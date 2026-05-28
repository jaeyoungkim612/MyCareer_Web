"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FileText, BarChart3, ArrowUp, ArrowDown, DollarSign, PieChartIcon, ChevronDown, ChevronUp, Eye } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useState, useEffect, useMemo } from "react"
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
  const [bdActualData, setBdActualData] = useState<{
    myAuditAmount: number
    myNonAuditAmount: number
    myAuditCount: number
    myNonAuditCount: number
  }>({
    myAuditAmount: 0,
    myNonAuditAmount: 0,
    myAuditCount: 0,
    myNonAuditCount: 0
  })
  const [teamBprData, setTeamBprData] = useState<{
    auditRevenue: number
    nonAuditRevenue: number
    auditBacklog: number
    nonAuditBacklog: number
    auditPipeline: number
    nonAuditPipeline: number
  }>({
    auditRevenue: 0,
    nonAuditRevenue: 0,
    auditBacklog: 0,
    nonAuditBacklog: 0,
    auditPipeline: 0,
    nonAuditPipeline: 0
  })
  const [myBprData, setMyBprData] = useState<{
    auditRevenue: number
    nonAuditRevenue: number
    auditBacklog: number
    nonAuditBacklog: number
    auditPipeline: number
    nonAuditPipeline: number
  }>({
    auditRevenue: 0,
    nonAuditRevenue: 0,
    auditBacklog: 0,
    nonAuditBacklog: 0,
    auditPipeline: 0,
    nonAuditPipeline: 0
  })

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
      
      // 사번 변형 목록 생성 (앞의 0을 제거한 모든 버전 포함)
      const empnoVariants = [
        normalizedEmpno,                     // 095129
        normalizedEmpno.replace(/^0+/, ''),  // 95129 (앞의 0 모두 제거) - 우선순위 높임!
        currentEmployeeId,                   // 원본
        currentEmployeeId.replace(/^0+/, ''), // 원본에서 0 제거
        String(parseInt(normalizedEmpno)),   // 95129 (정수 변환 후 문자열)
      ].filter((v, i, a) => a.indexOf(v) === i) // 중복 제거
      
      console.log(`🔍 Budget 조회용 사번 변형:`, empnoVariants)
      
      let data = null
      let error = null
      
      // 여러 사번 형식으로 시도 - 예산 값이 있는 데이터를 찾을 때까지
      for (const empnoVariant of empnoVariants) {
        console.log(`🔍 Trying empno: ${empnoVariant}`)
        const result = await supabase
          .from("hr_master_dashboard")
          .select("*")
          .eq("EMPNO", empnoVariant)
          .maybeSingle()
        
        console.log(`   Result:`, { 
          hasData: !!result.data, 
          hasError: !!result.error,
          errorCode: result.error?.code,
          errorMessage: result.error?.message,
          EMPNO: result.data?.EMPNO,
          budget_audit: result.data?.budget_audit,
          budget_non_audit: result.data?.budget_non_audit
        })
        
        if (!result.error && result.data) {
          console.log(`✅ Data found with empno: ${empnoVariant}`, {
            budget_audit: result.data.budget_audit,
            budget_non_audit: result.data.budget_non_audit
          })
          
          // 예산 값이 있으면 사용, 없으면 계속 시도
          if (result.data.budget_audit !== null || result.data.budget_non_audit !== null) {
        data = result.data
            console.log(`✅ Budget data found with empno: ${empnoVariant}`)
            break
          } else {
            console.log(`⚠️ Data found but budget is null, trying next variant...`)
            // 예산이 null이어도 데이터는 저장 (fallback용)
            if (!data) {
              data = result.data
            }
          }
        } else {
          console.log(`❌ No data with empno: ${empnoVariant}`)
        }
      }
      
      setBudgetData(data)
      // Budget 관련 주요 값만 보기 좋게 출력
      if (data) {
        console.log('Budget Debug:', {
          EMPNO: data.EMPNO,
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
        console.log('❌ Budget Debug: No data found with any empno variant:', empnoVariants);
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

  // BD 실제 데이터 조회
  useEffect(() => {
    if (!currentEmployeeId) return
    
    const fetchBdActualData = async () => {
      try {
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(currentEmployeeId)

        // 사번 변형 목록 (정규화 + 원본)
        const empnoVariants = [normalizedEmpno]
        if (normalizedEmpno.startsWith('0')) {
          empnoVariants.push(normalizedEmpno.replace(/^0+/, ''))
        } else {
          empnoVariants.push(`0${normalizedEmpno}`)
        }

        // 서버 집계 RPC 호출 (감사/비감사 × 금액/건수)
        const { data, error } = await supabase.rpc('get_bd_aggregate_by_person', {
          p_empno_list: empnoVariants,
        })

        if (error) {
          console.error('❌ get_bd_aggregate_by_person 실패:', error)
          return
        }

        const row = (data || [])[0]
        if (!row) return

        setBdActualData({
          myAuditAmount: Number(row.audit_amount) || 0,
          myNonAuditAmount: Number(row.non_audit_amount) || 0,
          myAuditCount: Number(row.audit_count) || 0,
          myNonAuditCount: Number(row.non_audit_count) || 0,
        })

        console.log('📊 BD 집계 (서버 RPC):', row)
      } catch (error) {
        console.error('❌ BD 실제 데이터 조회 실패:', error)
      }
    }

    fetchBdActualData()
  }, [currentEmployeeId])

  // Team BPR 데이터 조회 (BPR_fact 테이블)
  useEffect(() => {
    if (!currentEmployeeId) return
    
    const fetchTeamBprData = async () => {
      try {
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(currentEmployeeId)

        const empnoVariants = [normalizedEmpno]
        if (normalizedEmpno.startsWith('0')) {
          empnoVariants.push(normalizedEmpno.replace(/^0+/, ''))
        } else {
          empnoVariants.push(`0${normalizedEmpno}`)
        }

        // 사용자 본부(CM_NM) 조회
        const { data: userHrData, error: userHrError } = await supabase
          .from('a_hr_master')
          .select('CM_NM')
          .in('EMPNO', empnoVariants)
          .limit(1)
          .maybeSingle()

        if (userHrError || !userHrData?.CM_NM) {
          console.error('❌ 사용자 본부 정보 조회 실패:', userHrError)
          return
        }

        const userDeptName = userHrData.CM_NM

        // 서버 집계 RPC (BPR_fact 전체 fetch + JS forEach 제거)
        const { data, error } = await supabase.rpc('get_bpr_aggregate_by_dept', {
          p_dept_prefix: userDeptName,
          p_report_date: null, // 자동으로 최신 CDM_REPORT_DATE 사용
        })

        if (error) {
          console.error('❌ get_bpr_aggregate_by_dept 실패:', error)
          return
        }

        const row = (data || [])[0]
        if (!row) return

        setTeamBprData({
          auditRevenue: Number(row.audit_revenue) || 0,
          nonAuditRevenue: Number(row.non_audit_revenue) || 0,
          auditBacklog: Number(row.audit_backlog) || 0,
          nonAuditBacklog: Number(row.non_audit_backlog) || 0,
          auditPipeline: Number(row.audit_pipeline) || 0,
          nonAuditPipeline: Number(row.non_audit_pipeline) || 0,
        })

        console.log(`📊 Team BPR 집계 (서버 RPC, 본부=${userDeptName}):`, row)
      } catch (error) {
        console.error('❌ Team BPR 데이터 조회 실패:', error)
      }
    }

    fetchTeamBprData()
  }, [currentEmployeeId])

  // My BPR 데이터 조회 (BPR_fact 테이블)
  useEffect(() => {
    if (!currentEmployeeId) return
    
    const fetchMyBprData = async () => {
      try {
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(currentEmployeeId)

        const empnoVariants = [normalizedEmpno]
        if (normalizedEmpno.startsWith('0')) {
          empnoVariants.push(normalizedEmpno.replace(/^0+/, ''))
        } else {
          empnoVariants.push(`0${normalizedEmpno}`)
        }

        // 서버 집계 RPC (BPR_fact 전체 fetch + JS forEach 제거)
        const { data, error } = await supabase.rpc('get_bpr_aggregate_by_person', {
          p_empno_list: empnoVariants,
          p_report_date: null,
        })

        if (error) {
          console.error('❌ get_bpr_aggregate_by_person 실패:', error)
          return
        }

        const row = (data || [])[0]
        if (!row) return

        setMyBprData({
          auditRevenue: Number(row.audit_revenue) || 0,
          nonAuditRevenue: Number(row.non_audit_revenue) || 0,
          auditBacklog: Number(row.audit_backlog) || 0,
          nonAuditBacklog: Number(row.non_audit_backlog) || 0,
          auditPipeline: Number(row.audit_pipeline) || 0,
          nonAuditPipeline: Number(row.non_audit_pipeline) || 0,
        })

        console.log('📊 My BPR 집계 (서버 RPC):', row)
      } catch (error) {
        console.error('❌ My BPR 데이터 조회 실패:', error)
      }
    }

    fetchMyBprData()
  }, [currentEmployeeId])

  // Budget 실데이터 변수 선언 (매출 + BACKLOG + 파이프라인 합계)
  // My 개별 구성 요소들 - BPR_fact 테이블에서 조회한 데이터 사용
  const myAuditRevenue = myBprData.auditRevenue; // 매출 (BPR)
  const myAuditBacklog = myBprData.auditBacklog; // BACKLOG (BPR)
  const myNonAuditRevenue = myBprData.nonAuditRevenue; // 매출 (BPR)
  const myNonAuditBacklog = myBprData.nonAuditBacklog; // BACKLOG (BPR)
  const myAuditPipeline = myBprData.auditPipeline; // 감사 파이프라인 (BPR)
  const myNonAuditPipeline = myBprData.nonAuditPipeline; // 비감사 파이프라인 (BPR)
  
  // My 감사/비감사 실제 합계 (매출 + BACKLOG + 파이프라인)
  const myAuditActual = myAuditRevenue + myAuditBacklog + myAuditPipeline; // 각각의 파이프라인 사용
  const myNonAuditActual = myNonAuditRevenue + myNonAuditBacklog + myNonAuditPipeline; // 각각의 파이프라인 사용
  const myAuditBudget = Number(budgetData?.budget_audit ?? 0); // 이미 백만원단위
  const myNonAuditBudget = Number(budgetData?.budget_non_audit ?? 0); // 이미 백만원단위
  const myTotalActual = myAuditActual + myNonAuditActual;
  const myTotalBudget = myAuditBudget + myNonAuditBudget;

  // Team 개별 구성 요소들 - BPR_fact 테이블에서 조회한 데이터 사용
  const teamAuditRevenue = teamBprData.auditRevenue; // 매출 (BPR)
  const teamAuditBacklog = teamBprData.auditBacklog; // BACKLOG (BPR)
  const teamNonAuditRevenue = teamBprData.nonAuditRevenue; // 매출 (BPR)
  const teamNonAuditBacklog = teamBprData.nonAuditBacklog; // BACKLOG (BPR)
  const teamAuditPipeline = teamBprData.auditPipeline; // 감사 파이프라인 (BPR)
  const teamNonAuditPipeline = teamBprData.nonAuditPipeline; // 비감사 파이프라인 (BPR)
  
  // Team 감사/비감사 실제 합계 (매출 + BACKLOG + 파이프라인)
  const teamAuditActual = teamAuditRevenue + teamAuditBacklog + teamAuditPipeline; // 각각의 파이프라인 사용
  const teamNonAuditActual = teamNonAuditRevenue + teamNonAuditBacklog + teamNonAuditPipeline; // 각각의 파이프라인 사용
  const teamAuditBudget = Number(budgetData?.dept_budget_audit ?? 0);
  const teamNonAuditBudget = Number(budgetData?.dept_budget_non_audit ?? 0);
  const teamTotalActual = teamAuditActual + teamNonAuditActual;
  const teamTotalBudget = teamAuditBudget + teamNonAuditBudget;

  // 신규 BD 금액, UI Revenue 계약금액 실제/예산값 변수 선언 (컴포넌트 상단)
  // BD 테이블의 실제 집계 데이터 사용
  const actualNewBdAmount = bdActualData.myAuditAmount; // 백만원 단위
  const budgetNewBdAmount = goalData?.new_audit_amount ?? 0; // 백만원 단위 그대로
  const actualUiRevenueAmount = bdActualData.myNonAuditAmount; // 백만원 단위
  const budgetUiRevenueAmount = goalData?.ui_revenue_amount ?? 0; // 백만원 단위 그대로
  const actualNewBdCount = bdActualData.myAuditCount; // 감사 건수
  const actualUiRevenueCount = bdActualData.myNonAuditCount; // 비감사 건수

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
    isDepartmentView = false,
    isBdData = false,
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
    isDepartmentView?: boolean
    isBdData?: boolean
  }) => {
    const [projectDetails, setProjectDetails] = useState<{
      revenue: Array<{ name: string; amount: number; teamName?: string; personName?: string }>
      backlog: Array<{ name: string; amount: number; teamName?: string; personName?: string }>
      pipeline: Array<{ name: string; amount: number; teamName?: string; personName?: string }>
    }>({
      revenue: [],
      backlog: [],
      pipeline: []
    })
    const [bdDetails, setBdDetails] = useState<Array<{
      projectCode: string
      projectName: string
      client: string
      amount: number
      partnerName: string
      cisMonth: string
      chargeRatio: string
      reportMonth: string
      note: string
      updateMonth: string
    }>>([])
    const [latestUpdateMonth, setLatestUpdateMonth] = useState<string>('')
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)

    // 합계 캐시 (매 렌더마다 .reduce() 재계산 방지)
    const projectDetailsSums = useMemo(() => ({
      revenue: projectDetails.revenue.reduce((sum, p) => sum + p.amount, 0),
      backlog: projectDetails.backlog.reduce((sum, p) => sum + p.amount, 0),
      pipeline: projectDetails.pipeline.reduce((sum, p) => sum + p.amount, 0),
    }), [projectDetails])
    const bdDetailsSum = useMemo(
      () => bdDetails.reduce((sum, p) => sum + p.amount, 0),
      [bdDetails]
    )

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
        console.log(`🔍 fetchProjectDetails (${auditType}): currentEmployeeId = ${currentEmployeeId}, normalizedEmpno = ${normalizedEmpno}, isDepartmentView = ${isDepartmentView}, isBdData = ${isBdData}`)
        
        // BD 데이터 조회인 경우
        if (isBdData && auditType) {
        // 본부 기준 조회일 경우 본부 구성원 목록 가져오기
          let empnoList = [normalizedEmpno] // 기본값: 본인만
          
          if (isDepartmentView) {
            // 1. 현재 사용자의 본부명(CM_NM) 조회
            const { data: userData, error: userError } = await supabase
              .from('a_hr_master')
              .select('CM_NM')
              .eq('EMPNO', normalizedEmpno)
              .maybeSingle()
            
            if (userError) {
              console.error('❌ 사용자 본부 정보 조회 에러:', userError)
            }
            
            const userDeptName = userData?.CM_NM
            console.log(`🏢 사용자 본부: ${userDeptName}`)
            
            // 2. 해당 본부의 모든 사원 EMPNO 조회
            if (userDeptName) {
              const { data: deptMembers, error: deptError } = await supabase
                .from('a_hr_master')
                .select('EMPNO')
                .eq('CM_NM', userDeptName)
              
              if (deptError) {
                console.error('❌ 본부 구성원 조회 에러:', deptError)
              } else if (deptMembers && deptMembers.length > 0) {
                empnoList = deptMembers.map(m => m.EMPNO).filter(Boolean)
                console.log(`👥 본부 구성원 수: ${empnoList.length}명`)
              }
            }
          }

          console.log(`🔍 BD 조회 대상 사번 목록 (${isDepartmentView ? 'Team' : 'My'}):`, empnoList)

          // 1. 최신 Update기준월 조회
          const { data: latestMonthData, error: latestMonthError } = await supabase
            .from('L_BD_Table_Detail')
            .select('Update기준월')
            .not('Update기준월', 'is', null)
            .order('Update기준월', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (latestMonthError) {
            console.error('❌ 최신 Update기준월 조회 에러:', latestMonthError)
          }

          const latestMonth = latestMonthData ? (latestMonthData as any)['Update기준월'] : null
          setLatestUpdateMonth(latestMonth || '')
          console.log('📅 최신 Update기준월:', latestMonth)

          // 2. BD 데이터 조회 - 사번 목록과 Update기준월로 필터링
          const auditFilter = auditType === 'audit' ? '감사' : '비감사'
          
          // 정규화되지 않은 사번도 시도 (원본 사번으로도 조회)
          const allEmpnoVariants: string[] = []
          empnoList.forEach(empno => {
            allEmpnoVariants.push(empno)
            // 이미 정규화된 사번이면 앞자리 0 제거한 버전도 추가
            if (empno.startsWith('0')) {
              allEmpnoVariants.push(empno.replace(/^0+/, ''))
            } else {
              // 정규화 안된 사번이면 0 붙인 버전도 추가
              allEmpnoVariants.push(`0${empno}`)
            }
          })
          
          console.log(`🔍 조회할 사번 변형 목록:`, allEmpnoVariants.slice(0, 10)) // 처음 10개만 출력

          let bdQuery = supabase
            .from('L_BD_Table_Detail')
            .select('*')
            .in('사번', allEmpnoVariants)
            .order('Update기준월', { ascending: false })  // Update기준월 내림차순 정렬

          const { data: bdData, error: bdError } = await bdQuery

          if (bdError) {
            console.error('❌ BD 데이터 조회 에러:', bdError)
          }

          console.log(`📊 BD 데이터 조회 결과 (${auditType}):`)
          console.log(`  - 전체 조회 건수: ${bdData?.length || 0}`)
          console.log(`  - 에러: ${bdError?.message || '없음'}`)
          if (bdData && bdData.length > 0) {
            console.log(`  - 샘플 데이터 (첫 번째):`, bdData[0])
            console.log(`  - Audit/Non-Audit 값들:`, [...new Set(bdData.map(item => item['Audit/Non-Audit']))])
          }

          // 3. BD 데이터 정리 - Audit/Non-Audit 필터링 추가
          const filteredData = (bdData || []).filter(item => {
            const auditTypeValue = item['Audit/Non-Audit']
            console.log(`  필터링: ${item['Project Name']} - Audit/Non-Audit="${auditTypeValue}", 찾는값="${auditFilter}", 일치=${auditTypeValue === auditFilter}`)
            return auditTypeValue === auditFilter
          })

          console.log(`✅ 필터링 후 BD 데이터 (${auditFilter}):`)
          console.log(`  - 필터링 후 건수: ${filteredData.length}`)
          if (filteredData.length > 0) {
            console.log(`  - 샘플 (첫 번째):`, filteredData[0])
          }

          const bdProjects = filteredData.map(item => {
            const rawAmount = item['Amount']
            const parsedAmount = parseFloat(String(rawAmount || 0))
            const amountInMillion = parsedAmount / 1_000 // 천원 단위를 백만원 단위로 변환
            
            console.log(`💰 금액 변환: Project="${item['Project Name']}", Raw Amount="${rawAmount}", Parsed="${parsedAmount}", Million="${amountInMillion}"`)
            
            return {
              projectCode: item['Project Code'] || '',
              projectName: item['Project Name'] || '프로젝트명 없음',
              client: item['Client'] || '고객명 없음',
              amount: amountInMillion, // 백만원 단위
              partnerName: item['파트너명'] || '',
              cisMonth: item['CIS 등록월'] || '',
              chargeRatio: item['수임비율'] || '',
              reportMonth: item['집계연월'] || '',
              note: item['비고'] || '',
              updateMonth: item['Update기준월'] ? String(item['Update기준월']).replace('.0', '') : ''  // Update기준월 추가 (.0 제거)
            }
          }).sort((a, b) => b.amount - a.amount) // 금액 내림차순 정렬

          setBdDetails(bdProjects)
          setLoadingDetails(false)
          return
        }

        // Team Budget 상세보기 (BPR_fact 사용)
        if (isDepartmentView && !isBdData && auditType) {
          // 사번 변형 목록
          const empnoVariants = [normalizedEmpno]
          if (normalizedEmpno.startsWith('0')) {
            empnoVariants.push(normalizedEmpno.replace(/^0+/, ''))
          } else {
            empnoVariants.push(`0${normalizedEmpno}`)
          }
          
          // 1. a_hr_master에서 현재 사용자의 본부(CM_NM) 조회
          const { data: userHrData, error: userHrError } = await supabase
            .from('a_hr_master')
            .select('CM_NM')
            .in('EMPNO', empnoVariants)
            .limit(1)
            .maybeSingle()
          
          if (userHrError || !userHrData) {
            console.error('❌ Team 상세보기: 사용자 본부 조회 에러 (a_hr_master):', userHrError)
            setLoadingDetails(false)
            return
          }
          
          const userDeptName = userHrData.CM_NM
          console.log(`🏢 Team 상세보기 본부 (a_hr_master): ${userDeptName}`)
          
          // 2. 최신 CDM_REPORT_DATE 조회 (원본 테이블)
          const { data: latestDateData, error: dateError } = await supabase
            .from('BPR_fact')
            .select('CDM_REPORT_DATE')
            .not('CDM_REPORT_DATE', 'is', null)
            .order('CDM_REPORT_DATE', { ascending: false })
            .limit(1)
            .single()
          
          const latestDate = latestDateData?.CDM_REPORT_DATE
          
          if (!latestDate) {
            console.warn('⚠️ CDM_REPORT_DATE가 없습니다.')
            setLoadingDetails(false)
            return
          }
          
          // 3. BPR 데이터 조회 (원본 테이블, Pagination)
          let allDetailData: any[] = []
          let detailPage = 0
          const detailPageSize = 1000
          
          while (true) {
            const { data, error } = await supabase
              .from('BPR_fact')
              .select('*')
              .ilike('PRJT_CMOFNM', `${userDeptName}%`)
              .eq('CDM_REPORT_DATE', latestDate)
              .not('CDM_SOURCE', 'is', null)
              .range(detailPage * detailPageSize, (detailPage + 1) * detailPageSize - 1)
            
            if (error || !data || data.length === 0) break
            allDetailData = allDetailData.concat(data)
            if (data.length < detailPageSize) break
            detailPage++
            if (detailPage >= 20) break
          }
          
          // 중복 제거
          const uniqueDetailData = Array.from(
            new Map(allDetailData.map(item => [item.ID || JSON.stringify(item), item])).values()
          )
          
          const bprData = uniqueDetailData
          const bprError = null
          
          if (bprError) {
            console.error('❌ Team 상세보기 BPR 데이터 조회 에러:', bprError)
            setLoadingDetails(false)
            return
          }
          
          console.log(`📊 Team 상세보기 BPR 데이터: ${bprData?.length || 0}건`)
          
          // 4. 감사/비감사 필터링 및 데이터 정리
          const auditFilter = auditType === 'audit' ? '감사' : '비감사'
          
          // Revenue, Backlog, Pipeline 각각 분류 (Team 정보 포함)
          const revenueMap = new Map<string, { amount: number; teamName: string; personName: string }>()
          const backlogMap = new Map<string, { amount: number; teamName: string; personName: string }>()
          const pipelineMap = new Map<string, { amount: number; teamName: string; personName: string }>()
          
          if (bprData) {
            bprData.forEach(item => {
              const auditTypeRaw = String(item['감사 구분'] || '')
              const isAudit = auditTypeRaw.includes('감사') && !auditTypeRaw.includes('비감사')
              
              // 감사/비감사 필터
              const matchesFilter = (auditFilter === '감사' && isAudit) || (auditFilter === '비감사' && !isAudit)
              if (!matchesFilter) return
              
              const clientName = item.CDM_CLIENT_NAME || '고객명 없음'
              const projectName = item.CDM_PROJECT_NAME || '프로젝트명 없음'
              const teamName = item.TEAMNM || '-'
              const personName = item.CDM_PERSON_NAME || '-'
              const key = `${projectName}|${clientName}|${teamName}|${personName}`
              
              const cdmSource = item.CDM_SOURCE
              const cdmStage = item.CDM_STAGE
              const revenueTotal = parseFloat(String(item.CDM_REVENUE_TOTAL || 0)) / 1_000_000 // 백만원
              
              // Revenue: F-link + Realized
              if (cdmSource === 'F-link' && cdmStage === 'Realized') {
                const existing = revenueMap.get(key)
                if (existing) {
                  existing.amount += revenueTotal
                } else {
                  revenueMap.set(key, { amount: revenueTotal, teamName, personName })
                }
              }
              
              // Backlog: F-link + Backlog (분기별 월 데이터 합산)
              if (cdmSource === 'F-link' && cdmStage === 'Backlog') {
                const m1 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M1 || 0))
                const m2 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M2 || 0))
                const m3 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M3 || 0))
                const m4 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M4 || 0))
                const m5 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M5 || 0))
                const m6 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M6 || 0))
                const m7 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M7 || 0))
                const m8 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M8 || 0))
                const m9 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M9 || 0))
                const m10 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M10 || 0))
                const m11 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M11 || 0))
                const m12 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M12 || 0))
                const amount = (m1 + m2 + m3 + m4 + m5 + m6 + m7 + m8 + m9 + m10 + m11 + m12) / 1_000_000
                const existing = backlogMap.get(key)
                if (existing) {
                  existing.amount += amount
                } else {
                  backlogMap.set(key, { amount, teamName, personName })
                }
              }
              
              // Pipeline: Salesforce + Q1~Q4 합계
              if (cdmSource === 'Salesforce') {
                const q1 = parseFloat(String(item.CDM_REVENUE_TOTAL_Q1 || 0))
                const q2 = parseFloat(String(item.CDM_REVENUE_TOTAL_Q2 || 0))
                const q3 = parseFloat(String(item.CDM_REVENUE_TOTAL_Q3 || 0))
                const q4 = parseFloat(String(item.CDM_REVENUE_TOTAL_Q4 || 0))
                const amount = (q1 + q2 + q3 + q4) / 1_000_000 // 백만원
                const existing = pipelineMap.get(key)
                if (existing) {
                  existing.amount += amount
                } else {
                  pipelineMap.set(key, { amount, teamName, personName })
                }
              }
            })
          }
          
          // Map을 배열로 변환 (팀명, 담당자명 포함)
          const revenueProjects = Array.from(revenueMap.entries()).map(([key, data]) => {
            const [projectName, client, teamName, personName] = key.split('|')
            return { 
              name: `${projectName} (${client})`, 
              amount: data.amount,
              teamName: data.teamName,
              personName: data.personName
            }
          }).sort((a, b) => b.amount - a.amount)
          
          const backlogProjects = Array.from(backlogMap.entries()).map(([key, data]) => {
            const [projectName, client, teamName, personName] = key.split('|')
            return { 
              name: `${projectName} (${client})`, 
              amount: data.amount,
              teamName: data.teamName,
              personName: data.personName
            }
          }).sort((a, b) => b.amount - a.amount)
          
          const pipelineProjects = Array.from(pipelineMap.entries()).map(([key, data]) => {
            const [projectName, client, teamName, personName] = key.split('|')
            return { 
              name: `${projectName} (${client})`, 
              amount: data.amount,
              teamName: data.teamName,
              personName: data.personName
            }
          }).sort((a, b) => b.amount - a.amount)
          
          console.log(`✅ Team 상세보기 프로젝트 데이터 (${auditFilter}):`, {
            revenue: revenueProjects.length,
            backlog: backlogProjects.length,
            pipeline: pipelineProjects.length
          })
          
          setProjectDetails({
            revenue: revenueProjects,
            backlog: backlogProjects,
            pipeline: pipelineProjects
          })
          setLoadingDetails(false)
          return
        }
        
        // My Budget 상세보기 (원본 테이블 사용)
        if (!isDepartmentView && auditType) {
          // 사번 변형 목록
          const empnoVariants = [normalizedEmpno]
          if (normalizedEmpno.startsWith('0')) {
            empnoVariants.push(normalizedEmpno.replace(/^0+/, ''))
          } else {
            empnoVariants.push(`0${normalizedEmpno}`)
          }
          
          // 최신 날짜 조회
          const { data: latestDateData } = await supabase
            .from('BPR_fact')
            .select('CDM_REPORT_DATE')
            .not('CDM_REPORT_DATE', 'is', null)
            .order('CDM_REPORT_DATE', { ascending: false })
            .limit(1)
            .single()
          
          const latestDate = latestDateData?.CDM_REPORT_DATE
          
          if (!latestDate) {
            setLoadingDetails(false)
            return
          }
          
          // BPR 데이터 조회 (Pagination)
          let allMyData: any[] = []
          let myPage = 0
          const myPageSize = 1000
          
          while (true) {
            const { data, error } = await supabase
              .from('BPR_fact')
              .select('*')
              .in('CDM_PERSON_ID', empnoVariants)
              .eq('CDM_REPORT_DATE', latestDate)
              .not('CDM_SOURCE', 'is', null)
              .range(myPage * myPageSize, (myPage + 1) * myPageSize - 1)
            
            if (error || !data || data.length === 0) break
            allMyData = allMyData.concat(data)
            if (data.length < myPageSize) break
            myPage++
            if (myPage >= 20) break
          }
          
          // 중복 제거
          const uniqueMyData = Array.from(
            new Map(allMyData.map(item => [item.ID || JSON.stringify(item), item])).values()
          )
          
          const bprData = uniqueMyData
          
          // 감사/비감사 필터링
          const auditFilter = auditType === 'audit' ? '감사' : '비감사'
          
          const revenueMap = new Map<string, number>()
          const backlogMap = new Map<string, number>()
          const pipelineMap = new Map<string, number>()
          
          if (bprData) {
            bprData.forEach(item => {
              const auditTypeRaw = String(item['감사 구분'] || '')
              const isAudit = auditTypeRaw.includes('감사') && !auditTypeRaw.includes('비감사')
              
              const matchesFilter = (auditFilter === '감사' && isAudit) || (auditFilter === '비감사' && !isAudit)
              if (!matchesFilter) return
              
              const clientName = item.CDM_CLIENT_NAME || '고객명 없음'
              const projectName = item.CDM_PROJECT_NAME || '프로젝트명 없음'
              const key = `${projectName}|${clientName}`
              
              const cdmSource = String(item.CDM_SOURCE || '').trim()
              const cdmStage = String(item.CDM_STAGE || '').trim()
              const revenueTotal = parseFloat(String(item.CDM_REVENUE_TOTAL || 0)) / 1_000_000
              
              // Revenue
              if (cdmSource === 'F-link' && cdmStage === 'Realized') {
                revenueMap.set(key, (revenueMap.get(key) || 0) + revenueTotal)
              }
              
              // Backlog (분기별 월 데이터 합산)
              if (cdmSource === 'F-link' && cdmStage === 'Backlog') {
                const m1 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M1 || 0))
                const m2 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M2 || 0))
                const m3 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M3 || 0))
                const m4 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M4 || 0))
                const m5 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M5 || 0))
                const m6 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M6 || 0))
                const m7 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M7 || 0))
                const m8 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M8 || 0))
                const m9 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M9 || 0))
                const m10 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M10 || 0))
                const m11 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M11 || 0))
                const m12 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M12 || 0))
                const amount = (m1 + m2 + m3 + m4 + m5 + m6 + m7 + m8 + m9 + m10 + m11 + m12) / 1_000_000
                backlogMap.set(key, (backlogMap.get(key) || 0) + amount)
              }
              
              // Pipeline
              if (cdmSource === 'Salesforce') {
                const q1 = parseFloat(String(item.CDM_REVENUE_TOTAL_Q1 || 0))
                const q2 = parseFloat(String(item.CDM_REVENUE_TOTAL_Q2 || 0))
                const q3 = parseFloat(String(item.CDM_REVENUE_TOTAL_Q3 || 0))
                const q4 = parseFloat(String(item.CDM_REVENUE_TOTAL_Q4 || 0))
                const amount = (q1 + q2 + q3 + q4) / 1_000_000
                pipelineMap.set(key, (pipelineMap.get(key) || 0) + amount)
              }
            })
          }
          
          const revenueProjects = Array.from(revenueMap.entries()).map(([key, amount]) => {
            const [name, client] = key.split('|')
            return { name: `${name} (${client})`, amount }
          }).sort((a, b) => b.amount - a.amount)
          
          const backlogProjects = Array.from(backlogMap.entries()).map(([key, amount]) => {
            const [name, client] = key.split('|')
            return { name: `${name} (${client})`, amount }
          }).sort((a, b) => b.amount - a.amount)
          
          const pipelineProjects = Array.from(pipelineMap.entries()).map(([key, amount]) => {
            const [name, client] = key.split('|')
            return { name: `${name} (${client})`, amount }
          }).sort((a, b) => b.amount - a.amount)
          
          console.log(`✅ My 상세보기 프로젝트 데이터 (${auditFilter}):`, {
            revenue: revenueProjects.length,
            backlog: backlogProjects.length,
            pipeline: pipelineProjects.length
          })
          
          setProjectDetails({
            revenue: revenueProjects,
            backlog: backlogProjects,
            pipeline: pipelineProjects
          })
          setLoadingDetails(false)
          return
        }
        
        // 본부 기준 조회일 경우 본부 구성원 목록 가져오기 (기존 로직 - 사용 안함, 호환성 유지)
        let empnoList = [normalizedEmpno] // 기본값: 본인만
        
        if (isDepartmentView) {
          // 1. 현재 사용자의 본부명(CM_NM) 조회
          const { data: userData, error: userError } = await supabase
            .from('a_hr_master')
            .select('CM_NM')
            .eq('EMPNO', normalizedEmpno)
            .maybeSingle()
          
          if (userError) {
            console.error('❌ 사용자 본부 정보 조회 에러:', userError)
          }
          
          const userDeptName = userData?.CM_NM
          console.log(`🏢 사용자 본부: ${userDeptName}`)
          
          // 2. 해당 본부의 모든 사원 EMPNO 조회
          if (userDeptName) {
            const { data: deptMembers, error: deptError } = await supabase
              .from('a_hr_master')
              .select('EMPNO')
              .eq('CM_NM', userDeptName)
            
            if (deptError) {
              console.error('❌ 본부 구성원 조회 에러:', deptError)
            } else if (deptMembers && deptMembers.length > 0) {
              empnoList = deptMembers.map(m => m.EMPNO).filter(Boolean)
              console.log(`👥 본부 구성원 수: ${empnoList.length}명`)
            }
          }
        }
        
        // audityn 필터 값 설정
        const auditYnFilter = auditType === 'audit' ? 'Y' : auditType === 'non-audit' ? 'N' : null

        // 3. Revenue 프로젝트 조회 (a_performance_current에서 REVENUE가 있는 프로젝트, 음수 포함) - Fallback 로직
        let revenueQuery = supabase
          .from('a_performance_current')
          .select('PRJTNM, CLIENTNM, REVENUE, AUDITYN')
          .in('EMPLNO', empnoList)
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

        // 4. Backlog 프로젝트 조회 (a_performance_current에서 BACKLOG가 있는 프로젝트, 음수 포함)
        let backlogQuery = supabase
          .from('a_performance_current')
          .select('PRJTNM, CLIENTNM, BACKLOG, AUDITYN')
          .in('EMPLNO', empnoList)
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

        // 5. Pipeline 프로젝트 조회 (a_pipeline_current_re에서 최신 CDM_REPORT_MONTH 사용)
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
              .in('EMPLNO', empnoList)
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
      if (dialogOpen && (auditType || isBdData)) {
        fetchProjectDetails()
      }
    }, [dialogOpen, currentEmployeeId, auditType, isBdData])

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
              {/* 상세보기 버튼 추가 (auditType이 있거나 isBdData일 때만) */}
              {(auditType || isBdData) && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs h-6 px-2">
                      <Eye className="h-3 w-3 mr-1" />
                      상세보기
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[80vh] overflow-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {title} 상세 내역
                        {isBdData && (
                          <span className="text-sm text-gray-500 ml-2">(전체 기간)</span>
                        )}
                        {auditType && !isBdData && ` (${auditType === 'audit' ? '감사' : '비감사'})`}
                      </DialogTitle>
                    </DialogHeader>
                    {loadingDetails ? (
                      <div className="p-8 text-center text-gray-500">로딩 중...</div>
                    ) : isBdData ? (
                      /* BD 데이터 표시 */
                      <div className="space-y-4">
                        {/* 합계 정보 상단 표시 */}
                        <div className="p-4 bg-gray-50 rounded-lg border">
                          <div className="text-center">
                            <div className="text-sm text-gray-600 mb-1">총 계약 금액</div>
                            <div className="text-lg font-bold text-orange-600">
                              {bdDetails.length > 0
                                ? `${Math.ceil(bdDetailsSum).toLocaleString('ko-KR')}백만원`
                                : '0백만원'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {bdDetails.length}개 프로젝트
                            </div>
                          </div>
                        </div>

                        {bdDetails.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-28">Update기준월</TableHead>
                                <TableHead className="w-24">집계연월</TableHead>
                                <TableHead className="w-32">Project Code</TableHead>
                                <TableHead className="max-w-xs">Project Name</TableHead>
                                <TableHead className="w-40">Client</TableHead>
                                <TableHead className="w-36">파트너명</TableHead>
                                <TableHead className="w-28">CIS 등록월</TableHead>
                                <TableHead className="text-right w-40">금액 (백만원)</TableHead>
                                <TableHead className="w-32">비고</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {bdDetails.map((project, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium w-28">{project.updateMonth}</TableCell>
                                  <TableCell className="font-medium w-24">{project.reportMonth}</TableCell>
                                  <TableCell className="w-32">{project.projectCode}</TableCell>
                                  <TableCell className="max-w-xs truncate" title={project.projectName}>{project.projectName}</TableCell>
                                  <TableCell className="w-40">{project.client}</TableCell>
                                  <TableCell className="w-36">{project.partnerName}</TableCell>
                                  <TableCell className="w-28">{project.cisMonth}</TableCell>
                                  <TableCell className={`text-right w-40 ${project.amount < 0 ? 'text-red-600 font-bold' : ''}`}>
                                    {project.amount !== 0 
                                      ? `${Math.ceil(project.amount).toLocaleString('ko-KR')}백만원`
                                      : '-'}
                                  </TableCell>
                                  <TableCell className="w-32">{project.note}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="p-8 text-center text-gray-500">데이터가 없습니다.</div>
                        )}
                      </div>
                    ) : (
                      /* 기존 TBA 데이터 표시 */
                      <div className="space-y-4">
                        {/* 합계 정보 상단 표시 */}
                        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border">
                          <div className="text-center">
                            <div className="text-sm text-gray-600 mb-1">Revenue 합계</div>
                            <div className="text-lg font-bold text-orange-600">
                              {projectDetails.revenue.length > 0
                                ? `${Math.ceil(projectDetailsSums.revenue).toLocaleString('ko-KR')}백만원`
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
                                ? `${Math.ceil(projectDetailsSums.backlog).toLocaleString('ko-KR')}백만원`
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
                                ? `${Math.ceil(projectDetailsSums.pipeline).toLocaleString('ko-KR')}백만원`
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
                                    <TableHead className="max-w-xs">프로젝트명</TableHead>
                                    {isDepartmentView && !isBdData && (
                                      <>
                                        <TableHead className="w-28">팀명</TableHead>
                                        <TableHead className="w-32">담당자</TableHead>
                                      </>
                                    )}
                                    <TableHead className="text-right w-36">금액 (백만원)</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {projectDetails.revenue.map((project, index) => (
                                    <TableRow key={index}>
                                      <TableCell className="font-medium max-w-xs truncate" title={project.name}>{project.name}</TableCell>
                                      {isDepartmentView && !isBdData && (
                                        <>
                                          <TableCell className="w-28">{project.teamName || '-'}</TableCell>
                                          <TableCell className="w-32">{project.personName || '-'}</TableCell>
                                        </>
                                      )}
                                      <TableCell className={`text-right w-36 ${project.amount < 0 ? 'text-red-600 font-bold' : ''}`}>
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
                                    <TableHead className="max-w-xs">프로젝트명</TableHead>
                                    {isDepartmentView && !isBdData && (
                                      <>
                                        <TableHead className="w-28">팀명</TableHead>
                                        <TableHead className="w-32">담당자</TableHead>
                                      </>
                                    )}
                                    <TableHead className="text-right w-36">금액 (백만원)</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {projectDetails.backlog.map((project, index) => (
                                    <TableRow key={index}>
                                      <TableCell className="font-medium max-w-xs truncate" title={project.name}>{project.name}</TableCell>
                                      {isDepartmentView && !isBdData && (
                                        <>
                                          <TableCell className="w-28">{project.teamName || '-'}</TableCell>
                                          <TableCell className="w-32">{project.personName || '-'}</TableCell>
                                        </>
                                      )}
                                      <TableCell className={`text-right w-36 ${project.amount < 0 ? 'text-red-600 font-bold' : ''}`}>
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
                                    <TableHead className="max-w-xs">프로젝트명</TableHead>
                                    {isDepartmentView && !isBdData && (
                                      <>
                                        <TableHead className="w-28">팀명</TableHead>
                                        <TableHead className="w-32">담당자</TableHead>
                                      </>
                                    )}
                                    <TableHead className="text-right w-36">금액 (백만원)</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {projectDetails.pipeline.map((project, index) => (
                                    <TableRow key={index}>
                                      <TableCell className="font-medium max-w-xs truncate" title={project.name}>{project.name}</TableCell>
                                      {isDepartmentView && !isBdData && (
                                        <>
                                          <TableCell className="w-28">{project.teamName || '-'}</TableCell>
                                          <TableCell className="w-32">{project.personName || '-'}</TableCell>
                                        </>
                                      )}
                                      <TableCell className={`text-right w-36 ${project.amount < 0 ? 'text-red-600 font-bold' : ''}`}>
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
    isDepartmentView = false,
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
    isDepartmentView?: boolean
  }) => {
    const [projectDetails, setProjectDetails] = useState<{
      revenue: Array<{ name: string; amount: number; teamName?: string; personName?: string }>
      backlog: Array<{ name: string; amount: number; teamName?: string; personName?: string }>
      pipeline: Array<{ name: string; amount: number; teamName?: string; personName?: string }>
    }>({
      revenue: [],
      backlog: [],
      pipeline: []
    })
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)

    // 합계 캐시 (매 렌더마다 .reduce() 재계산 방지)
    const projectDetailsSums = useMemo(() => ({
      revenue: projectDetails.revenue.reduce((sum, p) => sum + p.amount, 0),
      backlog: projectDetails.backlog.reduce((sum, p) => sum + p.amount, 0),
      pipeline: projectDetails.pipeline.reduce((sum, p) => sum + p.amount, 0),
    }), [projectDetails])

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
        console.log(`🔍 fetchProjectDetails: currentEmployeeId = ${currentEmployeeId}, normalizedEmpno = ${normalizedEmpno}, isDepartmentView = ${isDepartmentView}`)
        
        // BPR_fact 테이블에서 조회 (Team/My Budget Total 상세보기)
        // 최신 날짜 조회
        const { data: latestDateData } = await supabase
          .from('BPR_fact')
          .select('CDM_REPORT_DATE')
          .not('CDM_REPORT_DATE', 'is', null)
          .order('CDM_REPORT_DATE', { ascending: false })
          .limit(1)
          .single()
        
        const latestDate = latestDateData?.CDM_REPORT_DATE
        
        if (!latestDate) {
          setLoadingDetails(false)
          return
        }
        
        // BPR 데이터 조회 (Team이면 PRJT_CMOFNM, My면 CDM_PERSON_ID)
        let allData: any[] = []
        let page = 0
        const pageSize = 1000
        
        if (isDepartmentView) {
          // Team: 본부 기준 조회
          const { data: userData } = await supabase
            .from('a_hr_master')
            .select('CM_NM')
            .eq('EMPNO', normalizedEmpno)
            .maybeSingle()
          
          const userDeptName = userData?.CM_NM
          
          if (!userDeptName) {
            setLoadingDetails(false)
            return
          }
          
          while (true) {
            const { data } = await supabase
              .from('BPR_fact')
              .select('*')
              .ilike('PRJT_CMOFNM', `${userDeptName}%`)
              .eq('CDM_REPORT_DATE', latestDate)
              .not('CDM_SOURCE', 'is', null)
              .range(page * pageSize, (page + 1) * pageSize - 1)
            
            if (!data || data.length === 0) break
            allData = allData.concat(data)
            if (data.length < pageSize) break
            page++
            if (page >= 20) break
          }
        } else {
          // My: 사번 기준 조회
          const empnoVariants = [normalizedEmpno]
          if (normalizedEmpno.startsWith('0')) {
            empnoVariants.push(normalizedEmpno.replace(/^0+/, ''))
          } else {
            empnoVariants.push(`0${normalizedEmpno}`)
          }
          
          while (true) {
            const { data } = await supabase
              .from('BPR_fact')
              .select('*')
              .in('CDM_PERSON_ID', empnoVariants)
              .eq('CDM_REPORT_DATE', latestDate)
              .not('CDM_SOURCE', 'is', null)
              .range(page * pageSize, (page + 1) * pageSize - 1)
        
            if (!data || data.length === 0) break
            allData = allData.concat(data)
            if (data.length < pageSize) break
            page++
            if (page >= 20) break
          }
        }
        
        // 중복 제거
        const uniqueData = Array.from(
          new Map(allData.map(item => [item.ID || JSON.stringify(item), item])).values()
        )

        // Revenue, Backlog, Pipeline 분류 (Team 정보 포함)
        const revenueMap = new Map<string, { amount: number; teamName: string; personName: string }>()
        const backlogMap = new Map<string, { amount: number; teamName: string; personName: string }>()
        const pipelineMap = new Map<string, { amount: number; teamName: string; personName: string }>()
        
        uniqueData.forEach(item => {
          const clientName = item.CDM_CLIENT_NAME || '고객명 없음'
          const projectName = item.CDM_PROJECT_NAME || '프로젝트명 없음'
          const teamName = item.TEAMNM || '-'
          const personName = item.CDM_PERSON_NAME || '-'
          const key = `${projectName}|${clientName}|${teamName}|${personName}`
          
          const cdmSource = String(item.CDM_SOURCE || '').trim()
          const cdmStage = String(item.CDM_STAGE || '').trim()
          
          // Revenue: F-link + Realized (슬래시 제외)
          if (cdmSource === 'F-link' && cdmStage === 'Realized' && !cdmStage.includes('/')) {
            const amount = parseFloat(String(item.CDM_REVENUE_TOTAL || 0)) / 1_000_000
            const existing = revenueMap.get(key)
            if (existing) {
              existing.amount += amount
            } else {
              revenueMap.set(key, { amount, teamName, personName })
            }
          }
          
          // Backlog: F-link + Backlog (슬래시 제외, 분기별 월 데이터 합산)
          if (cdmSource === 'F-link' && cdmStage === 'Backlog' && !cdmStage.includes('/')) {
            const m1 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M1 || 0))
            const m2 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M2 || 0))
            const m3 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M3 || 0))
            const m4 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M4 || 0))
            const m5 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M5 || 0))
            const m6 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M6 || 0))
            const m7 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M7 || 0))
            const m8 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M8 || 0))
            const m9 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M9 || 0))
            const m10 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M10 || 0))
            const m11 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M11 || 0))
            const m12 = parseFloat(String(item.CDM_REVENUE_BACKLOG_M12 || 0))
            const amount = (m1 + m2 + m3 + m4 + m5 + m6 + m7 + m8 + m9 + m10 + m11 + m12) / 1_000_000
            const existing = backlogMap.get(key)
            if (existing) {
              existing.amount += amount
            } else {
              backlogMap.set(key, { amount, teamName, personName })
            }
          }
          
          // Pipeline: Salesforce (전체)
          if (cdmSource === 'Salesforce') {
            const q1 = parseFloat(String(item.CDM_REVENUE_TOTAL_Q1 || 0))
            const q2 = parseFloat(String(item.CDM_REVENUE_TOTAL_Q2 || 0))
            const q3 = parseFloat(String(item.CDM_REVENUE_TOTAL_Q3 || 0))
            const q4 = parseFloat(String(item.CDM_REVENUE_TOTAL_Q4 || 0))
            const amount = (q1 + q2 + q3 + q4) / 1_000_000
            const existing = pipelineMap.get(key)
            if (existing) {
              existing.amount += amount
            } else {
              pipelineMap.set(key, { amount, teamName, personName })
            }
        }
        })

        const revenueProjects = Array.from(revenueMap.entries()).map(([key, data]) => {
          const [projectName, client, teamName, personName] = key.split('|')
          return {
            name: `${projectName} (${client})`, 
            amount: data.amount,
            teamName: data.teamName,
            personName: data.personName
          }
        }).sort((a, b) => b.amount - a.amount)
        
        const backlogProjects = Array.from(backlogMap.entries()).map(([key, data]) => {
          const [projectName, client, teamName, personName] = key.split('|')
          return { 
            name: `${projectName} (${client})`, 
            amount: data.amount,
            teamName: data.teamName,
            personName: data.personName
          }
        }).sort((a, b) => b.amount - a.amount)

        const pipelineProjects = Array.from(pipelineMap.entries()).map(([key, data]) => {
          const [projectName, client, teamName, personName] = key.split('|')
          return {
            name: `${projectName} (${client})`, 
            amount: data.amount,
            teamName: data.teamName,
            personName: data.personName
          }
        }).sort((a, b) => b.amount - a.amount)

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
                              ? `${Math.ceil(projectDetailsSums.revenue).toLocaleString('ko-KR')}백만원`
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
                              ? `${Math.ceil(projectDetailsSums.backlog).toLocaleString('ko-KR')}백만원`
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
                              ? `${Math.ceil(projectDetailsSums.pipeline).toLocaleString('ko-KR')}백만원`
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
                                <TableHead className="max-w-xs">프로젝트명</TableHead>
                                {isDepartmentView && (
                                  <>
                                    <TableHead className="w-28">팀명</TableHead>
                                    <TableHead className="w-32">담당자</TableHead>
                                  </>
                                )}
                                <TableHead className="text-right w-36">금액 (백만원)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {projectDetails.revenue.map((project, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium max-w-xs truncate" title={project.name}>{project.name}</TableCell>
                                  {isDepartmentView && (
                                    <>
                                      <TableCell className="w-28">{project.teamName || '-'}</TableCell>
                                      <TableCell className="w-32">{project.personName || '-'}</TableCell>
                                    </>
                                  )}
                                  <TableCell className={`text-right w-36 ${project.amount < 0 ? 'text-red-600 font-bold' : ''}`}>
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
                                <TableHead className="max-w-xs">프로젝트명</TableHead>
                                {isDepartmentView && (
                                  <>
                                    <TableHead className="w-28">팀명</TableHead>
                                    <TableHead className="w-32">담당자</TableHead>
                                  </>
                                )}
                                <TableHead className="text-right w-36">금액 (백만원)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {projectDetails.backlog.map((project, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium max-w-xs truncate" title={project.name}>{project.name}</TableCell>
                                  {isDepartmentView && (
                                    <>
                                      <TableCell className="w-28">{project.teamName || '-'}</TableCell>
                                      <TableCell className="w-32">{project.personName || '-'}</TableCell>
                                    </>
                                  )}
                                  <TableCell className={`text-right w-36 ${project.amount < 0 ? 'text-red-600 font-bold' : ''}`}>
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
                                <TableHead className="max-w-xs">프로젝트명</TableHead>
                                {isDepartmentView && (
                                  <>
                                    <TableHead className="w-28">팀명</TableHead>
                                    <TableHead className="w-32">담당자</TableHead>
                                  </>
                                )}
                                <TableHead className="text-right w-36">금액 (백만원)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {projectDetails.pipeline.map((project, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium max-w-xs truncate" title={project.name}>{project.name}</TableCell>
                                  {isDepartmentView && (
                                    <>
                                      <TableCell className="w-28">{project.teamName || '-'}</TableCell>
                                      <TableCell className="w-32">{project.personName || '-'}</TableCell>
                                    </>
                                  )}
                                  <TableCell className={`text-right w-36 ${project.amount < 0 ? 'text-red-600 font-bold' : ''}`}>
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
              isDepartmentView={true}
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
                color="#ea580c"
                trend={`-${Math.round((1 - (teamAuditActual / (teamAuditBudget || 1))) * 100)}%`}
                displayType="amount"
                cardClassName="shadow-sm border-l-4 border-l-orange-600"
                breakdown={{
                  revenue: teamAuditRevenue,
                  backlog: teamAuditBacklog,
                  pipeline: teamAuditPipeline
                }}
                currentEmployeeId={currentEmployeeId}
                auditType="audit"
                isDepartmentView={true}
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
                color="#059669"
                trend={`-${Math.round((1 - (teamNonAuditActual / (teamNonAuditBudget || 1))) * 100)}%`}
                displayType="amount"
                cardClassName="shadow-sm border-l-4 border-l-emerald-600"
                breakdown={{
                  revenue: teamNonAuditRevenue,
                  backlog: teamNonAuditBacklog,
                  pipeline: teamNonAuditPipeline
                }}
                currentEmployeeId={currentEmployeeId}
                auditType="non-audit"
                isDepartmentView={true}
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
                    actual={actualNewBdCount}
                    budget={goalData?.new_audit_count ?? 0}
                    title="신규 감사 건수"
                    color="#f97316"
                    trend=""
                    displayType="count"
                    currentEmployeeId={currentEmployeeId}
                    auditType="audit"
                    isBdData={true}
                  />
                  <BarChartComponent
                    actual={actualNewBdAmount}
                    budget={budgetNewBdAmount}
                    title="신규 감사 BD 금액"
                    color="#ea580c"
                    trend=""
                    displayType="amount"
                    currentEmployeeId={currentEmployeeId}
                    auditType="audit"
                    isBdData={true}
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
                    actual={actualUiRevenueCount}
                    budget={goalData?.ui_revenue_count ?? 0}
                    title="신규 비감사서비스 건수"
                    color="#3b82f6"
                    trend=""
                    displayType="count"
                    currentEmployeeId={currentEmployeeId}
                    auditType="non-audit"
                    isBdData={true}
                  />
                  <BarChartComponent
                    actual={actualUiRevenueAmount}
                    budget={budgetUiRevenueAmount}
                    title="신규 비감사서비스 BD 금액"
                    color="#60a5fa"
                    trend=""
                    displayType="amount"
                    currentEmployeeId={currentEmployeeId}
                    auditType="non-audit"
                    isBdData={true}
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
