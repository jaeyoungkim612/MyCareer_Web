"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FileText, BarChart3, ArrowUp, ArrowDown, DollarSign, PieChartIcon, ChevronDown, ChevronUp, Eye } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useState, useEffect } from "react"
import type { HrMasterDashboardRow } from "@/data/hr-master-dashboard"
import { supabase } from "@/lib/supabase"
import { AuthService } from "@/lib/auth-service"
import { BusinessGoalsService, type BusinessGoal } from "@/lib/business-goals-service"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

// 백만원 단위 변환 함수
const toMillion = (value: number | string) => Number(value) / 1_000_000;

// 적절한 단위로 올림 처리하는 함수
const roundUpToNiceNumber = (value: number) => {
  if (value <= 1000) {
    // 1000백만원 이하: 100백만원 단위로 올림
    return Math.ceil(value / 100) * 100;
  } else if (value <= 10000) {
    // 1000~10000백만원: 500백만원 단위로 올림  
    return Math.ceil(value / 500) * 500;
  } else {
    // 10000백만원 초과: 1000백만원 단위로 올림
    return Math.ceil(value / 1000) * 1000;
  }
};

// 막대 그래프 최대값을 적절하게 계산하는 함수
const calculateChartMax = (actual: number, budget: number) => {
  const maxValue = Math.max(actual, budget);
  // 둘 중 큰 값에 10% 여유만 주고 적절한 단위로 올림
  return roundUpToNiceNumber(maxValue * 1.1);
};

interface BusinessMonitoringTabProps {
  empno?: string
  readOnly?: boolean
}

