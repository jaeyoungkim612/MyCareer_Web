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
  Minus,
  TrendingDown,
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
    gpsScore: string | null         // 당기
    peiScore: string | null         // 당기
    prevGpsScore: string | null     // 전기
    prevPeiScore: string | null     // 전기
    coachingTimeHours: number
    refreshOffUsageRate: number | null
    utilAAverage: number | null
    utilBAverage: number | null
  }>({
    gpsScore: null,
    peiScore: null,
    prevGpsScore: null,
    prevPeiScore: null,
    coachingTimeHours: 0,
    refreshOffUsageRate: null,
    utilAAverage: null,
    utilBAverage: null
  })
  const [collabGoal, setCollabGoal] = useState<CollaborationGoal | null>(null)
  const [collabActuals, setCollabActuals] = useState<{ xlos: { count: number, amount: number }, los: { count: number, amount: number }, axnode: { count: number, amount: number } } | null>(null)
  const [collabLoading, setCollabLoading] = useState(false)
  const [collabError, setCollabError] = useState<string | null>(null)
  const [qualityGoal, setQualityGoal] = useState<{
    doae_rate?: number
    yra_ratio?: number
    yearEndTargetRatio?: number
    yearEndActualRatio?: number
    elInputTargetRatio?: number
    elInputActualRatio?: number
  } | null>(null)
  const [eerResult, setEerResult] = useState<string | null>(null)
  const [eerLoading, setEerLoading] = useState(true)
  const [qualityLoading, setQualityLoading] = useState(false)
  const [qualityError, setQualityError] = useState<string | null>(null)
  const [nonAuditGoal, setNonAuditGoal] = useState<{ Quality향상: string; 효율화계획: string; 신상품개발: string }>({ Quality향상: "", 효율화계획: "", 신상품개발: "" })
  const [nonAuditGoalText, setNonAuditGoalText] = useState("")
  const [isEditingNonAuditStatus, setIsEditingNonAuditStatus] = useState(false)
  const [nonAuditStatus, setNonAuditStatus] = useState<{ Quality향상: { progress: string }; 효율화계획: { progress: string }; 신상품개발: { progress: string } }>({ Quality향상: { progress: "" }, 효율화계획: { progress: "" }, 신상품개발: { progress: "" } })
  const [originalNonAuditStatus, setOriginalNonAuditStatus] = useState(nonAuditStatus)
  type PerfStatus = 'pending' | 'in_progress' | 'completed'
  const [performanceStatus, setPerformanceStatus] = useState<{ Quality향상: PerfStatus; 효율화계획: PerfStatus; 신상품개발: PerfStatus }>({ Quality향상: 'pending', 효율화계획: 'pending', 신상품개발: 'pending' })
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
        
        // Get goal and basic HR data
        const [goal, hrResult] = await Promise.all([
          BusinessGoalsService.getByEmployeeId(targetEmpno),
          supabase.from("hr_master_dashboard").select("*").eq("EMPNO", targetEmpno).single()
        ])
        
        setBusinessGoal(goal)
        
        // BPR_fact 집계 — 서버 RPC로 이동 (이전: 수천 행 fetch + JS 집계, pagination 버그 존재)
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(targetEmpno)

        // 사번 변형 목록 (정규화 + 원본)
        const empnoVariants = [normalizedEmpno]
        if (normalizedEmpno.startsWith('0')) {
          empnoVariants.push(normalizedEmpno.replace(/^0+/, ''))
        } else {
          empnoVariants.push(`0${normalizedEmpno}`)
        }

        // 사용자의 본부(CM_NM) 조회
        const { data: userData } = await supabase
          .from("a_hr_master")
          .select("CM_NM")
          .eq("EMPNO", normalizedEmpno)
          .maybeSingle()

        if (!userData?.CM_NM) {
          console.log("❌ 사용자 본부 정보 없음")
          if (hrResult.data) setBudgetData(hrResult.data)
          return
        }

        console.log("🏢 사용자 본부:", userData.CM_NM)

        // My + Team BPR 집계를 RPC 2개 병렬 호출
        const [myBprRes, teamBprRes] = await Promise.all([
          supabase.rpc('get_bpr_aggregate_by_person', {
            p_empno_list: empnoVariants,
            p_report_date: null,
          }),
          supabase.rpc('get_bpr_aggregate_by_dept', {
            p_dept_prefix: userData.CM_NM,
            p_report_date: null,
          }),
        ])

        if (myBprRes.error) {
          console.error('❌ get_bpr_aggregate_by_person 실패:', myBprRes.error)
        }
        if (teamBprRes.error) {
          console.error('❌ get_bpr_aggregate_by_dept 실패:', teamBprRes.error)
        }

        const myRow = (myBprRes.data || [])[0] || {}
        const teamRow = (teamBprRes.data || [])[0] || {}

        // RPC 반환값 단위: 백만원 (JS의 1_000_000으로 나눠준 결과와 동일)
        const myAuditRevenue = Number(myRow.audit_revenue) || 0
        const myNonAuditRevenue = Number(myRow.non_audit_revenue) || 0
        const myAuditBacklog = Number(myRow.audit_backlog) || 0
        const myNonAuditBacklog = Number(myRow.non_audit_backlog) || 0
        const myAuditPipeline = Number(myRow.audit_pipeline) || 0
        const myNonAuditPipeline = Number(myRow.non_audit_pipeline) || 0

        const teamAuditRevenue = Number(teamRow.audit_revenue) || 0
        const teamNonAuditRevenue = Number(teamRow.non_audit_revenue) || 0
        const teamAuditBacklog = Number(teamRow.audit_backlog) || 0
        const teamNonAuditBacklog = Number(teamRow.non_audit_backlog) || 0
        const teamAuditPipeline = Number(teamRow.audit_pipeline) || 0
        const teamNonAuditPipeline = Number(teamRow.non_audit_pipeline) || 0

        console.log("📊 BPR 집계 (서버 RPC):", {
          my: { rev: myAuditRevenue + myNonAuditRevenue, bl: myAuditBacklog + myNonAuditBacklog, pl: myAuditPipeline + myNonAuditPipeline },
          team: { rev: teamAuditRevenue + teamNonAuditRevenue, bl: teamAuditBacklog + teamNonAuditBacklog, pl: teamAuditPipeline + teamNonAuditPipeline },
        })

        // budgetData 구성 (RPC 결과 백만원 → 원단위로 변환해서 저장; JSX는 /1_000_000으로 표시)
        const combinedBudgetData = {
          ...(hrResult.data || {}),
          // My Budget 실적
          current_audit_revenue: Math.round(myAuditRevenue * 1_000_000),
          current_audit_backlog: Math.round(myAuditBacklog * 1_000_000),
          pipeline_audit_current_total: Math.round(myAuditPipeline * 1_000_000),
          current_non_audit_revenue: Math.round(myNonAuditRevenue * 1_000_000),
          current_non_audit_backlog: Math.round(myNonAuditBacklog * 1_000_000),
          pipeline_non_audit_current_total: Math.round(myNonAuditPipeline * 1_000_000),
          // Team Budget 실적
          dept_revenue_audit: Math.round(teamAuditRevenue * 1_000_000),
          dept_backlog_audit: Math.round(teamAuditBacklog * 1_000_000),
          dept_pipeline_audit_current_total: Math.round(teamAuditPipeline * 1_000_000),
          dept_revenue_non_audit: Math.round(teamNonAuditRevenue * 1_000_000),
          dept_backlog_non_audit: Math.round(teamNonAuditBacklog * 1_000_000),
          dept_pipeline_non_audit_current_total: Math.round(teamNonAuditPipeline * 1_000_000),
        }

        setBudgetData(combinedBudgetData)
        
      } catch (e: any) {
        console.error('❌ DashboardTabs: Business data fetch error:', e)
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
        
        // 사번 변형 (results-tab.tsx와 동일 패턴)
        const empnoVariations = Array.from(new Set([
          fiveDigitEmpno,
          normalizedEmpno,
          targetEmpno,
          fiveDigitEmpno.padStart(6, '0'),
          fiveDigitEmpno.padStart(5, '0'),
        ])).filter(Boolean)

        // 병렬로 모든 데이터 가져오기
        const [goalResult, scoreResult, refreshOffResult, coachingResult] = await Promise.all([
          // 1. 목표 데이터
          PeopleGoalsService.getLatestGoals(targetEmpno),

          // 2. GPS/PEI 실제 데이터 — 사번 변형 일괄, 연도는 JS에서 최신 선택
          //    ItS/ITS 컬럼명 호환을 위해 양쪽 시도
          (async () => {
            const tryQuery = (itsCol: string) =>
              supabase
                .from("L_GPS_PEI_Table")
                .select(`EMPNO, 연도, "${itsCol}", "GPS(PEI)"`)
                .in('EMPNO', empnoVariations)

            const first = await tryQuery('GPS(ItS)')
            if (first.error && first.error.message?.includes('does not exist')) {
              return await tryQuery('GPS(ITS)')
            }
            return first
          })(),

          // 3. TL의 팀원들 조회 (Refresh Off, Util A/B 계산용)
          supabase
            .from("a_hr_master")
            .select("EMPNO, EMPNM, CM_NM")
            .eq("TL_EMPNO", normalizedEmpno),

          // 4. 코칭타임 실제 데이터 — 회계연도 누적(yearHours) 사용
          (async () => {
            try {
              const now = new Date()
              const year = now.getFullYear()
              const quarter = Math.ceil((now.getMonth() + 1) / 3)
              const { yearHours } = await PeopleGoalsService.getCoachingTimeStats(normalizedEmpno, year, quarter)
              return yearHours
            } catch {
              return 0
            }
          })()
        ])

        // 목표 데이터 설정
        setPeopleGoal(goalResult)

        // GPS/PEI 실제 데이터 설정 (ItS / ITS 컬럼명 양쪽 호환 + 최신/이전 연도 자동 선택)
        const { data: scoreRows, error: scoreError } = scoreResult as any
        if (scoreError) {
          console.error('❌ DashboardTabs: GPS/PEI 조회 실패:', scoreError)
        }
        let gpsScore: string | null = null, peiScore: string | null = null
        let prevGpsScore: string | null = null, prevPeiScore: string | null = null
        // 연도 내림차순 정렬 → [0]: 당기, [1]: 전기
        const sortedRows = (scoreRows && scoreRows.length > 0)
          ? [...scoreRows].sort((a: any, b: any) => String(b['연도']).localeCompare(String(a['연도'])))
          : []
        const latestScoreRow = sortedRows[0] || null
        const prevScoreRow = sortedRows[1] || null
        if (latestScoreRow) {
          gpsScore = latestScoreRow['GPS(ItS)'] ?? latestScoreRow['GPS(ITS)'] ?? null
          peiScore = latestScoreRow['GPS(PEI)'] ?? null
        }
        if (prevScoreRow) {
          prevGpsScore = prevScoreRow['GPS(ItS)'] ?? prevScoreRow['GPS(ITS)'] ?? null
          prevPeiScore = prevScoreRow['GPS(PEI)'] ?? null
        }
        console.log(`📊 DashboardTabs: 당기(${latestScoreRow?.['연도']}) GPS=${gpsScore}, PEI=${peiScore} | 전기(${prevScoreRow?.['연도']}) GPS=${prevGpsScore}, PEI=${prevPeiScore}`)

        // 코칭타임 실제 데이터 (회계연도 누적)
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
          
          // Util A/B 계산 — v_employee_core 우회, a_utilization 2-phase 직접 조회
          console.log(`📊 DashboardTabs: Fetching Util A/B for ${teamEmpnos.length} team members (2-phase)`)

          try {
            // Phase 1: 최신 UTIL_DATE 조회 (전역 단일 스냅샷 가정)
            const { data: latestDateRow } = await supabase
              .from("a_utilization")
              .select("UTIL_DATE")
              .order("UTIL_DATE", { ascending: false })
              .limit(1)
              .maybeSingle()

            const latestUtilDate = latestDateRow?.UTIL_DATE

            // Phase 2: 해당 날짜의 팀원 활용률 행
            if (latestUtilDate) {
              const { data: utilData, error: utilError } = await supabase
                .from("a_utilization")
                .select("EMPNO, UTIL_A, UTIL_B")
                .in("EMPNO", teamEmpnos)
                .eq("UTIL_DATE", latestUtilDate)

              if (utilError) {
                console.error('❌ DashboardTabs: a_utilization query error:', utilError)
              } else if (utilData && utilData.length > 0) {
                const validUtilA = utilData.filter(item => item.UTIL_A !== null && item.UTIL_A !== "")
                const validUtilB = utilData.filter(item => item.UTIL_B !== null && item.UTIL_B !== "")

                const utilASum = validUtilA.reduce((sum, item) => sum + (parseFloat(item.UTIL_A) || 0), 0)
                const utilBSum = validUtilB.reduce((sum, item) => sum + (parseFloat(item.UTIL_B) || 0), 0)

                utilAAverage = validUtilA.length > 0 ? Math.round((utilASum / validUtilA.length) * 100) / 100 : 0
                utilBAverage = validUtilB.length > 0 ? Math.round((utilBSum / validUtilB.length) * 100) / 100 : 0

                console.log(`📊 DashboardTabs: Util A=${utilAAverage}%, B=${utilBAverage}% (date=${latestUtilDate})`)
              } else {
                console.warn('⚠️ DashboardTabs: No util data for latest date')
              }
            } else {
              console.warn('⚠️ DashboardTabs: No UTIL_DATE found in a_utilization')
            }
          } catch (e) {
            console.error('❌ DashboardTabs: Util fetch error:', e)
          }
        }
        
        // 실제 데이터 설정
        console.log("✅ DashboardTabs: People actual data set:", {
          gpsScore,
          peiScore,
          coachingTimeHours,
          refreshOffUsageRate,
          utilAAverage,
          utilBAverage
        })
        
        setPeopleActualData({
          gpsScore,
          peiScore,
          prevGpsScore,
          prevPeiScore,
          coachingTimeHours,
          refreshOffUsageRate,
          utilAAverage,
          utilBAverage
        })
        
      } catch (e: any) {
        console.error('❌ DashboardTabs: People data fetch error:', e)
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
        
        // ===== 실제값 (plan 유무와 독립적으로 항상 조회) =====
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(targetEmpno)
        let yearEndActualRatio = 0
        let elInputActualRatio = 0

        try {
          // Year-End 이전 시간 비율 = SUM(OCCURTIME) / SUM(CUMULATIVEBUDGET) × 100
          const { data: epcRows } = await supabase
            .from('epc_view')
            .select('OCCURTIME, CUMULATIVEBUDGET')
            .eq('EMPLNO', normalizedEmpno)
          if (epcRows && epcRows.length > 0) {
            const totalOccur = epcRows.reduce((s: number, r: any) => s + (parseFloat(r.OCCURTIME) || 0), 0)
            const totalBudget = epcRows.reduce((s: number, r: any) => s + (parseFloat(r.CUMULATIVEBUDGET) || 0), 0)
            yearEndActualRatio = totalBudget > 0 ? Math.round((totalOccur / totalBudget) * 10000) / 100 : 0
          }
        } catch (e) {
          console.warn('⚠️ Year-End ratio 조회 실패:', e)
        }

        try {
          // EL 투입시간 비율 = 내 시간 / 전체 프로젝트 시간 × 100
          // (CHARGPTR 프로젝트 중 PRJTCD 중간자 01/11만 필터)
          const { data: chargeProjects } = await supabase
            .from('a_project_info')
            .select('PRJTCD, PRJTNM')
            .eq('CHARGPTR', normalizedEmpno)
            .not('PRJTNM', 'ilike', '%코칭%')
            .not('PRJTNM', 'like', '%24%')
            .not('PRJTNM', 'like', '%2024%')

          const filteredProjectCodes = Array.from(new Set(
            (chargeProjects || [])
              .map((p: any) => p.PRJTCD)
              .filter((code: string) => {
                const parts = String(code).split('-')
                return parts.length >= 2 && (parts[1] === '01' || parts[1] === '11')
              })
          ))

          if (filteredProjectCodes.length > 0) {
            // 먼저 v_project_time 시도 (스키마 캐시 미스 가능성 있음)
            let timeRows: any[] | null = null
            const viewResult = await supabase
              .from('v_project_time')
              .select('EMPNO, total_use_time')
              .in('PRJTCD', filteredProjectCodes)

            if (!viewResult.error && viewResult.data && viewResult.data.length > 0) {
              timeRows = viewResult.data
            } else {
              // Fallback: a_coaching_time 직접 조회 + 2025 필터 + PRJTCD+EMPNO 집계
              console.log('🔄 Dashboard: v_project_time 실패, a_coaching_time fallback')
              const { data: coachingData } = await supabase
                .from('a_coaching_time')
                .select('EMPNO, PRJTCD, USE_TIME, INPUTDATE')
                .in('PRJTCD', filteredProjectCodes)
                .not('INPUTDATE', 'is', null)
                .like('INPUTDATE', '2025%')

              if (coachingData && coachingData.length > 0) {
                const timeMap = new Map<string, { EMPNO: string; total_use_time: number }>()
                coachingData.forEach((item: any) => {
                  const key = `${item.PRJTCD}_${item.EMPNO}`
                  const useTime = parseFloat(item.USE_TIME || '0') || 0
                  if (timeMap.has(key)) {
                    timeMap.get(key)!.total_use_time += useTime
                  } else {
                    timeMap.set(key, { EMPNO: item.EMPNO, total_use_time: useTime })
                  }
                })
                timeRows = Array.from(timeMap.values())
              }
            }

            if (timeRows && timeRows.length > 0) {
              const totalTime = timeRows.reduce((s: number, r: any) => s + (parseFloat(r.total_use_time) || 0), 0)
              const myTime = timeRows
                .filter((r: any) => r.EMPNO === normalizedEmpno)
                .reduce((s: number, r: any) => s + (parseFloat(r.total_use_time) || 0), 0)
              elInputActualRatio = totalTime > 0 ? Math.round((myTime / totalTime) * 10000) / 100 : 0
            }
          }
        } catch (e) {
          console.warn('⚠️ EL ratio 조회 실패:', e)
        }

        // ===== 목표값 (plan 있으면 사용, 없으면 0) =====
        const firstRecord = performances[0] || null as any
        const yearEndTargetRatio = firstRecord ? (Number(firstRecord.year_end_time_ratio) || 0) : 0
        const elInputTargetRatio = firstRecord ? (Number(firstRecord.el_input_hours) || 0) : 0

        // ===== qualityGoal 항상 set (plan 없어도 실제값은 표시) =====
        setQualityGoal({
          doae_rate: firstRecord?.doae_rate || 0,
          yra_ratio: firstRecord?.yra_ratio || 0,
          yearEndTargetRatio,
          yearEndActualRatio,
          elInputTargetRatio,
          elInputActualRatio,
        })
        console.log('📊 Dashboard Quality:', { yearEndTargetRatio, yearEndActualRatio, elInputTargetRatio, elInputActualRatio })

        if (performances.length > 0) {

          // 비감사 목표: 3분류(Quality향상/효율화계획/신상품개발) 타입 + none 폴백
          // monitoring-tab.tsx와 동일 로직
          const qualityPlan = performances.find((p: any) => p.type === 'Quality향상')
          const 효율화Plan = performances.find((p: any) => p.type === '효율화계획')
          const 신상품Plan = performances.find((p: any) => p.type === '신상품개발')
          const nonePerformance = performances.find((p: any) => p.type === 'none')

          const validStatus = ['pending', 'in_progress', 'completed']

          if (qualityPlan || 효율화Plan || 신상품Plan) {
            // 3분류 타입이면 합쳐서 표시
            const parts: string[] = []
            if (qualityPlan?.goal_text) {
              parts.push('Quality 향상')
              parts.push(qualityPlan.goal_text)
              parts.push('')
            }
            if (효율화Plan?.goal_text) {
              parts.push('효율화 계획')
              parts.push(효율화Plan.goal_text)
              parts.push('')
            }
            if (신상품Plan?.goal_text) {
              parts.push('신상품 개발')
              parts.push(신상품Plan.goal_text)
            }
            const combinedGoal = parts.join('\n')
            setNonAuditGoalText(combinedGoal)
            setNonAuditGoal(parseNonAuditGoal(combinedGoal))

            setPerformanceStatus({
              Quality향상: validStatus.includes(qualityPlan?.status || '') ? qualityPlan?.status as PerfStatus : 'pending',
              효율화계획: validStatus.includes(효율화Plan?.status || '') ? 효율화Plan?.status as PerfStatus : 'pending',
              신상품개발: validStatus.includes(신상품Plan?.status || '') ? 신상품Plan?.status as PerfStatus : 'pending',
            })
            setNonAuditStatus({
              Quality향상: { progress: qualityPlan?.progress_text || '' },
              효율화계획: { progress: 효율화Plan?.progress_text || '' },
              신상품개발: { progress: 신상품Plan?.progress_text || '' },
            })
          } else if (nonePerformance) {
            // 'none' 타입: goal_text 그대로 + parseNonAuditGoal로 분리 시도
            setNonAuditGoalText(nonePerformance.goal_text || '')
            setNonAuditGoal(parseNonAuditGoal(nonePerformance.goal_text || ''))

            const noneStatus = validStatus.includes(nonePerformance.status || '') ? nonePerformance.status as PerfStatus : 'pending'
            setPerformanceStatus({
              Quality향상: noneStatus,
              효율화계획: 'pending',
              신상품개발: 'pending',
            })
            setNonAuditStatus({
              Quality향상: { progress: nonePerformance.progress_text || '' },
              효율화계획: { progress: '' },
              신상품개발: { progress: '' },
            })
          }
        }
      } catch (e: any) {
        setQualityError(e.message || String(e))
      } finally {
        setQualityLoading(false)
      }
    }
    fetchQualityGoal()
  }, [targetEmpno])

  // EER 평가 결과 조회 (L_EER_Result 테이블)
  useEffect(() => {
    const fetchEer = async () => {
      if (!targetEmpno) {
        setEerLoading(false)
        return
      }
      setEerLoading(true)
      try {
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(targetEmpno)
        const empnoVariants = Array.from(new Set([
          normalizedEmpno,
          targetEmpno,
          normalizedEmpno.replace(/^0+/, ''),
        ])).filter(Boolean)

        const { data, error } = await supabase
          .from('L_EER_Result')
          .select('"2025 EER"')
          .in('사번', empnoVariants)
          .limit(1)
          .maybeSingle()

        if (error) {
          console.error('❌ Dashboard L_EER_Result 조회 실패:', error)
          setEerResult(null)
        } else {
          setEerResult((data as any)?.['2025 EER'] || null)
        }
      } catch (e) {
        console.error('❌ Dashboard EER 조회 에러:', e)
        setEerResult(null)
      } finally {
        setEerLoading(false)
      }
    }
    fetchEer()
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

  // 3분류(Quality 향상 / 효율화 계획 / 신상품 개발) 키워드 기반 파서 — monitoring-tab.tsx와 동일
  function parseNonAuditGoal(text: string) {
    if (!text) return { Quality향상: "", 효율화계획: "", 신상품개발: "" }
    const qualityIdx = text.indexOf("Quality 향상")
    const 효율화Idx = text.indexOf("효율화 계획")
    const 신상품Idx = text.indexOf("신상품 개발")

    let Quality향상 = ""
    let 효율화계획 = ""
    let 신상품개발 = ""

    const indices = [
      { type: "Quality 향상", idx: qualityIdx, key: "Quality향상" as const },
      { type: "효율화 계획", idx: 효율화Idx, key: "효율화계획" as const },
      { type: "신상품 개발", idx: 신상품Idx, key: "신상품개발" as const },
    ].filter(i => i.idx !== -1).sort((a, b) => a.idx - b.idx)

    for (let i = 0; i < indices.length; i++) {
      const current = indices[i]
      const next = indices[i + 1]
      const startIdx = current.idx + current.type.length
      const endIdx = next ? next.idx : text.length
      const content = text.substring(startIdx, endIdx).trim()
      if (current.key === "Quality향상") Quality향상 = content
      else if (current.key === "효율화계획") 효율화계획 = content
      else if (current.key === "신상품개발") 신상품개발 = content
    }
    return { Quality향상, 효율화계획, 신상품개발 }
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
      
      // Quality향상 타입 업데이트
      const qualityPerf = existingPerformances.find((p: any) => p.type === 'Quality향상')
      if (qualityPerf) {
        performancesToUpdate.push({
          ...qualityPerf,
          progress_text: nonAuditStatus.Quality향상.progress,
          status: performanceStatus.Quality향상,
        })
      }

      // 효율화계획 타입 업데이트
      const 효율화Perf = existingPerformances.find((p: any) => p.type === '효율화계획')
      if (효율화Perf) {
        performancesToUpdate.push({
          ...효율화Perf,
          progress_text: nonAuditStatus.효율화계획.progress,
          status: performanceStatus.효율화계획,
        })
      }

      // 신상품개발 타입 업데이트
      const 신상품Perf = existingPerformances.find((p: any) => p.type === '신상품개발')
      if (신상품Perf) {
        performancesToUpdate.push({
          ...신상품Perf,
          progress_text: nonAuditStatus.신상품개발.progress,
          status: performanceStatus.신상품개발,
        })
      }

      // none 타입도 확인하여 업데이트 (legacy)
      const nonePerformance = existingPerformances.find((p: any) => p.type === 'none')
      if (nonePerformance) {
        performancesToUpdate.push({
          ...nonePerformance,
          progress_text:
            nonAuditStatus.Quality향상.progress ||
            nonAuditStatus.효율화계획.progress ||
            nonAuditStatus.신상품개발.progress,
          status: performanceStatus.Quality향상,
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
                              {Math.ceil(((budgetData?.current_audit_revenue ?? 0) + (budgetData?.current_audit_backlog ?? 0) + (budgetData?.pipeline_audit_current_total ?? 0)) / 1_000_000).toLocaleString('ko-KR')}백만원
                              <div className="text-xs text-gray-500 mt-1">
                                Rev {Math.ceil((budgetData?.current_audit_revenue ?? 0) / 1_000_000).toLocaleString('ko-KR')} + BL {Math.ceil((budgetData?.current_audit_backlog ?? 0) / 1_000_000).toLocaleString('ko-KR')} + PL {Math.ceil((budgetData?.pipeline_audit_current_total ?? 0) / 1_000_000).toLocaleString('ko-KR')}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {Math.ceil(budgetData?.budget_audit ?? 0).toLocaleString('ko-KR')}백만원
                            </TableCell>
                            <TableCell className="text-center border-r">
                              <Badge className={
                                ((((budgetData?.current_audit_revenue ?? 0) + (budgetData?.current_audit_backlog ?? 0) + (budgetData?.pipeline_audit_current_total ?? 0)) / 1_000_000) / (budgetData?.budget_audit ?? 1) * 100) >= 100 
                                ? "bg-green-500" 
                                : ((((budgetData?.current_audit_revenue ?? 0) + (budgetData?.current_audit_backlog ?? 0) + (budgetData?.pipeline_audit_current_total ?? 0)) / 1_000_000) / (budgetData?.budget_audit ?? 1) * 100) >= 80 
                                ? "bg-orange-500" 
                                : "bg-red-500"
                              }>
                                {Math.round(((((budgetData?.current_audit_revenue ?? 0) + (budgetData?.current_audit_backlog ?? 0) + (budgetData?.pipeline_audit_current_total ?? 0)) / 1_000_000) / (budgetData?.budget_audit ?? 1) * 100))}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {Math.ceil(((budgetData?.dept_revenue_audit ?? 0) + (budgetData?.dept_backlog_audit ?? 0) + (budgetData?.dept_pipeline_audit_current_total ?? 0)) / 1_000_000).toLocaleString('ko-KR')}백만원
                              <div className="text-xs text-gray-500 mt-1">
                                Rev {Math.ceil((budgetData?.dept_revenue_audit ?? 0) / 1_000_000).toLocaleString('ko-KR')} + BL {Math.ceil((budgetData?.dept_backlog_audit ?? 0) / 1_000_000).toLocaleString('ko-KR')} + PL {Math.ceil((budgetData?.dept_pipeline_audit_current_total ?? 0) / 1_000_000).toLocaleString('ko-KR')}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {Math.ceil(budgetData?.dept_budget_audit ?? 0).toLocaleString('ko-KR')}백만원
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={
                                ((((budgetData?.dept_revenue_audit ?? 0) + (budgetData?.dept_backlog_audit ?? 0) + (budgetData?.dept_pipeline_audit_current_total ?? 0)) / 1_000_000) / (budgetData?.dept_budget_audit ?? 1) * 100) >= 100 
                                ? "bg-green-500" 
                                : ((((budgetData?.dept_revenue_audit ?? 0) + (budgetData?.dept_backlog_audit ?? 0) + (budgetData?.dept_pipeline_audit_current_total ?? 0)) / 1_000_000) / (budgetData?.dept_budget_audit ?? 1) * 100) >= 80 
                                ? "bg-orange-500" 
                                : "bg-red-500"
                              }>
                                {Math.round(((((budgetData?.dept_revenue_audit ?? 0) + (budgetData?.dept_backlog_audit ?? 0) + (budgetData?.dept_pipeline_audit_current_total ?? 0)) / 1_000_000) / (budgetData?.dept_budget_audit ?? 1) * 100))}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-semibold text-gray-800">비감사</TableCell>
                            <TableCell className="text-center font-medium">
                              {Math.ceil(((budgetData?.current_non_audit_revenue ?? 0) + (budgetData?.current_non_audit_backlog ?? 0) + (budgetData?.pipeline_non_audit_current_total ?? 0)) / 1_000_000).toLocaleString('ko-KR')}백만원
                              <div className="text-xs text-gray-500 mt-1">
                                Rev {Math.ceil((budgetData?.current_non_audit_revenue ?? 0) / 1_000_000).toLocaleString('ko-KR')} + BL {Math.ceil((budgetData?.current_non_audit_backlog ?? 0) / 1_000_000).toLocaleString('ko-KR')} + PL {Math.ceil((budgetData?.pipeline_non_audit_current_total ?? 0) / 1_000_000).toLocaleString('ko-KR')}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {Math.ceil(budgetData?.budget_non_audit ?? 0).toLocaleString('ko-KR')}백만원
                            </TableCell>
                            <TableCell className="text-center border-r">
                              <Badge className={
                                ((((budgetData?.current_non_audit_revenue ?? 0) + (budgetData?.current_non_audit_backlog ?? 0) + (budgetData?.pipeline_non_audit_current_total ?? 0)) / 1_000_000) / (budgetData?.budget_non_audit ?? 1) * 100) >= 100 
                                ? "bg-green-500" 
                                : ((((budgetData?.current_non_audit_revenue ?? 0) + (budgetData?.current_non_audit_backlog ?? 0) + (budgetData?.pipeline_non_audit_current_total ?? 0)) / 1_000_000) / (budgetData?.budget_non_audit ?? 1) * 100) >= 80 
                                ? "bg-orange-500" 
                                : "bg-red-500"
                              }>
                                {Math.round(((((budgetData?.current_non_audit_revenue ?? 0) + (budgetData?.current_non_audit_backlog ?? 0) + (budgetData?.pipeline_non_audit_current_total ?? 0)) / 1_000_000) / (budgetData?.budget_non_audit ?? 1) * 100))}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {Math.ceil(((budgetData?.dept_revenue_non_audit ?? 0) + (budgetData?.dept_backlog_non_audit ?? 0) + (budgetData?.dept_pipeline_non_audit_current_total ?? 0)) / 1_000_000).toLocaleString('ko-KR')}백만원
                              <div className="text-xs text-gray-500 mt-1">
                                Rev {Math.ceil((budgetData?.dept_revenue_non_audit ?? 0) / 1_000_000).toLocaleString('ko-KR')} + BL {Math.ceil((budgetData?.dept_backlog_non_audit ?? 0) / 1_000_000).toLocaleString('ko-KR')} + PL {Math.ceil((budgetData?.dept_pipeline_non_audit_current_total ?? 0) / 1_000_000).toLocaleString('ko-KR')}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {Math.ceil(budgetData?.dept_budget_non_audit ?? 0).toLocaleString('ko-KR')}백만원
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={
                                ((((budgetData?.dept_revenue_non_audit ?? 0) + (budgetData?.dept_backlog_non_audit ?? 0) + (budgetData?.dept_pipeline_non_audit_current_total ?? 0)) / 1_000_000) / (budgetData?.dept_budget_non_audit ?? 1) * 100) >= 100 
                                ? "bg-green-500" 
                                : ((((budgetData?.dept_revenue_non_audit ?? 0) + (budgetData?.dept_backlog_non_audit ?? 0) + (budgetData?.dept_pipeline_non_audit_current_total ?? 0)) / 1_000_000) / (budgetData?.dept_budget_non_audit ?? 1) * 100) >= 80 
                                ? "bg-orange-500" 
                                : "bg-red-500"
                              }>
                                {Math.round(((((budgetData?.dept_revenue_non_audit ?? 0) + (budgetData?.dept_backlog_non_audit ?? 0) + (budgetData?.dept_pipeline_non_audit_current_total ?? 0)) / 1_000_000) / (budgetData?.dept_budget_non_audit ?? 1) * 100))}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow className="border-t-2 bg-muted/20">
                            <TableCell className="font-bold text-gray-900">총합</TableCell>
                            <TableCell className="text-center font-bold">
                              {Math.ceil(((budgetData?.current_audit_revenue ?? 0) + (budgetData?.current_audit_backlog ?? 0) + (budgetData?.pipeline_audit_current_total ?? 0) + (budgetData?.current_non_audit_revenue ?? 0) + (budgetData?.current_non_audit_backlog ?? 0) + (budgetData?.pipeline_non_audit_current_total ?? 0)) / 1_000_000).toLocaleString('ko-KR')}백만원
                              <div className="text-xs text-gray-500 mt-1 font-normal">
                                Rev {Math.ceil(((budgetData?.current_audit_revenue ?? 0) + (budgetData?.current_non_audit_revenue ?? 0)) / 1_000_000).toLocaleString('ko-KR')} + BL {Math.ceil(((budgetData?.current_audit_backlog ?? 0) + (budgetData?.current_non_audit_backlog ?? 0)) / 1_000_000).toLocaleString('ko-KR')} + PL {Math.ceil(((budgetData?.pipeline_audit_current_total ?? 0) + (budgetData?.pipeline_non_audit_current_total ?? 0)) / 1_000_000).toLocaleString('ko-KR')}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {Math.ceil((budgetData?.budget_audit ?? 0) + (budgetData?.budget_non_audit ?? 0)).toLocaleString('ko-KR')}백만원
                            </TableCell>
                            <TableCell className="text-center border-r">
                              <Badge className={
                                ((((budgetData?.current_audit_revenue ?? 0) + (budgetData?.current_audit_backlog ?? 0) + (budgetData?.pipeline_audit_current_total ?? 0) + (budgetData?.current_non_audit_revenue ?? 0) + (budgetData?.current_non_audit_backlog ?? 0) + (budgetData?.pipeline_non_audit_current_total ?? 0)) / 1_000_000) / ((budgetData?.budget_audit ?? 0) + (budgetData?.budget_non_audit ?? 0)) * 100) >= 100 
                                ? "bg-green-500" 
                                : ((((budgetData?.current_audit_revenue ?? 0) + (budgetData?.current_audit_backlog ?? 0) + (budgetData?.pipeline_audit_current_total ?? 0) + (budgetData?.current_non_audit_revenue ?? 0) + (budgetData?.current_non_audit_backlog ?? 0) + (budgetData?.pipeline_non_audit_current_total ?? 0)) / 1_000_000) / ((budgetData?.budget_audit ?? 0) + (budgetData?.budget_non_audit ?? 0)) * 100) >= 80 
                                ? "bg-orange-500" 
                                : "bg-red-500"
                              }>
                                {Math.round(((((budgetData?.current_audit_revenue ?? 0) + (budgetData?.current_audit_backlog ?? 0) + (budgetData?.pipeline_audit_current_total ?? 0) + (budgetData?.current_non_audit_revenue ?? 0) + (budgetData?.current_non_audit_backlog ?? 0) + (budgetData?.pipeline_non_audit_current_total ?? 0)) / 1_000_000) / ((budgetData?.budget_audit ?? 0) + (budgetData?.budget_non_audit ?? 0)) * 100))}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {Math.ceil(((budgetData?.dept_revenue_audit ?? 0) + (budgetData?.dept_backlog_audit ?? 0) + (budgetData?.dept_pipeline_audit_current_total ?? 0) + (budgetData?.dept_revenue_non_audit ?? 0) + (budgetData?.dept_backlog_non_audit ?? 0) + (budgetData?.dept_pipeline_non_audit_current_total ?? 0)) / 1_000_000).toLocaleString('ko-KR')}백만원
                              <div className="text-xs text-gray-500 mt-1 font-normal">
                                Rev {Math.ceil(((budgetData?.dept_revenue_audit ?? 0) + (budgetData?.dept_revenue_non_audit ?? 0)) / 1_000_000).toLocaleString('ko-KR')} + BL {Math.ceil(((budgetData?.dept_backlog_audit ?? 0) + (budgetData?.dept_backlog_non_audit ?? 0)) / 1_000_000).toLocaleString('ko-KR')} + PL {Math.ceil(((budgetData?.dept_pipeline_audit_current_total ?? 0) + (budgetData?.dept_pipeline_non_audit_current_total ?? 0)) / 1_000_000).toLocaleString('ko-KR')}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {Math.ceil((budgetData?.dept_budget_audit ?? 0) + (budgetData?.dept_budget_non_audit ?? 0)).toLocaleString('ko-KR')}백만원
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={
                                ((((budgetData?.dept_revenue_audit ?? 0) + (budgetData?.dept_backlog_audit ?? 0) + (budgetData?.dept_pipeline_audit_current_total ?? 0) + (budgetData?.dept_revenue_non_audit ?? 0) + (budgetData?.dept_backlog_non_audit ?? 0) + (budgetData?.dept_pipeline_non_audit_current_total ?? 0)) / 1_000_000) / ((budgetData?.dept_budget_audit ?? 0) + (budgetData?.dept_budget_non_audit ?? 0)) * 100) >= 100 
                                ? "bg-green-500" 
                                : ((((budgetData?.dept_revenue_audit ?? 0) + (budgetData?.dept_backlog_audit ?? 0) + (budgetData?.dept_pipeline_audit_current_total ?? 0) + (budgetData?.dept_revenue_non_audit ?? 0) + (budgetData?.dept_backlog_non_audit ?? 0) + (budgetData?.dept_pipeline_non_audit_current_total ?? 0)) / 1_000_000) / ((budgetData?.dept_budget_audit ?? 0) + (budgetData?.dept_budget_non_audit ?? 0)) * 100) >= 80 
                                ? "bg-orange-500" 
                                : "bg-red-500"
                              }>
                                {Math.round(((((budgetData?.dept_revenue_audit ?? 0) + (budgetData?.dept_backlog_audit ?? 0) + (budgetData?.dept_pipeline_audit_current_total ?? 0) + (budgetData?.dept_revenue_non_audit ?? 0) + (budgetData?.dept_backlog_non_audit ?? 0) + (budgetData?.dept_pipeline_non_audit_current_total ?? 0)) / 1_000_000) / ((budgetData?.dept_budget_audit ?? 0) + (budgetData?.dept_budget_non_audit ?? 0)) * 100))}%
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
                              {Math.ceil((budgetData?.audit_pjt_amount ?? 0) / 1_000_000).toLocaleString('ko-KR')}백만원
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {Math.ceil(businessGoal.new_audit_amount ?? 0).toLocaleString('ko-KR')}백만원
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
                              {Math.ceil((budgetData?.non_audit_pjt_amount ?? 0) / 1_000_000).toLocaleString('ko-KR')}백만원
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {Math.ceil(businessGoal.ui_revenue_amount ?? 0).toLocaleString('ko-KR')}백만원
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
            {/* GPS(PEI) Score Card — L_GPS_PEI_Table."GPS(PEI)" 컬럼 (=people_goals.pei_score 목표) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">GPS(PEI)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end mb-1">
                     <div className="text-2xl font-bold">
                       {peopleActualData.peiScore && peopleActualData.peiScore !== '-' ? `${Math.round(parseFloat(peopleActualData.peiScore) * 100)}%` : '-%'}
                </div>
                     <div className="text-xs text-muted-foreground text-right">2606 기준</div>
                 </div>
                 <div className="space-y-2">
                   <div className="flex justify-between text-xs">
                     <span>전기(2506): {peopleActualData.prevPeiScore && peopleActualData.prevPeiScore !== '-' ? `${Math.round(parseFloat(peopleActualData.prevPeiScore) * 100)}%` : '-'}</span>
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
            {/* GPS(ITS) Score Card — L_GPS_PEI_Table."GPS(ItS)" 컬럼 (=people_goals.gps_score 목표) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">GPS(ITS)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end mb-1">
                     <div className="text-2xl font-bold">
                       {peopleActualData.gpsScore && peopleActualData.gpsScore !== '-' ? `${Math.round(parseFloat(peopleActualData.gpsScore) * 100)}%` : '-%'}
                </div>
                     <div className="text-xs text-muted-foreground text-right">2606 기준</div>
                 </div>
                 <div className="space-y-2">
                   <div className="flex justify-between text-xs">
                     <span>전기(2506): {peopleActualData.prevGpsScore && peopleActualData.prevGpsScore !== '-' ? `${Math.round(parseFloat(peopleActualData.prevGpsScore) * 100)}%` : '-'}</span>
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
          <div className="grid gap-4 md:grid-cols-2">
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
                      <span className="text-xs text-muted-foreground text-right">목표: {Math.ceil(collabGoal.x_los_target_amount).toLocaleString()}백만원</span>
                    </div>
                    <div className="text-2xl font-bold">{Math.ceil(Math.floor(collabActuals.xlos.amount / 1_000_000)).toLocaleString()}백만원</div>
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
                      <span className="text-xs text-muted-foreground text-right">목표: {Math.ceil(collabGoal.losllk_target_amount).toLocaleString()}백만원</span>
                    </div>
                    <div className="text-2xl font-bold">{Math.ceil(Math.floor(collabActuals.los.amount / 1_000_000)).toLocaleString()}백만원</div>
                    <Progress value={(Math.floor(collabActuals.los.amount / 1_000_000) / collabGoal.losllk_target_amount) * 100} className="h-2 mt-2" />
                    <div className="mt-1 text-xs text-right text-gray-500">달성률: {Math.round((Math.floor(collabActuals.los.amount / 1_000_000) / collabGoal.losllk_target_amount) * 100)}%</div>
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
                        {Math.ceil(Math.floor(collabActuals.xlos.amount / 1_000_000) + Math.floor(collabActuals.los.amount / 1_000_000) + Math.floor(collabActuals.axnode.amount / 1_000_000)).toLocaleString()}백만원
                      </td>
                      <td className="p-4 text-right text-muted-foreground">
                        {Math.ceil(collabGoal.x_los_target_amount + collabGoal.losllk_target_amount + collabGoal.ax_node_target_amount).toLocaleString()}백만원
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
              {/* Year End 이전 시간 비율 — epc_view: SUM(OCCURTIME) / SUM(CUMULATIVEBUDGET) */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Year End 이전 시간 비율</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end mb-1">
                    <div className="text-2xl font-bold">{qualityGoal.yearEndActualRatio ?? 0}%</div>
                    <div className="text-xs text-muted-foreground text-right">목표: {qualityGoal.yearEndTargetRatio ?? 0}%</div>
                  </div>
                  <Progress
                    value={qualityGoal.yearEndTargetRatio
                      ? Math.min(((qualityGoal.yearEndActualRatio ?? 0) / qualityGoal.yearEndTargetRatio) * 100, 100)
                      : 0}
                    className="h-2 mt-2"
                  />
                  <div className="mt-1 text-xs text-right text-gray-500">
                    실제: {qualityGoal.yearEndActualRatio ?? 0}% / 목표: {qualityGoal.yearEndTargetRatio ?? 0}%
                  </div>
                </CardContent>
              </Card>
              {/* EL 투입시간 비율 — v_project_time: 내 시간 / 전체 프로젝트 시간 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">EL 투입시간 비율</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end mb-1">
                    <div className="text-2xl font-bold">{qualityGoal.elInputActualRatio ?? 0}%</div>
                    <div className="text-xs text-muted-foreground text-right">목표: {qualityGoal.elInputTargetRatio ?? 0}%</div>
                  </div>
                  <Progress
                    value={qualityGoal.elInputTargetRatio
                      ? Math.min(((qualityGoal.elInputActualRatio ?? 0) / qualityGoal.elInputTargetRatio) * 100, 100)
                      : 0}
                    className="h-2 mt-2"
                  />
                  <div className="mt-1 text-xs text-right text-gray-500">
                    실제: {qualityGoal.elInputActualRatio ?? 0}% / 목표: {qualityGoal.elInputTargetRatio ?? 0}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* EER 평가 결과 — L_EER_Result 테이블에서 동적 조회 */}
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center">
                  EER 평가 결과
                  <span className="ml-2 text-xs text-muted-foreground font-normal">(2025 기준)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eerLoading ? (
                  <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">로딩 중...</div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {([
                        { value: '상위 20%', tone: 'green' as const,  icon: TrendingUp },
                        { value: '중위',      tone: 'blue' as const,   icon: Minus },
                        { value: '하위 20%', tone: 'amber' as const,  icon: TrendingDown },
                        { value: '하위 10%', tone: 'red' as const,    icon: TrendingDown },
                      ]).map(({ value, tone, icon: Icon }) => {
                        const selected = eerResult === value
                        const cls = {
                          green: { border: 'border-green-500', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', iconColor: 'text-green-600' },
                          blue:  { border: 'border-blue-500',  bg: 'bg-blue-50 dark:bg-blue-900/20',   text: 'text-blue-700 dark:text-blue-300',  iconColor: 'text-blue-600' },
                          amber: { border: 'border-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', iconColor: 'text-amber-600' },
                          red:   { border: 'border-red-500',   bg: 'bg-red-50 dark:bg-red-900/20',     text: 'text-red-700 dark:text-red-300',    iconColor: 'text-red-600' },
                        }[tone]
                        return (
                          <div
                            key={value}
                            className={
                              selected
                                ? `flex flex-col items-center justify-center p-3 border-2 ${cls.border} ${cls.bg} rounded-lg shadow-md h-[90px]`
                                : 'flex flex-col items-center justify-center p-3 border border-gray-200 bg-gray-50 dark:bg-gray-800 rounded-lg h-[90px] opacity-50'
                            }
                          >
                            <Icon className={`h-5 w-5 mb-1 ${selected ? cls.iconColor : 'text-gray-400'}`} />
                            <span className={`text-sm font-bold ${selected ? cls.text : 'text-gray-500'}`}>{value}</span>
                          </div>
                        )
                      })}
                    </div>
                    {!eerResult && (
                      <div className="mt-2 text-xs text-center text-muted-foreground">
                        EER 평가 결과 데이터가 없습니다
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          {/* 비감사(논오딧) 성과 - 내러티브 카드 */}
          <div>
            <div className="flex items-center mb-3">
              <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
              <span className="text-lg font-bold">비감사 성과</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(!nonAuditGoal.Quality향상 && !nonAuditGoal.효율화계획 && !nonAuditGoal.신상품개발) ? (
                // 폴백: 3분류 없으면 raw 텍스트 + 단일 상태
                <Card className="md:col-span-3">
                  <CardContent>
                    <div className="mt-4 mb-4 text-xs text-muted-foreground whitespace-pre-line">
                      {nonAuditGoalText || "비감사 목표를 입력하세요"}
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">현재 상태</span>
                        {isEditingNonAuditStatus && !readOnly ? (
                          <Select value={performanceStatus.Quality향상} onValueChange={v => setPerformanceStatus(s => ({ ...s, Quality향상: v as PerfStatus }))}>
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
                          performanceStatus.Quality향상 === 'completed' ? (
                            <Badge className="bg-green-500">Completed</Badge>
                          ) : performanceStatus.Quality향상 === 'in_progress' ? (
                            <Badge className="bg-orange-500">On Track</Badge>
                          ) : (
                            <Badge className="bg-gray-400">Pending</Badge>
                          )
                        )}
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                        {isEditingNonAuditStatus && !readOnly ? (
                          <Textarea
                            value={nonAuditStatus.Quality향상.progress}
                            onChange={e => setNonAuditStatus(s => ({ ...s, Quality향상: { progress: e.target.value } }))}
                            className="mb-2"
                          />
                        ) : (
                          <p className="text-sm">{nonAuditStatus.Quality향상.progress || nonAuditStatus.효율화계획.progress || nonAuditStatus.신상품개발.progress || "진행상황을 입력하세요"}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {([
                    { key: 'Quality향상' as const, label: 'Quality 향상' },
                    { key: '효율화계획' as const, label: '효율화 계획' },
                    { key: '신상품개발' as const, label: '신상품 개발' },
                  ]).map(({ key, label }) => nonAuditGoal[key] && (
                    <Card key={key}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{label}</CardTitle>
                        <CardDescription className="text-xs whitespace-pre-line">
                          {nonAuditGoal[key]}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">현재 상태</span>
                            {isEditingNonAuditStatus && !readOnly ? (
                              <Select value={performanceStatus[key]} onValueChange={v => setPerformanceStatus(s => ({ ...s, [key]: v as PerfStatus }))}>
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
                              performanceStatus[key] === 'completed' ? (
                                <Badge className="bg-green-500">Completed</Badge>
                              ) : performanceStatus[key] === 'in_progress' ? (
                                <Badge className="bg-orange-500">On Track</Badge>
                              ) : (
                                <Badge className="bg-gray-400">Pending</Badge>
                              )
                            )}
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                            {isEditingNonAuditStatus && !readOnly ? (
                              <Textarea
                                value={nonAuditStatus[key].progress}
                                onChange={e => setNonAuditStatus(s => ({ ...s, [key]: { progress: e.target.value } }))}
                                className="mb-2"
                              />
                            ) : (
                              <p className="text-sm">{nonAuditStatus[key].progress}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
