"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Clock,
  UserCheck,
  Building2,
  Handshake,
  Network,
  TrendingUp,
  FileText,
  BarChart3,
  DollarSign,
  CheckCircle,
  Percent,
  Lightbulb,
  Activity,
  Building,
  Target,
  Briefcase,
  Home,
  Award,
  Calendar,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AuthService } from "@/lib/auth-service"
import { BusinessGoalsService, type BusinessGoal } from "@/lib/business-goals-service"
import { PeopleGoalsService, type PeopleGoal } from "@/lib/people-goals-service"
import { CollaborationService, type CollaborationGoal } from "@/lib/collaboration-service"
import { QualityNonAuditPerformanceService } from "@/lib/quality-non-audit-performance-service"
import { IndustryTLActivitiesService, type IndustryTLActivity } from "@/lib/industry-tl-activities-service"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"

interface DashboardTabsProps {
  empno?: string  // 특정 사용자의 empno (없으면 현재 로그인된 사용자)
  readOnly?: boolean  // 읽기 전용 모드
}

export function DashboardTabs({ empno, readOnly = false }: DashboardTabsProps = {}) {
  const [activeTab, setActiveTab] = useState("business")
  const [businessGoal, setBusinessGoal] = useState<BusinessGoal | null>(null)
  const [goalLoading, setGoalLoading] = useState(false)
  const [goalError, setGoalError] = useState<string | null>(null)
  const [budgetData, setBudgetData] = useState<any>(null)
  const [peopleGoal, setPeopleGoal] = useState<PeopleGoal | null>(null)
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [peopleError, setPeopleError] = useState<string | null>(null)
  
  // 실제 People 데이터 (results-tab.tsx와 동일한 로직)
  const [peopleActualData, setPeopleActualData] = useState<{
    gpsScore: string | null
    peiScore: string | null
    coachingTimeHours: number
    refreshOffUsageRate: number | null
    utilAAverage: number | null
    utilBAverage: number | null
  }>({
    gpsScore: null,
    peiScore: null,
    coachingTimeHours: 0,
    refreshOffUsageRate: null,
    utilAAverage: null,
    utilBAverage: null
  })
  const [collabGoal, setCollabGoal] = useState<CollaborationGoal | null>(null)
  const [collabActuals, setCollabActuals] = useState<{ xlos: { count: number, amount: number }, los: { count: number, amount: number }, axnode: { count: number, amount: number } } | null>(null)
  const [collabLoading, setCollabLoading] = useState(false)
  const [collabError, setCollabError] = useState<string | null>(null)
  const [qualityGoal, setQualityGoal] = useState<{ doae_rate?: number; yra_ratio?: number } | null>(null)
  const [qualityLoading, setQualityLoading] = useState(false)
  const [qualityError, setQualityError] = useState<string | null>(null)
  const [nonAuditGoal, setNonAuditGoal] = useState<{ 신규: string; 기존: string }>({ 신규: "", 기존: "" })
  const [nonAuditGoalText, setNonAuditGoalText] = useState("")
  const [isEditingNonAuditStatus, setIsEditingNonAuditStatus] = useState(false)
  const [nonAuditStatus, setNonAuditStatus] = useState({ 신규: { progress: "" }, 기존: { progress: "" } })
  const [originalNonAuditStatus, setOriginalNonAuditStatus] = useState(nonAuditStatus)
  const [performanceStatus, setPerformanceStatus] = useState<{신규: 'pending'|'in_progress'|'completed', 기존: 'pending'|'in_progress'|'completed'}>({신규: 'pending', 기존: 'pending'})
  const [industryActivities, setIndustryActivities] = useState<IndustryTLActivity[]>([])
  const [industryLoading, setIndustryLoading] = useState(false)
  const [industryError, setIndustryError] = useState<string | null>(null)

  // 현재 사용할 empno 결정
  const targetEmpno = empno || AuthService.getCurrentUser()?.empno

  useEffect(() => {
    const fetchGoal = async () => {
      setGoalLoading(true)
      setGoalError(null)
      try {
        if (!targetEmpno) throw new Error("사용자 정보가 없습니다.")
        
        // Get both goal and actual data
        const [goal, budgetResult] = await Promise.all([
          BusinessGoalsService.getByEmployeeId(targetEmpno),
          supabase.from("hr_master_dashboard").select("*").eq("EMPNO", targetEmpno).single()
        ])
        
        setBusinessGoal(goal)
        if (budgetResult.data) setBudgetData(budgetResult.data)
      } catch (e: any) {
        setGoalError(e.message || String(e))
      } finally {
        setGoalLoading(false)
      }
    }
    fetchGoal()
  }, [targetEmpno])

  useEffect(() => {
    const fetchPeopleGoal = async () => {
      setPeopleLoading(true)
      setPeopleError(null)
      try {
        if (!targetEmpno) throw new Error("사용자 정보가 없습니다.")
        
        // 사번 정규화 (results-tab.tsx와 동일)
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(targetEmpno)
        const fiveDigitEmpno = normalizedEmpno.replace(/^0/, '')
        
        // 병렬로 모든 데이터 가져오기
        const [goalResult, scoreResult, refreshOffResult, coachingResult] = await Promise.all([
          // 1. 목표 데이터
          PeopleGoalsService.getLatestGoals(targetEmpno),
          
          // 2. GPS/PEI 실제 데이터
          supabase
            .from("L_GPS_PEI_Table")
            .select("GPS, PEI")
            .eq("EMPNO", fiveDigitEmpno)
            .maybeSingle(),
            
          // 3. TL의 팀원들 조회 (Refresh Off, Util A/B 계산용)
          supabase
            .from("a_hr_master")
            .select("EMPNO, EMPNM, CM_NM")
            .eq("TL_EMPNO", normalizedEmpno),
            
          // 4. 코칭타임 실제 데이터
          (async () => {
            try {
              const now = new Date()
              const year = now.getFullYear()
              const quarter = Math.ceil((now.getMonth() + 1) / 3)
              const { quarterHours } = await PeopleGoalsService.getCoachingTimeStats(normalizedEmpno, year, quarter)
              return quarterHours
            } catch {
              return 0
            }
          })()
        ])
        
        // 목표 데이터 설정
        setPeopleGoal(goalResult)
        
        // GPS/PEI 실제 데이터 설정
        const { data: scoreData } = scoreResult
        let gpsScore = null, peiScore = null
        if (scoreData) {
          gpsScore = scoreData.GPS
          peiScore = scoreData.PEI
        }
        
        // 코칭타임 실제 데이터
        const coachingTimeHours = coachingResult || 0
        
        // 팀원들 데이터로 Refresh Off, Util A/B 계산
        const { data: teamMembers } = refreshOffResult
        let refreshOffUsageRate = null, utilAAverage = null, utilBAverage = null
        
        if (teamMembers && teamMembers.length > 0) {
          const teamEmpnos = teamMembers.map(member => member.EMPNO)
          
          // Refresh Off 계산
          const { data: leaveData } = await supabase
            .from("a_leave_info")
            .select("EMPNO, SUM_TIME, RMN_TIME")
            .in("EMPNO", teamEmpnos)
            .order("BASE_YMD", { ascending: false })
          
          if (leaveData && leaveData.length > 0) {
            // 각 사번별 최신 데이터만 추출
            const latestLeaveData = teamEmpnos.map(empno => {
              const memberLeave = leaveData.find(leave => leave.EMPNO === empno)
              return memberLeave || { EMPNO: empno, SUM_TIME: 0, RMN_TIME: 0 }
            })
            
            let totalSumTime = 0, totalRmnTime = 0
            latestLeaveData.forEach(leave => {
              totalSumTime += parseFloat(leave.SUM_TIME || 0) || 0
              totalRmnTime += parseFloat(leave.RMN_TIME || 0) || 0
            })
            
            const totalUsedTime = totalSumTime - totalRmnTime
            refreshOffUsageRate = totalSumTime > 0 ? Math.round((totalUsedTime / totalSumTime) * 100 * 100) / 100 : 0
          }
          
          // Util A/B 계산
          const { data: utilData } = await supabase
            .from("v_employee_core")
            .select("EMPNO, UTIL_A, UTIL_B")
            .in("EMPNO", teamEmpnos)
          
          if (utilData && utilData.length > 0) {
            const validUtilA = utilData.filter(item => item.UTIL_A !== null && item.UTIL_A !== "")
            const validUtilB = utilData.filter(item => item.UTIL_B !== null && item.UTIL_B !== "")
            
            const utilASum = validUtilA.reduce((sum, item) => sum + (parseFloat(item.UTIL_A) || 0), 0)
            const utilBSum = validUtilB.reduce((sum, item) => sum + (parseFloat(item.UTIL_B) || 0), 0)
            
            utilAAverage = validUtilA.length > 0 ? Math.round((utilASum / validUtilA.length) * 100) / 100 : 0
            utilBAverage = validUtilB.length > 0 ? Math.round((utilBSum / validUtilB.length) * 100) / 100 : 0
          }
        }
        
        // 실제 데이터 설정
        setPeopleActualData({
          gpsScore,
          peiScore,
          coachingTimeHours,
          refreshOffUsageRate,
          utilAAverage,
          utilBAverage
        })
        
      } catch (e: any) {
        setPeopleError(e.message || String(e))
      } finally {
        setPeopleLoading(false)
      }
    }
    fetchPeopleGoal()
  }, [targetEmpno])

  useEffect(() => {
    const fetchCollab = async () => {
      setCollabLoading(true)
      setCollabError(null)
      try {
        if (!targetEmpno) throw new Error("사용자 정보가 없습니다.")
        const [goal, actuals] = await Promise.all([
          CollaborationService.getByEmployeeId(targetEmpno),
          CollaborationService.getActualsByEmployeeId(targetEmpno)
        ])
        setCollabGoal(goal)
        setCollabActuals(actuals)
      } catch (e: any) {
        setCollabError(e.message || String(e))
      } finally {
        setCollabLoading(false)
      }
    }
    fetchCollab()
  }, [targetEmpno])

  useEffect(() => {
    const fetchQualityGoal = async () => {
      setQualityLoading(true)
      setQualityError(null)
      try {
        if (!targetEmpno) throw new Error("사용자 정보가 없습니다.")
        
        // 새로운 quality_non_audit_performance 테이블에서 데이터 가져오기
        const performances = await QualityNonAuditPerformanceService.getByEmployeeId(targetEmpno)
        
        if (performances.length > 0) {
          // 첫 번째 레코드에서 감사 메트릭 가져오기
          const firstRecord = performances[0]
          setQualityGoal({
            doae_rate: firstRecord.doae_rate || 0,
            yra_ratio: firstRecord.yra_ratio || 0,
          })
          
          // 비감사 목표 조합
          const 신규Performance = performances.find(p => p.type === '신규')
          const 기존Performance = performances.find(p => p.type === '기존')
          const nonePerformance = performances.find(p => p.type === 'none')
          
          // 목표 텍스트 설정
          if (신규Performance || 기존Performance) {
            const combinedGoal = QualityNonAuditPerformanceService.combineToOriginalFormat(
              신규Performance?.goal_text || '',
              기존Performance?.goal_text || ''
            )
            setNonAuditGoalText(combinedGoal)
            setNonAuditGoal(parseNonAuditGoal(combinedGoal))
          } else if (nonePerformance?.goal_text) {
            setNonAuditGoalText(nonePerformance.goal_text)
            setNonAuditGoal(parseNonAuditGoal(nonePerformance.goal_text))
          }
          
          // 상태 설정
          const validStatus = ['pending', 'in_progress', 'completed'];
          setPerformanceStatus({
            신규: validStatus.includes(신규Performance?.status || '') ? 신규Performance?.status as any : 'pending',
            기존: validStatus.includes(기존Performance?.status || '') ? 기존Performance?.status as any : 'pending',
          })
          
          // 진행상황 설정
          setNonAuditStatus({
            신규: { progress: 신규Performance?.progress_text || '' },
            기존: { progress: 기존Performance?.progress_text || '' },
          })
        }
      } catch (e: any) {
        setQualityError(e.message || String(e))
      } finally {
        setQualityLoading(false)
      }
    }
    fetchQualityGoal()
  }, [targetEmpno])

  useEffect(() => {
    const fetchIndustryActivities = async () => {
      setIndustryLoading(true)
      setIndustryError(null)
      try {
        if (!targetEmpno) throw new Error("사용자 정보가 없습니다.")
        // 현재 사용자의 활동만 가져오기
        const activities = await IndustryTLActivitiesService.getByEmployeeId(targetEmpno)
        setIndustryActivities(activities)
      } catch (e: any) {
        setIndustryError(e.message || String(e))
      } finally {
        setIndustryLoading(false)
      }
    }
    fetchIndustryActivities()
  }, [targetEmpno])

  function formatNumber(n: number) {
    return n?.toLocaleString() ?? "0"
  }

  function parseNonAuditGoal(text: string) {
    if (!text) return { 신규: "", 기존: "" };
    const 신규Idx = text.indexOf("신규 서비스 개발");
    const 기존Idx = text.indexOf("기존 서비스 확장");
    let 신규 = "";
    let 기존 = "";
    if (신규Idx !== -1 && 기존Idx !== -1) {
      신규 = text.substring(신규Idx + 9, 기존Idx).trim();
      기존 = text.substring(기존Idx + 9).trim();
    } else if (신규Idx !== -1) {
      신규 = text.substring(신규Idx + 9).trim();
    } else if (기존Idx !== -1) {
      기존 = text.substring(기존Idx + 9).trim();
    }
    return { 신규, 기존 };
  }

  const handleEditNonAuditStatus = () => {
    if (readOnly) return
    setOriginalNonAuditStatus(nonAuditStatus)
    setIsEditingNonAuditStatus(true)
  }
  const handleCancelNonAuditStatus = () => {
    setNonAuditStatus(originalNonAuditStatus)
    setIsEditingNonAuditStatus(false)
  }
  const handleSaveNonAuditStatus = async () => {
    if (!targetEmpno || !qualityGoal || readOnly) return
    try {
      // 기존 데이터 불러오기
      const existingPerformances = await QualityNonAuditPerformanceService.getByEmployeeId(targetEmpno)
      
      // 업데이트할 데이터 준비
      const performancesToUpdate = []
      
      // 신규 타입 업데이트
      const 신규Performance = existingPerformances.find(p => p.type === '신규')
      if (신규Performance) {
        performancesToUpdate.push({
          ...신규Performance,
          progress_text: nonAuditStatus.신규.progress,
          status: performanceStatus.신규
        })
      }
      
      // 기존 타입 업데이트
      const 기존Performance = existingPerformances.find(p => p.type === '기존')
      if (기존Performance) {
        performancesToUpdate.push({
          ...기존Performance,
          progress_text: nonAuditStatus.기존.progress,
          status: performanceStatus.기존
        })
      }
      
      // none 타입도 확인하여 업데이트
      const nonePerformance = existingPerformances.find(p => p.type === 'none')
      if (nonePerformance) {
        performancesToUpdate.push({
          ...nonePerformance,
          progress_text: nonAuditStatus.신규.progress || nonAuditStatus.기존.progress,
          status: performanceStatus.신규 || performanceStatus.기존
        })
      }
      
      if (performancesToUpdate.length > 0) {
        await QualityNonAuditPerformanceService.upsertMultiple(performancesToUpdate as any)
      }
      
      setIsEditingNonAuditStatus(false)
    } catch (error) {
      console.error('Error saving non-audit status:', error)
    }
  }

  return (
    <Tabs defaultValue="business" className="w-full" onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="business" className="text-xs sm:text-sm">
          Business
        </TabsTrigger>
        <TabsTrigger value="people" className="text-xs sm:text-sm">
          People
        </TabsTrigger>
        <TabsTrigger value="collaboration" className="text-xs sm:text-sm">
          Collaboration
        </TabsTrigger>
        <TabsTrigger value="quality" className="text-xs sm:text-sm">
          Quality
        </TabsTrigger>
        <TabsTrigger value="industry" className="text-xs sm:text-sm">
          Industry & TL
        </TabsTrigger>
      </TabsList>

      {/* Business Tab Content - Business 페이지 데이터 요약 */}
      <TabsContent value="business" className="mt-4">
        {goalLoading ? (
          <div className="p-8 text-center text-gray-500">목표 데이터를 불러오는 중...</div>
        ) : goalError ? (
          <div className="p-8 text-center text-red-500">{goalError}</div>
        ) : !businessGoal ? (
          <div className="p-8 text-center text-gray-500">입력된 목표 데이터가 없습니다.</div>
        ) : (
            <div className="space-y-8">
              {/* TBA 기준 요약 테이블 */}
              <div>
                <div className="flex items-center mb-4">
                  <FileText className="mr-2 h-5 w-5 text-orange-600" />
                  <span className="text-lg font-bold">TBA 기준 요약</span>
                </div>
                <Card>
                  <CardContent className="p-6">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted">
                            <TableHead className="w-[100px]">구분</TableHead>
                            <TableHead className="text-center border-r" colSpan={3}>My Budget</TableHead>
                            <TableHead className="text-center" colSpan={3}>Team Budget</TableHead>
                          </TableRow>
                          <TableRow className="bg-muted/50">
                            <TableHead></TableHead>
                            <TableHead className="text-center text-xs">실적</TableHead>
                            <TableHead className="text-center text-xs">예산</TableHead>
                            <TableHead className="text-center text-xs border-r">달성률</TableHead>
                            <TableHead className="text-center text-xs">실적</TableHead>
                            <TableHead className="text-center text-xs">예산</TableHead>
                            <TableHead className="text-center text-xs">달성률</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-semibold text-gray-800">감사</TableCell>
                            <TableCell className="text-center font-medium">
                              {((budgetData?.current_audit_revenue ?? 0) / 1_000_000).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {(budgetData?.budget_audit ?? 0).toLocaleString('ko-KR')}M
                            </TableCell>
                            <TableCell className="text-center border-r">
                              <Badge className={
                                (((budgetData?.current_audit_revenue ?? 0) / 1_000_000) / (budgetData?.budget_audit ?? 1) * 100) >= 100 
                                ? "bg-green-500" 
                                : (((budgetData?.current_audit_revenue ?? 0) / 1_000_000) / (budgetData?.budget_audit ?? 1) * 100) >= 80 
                                ? "bg-orange-500" 
                                : "bg-red-500"
                              }>
                                {Math.round(((budgetData?.current_audit_revenue ?? 0) / 1_000_000) / (budgetData?.budget_audit ?? 1) * 100)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {((budgetData?.dept_revenue_audit ?? 0) / 1_000_000).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {(budgetData?.dept_budget_audit ?? 0).toLocaleString('ko-KR')}M
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={
                                (((budgetData?.dept_revenue_audit ?? 0) / 1_000_000) / (budgetData?.dept_budget_audit ?? 1) * 100) >= 100 
                                ? "bg-green-500" 
                                : (((budgetData?.dept_revenue_audit ?? 0) / 1_000_000) / (budgetData?.dept_budget_audit ?? 1) * 100) >= 80 
                                ? "bg-orange-500" 
                                : "bg-red-500"
                              }>
                                {Math.round(((budgetData?.dept_revenue_audit ?? 0) / 1_000_000) / (budgetData?.dept_budget_audit ?? 1) * 100)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-semibold text-gray-800">비감사</TableCell>
                            <TableCell className="text-center font-medium">
                              {((budgetData?.current_non_audit_revenue ?? 0) / 1_000_000).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {(budgetData?.budget_non_audit ?? 0).toLocaleString('ko-KR')}M
                            </TableCell>
                            <TableCell className="text-center border-r">
                              <Badge className={
                                (((budgetData?.current_non_audit_revenue ?? 0) / 1_000_000) / (budgetData?.budget_non_audit ?? 1) * 100) >= 100 
                                ? "bg-green-500" 
                                : (((budgetData?.current_non_audit_revenue ?? 0) / 1_000_000) / (budgetData?.budget_non_audit ?? 1) * 100) >= 80 
                                ? "bg-orange-500" 
                                : "bg-red-500"
                              }>
                                {Math.round(((budgetData?.current_non_audit_revenue ?? 0) / 1_000_000) / (budgetData?.budget_non_audit ?? 1) * 100)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {((budgetData?.dept_revenue_non_audit ?? 0) / 1_000_000).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {(budgetData?.dept_budget_non_audit ?? 0).toLocaleString('ko-KR')}M
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={
                                (((budgetData?.dept_revenue_non_audit ?? 0) / 1_000_000) / (budgetData?.dept_budget_non_audit ?? 1) * 100) >= 100 
                                ? "bg-green-500" 
                                : (((budgetData?.dept_revenue_non_audit ?? 0) / 1_000_000) / (budgetData?.dept_budget_non_audit ?? 1) * 100) >= 80 
                                ? "bg-orange-500" 
                                : "bg-red-500"
                              }>
                                {Math.round(((budgetData?.dept_revenue_non_audit ?? 0) / 1_000_000) / (budgetData?.dept_budget_non_audit ?? 1) * 100)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow className="border-t-2 bg-muted/20">
                            <TableCell className="font-bold text-gray-900">총합</TableCell>
                            <TableCell className="text-center font-bold">
                              {(((budgetData?.current_audit_revenue ?? 0) + (budgetData?.current_non_audit_revenue ?? 0)) / 1_000_000).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {((budgetData?.budget_audit ?? 0) + (budgetData?.budget_non_audit ?? 0)).toLocaleString('ko-KR')}M
                            </TableCell>
                            <TableCell className="text-center border-r">
                              <Badge className={
                                ((((budgetData?.current_audit_revenue ?? 0) + (budgetData?.current_non_audit_revenue ?? 0)) / 1_000_000) / ((budgetData?.budget_audit ?? 0) + (budgetData?.budget_non_audit ?? 0)) * 100) >= 100 
                                ? "bg-green-500" 
                                : ((((budgetData?.current_audit_revenue ?? 0) + (budgetData?.current_non_audit_revenue ?? 0)) / 1_000_000) / ((budgetData?.budget_audit ?? 0) + (budgetData?.budget_non_audit ?? 0)) * 100) >= 80 
                                ? "bg-orange-500" 
                                : "bg-red-500"
                              }>
                                {Math.round(((((budgetData?.current_audit_revenue ?? 0) + (budgetData?.current_non_audit_revenue ?? 0)) / 1_000_000) / ((budgetData?.budget_audit ?? 0) + (budgetData?.budget_non_audit ?? 0)) * 100))}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {(((budgetData?.dept_revenue_audit ?? 0) + (budgetData?.dept_revenue_non_audit ?? 0)) / 1_000_000).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {((budgetData?.dept_budget_audit ?? 0) + (budgetData?.dept_budget_non_audit ?? 0)).toLocaleString('ko-KR')}M
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={
                                ((((budgetData?.dept_revenue_audit ?? 0) + (budgetData?.dept_revenue_non_audit ?? 0)) / 1_000_000) / ((budgetData?.dept_budget_audit ?? 0) + (budgetData?.dept_budget_non_audit ?? 0)) * 100) >= 100 
                                ? "bg-green-500" 
                                : ((((budgetData?.dept_revenue_audit ?? 0) + (budgetData?.dept_revenue_non_audit ?? 0)) / 1_000_000) / ((budgetData?.dept_budget_audit ?? 0) + (budgetData?.dept_budget_non_audit ?? 0)) * 100) >= 80 
                                ? "bg-orange-500" 
                                : "bg-red-500"
                              }>
                                {Math.round(((((budgetData?.dept_revenue_audit ?? 0) + (budgetData?.dept_revenue_non_audit ?? 0)) / 1_000_000) / ((budgetData?.dept_budget_audit ?? 0) + (budgetData?.dept_budget_non_audit ?? 0)) * 100))}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
                    </div>

              {/* 계약금액 기준 요약 테이블 */}
              <div>
                <div className="flex items-center mb-4">
                  <BarChart3 className="mr-2 h-5 w-5 text-blue-600" />
                  <span className="text-lg font-bold">계약금액 기준 요약</span>
                </div>
                <Card>
                  <CardContent className="p-6">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted">
                            <TableHead className="w-[200px]">구분</TableHead>
                            <TableHead className="text-center">실적</TableHead>
                            <TableHead className="text-center">목표</TableHead>
                            <TableHead className="text-center">달성률</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-semibold text-gray-800">신규 감사 건수</TableCell>
                            <TableCell className="text-center font-medium">
                              {budgetData?.audit_pjt_count ?? 0}건
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {businessGoal.new_audit_count ?? 0}건
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={
                                (businessGoal.new_audit_count ? Math.round((budgetData?.audit_pjt_count ?? 0) / businessGoal.new_audit_count * 100) : 0) >= 100 
                                ? "bg-green-500" 
                                : (businessGoal.new_audit_count ? Math.round((budgetData?.audit_pjt_count ?? 0) / businessGoal.new_audit_count * 100) : 0) >= 80 
                                ? "bg-orange-500" 
                                : "bg-red-500"
                              }>
                                {businessGoal.new_audit_count ? Math.round((budgetData?.audit_pjt_count ?? 0) / businessGoal.new_audit_count * 100) : 0}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-semibold text-gray-800">신규 감사 BD 금액</TableCell>
                            <TableCell className="text-center font-medium">
                              {((budgetData?.audit_pjt_amount ?? 0) / 1_000_000).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {businessGoal.new_audit_amount?.toLocaleString('ko-KR')}M
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={
                                (businessGoal.new_audit_amount ? Math.round(((budgetData?.audit_pjt_amount ?? 0) / 1_000_000) / businessGoal.new_audit_amount * 100) : 0) >= 100 
                                ? "bg-green-500" 
                                : (businessGoal.new_audit_amount ? Math.round(((budgetData?.audit_pjt_amount ?? 0) / 1_000_000) / businessGoal.new_audit_amount * 100) : 0) >= 80 
                                ? "bg-orange-500" 
                                : "bg-red-500"
                              }>
                                {businessGoal.new_audit_amount ? Math.round(((budgetData?.audit_pjt_amount ?? 0) / 1_000_000) / businessGoal.new_audit_amount * 100) : 0}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-semibold text-gray-800">신규 비감사서비스 건수</TableCell>
                            <TableCell className="text-center font-medium">
                              {budgetData?.non_audit_pjt_count ?? 0}건
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {businessGoal.ui_revenue_count ?? 0}건
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={
                                (businessGoal.ui_revenue_count ? Math.round((budgetData?.non_audit_pjt_count ?? 0) / businessGoal.ui_revenue_count * 100) : 0) >= 100 
                                ? "bg-green-500" 
                                : (businessGoal.ui_revenue_count ? Math.round((budgetData?.non_audit_pjt_count ?? 0) / businessGoal.ui_revenue_count * 100) : 0) >= 80 
                                ? "bg-orange-500" 
                                : "bg-red-500"
                              }>
                                {businessGoal.ui_revenue_count ? Math.round((budgetData?.non_audit_pjt_count ?? 0) / businessGoal.ui_revenue_count * 100) : 0}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-semibold text-gray-800">신규 비감사서비스 BD 금액</TableCell>
                            <TableCell className="text-center font-medium">
                              {((budgetData?.non_audit_pjt_amount ?? 0) / 1_000_000).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {businessGoal.ui_revenue_amount?.toLocaleString('ko-KR')}M
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={
                                (businessGoal.ui_revenue_amount ? Math.round(((budgetData?.non_audit_pjt_amount ?? 0) / 1_000_000) / businessGoal.ui_revenue_amount * 100) : 0) >= 100 
                                ? "bg-green-500" 
                                : (businessGoal.ui_revenue_amount ? Math.round(((budgetData?.non_audit_pjt_amount ?? 0) / 1_000_000) / businessGoal.ui_revenue_amount * 100) : 0) >= 80 
                                ? "bg-orange-500" 
                                : "bg-red-500"
                              }>
                                {businessGoal.ui_revenue_amount ? Math.round(((budgetData?.non_audit_pjt_amount ?? 0) / 1_000_000) / businessGoal.ui_revenue_amount * 100) : 0}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
            </div>
          </div>
        )}
      </TabsContent>

      {/* People Tab Content - Based on People Monitoring */}
      <TabsContent value="people" className="mt-4">
        {peopleLoading ? (
          <div className="p-8 text-center text-gray-500">People 데이터를 불러오는 중...</div>
        ) : peopleError ? (
          <div className="p-8 text-center text-red-500">{peopleError}</div>
        ) : !peopleGoal ? (
          <div className="p-8 text-center text-gray-500">입력된 People 데이터가 없습니다.</div>
        ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {/* Util A Card */}
             <Card>
               <CardHeader className="pb-2">
                 <CardTitle className="text-base font-semibold">Util A</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="flex justify-between items-end mb-1">
                     <div className="text-2xl font-bold">
                       {peopleActualData.utilAAverage !== null ? `${peopleActualData.utilAAverage}%` : '-%'}
                     </div>
                     <div className="text-xs text-muted-foreground text-right">팀 평균</div>
                 </div>
                 <div className="space-y-2">
                   <div className="flex justify-between text-xs">
                     <span>평균: {peopleActualData.utilAAverage !== null ? `${peopleActualData.utilAAverage}%` : '-%'}</span>
                     <span>기준: 100%</span>
                   </div>
                   <Progress value={peopleActualData.utilAAverage !== null ? Math.min(peopleActualData.utilAAverage, 100) : 0} className="h-1.5" />
                 </div>
               </CardContent>
             </Card>
             {/* Util B Card */}
             <Card>
               <CardHeader className="pb-2">
                 <CardTitle className="text-base font-semibold">Util B</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="flex justify-between items-end mb-1">
                     <div className="text-2xl font-bold">
                       {peopleActualData.utilBAverage !== null ? `${peopleActualData.utilBAverage}%` : '-%'}
                     </div>
                     <div className="text-xs text-muted-foreground text-right">팀 평균</div>
                 </div>
                 <div className="space-y-2">
                   <div className="flex justify-between text-xs">
                     <span>평균: {peopleActualData.utilBAverage !== null ? `${peopleActualData.utilBAverage}%` : '-%'}</span>
                     <span>기준: 100%</span>
                   </div>
                   <Progress value={peopleActualData.utilBAverage !== null ? Math.min(peopleActualData.utilBAverage, 100) : 0} className="h-1.5" />
                 </div>
               </CardContent>
             </Card>
            {/* GPS Score Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">GPS Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end mb-1">
                     <div className="text-2xl font-bold">
                       {peopleActualData.gpsScore && peopleActualData.gpsScore !== '-' ? `${Math.round(parseFloat(peopleActualData.gpsScore) * 100)}%` : '-%'}
                </div>
                     <div className="text-xs text-muted-foreground text-right">FY25 기준</div>
                 </div>
                 <div className="space-y-2">
                   <div className="flex justify-between text-xs">
                     <span>실제: {peopleActualData.gpsScore && peopleActualData.gpsScore !== '-' ? `${Math.round(parseFloat(peopleActualData.gpsScore) * 100)}%` : '-'}</span>
                     <span>목표: {peopleGoal?.gps_score || '-'}%</span>
                   </div>
                   <Progress value={
                     peopleActualData.gpsScore && peopleActualData.gpsScore !== '-' && peopleGoal?.gps_score 
                     ? Math.min(Math.round((parseFloat(peopleActualData.gpsScore) * 100) / peopleGoal.gps_score * 100), 100) 
                     : 0
                   } className="h-1.5" />
                 </div>
              </CardContent>
            </Card>
            {/* PEI Score Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">PEI Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end mb-1">
                     <div className="text-2xl font-bold">
                       {peopleActualData.peiScore && peopleActualData.peiScore !== '-' ? `${Math.round(parseFloat(peopleActualData.peiScore) * 100)}%` : '-%'}
                </div>
                     <div className="text-xs text-muted-foreground text-right">FY25 기준</div>
                 </div>
                 <div className="space-y-2">
                   <div className="flex justify-between text-xs">
                     <span>실제: {peopleActualData.peiScore && peopleActualData.peiScore !== '-' ? `${Math.round(parseFloat(peopleActualData.peiScore) * 100)}%` : '-'}</span>
                     <span>목표: {peopleGoal?.pei_score || '-'}%</span>
                   </div>
                   <Progress value={
                     peopleActualData.peiScore && peopleActualData.peiScore !== '-' && peopleGoal?.pei_score 
                     ? Math.min(Math.round((parseFloat(peopleActualData.peiScore) * 100) / peopleGoal.pei_score * 100), 100) 
                     : 0
                   } className="h-1.5" />
                 </div>
              </CardContent>
            </Card>
            {/* Staff Coaching Time Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Staff Coaching Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end mb-1">
                     <div className="text-2xl font-bold">{peopleActualData.coachingTimeHours > 0 ? `${peopleActualData.coachingTimeHours} 시간` : '- 시간'}</div>
                     <div className="text-xs text-muted-foreground text-right">목표: {peopleGoal?.coaching_time || 40} 시간</div>
                </div>
                 <div className="space-y-2">
                   <div className="flex justify-between text-xs">
                     <span>실제: {peopleActualData.coachingTimeHours > 0 ? `${peopleActualData.coachingTimeHours} 시간` : '- 시간'}</span>
                     <span>목표: {peopleGoal?.coaching_time || 40} 시간</span>
                   </div>
                   <Progress value={
                     peopleActualData.coachingTimeHours > 0 && peopleGoal?.coaching_time 
                     ? Math.min(Math.round((peopleActualData.coachingTimeHours / peopleGoal.coaching_time) * 100), 100) 
                     : 0
                   } className="h-1.5" />
                 </div>
              </CardContent>
            </Card>
            {/* Refresh Off Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Refresh Off 사용률(%)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end mb-1">
                     <div className="text-2xl font-bold">{peopleActualData.refreshOffUsageRate !== null ? `${peopleActualData.refreshOffUsageRate}%` : '-%'}</div>
                     <div className="text-xs text-muted-foreground text-right">목표: {peopleGoal?.refresh_off_usage_rate || 100}%</div>
                </div>
                 <div className="space-y-2">
                   <div className="flex justify-between text-xs">
                     <span>실제: {peopleActualData.refreshOffUsageRate !== null ? `${peopleActualData.refreshOffUsageRate}%` : '-%'}</span>
                     <span>목표: {peopleGoal?.refresh_off_usage_rate || 100}%</span>
                   </div>
                   <Progress value={
                     peopleActualData.refreshOffUsageRate !== null && peopleGoal?.refresh_off_usage_rate 
                     ? Math.min(Math.round((peopleActualData.refreshOffUsageRate / peopleGoal.refresh_off_usage_rate) * 100), 100) 
                     : peopleActualData.refreshOffUsageRate !== null ? peopleActualData.refreshOffUsageRate : 0
                   } className="h-1.5" />
                 </div>
              </CardContent>
            </Card>
          </div>
        </div>
        )}
      </TabsContent>

      {/* Collaboration Tab Content - Based on Collaboration Monitoring */}
      <TabsContent value="collaboration" className="mt-4">
        {collabLoading ? (
          <div className="p-8 text-center text-gray-500">Collaboration 데이터를 불러오는 중...</div>
        ) : collabError ? (
          <div className="p-8 text-center text-red-500">{collabError}</div>
        ) : !collabGoal || !collabActuals ? (
          <div className="p-8 text-center text-gray-500">입력된 Collaboration 데이터가 없습니다.</div>
        ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* X-Los 협업 카드 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Handshake className="mr-2 h-4 w-4 text-orange-600" />
                  X-Los 협업
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-sm text-muted-foreground">건수</span>
                      <span className="text-xs text-muted-foreground text-right">목표: {formatNumber(collabGoal.x_los_target_count)}건</span>
                    </div>
                    <div className="text-2xl font-bold">{formatNumber(collabActuals.xlos.count)}건</div>
                    <Progress value={(collabActuals.xlos.count / collabGoal.x_los_target_count) * 100} className="h-2 mt-2" />
                    <div className="mt-1 text-xs text-right text-gray-500">달성률: {Math.round((collabActuals.xlos.count / collabGoal.x_los_target_count) * 100)}%</div>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-sm text-muted-foreground">금액</span>
                      <span className="text-xs text-muted-foreground text-right">목표: {formatNumber(collabGoal.x_los_target_amount)}M</span>
                    </div>
                    <div className="text-2xl font-bold">{formatNumber(Math.floor(collabActuals.xlos.amount / 1_000_000))}M</div>
                    <Progress value={(Math.floor(collabActuals.xlos.amount / 1_000_000) / collabGoal.x_los_target_amount) * 100} className="h-2 mt-2" />
                    <div className="mt-1 text-xs text-right text-gray-500">달성률: {Math.round((Math.floor(collabActuals.xlos.amount / 1_000_000) / collabGoal.x_los_target_amount) * 100)}%</div>
                </div>
              </CardContent>
            </Card>
            {/* Los내 협업 카드 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Users className="mr-2 h-4 w-4 text-orange-600" />
                  Los내 협업
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-sm text-muted-foreground">건수</span>
                      <span className="text-xs text-muted-foreground text-right">목표: {formatNumber(collabGoal.losllk_target_count)}건</span>
                    </div>
                    <div className="text-2xl font-bold">{formatNumber(collabActuals.los.count)}건</div>
                    <Progress value={(collabActuals.los.count / collabGoal.losllk_target_count) * 100} className="h-2 mt-2" />
                    <div className="mt-1 text-xs text-right text-gray-500">달성률: {Math.round((collabActuals.los.count / collabGoal.losllk_target_count) * 100)}%</div>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-sm text-muted-foreground">금액</span>
                      <span className="text-xs text-muted-foreground text-right">목표: {formatNumber(collabGoal.losllk_target_amount)}M</span>
                    </div>
                    <div className="text-2xl font-bold">{formatNumber(Math.floor(collabActuals.los.amount / 1_000_000))}M</div>
                    <Progress value={(Math.floor(collabActuals.los.amount / 1_000_000) / collabGoal.losllk_target_amount) * 100} className="h-2 mt-2" />
                    <div className="mt-1 text-xs text-right text-gray-500">달성률: {Math.round((Math.floor(collabActuals.los.amount / 1_000_000) / collabGoal.losllk_target_amount) * 100)}%</div>
                </div>
              </CardContent>
            </Card>
            {/* AX Node 협업 카드 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Network className="mr-2 h-4 w-4 text-orange-600" />
                  AX Node 협업
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-sm text-muted-foreground">건수</span>
                      <span className="text-xs text-muted-foreground text-right">목표: {formatNumber(collabGoal.ax_node_target_count)}건</span>
                    </div>
                    <div className="text-2xl font-bold">{formatNumber(collabActuals.axnode.count)}건</div>
                    <Progress value={(collabActuals.axnode.count / collabGoal.ax_node_target_count) * 100} className="h-2 mt-2" />
                    <div className="mt-1 text-xs text-right text-gray-500">달성률: {Math.round((collabActuals.axnode.count / collabGoal.ax_node_target_count) * 100)}%</div>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-sm text-muted-foreground">금액</span>
                      <span className="text-xs text-muted-foreground text-right">목표: {formatNumber(collabGoal.ax_node_target_amount)}M</span>
                    </div>
                    <div className="text-2xl font-bold">{formatNumber(Math.floor(collabActuals.axnode.amount / 1_000_000))}M</div>
                    <Progress value={(Math.floor(collabActuals.axnode.amount / 1_000_000) / collabGoal.ax_node_target_amount) * 100} className="h-2 mt-2" />
                    <div className="mt-1 text-xs text-right text-gray-500">달성률: {Math.round((Math.floor(collabActuals.axnode.amount / 1_000_000) / collabGoal.ax_node_target_amount) * 100)}%</div>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-orange-600" />
                성과 요약
              </CardTitle>
              <CardDescription>전체 협업 성과 분석</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50 dark:bg-slate-800">
                      <th className="p-4 text-left font-medium text-muted-foreground">구분</th>
                      <th className="p-4 text-right font-medium text-muted-foreground">실적</th>
                      <th className="p-4 text-right font-medium text-muted-foreground">목표</th>
                      <th className="p-4 text-right font-medium text-muted-foreground">달성률</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-4 font-medium">총 협업 건수</td>
                      <td className="p-4 text-right font-bold text-2xl">
                        {formatNumber(collabActuals.xlos.count + collabActuals.los.count + collabActuals.axnode.count)}건
                      </td>
                      <td className="p-4 text-right text-muted-foreground">
                        {formatNumber(collabGoal.x_los_target_count + collabGoal.losllk_target_count + collabGoal.ax_node_target_count)}건
                      </td>
                      <td className="p-4 text-right">
                        {((collabActuals.xlos.count + collabActuals.los.count + collabActuals.axnode.count) / (collabGoal.x_los_target_count + collabGoal.losllk_target_count + collabGoal.ax_node_target_count) * 100).toFixed(1)}%
                        <Progress
                          value={((collabActuals.xlos.count + collabActuals.los.count + collabActuals.axnode.count) / (collabGoal.x_los_target_count + collabGoal.losllk_target_count + collabGoal.ax_node_target_count)) * 100}
                          className="h-1.5 mt-2"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium">총 협업 수익</td>
                      <td className="p-4 text-right font-bold text-2xl">
                        {formatNumber(Math.floor(collabActuals.xlos.amount / 1_000_000) + Math.floor(collabActuals.los.amount / 1_000_000) + Math.floor(collabActuals.axnode.amount / 1_000_000))}M
                      </td>
                      <td className="p-4 text-right text-muted-foreground">
                        {formatNumber(collabGoal.x_los_target_amount + collabGoal.losllk_target_amount + collabGoal.ax_node_target_amount)}M
                      </td>
                      <td className="p-4 text-right">
                        {((Math.floor(collabActuals.xlos.amount / 1_000_000) + Math.floor(collabActuals.los.amount / 1_000_000) + Math.floor(collabActuals.axnode.amount / 1_000_000)) / (collabGoal.x_los_target_amount + collabGoal.losllk_target_amount + collabGoal.ax_node_target_amount) * 100).toFixed(1)}%
                        <Progress
                          value={((Math.floor(collabActuals.xlos.amount / 1_000_000) + Math.floor(collabActuals.los.amount / 1_000_000) + Math.floor(collabActuals.axnode.amount / 1_000_000)) / (collabGoal.x_los_target_amount + collabGoal.losllk_target_amount + collabGoal.ax_node_target_amount)) * 100}
                          className="h-1.5 mt-2"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
        )}
      </TabsContent>

      {/* Quality Tab Content - Based on Expertise Monitoring */}
      <TabsContent value="quality" className="space-y-6">
        {qualityLoading ? (
          <div className="p-8 text-center text-gray-500">Quality 데이터를 불러오는 중...</div>
        ) : qualityError ? (
          <div className="p-8 text-center text-red-500">{qualityError}</div>
        ) : !qualityGoal ? (
          <div className="p-8 text-center text-gray-500">입력된 Quality 데이터가 없습니다.</div>
        ) : (
        <div className="space-y-8">
          {/* 감사(오딧) 성과 */}
          <div>
            <div className="flex items-center mb-3">
              <CheckCircle className="mr-2 h-5 w-5 text-orange-600" />
              <span className="text-lg font-bold">감사 성과</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* DoAE 적용율 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">DoAE 적용율</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end mb-1">
                    <div className="text-2xl font-bold">{qualityGoal.doae_rate ?? 0}%</div>
                    <div className="text-xs text-muted-foreground text-right">목표: {qualityGoal.doae_rate ?? 0}%</div>
                  </div>
                  <Progress value={qualityGoal.doae_rate ?? 0} className="h-2 mt-2" />
                  <div className="mt-1 text-xs text-right text-gray-500">달성률: {qualityGoal.doae_rate ?? 0}%</div>
                </CardContent>
              </Card>
              {/* YRA 비율 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">YRA 비율</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end mb-1">
                    <div className="text-2xl font-bold">{qualityGoal.yra_ratio ?? 0}%</div>
                    <div className="text-xs text-muted-foreground text-right">목표: {qualityGoal.yra_ratio ?? 0}%</div>
                  </div>
                  <Progress value={qualityGoal.yra_ratio ?? 0} className="h-2 mt-2" />
                  <div className="mt-1 text-xs text-right text-gray-500">달성률: {qualityGoal.yra_ratio ?? 0}%</div>
                </CardContent>
              </Card>
            </div>
          </div>
          {/* 비감사(논오딧) 성과 - 내러티브 카드 */}
          <div>
            <div className="flex items-center mb-3">
              <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
              <span className="text-lg font-bold">비감사 성과</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 단일/복수 카드 모두 지원 */}
              {(!nonAuditGoal.신규 && !nonAuditGoal.기존) ? (
                <Card className="md:col-span-2">
                  <CardContent>
                    <div className="mt-4 mb-4 text-xs text-muted-foreground whitespace-pre-line">
                      {nonAuditGoalText || "비감사 목표를 입력하세요"}
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">현재 상태</span>
                        {isEditingNonAuditStatus && !readOnly ? (
                          <Select value={performanceStatus.신규} onValueChange={v => setPerformanceStatus(s => ({...s, 신규: v as any}))}>
                            <SelectTrigger className="w-32 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">On Track</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          performanceStatus.신규 === 'completed' ? (
                            <Badge className="bg-green-500">Completed</Badge>
                          ) : performanceStatus.신규 === 'in_progress' ? (
                            <Badge className="bg-orange-500">On Track</Badge>
                          ) : (
                            <Badge className="bg-gray-400">Pending</Badge>
                          )
                        )}
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                        {isEditingNonAuditStatus && !readOnly ? (
                          <Textarea
                            value={nonAuditStatus.신규.progress}
                            onChange={e => setNonAuditStatus(s => ({ ...s, 신규: { progress: e.target.value } }))}
                            className="mb-2"
                          />
                        ) : (
                          <p className="text-sm">{nonAuditStatus.신규.progress || nonAuditStatus.기존.progress || "진행상황을 입력하세요"}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {nonAuditGoal.신규 && (
              <Card>
                <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">신규 서비스 개발</CardTitle>
                        <CardDescription className="text-xs">
                          {nonAuditGoal.신규}
                        </CardDescription>
                </CardHeader>
                <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">현재 상태</span>
                            {isEditingNonAuditStatus && !readOnly ? (
                              <Select value={performanceStatus.신규} onValueChange={v => setPerformanceStatus(s => ({...s, 신규: v as any}))}>
                                <SelectTrigger className="w-32 h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_progress">On Track</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              performanceStatus.신규 === 'completed' ? (
                                <Badge className="bg-green-500">Completed</Badge>
                              ) : performanceStatus.신규 === 'in_progress' ? (
                                <Badge className="bg-orange-500">On Track</Badge>
                              ) : (
                                <Badge className="bg-gray-400">Pending</Badge>
                              )
                            )}
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                            {isEditingNonAuditStatus && !readOnly ? (
                              <Textarea
                                value={nonAuditStatus.신규.progress}
                                onChange={e => setNonAuditStatus(s => ({ ...s, 신규: { progress: e.target.value } }))}
                                className="mb-2"
                              />
                            ) : (
                              <p className="text-sm">{nonAuditStatus.신규.progress}</p>
                            )}
                          </div>
                  </div>
                </CardContent>
              </Card>
                  )}
                  {nonAuditGoal.기존 && (
              <Card>
                <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">기존 서비스 확장</CardTitle>
                        <CardDescription className="text-xs">
                          {nonAuditGoal.기존}
                        </CardDescription>
                </CardHeader>
                <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">현재 상태</span>
                            {isEditingNonAuditStatus && !readOnly ? (
                              <Select value={performanceStatus.기존} onValueChange={v => setPerformanceStatus(s => ({...s, 기존: v as any}))}>
                                <SelectTrigger className="w-32 h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_progress">On Track</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              performanceStatus.기존 === 'completed' ? (
                                <Badge className="bg-green-500">Completed</Badge>
                              ) : performanceStatus.기존 === 'in_progress' ? (
                                <Badge className="bg-orange-500">On Track</Badge>
                              ) : (
                                <Badge className="bg-gray-400">Pending</Badge>
                              )
                            )}
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                            {isEditingNonAuditStatus && !readOnly ? (
                              <Textarea
                                value={nonAuditStatus.기존.progress}
                                onChange={e => setNonAuditStatus(s => ({ ...s, 기존: { progress: e.target.value } }))}
                                className="mb-2"
                              />
                            ) : (
                              <p className="text-sm">{nonAuditStatus.기존.progress}</p>
                            )}
                          </div>
                  </div>
                </CardContent>
              </Card>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        )}
      </TabsContent>

      {/* Industry Tab Content - Industry 페이지 데이터 요약 */}
      <TabsContent value="industry" className="mt-4">
        {industryLoading ? (
          <div className="p-8 text-center text-gray-500">Industry & TL 활동 데이터를 불러오는 중...</div>
        ) : industryError ? (
          <div className="p-8 text-center text-red-500">{industryError}</div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5 text-orange-600" />
                  Industry & TL Activities
                </CardTitle>
                <CardDescription>산업전문화 및 TL 활동 전체 목록</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto w-full">
                  <Table className="min-w-full">
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead className="w-[130px]">일자</TableHead>
                        <TableHead className="w-[130px]">구분</TableHead>
                        <TableHead className="w-[300px]">제목</TableHead>
                        <TableHead className="w-[120px]">대상</TableHead>
                        <TableHead className="w-[90px]">상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {industryActivities.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell className="font-medium">{activity.date}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {(() => {
                                switch (activity.category) {
                                  case "산업전문화":
                                    return <Building className="h-4 w-4 text-blue-600" />
                                  case "감사효율화":
                                    return <Target className="h-4 w-4 text-green-600" />
                                  case "신규 Product":
                                    return <Lightbulb className="h-4 w-4 text-purple-600" />
                                  case "TL 활동":
                                    return <FileText className="h-4 w-4 text-orange-600" />
                                  case "BD활동":
                                    return <Briefcase className="h-4 w-4 text-red-600" />
                                  default:
                                    return null
                                }
                              })()}
                              <span>{activity.category}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium" style={{ whiteSpace: 'pre-line', overflowWrap: 'break-word', wordBreak: 'break-all' }}>{activity.title}</div>
                            <div className="text-sm text-muted-foreground" style={{ whiteSpace: 'pre-line', maxWidth: 300, overflowWrap: 'break-word', wordBreak: 'break-all' }}>{activity.description}</div>
                          </TableCell>
                          <TableCell>{activity.target}</TableCell>
                          <TableCell>
                            {(() => {
                              switch (activity.status) {
                                case "Completed":
                                  return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Completed</Badge>
                                case "In Progress":
                                  return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">In Progress</Badge>
                                case "Start":
                                  return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">Start</Badge>
                                default:
                                  return null
                              }
                            })()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