export function BusinessMonitoringTab({ empno, readOnly = false }: BusinessMonitoringTabProps = {}) {
  const [budgetData, setBudgetData] = useState<HrMasterDashboardRow | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>("")
  const [goalData, setGoalData] = useState<BusinessGoal | null>(null)
  const [goalLoading, setGoalLoading] = useState(false)
  const [goalError, setGoalError] = useState<string | null>(null)

  // 컴포넌트 마운트 시 사용자 정보 로드
  useEffect(() => {
    const loadUser = async () => {
      const authUser = AuthService.getCurrentUser()
      if (authUser) {
        setCurrentUser(authUser)
        // readOnly 모드(리뷰어/마스터 리뷰어)에서는 반드시 전달받은 empno 사용
        // 일반 모드에서는 empno가 있으면 그것을, 없으면 로그인 사용자 사용
        const targetEmpno = readOnly 
          ? empno // readOnly일 때는 반드시 전달받은 empno 사용 (리뷰 대상자)
          : (empno || authUser.empno) // 일반 모드일 때는 empno가 있으면 그것을, 없으면 로그인 사용자
        console.log(`🔍 BusinessMonitoringTab: loadUser - readOnly=${readOnly}, empno=${empno}, targetEmpno=${targetEmpno}`)
        if (targetEmpno) {
          setCurrentEmployeeId(targetEmpno)
        } else if (readOnly) {
          console.warn('⚠️ BusinessMonitoringTab: readOnly 모드인데 empno가 전달되지 않았습니다.')
        }
      } else {
        // authUser가 없어도 empno가 있으면 사용
        if (empno) {
          console.log(`🔍 BusinessMonitoringTab: loadUser - no authUser, using empno=${empno}`)
          setCurrentEmployeeId(empno)
        } else if (readOnly) {
          console.warn('⚠️ BusinessMonitoringTab: readOnly 모드인데 empno가 전달되지 않았습니다.')
        }
      }
    }
    loadUser()
  }, [empno, readOnly])

  // empno가 설정되면 budgetData fetch
  useEffect(() => {
    if (!currentEmployeeId) return
    const fetchBudget = async () => {
      // 사번 정규화 (95129 → 095129)
      const { ReviewerService } = await import("@/lib/reviewer-service")
      const normalizedEmpno = ReviewerService.normalizeEmpno(currentEmployeeId)
      console.log(`🔧 BusinessMonitoringTab: Normalizing empno: ${currentEmployeeId} → ${normalizedEmpno}`)
      
      // 정규화된 사번으로 먼저 시도
      let { data, error } = await supabase
        .from("hr_master_dashboard")
        .select("*")
        .eq("EMPNO", normalizedEmpno)
        .single()
      
      // 정규화된 사번으로 못 찾으면 원본 사번으로 시도
      if (error || !data) {
        console.log("🔄 BusinessMonitoringTab: Trying with original empno:", currentEmployeeId)
        const result = await supabase
          .from("hr_master_dashboard")
          .select("*")
          .eq("EMPNO", currentEmployeeId)
          .single()
        data = result.data
        error = result.error
      }
      
      setBudgetData(data)
      // Budget 관련 주요 값만 보기 좋게 출력
      if (data) {
        console.log('Budget Debug:', {
          budget_audit: data.budget_audit,
          budget_non_audit: data.budget_non_audit,
          dept_budget_audit: data.dept_budget_audit,
          dept_budget_non_audit: data.dept_budget_non_audit,
          current_audit_revenue: data.current_audit_revenue,
          current_non_audit_revenue: data.current_non_audit_revenue,
          dept_revenue_audit: data.dept_revenue_audit,
          dept_revenue_non_audit: data.dept_revenue_non_audit,
        });
      } else {
        console.log('Budget Debug: No data', error);
      }
    }
    fetchBudget()
  }, [currentEmployeeId])

  useEffect(() => {
    if (!currentEmployeeId) return
    setGoalLoading(true)
    setGoalError(null)
    const fetchGoal = async () => {
      try {
        const latestGoal = await BusinessGoalsService.getByEmployeeId(currentEmployeeId)
        setGoalData(latestGoal)
      } catch (e) {
        setGoalError('목표 데이터를 불러오지 못했습니다.')
      } finally {
        setGoalLoading(false)
      }
    }
    fetchGoal()
  }, [currentEmployeeId])

  // Budget 실데이터 변수 선언 (매출 + BACKLOG + 파이프라인 합계)
  // My 개별 구성 요소들
  const myAuditRevenue = toMillion(budgetData?.current_audit_revenue ?? 0); // 매출
  const myAuditBacklog = toMillion(budgetData?.current_audit_backlog ?? 0); // BACKLOG
  const myNonAuditRevenue = toMillion(budgetData?.current_non_audit_revenue ?? 0); // 매출
  const myNonAuditBacklog = toMillion(budgetData?.current_non_audit_backlog ?? 0); // BACKLOG
  const myAuditPipeline = toMillion(budgetData?.pipeline_audit_current_total ?? 0); // 감사 파이프라인
  const myNonAuditPipeline = toMillion(budgetData?.pipeline_non_audit_current_total ?? 0); // 비감사 파이프라인
  
  // My 감사/비감사 실제 합계 (매출 + BACKLOG + 파이프라인)
  const myAuditActual = myAuditRevenue + myAuditBacklog + myAuditPipeline; // 각각의 파이프라인 사용
  const myNonAuditActual = myNonAuditRevenue + myNonAuditBacklog + myNonAuditPipeline; // 각각의 파이프라인 사용
  const myAuditBudget = Number(budgetData?.budget_audit ?? 0); // 이미 백만원단위
  const myNonAuditBudget = Number(budgetData?.budget_non_audit ?? 0); // 이미 백만원단위
  const myTotalActual = myAuditActual + myNonAuditActual;
  const myTotalBudget = myAuditBudget + myNonAuditBudget;

  // Team 개별 구성 요소들
  const teamAuditRevenue = toMillion(budgetData?.dept_revenue_audit ?? 0); // 매출
  const teamAuditBacklog = toMillion(budgetData?.dept_backlog_audit ?? 0); // BACKLOG
  const teamNonAuditRevenue = toMillion(budgetData?.dept_revenue_non_audit ?? 0); // 매출
  const teamNonAuditBacklog = toMillion(budgetData?.dept_backlog_non_audit ?? 0); // BACKLOG
  const teamAuditPipeline = toMillion(budgetData?.dept_pipeline_audit_current_total ?? 0); // 감사 파이프라인
  const teamNonAuditPipeline = toMillion(budgetData?.dept_pipeline_non_audit_current_total ?? 0); // 비감사 파이프라인
  
  // Team 감사/비감사 실제 합계 (매출 + BACKLOG + 파이프라인)
  const teamAuditActual = teamAuditRevenue + teamAuditBacklog + teamAuditPipeline; // 각각의 파이프라인 사용
  const teamNonAuditActual = teamNonAuditRevenue + teamNonAuditBacklog + teamNonAuditPipeline; // 각각의 파이프라인 사용
  const teamAuditBudget = Number(budgetData?.dept_budget_audit ?? 0);
  const teamNonAuditBudget = Number(budgetData?.dept_budget_non_audit ?? 0);
  const teamTotalActual = teamAuditActual + teamNonAuditActual;
  const teamTotalBudget = teamAuditBudget + teamNonAuditBudget;

  // 신규 BD 금액, UI Revenue 계약금액 실제/예산값 변수 선언 (컴포넌트 상단)
  const actualNewBdAmount = (budgetData?.audit_pjt_amount ?? 0) / 1_000_000; // 백만원 단위
  const budgetNewBdAmount = goalData?.new_audit_amount ?? 0; // 백만원 단위 그대로
  const actualUiRevenueAmount = (budgetData?.non_audit_pjt_amount ?? 0) / 1_000_000; // 백만원 단위
  const budgetUiRevenueAmount = goalData?.ui_revenue_amount ?? 0; // 백만원 단위 그대로

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(value)
  }

  const getStatusVariant = (actual: number, target: number) => {
    const percentage = (actual / target) * 100
    if (percentage >= 100) return "default"
    if (percentage >= 80) return "secondary"
    return "destructive"
  }

  const getStatusText = (actual: number, target: number) => {
    const percentage = (actual / target) * 100
    if (percentage >= 100) return "Exceeded"
    if (percentage >= 80) return "On Track"
    return "Needs Attention"
  }

  const getTrendIcon = (trend: string) => {
    if (trend.startsWith("+")) return <ArrowUp className="h-4 w-4 text-green-600" />
    if (trend.startsWith("-")) return <ArrowDown className="h-4 w-4 text-red-600" />
    return null
  }

  const getTrendColor = (trend: string) => {
    if (trend.startsWith("+")) return "text-green-600"
    if (trend.startsWith("-")) return "text-red-600"
    return ""
  }

  // 가로 막대 그래프 컴포넌트
  const BarChartComponent = ({
    actual,
    budget,
    title,
    color,
    trend,
    displayType = "percentage",
    cardClassName,
    breakdown,
    subtitle,
    currentEmployeeId,
    auditType,
  }: {
    actual: number
    budget: number
    title: string
    color: string
    trend: string
    displayType?: "percentage" | "count" | "amount" | "tenThousand"
    cardClassName?: string
    breakdown?: {
      revenue: number
      backlog: number
      pipeline: number
    }
    subtitle?: string
    currentEmployeeId?: string
    auditType?: 'audit' | 'non-audit'
  }) => {
    const [projectDetails, setProjectDetails] = useState<{
      revenue: Array<{ name: string; amount: number }>
      backlog: Array<{ name: string; amount: number }>
      pipeline: Array<{ name: string; amount: number }>
    }>({
      revenue: [],
      backlog: [],
      pipeline: []
    })
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)

    const percentage = (actual / budget) * 100
    const isExceeded = actual > budget

    // 상세보기 Dialog 열릴 때 프로젝트 데이터 가져오기
    const fetchProjectDetails = async () => {
      if (!currentEmployeeId) {
        console.warn('⚠️ fetchProjectDetails: currentEmployeeId가 없습니다.')
        return
      }

      setLoadingDetails(true)
      try {
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(currentEmployeeId)
        console.log(`🔍 fetchProjectDetails (${auditType}): currentEmployeeId = ${currentEmployeeId}, normalizedEmpno = ${normalizedEmpno}`)
        
        // audityn 필터 값 설정
        const auditYnFilter = auditType === 'audit' ? 'Y' : auditType === 'non-audit' ? 'N' : null

        // 1. Revenue 프로젝트 조회 (a_performance_current에서 REVENUE가 있는 프로젝트, 음수 포함)
        let revenueQuery = supabase
          .from('a_performance_current')
          .select('PRJTNM, CLIENTNM, REVENUE, AUDITYN')
          .eq('EMPLNO', normalizedEmpno)
          .not('REVENUE', 'is', null)
          .order('ETL_DATE', { ascending: false })
        
        if (auditYnFilter) {
          revenueQuery = revenueQuery.eq('AUDITYN', auditYnFilter)
        }

        const { data: revenueData, error: revenueError } = await revenueQuery
        
        if (revenueError) {
          console.error('❌ Revenue 데이터 조회 에러:', revenueError)
        }
        console.log(`📊 Revenue 데이터 조회 결과 (${auditType}):`, { 
          count: revenueData?.length || 0, 
          error: revenueError?.message,
          sample: revenueData?.slice(0, 2)
        })

        // 2. Backlog 프로젝트 조회 (a_performance_current에서 BACKLOG가 있는 프로젝트, 음수 포함)
        let backlogQuery = supabase
          .from('a_performance_current')
          .select('PRJTNM, CLIENTNM, BACKLOG, AUDITYN')
          .eq('EMPLNO', normalizedEmpno)
          .not('BACKLOG', 'is', null)
          .order('ETL_DATE', { ascending: false })
        
        if (auditYnFilter) {
          backlogQuery = backlogQuery.eq('AUDITYN', auditYnFilter)
        }

        const { data: backlogData, error: backlogError } = await backlogQuery
        
        if (backlogError) {
          console.error('❌ Backlog 데이터 조회 에러:', backlogError)
        }
        console.log(`📊 Backlog 데이터 조회 결과 (${auditType}):`, { 
          count: backlogData?.length || 0, 
          error: backlogError?.message,
          sample: backlogData?.slice(0, 2)
        })

        // 3. Pipeline 프로젝트 조회 (a_pipeline_current_re에서 최신 CDM_REPORT_MONTH 사용)
        const { data: latestMonthData, error: latestMonthError } = await supabase
          .from('a_pipeline_current_re')
          .select('CDM_REPORT_MONTH')
          .not('CDM_REPORT_MONTH', 'is', null)
          .order('CDM_REPORT_MONTH', { ascending: false })
          .limit(1)
          .maybeSingle()

        const latestMonth = latestMonthData?.CDM_REPORT_MONTH
        if (latestMonthError) {
          console.error('❌ 최신 CDM_REPORT_MONTH 조회 에러:', latestMonthError)
        }
        console.log('📅 최신 CDM_REPORT_MONTH:', latestMonth)

        // 최신 CDM_REPORT_MONTH의 Pipeline 데이터 조회 (음수 포함)
        let pipelineQuery = latestMonth
          ? supabase
              .from('a_pipeline_current_re')
              .select('PRJTNM, CLIENTNM, current_total, audityn')
              .eq('EMPLNO', normalizedEmpno)
              .eq('CDM_REPORT_MONTH', latestMonth)
              .not('current_total', 'is', null)
          : null

        if (pipelineQuery && auditYnFilter) {
          pipelineQuery = pipelineQuery.eq('audityn', auditYnFilter)
        }

        const { data: pipelineData, error: pipelineError } = pipelineQuery 
          ? await pipelineQuery 
          : { data: null, error: null }
        
        if (pipelineError) {
          console.error('❌ Pipeline 데이터 조회 에러:', pipelineError)
        }
        
        console.log(`📊 Pipeline 데이터 조회 결과 (${auditType}):`, { 
          count: pipelineData?.length || 0, 
          error: pipelineError?.message,
          latestMonth,
          sample: pipelineData?.slice(0, 2)
        })

        // 4. 프로젝트 데이터 정리
        // Revenue 프로젝트 정리 (프로젝트명+고객명으로 그룹화)
        const revenueMap = new Map<string, number>()
        if (revenueData) {
          revenueData.forEach(item => {
            const key = `${item.PRJTNM || '프로젝트명 없음'}|${item.CLIENTNM || '고객명 없음'}`
            const revenue = parseFloat(String(item.REVENUE || 0)) / 1_000_000 // 백만원 단위
            if (revenueMap.has(key)) {
              revenueMap.set(key, revenueMap.get(key)! + revenue)
            } else {
              revenueMap.set(key, revenue)
            }
          })
        }

        const revenueProjects = Array.from(revenueMap.entries()).map(([key, amount]) => {
          const [name, client] = key.split('|')
          return {
            name: `${name} (${client})`,
            amount: amount
          }
        }).sort((a, b) => b.amount - a.amount) // 금액 내림차순 정렬

        // Backlog 프로젝트 정리
        const backlogMap = new Map<string, number>()
        if (backlogData) {
          backlogData.forEach(item => {
            const key = `${item.PRJTNM || '프로젝트명 없음'}|${item.CLIENTNM || '고객명 없음'}`
            const backlog = parseFloat(String(item.BACKLOG || 0)) / 1_000_000 // 백만원 단위
            if (backlogMap.has(key)) {
              backlogMap.set(key, backlogMap.get(key)! + backlog)
            } else {
              backlogMap.set(key, backlog)
            }
          })
        }

        const backlogProjects = Array.from(backlogMap.entries()).map(([key, amount]) => {
          const [name, client] = key.split('|')
          return {
            name: `${name} (${client})`,
            amount: amount
          }
        }).sort((a, b) => b.amount - a.amount) // 금액 내림차순 정렬

        // Pipeline 프로젝트 정리
        const pipelineMap = new Map<string, number>()
        if (pipelineData) {
          pipelineData.forEach(item => {
            const prjtnm = (item as any).PRJTNM || (item as any).prjtnm || '프로젝트명 없음'
            const clientnm = (item as any).CLIENTNM || (item as any).clientnm || '고객명 없음'
            const key = `${prjtnm}|${clientnm}`
            const pipeline = parseFloat(String((item as any).current_total || (item as any).CURRENT_TOTAL || 0)) / 1_000_000 // 백만원 단위
            if (pipelineMap.has(key)) {
              pipelineMap.set(key, pipelineMap.get(key)! + pipeline)
            } else {
              pipelineMap.set(key, pipeline)
            }
          })
        }

        const pipelineProjects = Array.from(pipelineMap.entries()).map(([key, amount]) => {
          const [name, client] = key.split('|')
          return {
            name: `${name} (${client})`,
            amount: amount
          }
        }).sort((a, b) => b.amount - a.amount) // 금액 내림차순 정렬

        console.log(`✅ 최종 프로젝트 상세 데이터 (${auditType}):`, {
          revenue: revenueProjects.length,
          backlog: backlogProjects.length,
          pipeline: pipelineProjects.length
        })

        setProjectDetails({
          revenue: revenueProjects,
          backlog: backlogProjects,
          pipeline: pipelineProjects
        })
      } catch (error) {
        console.error('❌ 프로젝트 상세 정보 가져오기 실패:', error)
        setProjectDetails({ revenue: [], backlog: [], pipeline: [] })
      } finally {
        setLoadingDetails(false)
      }
    }

    // Dialog가 열릴 때 데이터 가져오기
    useEffect(() => {
      if (dialogOpen && auditType) {
        fetchProjectDetails()
      }
    }, [dialogOpen, currentEmployeeId, auditType])

    // BarChartComponent 내부 formatDisplayValue 함수에서 'amount' 타입일 때 value를 그대로 사용하고, 단위만 붙임. 추가적인 / 1_000_000 등 연산 제거.
    // 카드 하단, 툴팁 등에서도 변수값 그대로 사용하고, 단위만 붙임.
    const formatDisplayValue = (value: number, type: string, isBudget = false) => {
      switch (type) {
        case "count":
          return `${Math.round(value)}건`
        case "amount":
          return `${Math.ceil(value).toLocaleString('ko-KR')}백만원`
        case "tenThousand":
          return `${Math.round(value / 10000)}만`
        case "percentage":
        default:
          return `${value}%`
      }
    }

    // 막대 그래프 데이터
    const data = [
      {
        name: title,
        actual: actual,
        budget: budget,
        // breakdown이 있을 때 구성 요소 추가
        ...(breakdown && {
          revenue: breakdown.revenue,
          backlog: breakdown.backlog,
          pipeline: breakdown.pipeline,
        }),
      },
    ]

    // 커스텀 툴팁
    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        // Goal 탭이면 예산 -> 목표로 표시
        const isGoalTab = title.includes('신규 감사 건수') || title.includes('신규 감사 BD 금액') || title.includes('신규 비감사서비스') || title.includes('시간 당 Revenue');
        return (
          <div className="bg-white p-3 shadow-md rounded-md border">
            <p className="font-medium">{label}</p>
            <p className="text-sm">
              <span className="font-medium">실제: </span>
              {formatDisplayValue(payload[0].value, displayType)}
            </p>
            <p className="text-sm">
              <span className="font-medium">{isGoalTab ? '목표' : '예산'}: </span>
              {formatDisplayValue(budget, displayType, true)}
            </p>
            <p className="text-sm font-medium">달성률: {budget > 0 ? Math.round((actual / budget) * 100) : 0}%</p>
          </div>
        )
      }
      return null
    }

    return (
      <Card className={`h-full w-full ${cardClassName || ""}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: color }} />
              <div>
                <span className="text-lg font-semibold text-gray-900">{title}</span>
                {subtitle && (
                  <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
                )}
              </div>
              {/* 상세보기 버튼 추가 (auditType이 있을 때만) */}
              {auditType && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs h-6 px-2">
                      <Eye className="h-3 w-3 mr-1" />
                      상세보기
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                    <DialogHeader>
                      <DialogTitle>{title} 상세 내역 ({auditType === 'audit' ? '감사' : '비감사'})</DialogTitle>
                    </DialogHeader>
                    {loadingDetails ? (
                      <div className="p-8 text-center text-gray-500">로딩 중...</div>
                    ) : (
                      <div className="space-y-4">
                        {/* 합계 정보 상단 표시 */}
                        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border">
                          <div className="text-center">
                            <div className="text-sm text-gray-600 mb-1">Revenue 합계</div>
                            <div className="text-lg font-bold text-orange-600">
                              {projectDetails.revenue.length > 0
                                ? `${Math.ceil(projectDetails.revenue.reduce((sum, p) => sum + p.amount, 0)).toLocaleString('ko-KR')}백만원`
                                : '0백만원'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {projectDetails.revenue.length}개 프로젝트
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm text-gray-600 mb-1">Backlog 합계</div>
                            <div className="text-lg font-bold text-emerald-600">
                              {projectDetails.backlog.length > 0
                                ? `${Math.ceil(projectDetails.backlog.reduce((sum, p) => sum + p.amount, 0)).toLocaleString('ko-KR')}백만원`
                                : '0백만원'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {projectDetails.backlog.length}개 프로젝트
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm text-gray-600 mb-1">Pipeline 합계</div>
                            <div className="text-lg font-bold text-violet-600">
                              {projectDetails.pipeline.length > 0
                                ? `${Math.ceil(projectDetails.pipeline.reduce((sum, p) => sum + p.amount, 0)).toLocaleString('ko-KR')}백만원`
                                : '0백만원'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {projectDetails.pipeline.length}개 프로젝트
                            </div>
                          </div>
                        </div>
                        
                        <Tabs defaultValue="revenue" className="w-full">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="revenue">Revenue ({projectDetails.revenue.length})</TabsTrigger>
                            <TabsTrigger value="backlog">Backlog ({projectDetails.backlog.length})</TabsTrigger>
                            <TabsTrigger value="pipeline">Pipeline ({projectDetails.pipeline.length})</TabsTrigger>
                          </TabsList>
                          <TabsContent value="revenue" className="mt-4">
                            {projectDetails.revenue.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>프로젝트명</TableHead>
                                    <TableHead className="text-right">금액 (백만원)</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {projectDetails.revenue.map((project, index) => (
                                    <TableRow key={index}>
                                      <TableCell className="font-medium">{project.name}</TableCell>
                                      <TableCell className={`text-right ${project.amount < 0 ? 'text-red-600 font-bold' : ''}`}>
                                        {project.amount !== 0 
                                          ? `${Math.ceil(project.amount).toLocaleString('ko-KR')}백만원`
                                          : '-'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <div className="p-8 text-center text-gray-500">데이터가 없습니다.</div>
                            )}
                          </TabsContent>
                          <TabsContent value="backlog" className="mt-4">
                            {projectDetails.backlog.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>프로젝트명</TableHead>
                                    <TableHead className="text-right">금액 (백만원)</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {projectDetails.backlog.map((project, index) => (
                                    <TableRow key={index}>
                                      <TableCell className="font-medium">{project.name}</TableCell>
                                      <TableCell className={`text-right ${project.amount < 0 ? 'text-red-600 font-bold' : ''}`}>
                                        {project.amount !== 0 
                                          ? `${Math.ceil(project.amount).toLocaleString('ko-KR')}백만원`
                                          : '-'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <div className="p-8 text-center text-gray-500">데이터가 없습니다.</div>
                            )}
                          </TabsContent>
                          <TabsContent value="pipeline" className="mt-4">
                            {projectDetails.pipeline.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>프로젝트명</TableHead>
                                    <TableHead className="text-right">금액 (백만원)</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {projectDetails.pipeline.map((project, index) => (
                                    <TableRow key={index}>
                                      <TableCell className="font-medium">{project.name}</TableCell>
                                      <TableCell className={`text-right ${project.amount < 0 ? 'text-red-600 font-bold' : ''}`}>
                                        {project.amount !== 0 
                                          ? `${Math.ceil(project.amount).toLocaleString('ko-KR')}백만원`
                                          : '-'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <div className="p-8 text-center text-gray-500">데이터가 없습니다.</div>
                            )}
                          </TabsContent>
                        </Tabs>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {getTrendIcon(trend)}
              <span className={`text-sm font-medium ${getTrendColor(trend)}`}>{trend}</span>
            </div>
          </div>

          {/* 범례 추가 */}
          <div className="flex items-center justify-center space-x-4 mb-4 flex-wrap">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-300 border border-gray-400 rounded"></div>
              <span className="text-xs text-gray-600">{(title.includes('신규 감사 건수') || title.includes('신규 감사 BD 금액') || title.includes('신규 비감사서비스') || title.includes('시간 당 Revenue')) ? '목표' : '예산'}</span>
            </div>
            {breakdown ? (
              /* 구성 요소별 범례 */
              <>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span className="text-xs text-gray-600">Revenue</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                  <span className="text-xs text-gray-600">Backlog</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-violet-500 rounded"></div>
                  <span className="text-xs text-gray-600">Pipeline</span>
                </div>
              </>
            ) : (
              /* 기존 단일 범례 */
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: color }}></div>
                <span className="text-xs text-gray-600">실제</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <ResponsiveContainer width="100%" height={100}>
              <BarChart layout="vertical" data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, calculateChartMax(actual, budget)]}
                  tickFormatter={(value) => formatDisplayValue(value, displayType)}
                />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip content={<CustomTooltip />} />
                
                {/* 구성 요소별 스택형 막대 (breakdown이 있을 때만) */}
                {breakdown ? (
                  <>
                    <Bar
                      dataKey="revenue"
                      stackId="actual"
                      fill="#f97316"
                      radius={[0, 0, 0, 0]}
                      barSize={24}
                      name="Rev"
                    />
                    <Bar
                      dataKey="backlog"
                      stackId="actual"
                      fill="#10b981"
                      radius={[0, 0, 0, 0]}
                      barSize={24}
                      name="BL"
                    />
                    <Bar
                      dataKey="pipeline"
                      stackId="actual"
                      fill="#8b5cf6"
                      radius={[0, 4, 4, 0]}
                      barSize={24}
                      name="PL"
                    />
                  </>
                ) : (
                  /* 기존 단일 막대 (fallback) */
                  <Bar
                    dataKey="actual"
                    fill={color}
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                    name="실제"
                  />
                )}
                
                <Bar
                  dataKey="budget"
                  fill="#f3f4f6"
                  stroke="#d1d5db"
                  strokeWidth={1}
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                  name="예산"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="text-sm text-gray-500">실제</div>
              <div className="text-xl font-bold text-gray-900">
                {displayType === 'count' ? `${Math.round(actual)}건` :
                  // 목표탭의 '신규 감사 BD 금액', '신규 비감사서비스 BD 금액'만 백만단위 환산 및 콤마
                  (title === '신규 감사 BD 금액' || title === '신규 비감사서비스 BD 금액') ? `${Math.ceil(actual).toLocaleString('ko-KR')}백만원` :
                  displayType === 'amount' ? `${Math.ceil(actual).toLocaleString('ko-KR')}백만원` :
                  displayType === 'tenThousand' ? `${actual.toLocaleString('ko-KR')}/h` :
                  actual !== undefined && actual !== null ? `${Math.ceil(actual).toLocaleString('ko-KR')}백만원` : '-'}
              </div>
              {/* 구성 요소 하단 표시 (breakdown이 있을 때만) */}
              {breakdown && (
                <div className="flex items-center flex-wrap gap-1 text-xs mt-1">
                  <span className="text-gray-400">(</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span className="text-gray-600">Rev {Math.ceil(breakdown.revenue).toLocaleString('ko-KR')}</span>
                  </div>
                  <span className="text-gray-400">+</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-gray-600">BL {Math.ceil(breakdown.backlog).toLocaleString('ko-KR')}</span>
                  </div>
                  <span className="text-gray-400">+</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                    <span className="text-gray-600">PL {Math.ceil(breakdown.pipeline).toLocaleString('ko-KR')}</span>
                  </div>
                  <span className="text-gray-400">)</span>
                </div>
              )}
            </div>
            <div className="space-y-1 text-right">
              <div className="text-sm text-gray-500">{(title.includes('신규 감사 건수') || title.includes('신규 감사 BD 금액') || title.includes('신규 비감사서비스') || title.includes('시간 당 Revenue')) ? '목표' : '예산'}</div>
              <div className="text-xl font-bold text-gray-900">
                {displayType === 'count' ? `${Math.round(budget)}건` :
                  displayType === 'amount' ? `${Math.ceil(budget).toLocaleString('ko-KR')}백만원` :
                  displayType === 'tenThousand' ? `${budget.toLocaleString('ko-KR')}/h` :
                  budget !== undefined && budget !== null ? `${Math.ceil(budget).toLocaleString('ko-KR')}백만원` : '-'}
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <div
              className={`text-sm font-medium ${percentage >= 100 ? "text-green-600" : percentage >= 80 ? "text-amber-600" : "text-red-600"}`}
            >
              {Math.round(percentage)}% {percentage >= 100 ? "초과달성" : "달성"}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {displayType === 'count' 
                ? `(실제: ${Math.round(actual)}건 / 목표: ${Math.round(budget)}건 × 100 = ${Math.round(percentage)}%)`
                : `(실제: ${Math.ceil(actual).toLocaleString('ko-KR')}백만원 / 목표: ${Math.ceil(budget).toLocaleString('ko-KR')}백만원 × 100 = ${Math.round(percentage)}%)`
              }
            </div>
          </div>


        </CardContent>
      </Card>
    )
  }

  // Total Budget용 누적 막대 그래프 컴포넌트
  const StackedBarChartComponent = ({
    auditActual,
    nonAuditActual,
    totalBudget,
    title,
    trend,
    cardClassName,
    isTeam = false,
    totalBreakdown,
    subtitle,
    currentEmployeeId,
  }: {
    auditActual: number
    nonAuditActual: number
    totalBudget: number
    title: string
    trend: string
    cardClassName?: string
    isTeam?: boolean
    totalBreakdown?: {
      auditRevenue: number
      auditBacklog: number
      nonAuditRevenue: number
      nonAuditBacklog: number
      pipeline: number
    }
    subtitle?: string
    currentEmployeeId?: string
  }) => {
    const [projectDetails, setProjectDetails] = useState<{
      revenue: Array<{ name: string; amount: number; prjtcd?: string }>
      backlog: Array<{ name: string; amount: number; prjtcd?: string }>
      pipeline: Array<{ name: string; amount: number; prjtcd?: string }>
    }>({
      revenue: [],
      backlog: [],
      pipeline: []
    })
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)

    const totalActual = auditActual + nonAuditActual
    const percentage = Math.round((totalActual / totalBudget) * 100)
    const auditPercentage = Math.round((auditActual / totalActual) * 100)
    const nonAuditPercentage = Math.round((nonAuditActual / totalActual) * 100)

    // 상세보기 Dialog 열릴 때 프로젝트 데이터 가져오기
    const fetchProjectDetails = async () => {
      if (!currentEmployeeId) {
        console.warn('⚠️ fetchProjectDetails: currentEmployeeId가 없습니다.')
        return
      }

      setLoadingDetails(true)
      try {
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(currentEmployeeId)
        console.log(`🔍 fetchProjectDetails: currentEmployeeId = ${currentEmployeeId}, normalizedEmpno = ${normalizedEmpno}`)
        
        // 실제 테이블 구조에 맞게 조회
        // a_performance_current: EMPLNO, PRJTNM, CLIENTNM, REVENUE, BACKLOG, AUDITYN, ETL_DATE
        // a_pipeline_current: EMPLNO, PRJTNM, CLIENTNM, CURRENT_TOTAL, AUDITYN, ETL_DATE, CDM_REPORT_MONTH

        // 1. Revenue 프로젝트 조회 (a_performance_current에서 REVENUE가 있는 프로젝트, 음수 포함)
        const { data: revenueData, error: revenueError } = await supabase
          .from('a_performance_current')
          .select('PRJTNM, CLIENTNM, REVENUE, AUDITYN')
          .eq('EMPLNO', normalizedEmpno)
          .not('REVENUE', 'is', null)
          .order('ETL_DATE', { ascending: false })
        
        if (revenueError) {
          console.error('❌ Revenue 데이터 조회 에러:', revenueError)
          console.error('❌ Revenue 에러 상세:', {
            message: revenueError.message,
            details: revenueError.details,
            hint: revenueError.hint,
            code: revenueError.code
          })
        }
        console.log('📊 Revenue 데이터 조회 결과:', { 
          count: revenueData?.length || 0, 
          error: revenueError?.message,
          sample: revenueData?.slice(0, 2)
        })

        // 2. Backlog 프로젝트 조회 (a_performance_current에서 BACKLOG가 있는 프로젝트, 음수 포함)
        const { data: backlogData, error: backlogError } = await supabase
          .from('a_performance_current')
          .select('PRJTNM, CLIENTNM, BACKLOG, AUDITYN')
          .eq('EMPLNO', normalizedEmpno)
          .not('BACKLOG', 'is', null)
          .order('ETL_DATE', { ascending: false })
        
        if (backlogError) {
          console.error('❌ Backlog 데이터 조회 에러:', backlogError)
          console.error('❌ Backlog 에러 상세:', {
            message: backlogError.message,
            details: backlogError.details,
            hint: backlogError.hint,
            code: backlogError.code
          })
        }
        console.log('📊 Backlog 데이터 조회 결과:', { 
          count: backlogData?.length || 0, 
          error: backlogError?.message,
          sample: backlogData?.slice(0, 2)
        })

        // 3. Pipeline 프로젝트 조회 (a_pipeline_current_re에서 최신 CDM_REPORT_MONTH 사용)
        // SQL 뷰와 동일하게 CDM_REPORT_MONTH로 최신 데이터 찾기
        // 먼저 최신 CDM_REPORT_MONTH 조회
        const { data: latestMonthData, error: latestMonthError } = await supabase
          .from('a_pipeline_current_re')
          .select('CDM_REPORT_MONTH')
          .not('CDM_REPORT_MONTH', 'is', null)
          .order('CDM_REPORT_MONTH', { ascending: false })
          .limit(1)
          .maybeSingle()

        const latestMonth = latestMonthData?.CDM_REPORT_MONTH
        if (latestMonthError) {
          console.error('❌ 최신 CDM_REPORT_MONTH 조회 에러:', latestMonthError)
        }
        console.log('📅 최신 CDM_REPORT_MONTH:', latestMonth)

        // 최신 CDM_REPORT_MONTH의 Pipeline 데이터 조회 (음수 포함)
        // SQL 뷰와 동일하게 a_pipeline_current_re 사용, current_total 합계
        const { data: pipelineData, error: pipelineError } = latestMonth
          ? await supabase
              .from('a_pipeline_current_re')
              .select('PRJTNM, CLIENTNM, current_total, audityn')
              .eq('EMPLNO', normalizedEmpno)
              .eq('CDM_REPORT_MONTH', latestMonth)
              .not('current_total', 'is', null)
          : { data: null, error: null }
        
        if (pipelineError) {
          console.error('❌ Pipeline 데이터 조회 에러:', pipelineError)
          console.error('❌ Pipeline 에러 상세:', {
            message: pipelineError.message,
            details: pipelineError.details,
            hint: pipelineError.hint,
            code: pipelineError.code
          })
        }
        
        console.log('📊 Pipeline 데이터 조회 결과:', { 
          count: pipelineData?.length || 0, 
          error: pipelineError?.message,
          latestMonth,
          sample: pipelineData?.slice(0, 2)
        })

        // 4. 프로젝트 데이터 정리 (PRJTNM, CLIENTNM이 이미 있으므로 직접 사용)
        // Revenue 프로젝트 정리 (프로젝트명+고객명으로 그룹화)
        const revenueMap = new Map<string, number>()
        if (revenueData) {
          revenueData.forEach(item => {
            const key = `${item.PRJTNM || '프로젝트명 없음'}|${item.CLIENTNM || '고객명 없음'}`
            const revenue = parseFloat(String(item.REVENUE || 0)) / 1_000_000 // 백만원 단위
            if (revenueMap.has(key)) {
              revenueMap.set(key, revenueMap.get(key)! + revenue)
            } else {
              revenueMap.set(key, revenue)
            }
          })
        }

        const revenueProjects = Array.from(revenueMap.entries()).map(([key, amount]) => {
          const [name, client] = key.split('|')
          return {
            name: `${name} (${client})`,
            amount: amount
          }
        }).sort((a, b) => b.amount - a.amount) // 금액 내림차순 정렬

        // Backlog 프로젝트 정리
        const backlogMap = new Map<string, number>()
        if (backlogData) {
          backlogData.forEach(item => {
            const key = `${item.PRJTNM || '프로젝트명 없음'}|${item.CLIENTNM || '고객명 없음'}`
            const backlog = parseFloat(String(item.BACKLOG || 0)) / 1_000_000 // 백만원 단위
            if (backlogMap.has(key)) {
              backlogMap.set(key, backlogMap.get(key)! + backlog)
            } else {
              backlogMap.set(key, backlog)
            }
          })
        }

        const backlogProjects = Array.from(backlogMap.entries()).map(([key, amount]) => {
          const [name, client] = key.split('|')
          return {
            name: `${name} (${client})`,
            amount: amount
          }
        }).sort((a, b) => b.amount - a.amount) // 금액 내림차순 정렬

        // Pipeline 프로젝트 정리
        const pipelineMap = new Map<string, number>()
        if (pipelineData) {
          pipelineData.forEach(item => {
            const prjtnm = (item as any).PRJTNM || (item as any).prjtnm || '프로젝트명 없음'
            const clientnm = (item as any).CLIENTNM || (item as any).clientnm || '고객명 없음'
            const key = `${prjtnm}|${clientnm}`
            const pipeline = parseFloat(String((item as any).current_total || (item as any).CURRENT_TOTAL || 0)) / 1_000_000 // 백만원 단위
            if (pipelineMap.has(key)) {
              pipelineMap.set(key, pipelineMap.get(key)! + pipeline)
            } else {
              pipelineMap.set(key, pipeline)
            }
          })
        }

        const pipelineProjects = Array.from(pipelineMap.entries()).map(([key, amount]) => {
          const [name, client] = key.split('|')
          return {
            name: `${name} (${client})`,
            amount: amount
          }
        }).sort((a, b) => b.amount - a.amount) // 금액 내림차순 정렬

        console.log('✅ 최종 프로젝트 상세 데이터:', {
          revenue: revenueProjects.length,
          backlog: backlogProjects.length,
          pipeline: pipelineProjects.length
        })

        setProjectDetails({
          revenue: revenueProjects,
          backlog: backlogProjects,
          pipeline: pipelineProjects
        })
      } catch (error) {
        console.error('❌ 프로젝트 상세 정보 가져오기 실패:', error)
        setProjectDetails({ revenue: [], backlog: [], pipeline: [] })
      } finally {
        setLoadingDetails(false)
      }
    }

    // Dialog가 열릴 때 데이터 가져오기
    useEffect(() => {
      if (dialogOpen) {
        fetchProjectDetails()
      }
    }, [dialogOpen, currentEmployeeId])

    const formatDisplayValue = (value: number) => {
      return `${Math.ceil(value).toLocaleString('ko-KR')}백만원`;
    }

    // 막대 그래프 데이터
    const data = [
      {
        name: title,
        budget: totalBudget,
        audit: auditActual,
        nonAudit: nonAuditActual,
        // totalBreakdown이 있을 때 구성 요소 추가
        ...(totalBreakdown && {
          revenue: totalBreakdown.auditRevenue + totalBreakdown.nonAuditRevenue,
          backlog: totalBreakdown.auditBacklog + totalBreakdown.nonAuditBacklog,
          pipeline: totalBreakdown.pipeline,
        }),
      },
    ]

    // 커스텀 툴팁
    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-white p-3 shadow-md rounded-md border">
            <p className="font-medium">{label}</p>
            <p className="text-sm">
              <span className="font-medium">감사: </span>
              {Math.ceil(auditActual).toLocaleString('ko-KR')}백만원 ({totalActual > 0 ? Math.round((auditActual / totalActual) * 100) : 0}%)
            </p>
            <p className="text-sm">
              <span className="font-medium">비감사서비스: </span>
              {Math.ceil(nonAuditActual).toLocaleString('ko-KR')}백만원 ({totalActual > 0 ? Math.round((nonAuditActual / totalActual) * 100) : 0}%)
            </p>
            <p className="text-sm">
              <span className="font-medium">총 실제: </span>
              {Math.ceil(totalActual).toLocaleString('ko-KR')}백만원
            </p>
            <p className="text-sm">
              <span className="font-medium">예산: </span>
              {Math.ceil(totalBudget).toLocaleString('ko-KR')}백만원
            </p>
            <p className="text-sm font-medium">달성률: {totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0}%</p>
          </div>
        )
      }
      return null
    }

    // 색상 설정 - Team일 때는 개별 Team 카드와 동일한 색상 사용
    const auditColor = isTeam ? "#ea580c" : "#f97316"
    const nonAuditColor = isTeam ? "#059669" : "#10b981"

    return (
      <Card className={`h-full w-full ${cardClassName || ""}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-gray-900">{title}</span>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs h-6 px-2">
                    <Eye className="h-3 w-3 mr-1" />
                    상세보기
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle>{title} 상세 내역</DialogTitle>
                  </DialogHeader>
                  {loadingDetails ? (
                    <div className="p-8 text-center text-gray-500">로딩 중...</div>
                  ) : (
                    <div className="space-y-4">
                      {/* 합계 정보 상단 표시 */}
                      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border">
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">Revenue 합계</div>
                          <div className="text-lg font-bold text-orange-600">
                            {projectDetails.revenue.length > 0
                              ? `${Math.ceil(projectDetails.revenue.reduce((sum, p) => sum + p.amount, 0)).toLocaleString('ko-KR')}백만원`
                              : '0백만원'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {projectDetails.revenue.length}개 프로젝트
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">Backlog 합계</div>
                          <div className="text-lg font-bold text-emerald-600">
                            {projectDetails.backlog.length > 0
                              ? `${Math.ceil(projectDetails.backlog.reduce((sum, p) => sum + p.amount, 0)).toLocaleString('ko-KR')}백만원`
                              : '0백만원'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {projectDetails.backlog.length}개 프로젝트
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">Pipeline 합계</div>
                          <div className="text-lg font-bold text-violet-600">
                            {projectDetails.pipeline.length > 0
                              ? `${Math.ceil(projectDetails.pipeline.reduce((sum, p) => sum + p.amount, 0)).toLocaleString('ko-KR')}백만원`
                              : '0백만원'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {projectDetails.pipeline.length}개 프로젝트
                          </div>
                        </div>
                      </div>
                      
                      <Tabs defaultValue="revenue" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="revenue">Revenue ({projectDetails.revenue.length})</TabsTrigger>
                          <TabsTrigger value="backlog">Backlog ({projectDetails.backlog.length})</TabsTrigger>
                          <TabsTrigger value="pipeline">Pipeline ({projectDetails.pipeline.length})</TabsTrigger>
                        </TabsList>
                      <TabsContent value="revenue" className="mt-4">
                        {projectDetails.revenue.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>프로젝트명</TableHead>
                                <TableHead className="text-right">금액 (백만원)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {projectDetails.revenue.map((project, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{project.name}</TableCell>
                                  <TableCell className={`text-right ${project.amount < 0 ? 'text-red-600 font-bold' : ''}`}>
                                    {project.amount !== 0 
                                      ? `${Math.ceil(project.amount).toLocaleString('ko-KR')}백만원`
                                      : '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="p-8 text-center text-gray-500">데이터가 없습니다.</div>
                        )}
                      </TabsContent>
                      <TabsContent value="backlog" className="mt-4">
                        {projectDetails.backlog.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>프로젝트명</TableHead>
                                <TableHead className="text-right">금액 (백만원)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {projectDetails.backlog.map((project, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{project.name}</TableCell>
                                  <TableCell className={`text-right ${project.amount < 0 ? 'text-red-600 font-bold' : ''}`}>
                                    {project.amount !== 0 
                                      ? `${Math.ceil(project.amount).toLocaleString('ko-KR')}백만원`
                                      : '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="p-8 text-center text-gray-500">데이터가 없습니다.</div>
                        )}
                      </TabsContent>
                      <TabsContent value="pipeline" className="mt-4">
                        {projectDetails.pipeline.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>프로젝트명</TableHead>
                                <TableHead className="text-right">금액 (백만원)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {projectDetails.pipeline.map((project, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{project.name}</TableCell>
                                  <TableCell className={`text-right ${project.amount < 0 ? 'text-red-600 font-bold' : ''}`}>
                                    {project.amount !== 0 
                                      ? `${Math.ceil(project.amount).toLocaleString('ko-KR')}백만원`
                                      : '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="p-8 text-center text-gray-500">데이터가 없습니다.</div>
                        )}
                      </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
              {subtitle && (
                <div className="text-xs text-gray-500">{subtitle}</div>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {getTrendIcon(trend)}
              <span className={`text-sm font-medium ${getTrendColor(trend)}`}>{trend}</span>
            </div>
          </div>

          {/* 범례 추가 */}
          <div className="flex items-center justify-center space-x-4 mb-4 flex-wrap">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-300 border border-gray-400 rounded"></div>
              <span className="text-xs text-gray-600">예산</span>
            </div>
            {totalBreakdown ? (
              /* 구성 요소별 범례 */
              <>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span className="text-xs text-gray-600">Revenue</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                  <span className="text-xs text-gray-600">Backlog</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-violet-500 rounded"></div>
                  <span className="text-xs text-gray-600">Pipeline</span>
                </div>
              </>
            ) : (
              /* 기존 감사/비감사 범례 */
              <>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: auditColor }}></div>
                  <span className="text-xs text-gray-600">감사</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: nonAuditColor }}></div>
                  <span className="text-xs text-gray-600">비감사서비스</span>
                </div>
              </>
            )}
          </div>

          <div className="mb-6">
            <ResponsiveContainer width="100%" height={100}>
              <BarChart layout="vertical" data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, calculateChartMax(totalActual, totalBudget)]}
                  tickFormatter={(value) => formatDisplayValue(value)}
                />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="budget"
                  fill="#f3f4f6"
                  stroke="#d1d5db"
                  strokeWidth={1}
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                  name="예산"
                />
                
                {/* 구성 요소별 스택형 막대 (totalBreakdown이 있을 때만) */}
                {totalBreakdown ? (
                  <>
                    <Bar
                      dataKey="revenue"
                      stackId="actual"
                      fill="#f97316"
                      radius={[0, 0, 0, 0]}
                      barSize={24}
                      name="Rev"
                    />
                    <Bar
                      dataKey="backlog"
                      stackId="actual"
                      fill="#10b981"
                      radius={[0, 0, 0, 0]}
                      barSize={24}
                      name="BL"
                    />
                    <Bar
                      dataKey="pipeline"
                      stackId="actual"
                      fill="#8b5cf6"
                      radius={[0, 4, 4, 0]}
                      barSize={24}
                      name="PL"
                    />
                  </>
                ) : (
                  /* 기존 감사/비감사 막대 */
                  <>
                    <Bar dataKey="audit" stackId="a" fill={auditColor} radius={[0, 0, 0, 0]} barSize={24} name="Audit" />
                    <Bar
                      dataKey="nonAudit"
                      stackId="a"
                      fill={nonAuditColor}
                      radius={[0, 4, 4, 0]}
                      barSize={24}
                      name="Non-Audit"
                    />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="text-sm text-gray-500">실제</div>
              <div className="text-xl font-bold text-gray-900">{totalActual !== undefined && totalActual !== null ? `${Math.ceil(totalActual).toLocaleString('ko-KR')}백만원` : '-'}</div>
              {/* 구성 요소 하단 표시 (totalBreakdown이 있을 때만) */}
              {totalBreakdown && (
                <div className="flex items-center flex-wrap gap-1 text-xs mt-1">
                  <span className="text-gray-400">(</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span className="text-gray-600">Rev {Math.ceil(totalBreakdown.auditRevenue + totalBreakdown.nonAuditRevenue).toLocaleString('ko-KR')}</span>
                  </div>
                  <span className="text-gray-400">+</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-gray-600">BL {Math.ceil(totalBreakdown.auditBacklog + totalBreakdown.nonAuditBacklog).toLocaleString('ko-KR')}</span>
                  </div>
                  <span className="text-gray-400">+</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                    <span className="text-gray-600">PL {Math.ceil(totalBreakdown.pipeline).toLocaleString('ko-KR')}</span>
                  </div>
                  <span className="text-gray-400">)</span>
                </div>
              )}
            </div>
            <div className="space-y-1 text-right">
              <div className="text-sm text-gray-500">예산</div>
              <div className="text-xl font-bold text-gray-900">{totalBudget !== undefined && totalBudget !== null ? `${Math.ceil(totalBudget).toLocaleString('ko-KR')}백만원` : '-'}</div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-1">
              {getTrendIcon(trend)}
              <span className={`text-sm font-medium ${getTrendColor(trend)}`}>{trend}</span>
            </div>
            <div className="text-center">
              <div
                className={`text-sm font-medium ${percentage >= 100 ? "text-green-600" : percentage >= 80 ? "text-amber-600" : "text-red-600"}`}
              >
                {percentage}% {percentage >= 100 ? "초과달성" : "달성"}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                (실제: {Math.ceil(totalActual).toLocaleString('ko-KR')}백만원 / 예산: {Math.ceil(totalBudget).toLocaleString('ko-KR')}백만원 × 100 = {percentage}%)
              </div>
            </div>
          </div>




        </CardContent>
      </Card>
    )
  }

  // 탭 상태
  const [activeTab, setActiveTab] = useState<"budget" | "goal">("budget")
  const tabList = [
    { key: "budget", label: "TBA 기준" },
    { key: "goal", label: "계약금액 기준" },
  ]

  // 총 계약금액 도넛차트용 값
  const totalContractAmount = 1270000000
  const planTotalBudget = 1350000000 // plan-tab의 Total Budget 값
  const totalContractRate = Math.round((totalContractAmount / planTotalBudget) * 100)

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-3 mb-6">
        {tabList.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as "budget" | "goal")}
            className={`px-6 py-3 rounded-t-md border-b-2 transition-colors font-semibold text-base ${activeTab === tab.key ? "border-orange-600 text-orange-600 bg-slate-50" : "border-transparent text-muted-foreground bg-transparent hover:bg-slate-100"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* Tab Content */}
      {activeTab === "budget" && (
        <div>
          {/* 헤더 */}
          <div className="flex items-center mb-6">
            <PieChartIcon className="mr-3 h-6 w-6 text-blue-600" />
                            <span className="text-lg font-bold text-gray-900">Total Budget</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* My Budget Card - 누적 막대 그래프 */}
            <StackedBarChartComponent
              auditActual={myAuditActual}
              nonAuditActual={myNonAuditActual}
              totalBudget={myTotalBudget}
              title="My Budget"
              trend={`-${Math.round((1 - (myTotalActual / (myTotalBudget || 1))) * 100)}%`}
              cardClassName="shadow-sm border-l-4 border-l-gray-300"
              totalBreakdown={{
                auditRevenue: myAuditRevenue,
                auditBacklog: myAuditBacklog,
                nonAuditRevenue: myNonAuditRevenue,
                nonAuditBacklog: myNonAuditBacklog,
                pipeline: myAuditPipeline + myNonAuditPipeline
              }}
              currentEmployeeId={currentEmployeeId}
            />

            {/* Team Budget Card - 누적 막대 그래프 */}
            <StackedBarChartComponent
              auditActual={teamAuditActual}
              nonAuditActual={teamNonAuditActual}
              totalBudget={teamTotalBudget}
              title="Team Budget"
              subtitle="- 9월 중 업데이트 예정"
              trend={`-${Math.round((1 - (teamTotalActual / (teamTotalBudget || 1))) * 100)}%`}
              cardClassName="shadow-sm border-l-4 border-l-gray-300"
              isTeam={true}
              totalBreakdown={{
                auditRevenue: teamAuditRevenue,
                auditBacklog: teamAuditBacklog,
                nonAuditRevenue: teamNonAuditRevenue,
                nonAuditBacklog: teamNonAuditBacklog,
                pipeline: teamAuditPipeline + teamNonAuditPipeline
              }}
              currentEmployeeId={currentEmployeeId}
            />
          </div>

          {/* 감사 Budget Overview 섹션 */}
          <div className="mt-12">
            {/* 헤더 */}
            <div className="flex items-center mb-6">
              <FileText className="mr-3 h-6 w-6 text-orange-600" />
              <span className="text-lg font-bold text-gray-900">감사 Budget</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* My 감사 Budget Card */}
              <BarChartComponent
                actual={myAuditActual}
                budget={myAuditBudget}
                title="My 감사 Budget"
                color="#f97316"
                trend={`-${Math.round((1 - (myAuditActual / (myAuditBudget || 1))) * 100)}%`}
                displayType="amount"
                cardClassName="shadow-sm border-l-4 border-l-orange-500"
                breakdown={{
                  revenue: myAuditRevenue,
                  backlog: myAuditBacklog,
                  pipeline: myAuditPipeline
                }}
                currentEmployeeId={currentEmployeeId}
                auditType="audit"
              />

              {/* Team 감사 Budget Card */}
              <BarChartComponent
                actual={teamAuditActual}
                budget={teamAuditBudget}
                title="Team 감사 Budget"
                subtitle="- 9월 중 업데이트 예정"
                color="#ea580c"
                trend={`-${Math.round((1 - (teamAuditActual / (teamAuditBudget || 1))) * 100)}%`}
                displayType="amount"
                cardClassName="shadow-sm border-l-4 border-l-orange-600"
                breakdown={{
                  revenue: teamAuditRevenue,
                  backlog: teamAuditBacklog,
                  pipeline: teamAuditPipeline
                }}
              />
            </div>
          </div>

          {/* 비감사서비스 Budget Overview 섹션 */}
          <div className="mt-12">
            {/* 헤더 */}
            <div className="flex items-center mb-6">
              <BarChart3 className="mr-3 h-6 w-6 text-blue-600" />
              <span className="text-lg font-bold text-gray-900">비감사서비스 Budget</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* My 비감사서비스 Budget Card */}
              <BarChartComponent
                actual={myNonAuditActual}
                budget={myNonAuditBudget}
                title="My 비감사서비스 Budget"
                color="#10b981"
                trend={`-${Math.round((1 - (myNonAuditActual / (myNonAuditBudget || 1))) * 100)}%`}
                displayType="amount"
                cardClassName="shadow-sm border-l-4 border-l-emerald-500"
                breakdown={{
                  revenue: myNonAuditRevenue,
                  backlog: myNonAuditBacklog,
                  pipeline: myNonAuditPipeline
                }}
                currentEmployeeId={currentEmployeeId}
                auditType="non-audit"
              />

              {/* Team 비감사서비스 Budget Card */}
              <BarChartComponent
                actual={teamNonAuditActual}
                budget={teamNonAuditBudget}
                title="Team 비감사서비스 Budget"
                subtitle="- 9월 중 업데이트 예정"
                color="#059669"
                trend={`-${Math.round((1 - (teamNonAuditActual / (teamNonAuditBudget || 1))) * 100)}%`}
                displayType="amount"
                cardClassName="shadow-sm border-l-4 border-l-emerald-600"
                breakdown={{
                  revenue: teamNonAuditRevenue,
                  backlog: teamNonAuditBacklog,
                  pipeline: teamNonAuditPipeline
                }}
              />
            </div>
          </div>
        </div>
      )}
      {activeTab === "goal" && (
        <div>
          {goalLoading ? (
            <div className="p-8 text-center text-gray-500">목표 데이터를 불러오는 중...</div>
          ) : !goalData ? (
            <div className="p-8 text-center text-gray-500">입력된 목표 데이터가 없습니다.</div>
          ) : (
            <>
              {/* 감사 Metrics */}
              <div>
                <div className="flex items-center mb-6">
                  <FileText className="mr-3 h-6 w-6 text-orange-600" />
                  <span className="text-lg font-bold text-gray-900">감사</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <BarChartComponent
                    actual={Math.round(budgetData?.audit_pjt_count ?? 0)}
                    budget={goalData?.new_audit_count ?? 0}
                    title="신규 감사 건수"
                    color="#f97316"
                    trend=""
                    displayType="count"
                  />
                  <BarChartComponent
                    actual={actualNewBdAmount}
                    budget={budgetNewBdAmount}
                    title="신규 감사 BD 금액"
                    color="#ea580c"
                    trend=""
                    displayType="amount"
                  />
                </div>
              </div>
              {/* 비감사서비스 Metrics */}
              <div className="mt-12">
                <div className="flex items-center mb-6">
                  <BarChart3 className="mr-3 h-6 w-6 text-blue-600" />
                  <span className="text-lg font-bold text-gray-900">비감사서비스</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <BarChartComponent
                    actual={Math.round(budgetData?.non_audit_pjt_count ?? 0)}
                    budget={goalData?.ui_revenue_count ?? 0}
                    title="신규 비감사서비스 건수"
                    color="#3b82f6"
                    trend=""
                    displayType="count"
                  />
                  <BarChartComponent
                    actual={actualUiRevenueAmount}
                    budget={budgetUiRevenueAmount}
                    title="신규 비감사서비스 BD 금액"
                    color="#60a5fa"
                    trend=""
                    displayType="amount"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
