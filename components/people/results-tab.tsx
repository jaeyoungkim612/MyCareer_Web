"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

import { UserCheck, Clock, Calendar, BarChart3, ArrowRight, Table, Eye, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table as TableComponent, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { supabase } from "@/lib/supabase"
import { AuthService } from "@/lib/auth-service"
import { PeopleGoalsService } from "@/lib/people-goals-service"
import { useSettings } from "@/contexts/settings-context"

interface ResultsTabProps {
  empno?: string
  readOnly?: boolean
}

export function ResultsTab({ empno, readOnly = false }: ResultsTabProps = {}) {
  const { isReviewerDialogOpen } = useSettings()
  const [perfTier, setPerfTier] = useState("HP") // 기본값 유지
  const [perfComment, setPerfComment] = useState(
    "탁월한 리더십과 팀워크를 바탕으로 프로젝트를 성공적으로 이끌었으며, 동료들과의 소통 능력이 매우 뛰어납니다. 새로운 과제에 대한 빠른 적응력과 문제 해결 능력도 돋보입니다. 또한, 팀원들의 성장을 적극적으로 지원하며 긍정적인 조직 문화를 조성하는 데 큰 기여를 하였습니다."
  ) // 기본값 유지
  
  // HR 정보 상태
  const [userInfo, setUserInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // GPS/PEI 점수 상태 (실제 LoS 데이터)
  const [gpsScore, setGpsScore] = useState<string | null>(null)
  const [peiScore, setPeiScore] = useState<string | null>(null)
  
  // 목표 데이터 상태 (plan에서 설정한 값)
  const [goalData, setGoalData] = useState<{
    gpsTarget: number | null
    peiTarget: number | null
    refreshOffTarget: number | null
    coachingTimeTarget: number | null
  }>({
    gpsTarget: null,
    peiTarget: null,
    refreshOffTarget: null,
    coachingTimeTarget: null
  })

  // 코칭타임 실적 데이터 상태
  const [coachingTimeData, setCoachingTimeData] = useState<{
    quarterHours: number
    yearHours: number
    year: number
    quarter: number
  }>({
    quarterHours: 0,
    yearHours: 0,
    year: 0,
    quarter: 0
  })

  // 팀 활용률 데이터 상태 (Util A, B)
  const [utilizationData, setUtilizationData] = useState<{
    utilAAverage: number | null
    utilBAverage: number | null
    teamDetails: any[] | null
    utilDate: string | null
  }>({
    utilAAverage: null,
    utilBAverage: null,
    teamDetails: null,
    utilDate: null
  })

  // Refresh Off 관련 state 추가 - 팀 전체 집계 + 상세 데이터
  const [refreshOffData, setRefreshOffData] = useState<{
    usageRate: number | null
    sumTime: number | null
    rmnTime: number | null
    usedTime: number | null
    teamDetails: any[] | null
    baseDate: string | null
  }>({
    usageRate: null,
    sumTime: null,
    rmnTime: null,
    usedTime: null,
    teamDetails: null,
    baseDate: null
  })

  // 팀원 코칭 시간 관련 state 추가
  const [teamCoachingData, setTeamCoachingData] = useState<Array<{
    empno: string
    empnm: string
    org_nm: string
    gradnm: string
    totalCoachingHours: number
  }>>([])
  const [isTeamDetailDialogOpen, setIsTeamDetailDialogOpen] = useState(false)
  const [isLoadingTeamData, setIsLoadingTeamData] = useState(false)

  // DoAE Interim 다면평가결과 state 추가
  const [evaluationData, setEvaluationData] = useState<{
    teamData: any | null
    partnerData: any | null
    allTeamData: any[] | null
    loading: boolean
  }>({
    teamData: null,
    partnerData: null,
    allTeamData: null,
    loading: true
  })
  const [isAllTeamDialogOpen, setIsAllTeamDialogOpen] = useState(false)
  const [isTeamPartnersDialogOpen, setIsTeamPartnersDialogOpen] = useState(false)
  const [isAllPartnersDialogOpen, setIsAllPartnersDialogOpen] = useState(false)
  const [teamPartners, setTeamPartners] = useState<any[]>([])
  const [allPartners, setAllPartners] = useState<any[]>([])
  
  // 권한 확인
  const [userRole, setUserRole] = useState<{
    isSecondaryReviewer: boolean
    isMaster: boolean
  }>({
    isSecondaryReviewer: false,
    isMaster: false
  })

  // 코칭 시간 로딩 상태 관리 (readOnly 모드에서 lazy load)
  const [shouldLoadCoaching, setShouldLoadCoaching] = useState(!readOnly)
  
  useEffect(() => {
    // readOnly 모드일 때 컴포넌트가 마운트되면 코칭 데이터 로드 플래그 설정
    if (readOnly) {
      console.log("🔄 ResultsTab: People 탭 활성화 - 코칭 시간 조회 시작")
      setShouldLoadCoaching(true)
    }
  }, [readOnly])

  // HR 정보 로드
  useEffect(() => {
    const loadUserInfo = async () => {
      const user = AuthService.getCurrentUser()
      // readOnly 모드(리뷰어/마스터 리뷰어)에서는 반드시 전달받은 empno 사용
      // 일반 모드에서는 empno가 있으면 그것을, 없으면 로그인 사용자 사용
      const targetEmpno = readOnly 
        ? empno // readOnly일 때는 반드시 전달받은 empno 사용 (리뷰 대상자)
        : (empno || user?.empno) // 일반 모드일 때는 empno가 있으면 그것을, 없으면 로그인 사용자
      
      console.log(`🔍 ResultsTab: loadUserInfo - readOnly=${readOnly}, empno=${empno}, targetEmpno=${targetEmpno}`)
      
      if (!targetEmpno) {
        if (readOnly) {
          console.warn('⚠️ ResultsTab: readOnly 모드인데 empno가 전달되지 않았습니다.')
        }
        setLoading(false)
        return
      }
      
      if (!targetEmpno) {
        setLoading(false)
        return
      }

      try {
        // 사번 정규화 (95129 → 095129)
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(targetEmpno)
        // GPS/PEI 테이블용 5자리 사번 (098095 → 98095)
        const fiveDigitEmpno = normalizedEmpno.replace(/^0/, '')
        console.log(`🔍 Results Tab: Querying with normalized empno: ${targetEmpno} → ${normalizedEmpno}, GPS/PEI empno: ${fiveDigitEmpno}`)
        
        // HR 정보, 목표 데이터, 성과평가 데이터, Refresh Off 데이터를 먼저 가져오기
        const [hrResult, goalResult, performanceResult, refreshOffResult] = await Promise.all([
          supabase
            .from("a_hr_master")
            .select("EMPNO, EMPNM, ORG_NM, JOB_INFO_NM, GRADNM, CM_NM")
            .eq("EMPNO", normalizedEmpno)
            .maybeSingle(),
          supabase
            .from("people_goals")
            .select("gps_score, pei_score, refresh_off_usage_rate, coaching_time")
            .eq("employee_id", normalizedEmpno)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("L_성과평가_Table")
            .select("Tier, Comments")
            .eq("사번", normalizedEmpno)
            .maybeSingle(),
          // Refresh Off 데이터 조회 - TL의 팀원들 직접 조회 (원본 테이블 사용)
          supabase
            .from("a_hr_master")
            .select("EMPNO, EMPNM, CM_NM")
            .eq("TL_EMPNO", normalizedEmpno)
        ])
        
        const { data: hrData, error: hrError } = hrResult
        const { data: goalDataResult, error: goalError } = goalResult
        const { data: performanceData, error: performanceError } = performanceResult
        const { data: refreshOffDataResult, error: refreshOffError } = refreshOffResult
        
        if (hrError) {
          console.error(`❌ HR 데이터 조회 에러 (${normalizedEmpno}):`, hrError)
        }
        
        if (goalError) {
          console.error(`❌ 목표 데이터 조회 에러:`, goalError)
        }
        
        if (performanceError) {
          console.error(`❌ 성과평가 데이터 조회 에러:`, performanceError)
        }

        if (refreshOffError) {
          console.log('❌ Refresh Off 데이터 조회 에러:', refreshOffError)
        }

        // GPS/PEI 실데이터(2606) + 목표기준(2506) 1쿼리로 일괄 조회
        let scoreData = null
        let fallbackTargetData = null

        const empnoVariations = Array.from(new Set([
          fiveDigitEmpno,
          normalizedEmpno,
          targetEmpno,
          fiveDigitEmpno.padStart(6, '0'),
          fiveDigitEmpno.padStart(5, '0'),
        ])).filter(Boolean)

        const { data: gpsPeiRows, error: gpsPeiError } = await supabase
          .from("L_GPS_PEI_Table")
          .select('"EMPNO", "연도", "GPS(ITS)", "GPS(PEI)"')
          .in('"EMPNO"', empnoVariations)
          .in('"연도"', ['2606', '2506'])

        if (gpsPeiError) {
          console.error('❌ GPS/PEI 일괄 조회 실패:', gpsPeiError)
        } else {
          scoreData = gpsPeiRows?.find((r: any) => r['연도'] === '2606') || null
          fallbackTargetData = gpsPeiRows?.find((r: any) => r['연도'] === '2506') || null
          console.log(`📊 GPS/PEI 일괄 조회: ${gpsPeiRows?.length || 0}건`)
        }

        // HR 정보 설정
        if (hrData) {
            setUserInfo({
              empno: hrData.EMPNO,
              empnm: hrData.EMPNM,
              org_nm: hrData.ORG_NM,
              job_info_nm: hrData.JOB_INFO_NM,
              gradnm: hrData.GRADNM,
              cm_nm: hrData.CM_NM,
            })
          console.log("✅ HR data loaded for Results Tab:", hrData.EMPNM, hrData.ORG_NM)
        } else {
          console.log("ℹ️ No HR data found, using target empno")
          setUserInfo({
            empno: targetEmpno,
            empnm: targetEmpno,
            org_nm: null,
          })
        }

        // GPS/PEI 실데이터 설정
        if (scoreData) {
          const gpsItsValue = (scoreData as any)['GPS(ITS)']
          const gpsPeiValue = (scoreData as any)['GPS(PEI)']
          setGpsScore(gpsItsValue)
          setPeiScore(gpsPeiValue)
          console.log("✅ Results: GPS/PEI actual data loaded:", { 'GPS(ITS)': gpsItsValue, 'GPS(PEI)': gpsPeiValue })
        } else {
          console.log("ℹ️ Results: No GPS/PEI actual data found for 2606")
          setGpsScore(null)
          setPeiScore(null)
        }
        
        // 목표 데이터 설정 (people_goals 우선, 없으면 2506 데이터 사용)
        let finalGpsTarget = null
        let finalPeiTarget = null
        let finalRefreshOffTarget = null
        let finalCoachingTimeTarget = null
        
        console.log("🔍 Results: Debug goal data loading...")
        console.log("  - goalDataResult:", goalDataResult)
        console.log("  - fallbackTargetData:", fallbackTargetData)
        console.log("  - normalizedEmpno:", normalizedEmpno)
        console.log("  - fiveDigitEmpno:", fiveDigitEmpno)
        
        if (goalDataResult) {
          // people_goals에 데이터가 있으면 우선 사용
          finalGpsTarget = goalDataResult.gps_score
          finalPeiTarget = goalDataResult.pei_score
          finalRefreshOffTarget = goalDataResult.refresh_off_usage_rate
          finalCoachingTimeTarget = goalDataResult.coaching_time
          console.log("✅ Goal data from people_goals:", goalDataResult)
          console.log("  - GPS target:", finalGpsTarget)
          console.log("  - PEI target:", finalPeiTarget)
        } else {
          console.log("❌ Results: No people_goals data found, trying fallback...")
          if (fallbackTargetData) {
            // people_goals에 없으면 2506 데이터를 목표로 사용
            console.log("📊 Results: Using 2506 fallback data:", fallbackTargetData)
            const gpsItsValue = (fallbackTargetData as any)['GPS(ITS)']
            const gpsPeiValue = (fallbackTargetData as any)['GPS(PEI)']
            
            if (gpsItsValue && gpsItsValue !== '-') {
              finalGpsTarget = Math.round(parseFloat(gpsItsValue) * 100) // 0.71 → 71
              console.log(`  - GPS(ITS): ${gpsItsValue} → ${finalGpsTarget}%`)
            }
            if (gpsPeiValue && gpsPeiValue !== '-') {
              finalPeiTarget = Math.round(parseFloat(gpsPeiValue) * 100) // 0.82 → 82
              console.log(`  - GPS(PEI): ${gpsPeiValue} → ${finalPeiTarget}%`)
            }
            console.log("✅ Results: Goal data from 2506 fallback:", { 
              'GPS(ITS)': gpsItsValue, 
              'GPS(PEI)': gpsPeiValue, 
              finalGpsTarget, 
              finalPeiTarget 
            })
          } else {
            console.log("❌ Results: No fallback data available either!")
          }
        }
        
        setGoalData({
          gpsTarget: finalGpsTarget,
          peiTarget: finalPeiTarget,
          refreshOffTarget: finalRefreshOffTarget,
          coachingTimeTarget: finalCoachingTimeTarget
        })
        console.log("✅ Final goal data set:", { finalGpsTarget, finalPeiTarget, finalRefreshOffTarget, finalCoachingTimeTarget })

        // 코칭타임 실적 데이터 조회
        // readOnly 모드(리뷰어/마스터 리뷰어)에서는 shouldLoadCoaching이 true일 때만 조회
        if (!readOnly || shouldLoadCoaching) {
        try {
          const now = new Date()
          const year = now.getFullYear()
          const quarter = Math.ceil((now.getMonth() + 1) / 3)
          
          const { quarterHours, yearHours } = await PeopleGoalsService.getCoachingTimeStats(normalizedEmpno, year, quarter)
          
          setCoachingTimeData({
            quarterHours,
            yearHours,
            year,
            quarter
          })
          
          console.log("✅ Coaching time data loaded:", { quarterHours, yearHours, year, quarter })
        } catch (coachingError) {
          console.log("❌ 코칭타임 데이터 조회 에러:", coachingError)
          }
        } else {
          console.log("⚠️ ResultsTab: readOnly 모드 - People 탭 활성화 시 코칭 시간 조회 예정")
          setCoachingTimeData({
            quarterHours: 0,
            yearHours: 0,
            year: 0,
            quarter: 0
          })
        }
        
        // 팀원 코칭 시간 데이터 조회
        // readOnly 모드(리뷰어/마스터 리뷰어)에서는 shouldLoadCoaching이 true일 때만 조회
        if (!readOnly || shouldLoadCoaching) {
        setIsLoadingTeamData(true)
        try {
          const teamData = await PeopleGoalsService.getTeamCoachingTimeStats(normalizedEmpno)
          setTeamCoachingData(teamData)
          console.log("📊 Results: Team coaching data loaded:", teamData)
        } catch (error) {
          console.error("❌ Results: Error loading team coaching data:", error)
        } finally {
            setIsLoadingTeamData(false)
          }
        } else {
          console.log("⚠️ ResultsTab: readOnly 모드 - People 탭 활성화 시 팀 코칭 데이터 조회 예정")
          setTeamCoachingData([])
          setIsLoadingTeamData(false)
        }
        
        // 성과평가 데이터 설정
        if (performanceData) {
          const tier = performanceData.Tier
          const comment = performanceData.Comments
          
          if (tier && tier !== '') {
            setPerfTier(tier)
          } else {
            setPerfTier("정보 없음")
          }
          
          if (comment && comment !== '') {
            setPerfComment(comment)
          } else {
            setPerfComment("Upward Feedback 정보가 없습니다.")
          }
          
          console.log("✅ Performance data loaded:", { tier, comment })
        } else {
          // 데이터가 없으면 기본값 설정
          setPerfTier("정보 없음")
          setPerfComment("Upward Feedback 정보가 없습니다.")
          console.log("ℹ️ No performance data found")
        }
        
        // Refresh Off 데이터 설정 및 팀 전체 계산 (성능 최적화)
        if (refreshOffDataResult && Array.isArray(refreshOffDataResult)) {
          console.log("🔍 TL의 팀원들 HR 데이터:", refreshOffDataResult)
          
          // 팀원들의 사번 목록
          const teamEmpnos = refreshOffDataResult.map(member => member.EMPNO)
          console.log("🔍 팀원 사번 목록:", teamEmpnos)
          
          if (teamEmpnos.length > 0) {
            // ⚡ Phase 1: 휴가 정보 + 최신 활용률 날짜를 병렬로 조회
            //   (v_employee_core 뷰는 조인이 많아 타임아웃이 잦아 사용 안 함)
            const [leaveResult, latestUtilDateResult] = await Promise.all([
              supabase
                .from("a_leave_info")
                .select("EMPNO, SUM_TIME, RMN_TIME, BASE_YMD")
                .in("EMPNO", teamEmpnos)
                .order("BASE_YMD", { ascending: false }),

              // 최신 UTIL_DATE — 인덱스가 있다면 매우 빠름 (전사 단일 스냅샷 날짜)
              supabase
                .from("a_utilization")
                .select("UTIL_DATE")
                .order("UTIL_DATE", { ascending: false })
                .limit(1)
                .maybeSingle(),
            ])

            const { data: leaveData, error: leaveError } = leaveResult
            const latestUtilDateValue = latestUtilDateResult.data?.UTIL_DATE || null

            // ⚡ Phase 2: 그 날짜의 팀원 활용률 행만 조회 (v_employee_core 우회)
            let utilData: any[] | null = null
            let utilError: any = null
            if (latestUtilDateValue) {
              const utilRes = await supabase
                .from("a_utilization")
                .select("EMPNO, UTIL_A, UTIL_B, UTIL_DATE")
                .in("EMPNO", teamEmpnos)
                .eq("UTIL_DATE", latestUtilDateValue)

              utilError = utilRes.error
              if (utilRes.data) {
                // HR 정보는 refreshOffDataResult에서 재사용 (재조회 X)
                const hrMap = new Map<string, { EMPNM: string; CM_NM: string }>()
                refreshOffDataResult.forEach((hr: any) => {
                  hrMap.set(hr.EMPNO, { EMPNM: hr.EMPNM, CM_NM: hr.CM_NM })
                })
                utilData = utilRes.data.map(u => ({
                  EMPNO: u.EMPNO,
                  EMPNM: hrMap.get(u.EMPNO)?.EMPNM || u.EMPNO,
                  CM_NM: hrMap.get(u.EMPNO)?.CM_NM || '',
                  UTIL_A: u.UTIL_A,
                  UTIL_B: u.UTIL_B,
                  BASE_YMD: u.UTIL_DATE,
                }))
              }
            }

            // 최신 날짜는 Phase 1에서 이미 확보 → utilDateData 호환 형태로 래핑
            const utilDateData = latestUtilDateValue
              ? [{ UTIL_DATE: latestUtilDateValue }]
              : null
            
            if (leaveError) {
              // 타임아웃 에러인 경우 경고 로그만 출력하고 계속 진행 (빈 데이터로 처리)
              if ('code' in leaveError && (leaveError.code === '57014' || leaveError.message?.includes('statement timeout'))) {
                console.warn("⚠️ 팀원 휴가 데이터 조회 타임아웃 - 빈 데이터로 처리합니다:", leaveError.message)
              } else {
              console.log("❌ 팀원 휴가 데이터 조회 에러:", leaveError)
              }
              // 타임아웃 에러는 빈 데이터로 계속 진행, 다른 에러는 조기 리턴
              if (!('code' in leaveError && leaveError.code === '57014') && !leaveError?.message?.includes('statement timeout')) {
              return
              }
            }
            
            if (utilError) {
              if ('code' in utilError && (utilError.code === '57014' || utilError.message?.includes('statement timeout'))) {
                console.warn("⚠️ 팀원 활용률 데이터 조회 타임아웃 - 빈 데이터로 처리합니다:", utilError.message)
              } else {
              console.log("❌ 팀원 활용률 데이터 조회 에러:", utilError)
              }
            }
            
            console.log("🔍 팀원 휴가 데이터:", leaveData)
            console.log("🔍 팀원 활용률 데이터:", utilData)
            
            // ⚡ Map을 사용해 O(1) 조회 성능 최적화
            const leaveMap = new Map()
            const utilizationMap = new Map()
            
            // 각 사번별 최신 휴가 데이터 매핑
            if (leaveData) {
              leaveData.forEach(leave => {
                if (!leaveMap.has(leave.EMPNO)) {
                  leaveMap.set(leave.EMPNO, leave)
                }
              })
            }
            
            // 활용률 데이터 매핑
            if (utilData) {
              utilData.forEach(util => {
                utilizationMap.set(util.EMPNO, util)
              })
            }
            
            // 가장 최신 BASE_YMD 찾기
            const latestBaseDate = leaveData && leaveData.length > 0 ? leaveData[0]?.BASE_YMD : null
            const latestUtilDate = utilDateData && utilDateData.length > 0 ? utilDateData[0]?.UTIL_DATE : null
          
            // ⚡ 단일 반복문으로 모든 계산 처리
            let totalSumTime = 0
            let totalRmnTime = 0
            let utilASumForAvg = 0
            let utilBSumForAvg = 0
            let validUtilACount = 0
            let validUtilBCount = 0
            
            const teamDetails: any[] = []
            const utilizationTeamDetails: any[] = []
            
            refreshOffDataResult.forEach(member => {
              const empno = member.EMPNO
              
              // Refresh Off 계산
              const leaveInfo = leaveMap.get(empno) || { SUM_TIME: 0, RMN_TIME: 0, BASE_YMD: null }
              const sumTime = parseFloat(leaveInfo.SUM_TIME || 0) || 0
              const rmnTime = parseFloat(leaveInfo.RMN_TIME || 0) || 0
              const usedTime = sumTime - rmnTime
              const usageRate = sumTime > 0 ? Math.round((usedTime / sumTime) * 100 * 100) / 100 : 0
              
              totalSumTime += sumTime
              totalRmnTime += rmnTime
              
              teamDetails.push({
                empno: member.EMPNO,
                empnm: member.EMPNM,
                cm_nm: member.CM_NM,
                sumTime,
                rmnTime,
                usedTime,
                usageRate,
                baseDate: leaveInfo.BASE_YMD
              })
              
              // 활용률 계산
              const utilInfo = utilizationMap.get(empno)
              if (utilInfo) {
                const utilA = parseFloat(utilInfo.UTIL_A) || 0
                const utilB = parseFloat(utilInfo.UTIL_B) || 0
                
                if (utilInfo.UTIL_A !== null && utilInfo.UTIL_A !== "") {
                  utilASumForAvg += utilA
                  validUtilACount++
                }
                
                if (utilInfo.UTIL_B !== null && utilInfo.UTIL_B !== "") {
                  utilBSumForAvg += utilB
                  validUtilBCount++
                }
                
                utilizationTeamDetails.push({
                  empno: member.EMPNO,
                  empnm: member.EMPNM,
                  cm_nm: member.CM_NM,
                  utilA,
                  utilB,
                })
              }
            })
            
            const totalUsedTime = totalSumTime - totalRmnTime
            const teamUsageRate = totalSumTime > 0 ? Math.round((totalUsedTime / totalSumTime) * 100 * 100) / 100 : 0
            
            const utilAAverage = validUtilACount > 0 ? Math.round((utilASumForAvg / validUtilACount) * 100) / 100 : 0
            const utilBAverage = validUtilBCount > 0 ? Math.round((utilBSumForAvg / validUtilBCount) * 100) / 100 : 0
            
            console.log("🧮 Team calculation (최적화):", {
              teamCount: refreshOffDataResult.length,
              totalSumTime,
              totalRmnTime,
              totalUsedTime,
              teamUsageRate,
              utilAAverage,
              utilBAverage
            })
            
            // 상태 업데이트
            setRefreshOffData({
              usageRate: teamUsageRate,
              sumTime: totalSumTime,
              rmnTime: totalRmnTime,
              usedTime: totalUsedTime,
              teamDetails: teamDetails,
              baseDate: latestBaseDate
            })

            setUtilizationData({
              utilAAverage,
              utilBAverage,
              teamDetails: utilizationTeamDetails,
              utilDate: latestUtilDate
            })
          }
        } else {
          console.log("❌ No team members found for TL")
        }

        // DoAE Interim 다면평가결과 데이터 조회
        try {
          console.log("🔍 DoAE Interim 다면평가결과 조회 시작:", { targetEmpno, normalizedEmpno, fiveDigitEmpno })
          
          let teamData = null
          let partnerData = null
          
          // 권한 확인
          const user = AuthService.getCurrentUser()
          const { ReviewerService } = await import("@/lib/reviewer-service")
          const userRoleInfo = await ReviewerService.getUserRole(user?.empno || '')
          
          setUserRole({
            isSecondaryReviewer: userRoleInfo.isReviewer,
            isMaster: userRoleInfo.isMaster
          })
          
          console.log(`🔐 사용자 권한:`, { isReviewer: userRoleInfo.isReviewer, isMaster: userRoleInfo.isMaster })
          
          // 1. 팀 평가결과 조회
          let allTeamData = null
          
          // 전체 팀 데이터 조회
          const { data: allTeams, error: allTeamError } = await supabase
            .from("evaluation_team")
            .select("*")
            .order("평균", { ascending: false })
          
          if (!allTeamError && allTeams) {
            allTeamData = allTeams
            console.log(`✅ 전체 팀 데이터 로드 (${allTeams.length}개)`)
          }
          
          // 현재 사용자 팀 데이터 조회
          if (hrData && (hrData as any).CM_NM) {
            const cmNm = (hrData as any).CM_NM
            console.log(`🔍 팀 평가결과 조회 - 팀(CM_NM): ${cmNm}`)
            
            const { data, error: teamError } = await supabase
              .from("evaluation_team")
              .select("*")
              .eq("구분", cmNm)
              .maybeSingle()
            
            console.log(`  팀 평가결과 조회 결과:`, { data, error: teamError })
            
            if (!teamError && data) {
              teamData = data
              console.log(`✅ 팀 평가결과 데이터 발견 (팀: ${cmNm}):`, teamData)
            } else {
              console.log(`ℹ️ 팀 평가결과 데이터 없음 (팀: ${cmNm})`)
            }
          } else {
            console.log("⚠️ HR 데이터에 팀(CM_NM) 정보가 없습니다")
          }
          
          // 2. 파트너 평가결과 조회 - 사번 변형 일괄 .in() 조회 (정수형 + 문자열)
          const partnerEmpnoVariations: (string | number)[] = Array.from(new Set([
            parseInt(targetEmpno),
            parseInt(normalizedEmpno),
            parseInt(fiveDigitEmpno),
            targetEmpno,
            normalizedEmpno,
            fiveDigitEmpno,
          ].filter((v: any) => v !== undefined && v !== null && !Number.isNaN(v))))

          const { data: partnerRows, error: partnerError } = await supabase
            .from("evaluation_partner")
            .select(`
              사번,
              성명,
              평가자,
              응답수,
              회신률,
              소속,
              직위,
              "1",
              "2",
              "3",
              "4",
              합계,
              평균,
              등급,
              "Comment 1",
              "Comment 2"
            `)
            .in("사번", partnerEmpnoVariations)
            .limit(1)

          if (partnerError) {
            console.error('❌ 파트너 평가결과 조회 실패:', partnerError)
          } else if (partnerRows && partnerRows.length > 0) {
            partnerData = partnerRows[0]
            console.log(`✅ 파트너 평가결과 데이터 발견:`, partnerData)
          } else {
            console.log(`ℹ️ 파트너 평가결과 데이터 없음 - 조회한 사번:`, partnerEmpnoVariations)
          }
          
          setEvaluationData({
            teamData,
            partnerData,
            allTeamData,
            loading: false
          })
          
          console.log("✅ DoAE Interim 다면평가결과 로드 완료:", { teamData, partnerData, allTeamCount: allTeamData?.length })
        } catch (evalError) {
          console.error("❌ DoAE Interim 다면평가결과 조회 에러:", evalError)
          setEvaluationData({
            teamData: null,
            partnerData: null,
            allTeamData: null,
            loading: false
          })
        }

      } catch (error) {
        console.log("ℹ️ Could not load data:", error)
        setUserInfo({
          empno: targetEmpno,
          empnm: targetEmpno,
          org_nm: null,
        })
        // 에러 시에도 기본값 설정
        setPerfTier("정보 없음")
        setPerfComment("데이터를 불러올 수 없습니다.")
      } finally {
        setLoading(false)
      }
    }
    
    loadUserInfo()
  }, [empno, readOnly, shouldLoadCoaching])

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "EP":
        return "bg-[#DE6100]"
      case "HP":
        return "bg-[#E76200]"
      case "ME":
        return "bg-orange-500"
      case "정보 없음":
        return "bg-gray-400"
      default:
        return "bg-slate-500"
    }
  }

  // 코멘트 텍스트 포맷팅: 번호가 있는 항목들의 마침표를 쉼표로 변경 (마지막 항목 제외)
  const formatComment = (comment: string | null | undefined): string => {
    if (!comment) return ''
    
    // 1), 2), 3) 등의 패턴이 있는지 확인
    const hasNumberedItems = /\d+\)/g.test(comment)
    
    if (!hasNumberedItems) {
      return comment
    }
    
    // 1) ... 2) ... 3) ... 형태를 찾아서 처리
    // 각 번호 항목을 찾아서, 다음 번호 항목 전까지의 텍스트에서 마지막 마침표를 쉼표로 변경
    let result = comment
    
    // 모든 번호 패턴의 위치를 찾기
    const numberPattern = /(\d+\))/g
    const matches = [...comment.matchAll(numberPattern)]
    
    if (matches.length > 1) {
      // 여러 항목이 있는 경우
      for (let i = 0; i < matches.length - 1; i++) {
        const currentMatch = matches[i]
        const nextMatch = matches[i + 1]
        
        if (currentMatch.index !== undefined && nextMatch.index !== undefined) {
          // 현재 번호와 다음 번호 사이의 텍스트
          const startIdx = currentMatch.index
          const endIdx = nextMatch.index
          const segment = comment.substring(startIdx, endIdx)
          
          // 이 세그먼트의 마지막 마침표를 쉼표로 변경
          const lastPeriodIdx = segment.lastIndexOf('.')
          if (lastPeriodIdx !== -1) {
            const beforePeriod = segment.substring(0, lastPeriodIdx)
            const afterPeriod = segment.substring(lastPeriodIdx + 1)
            const newSegment = beforePeriod + ',' + afterPeriod
            
            result = result.substring(0, startIdx) + newSegment + result.substring(endIdx)
          }
        }
      }
    }
    
    return result
  }

  // GPS 달성률 계산
  const getGpsAchievement = () => {
    const target = goalData.gpsTarget || 0
    
    if (!gpsScore || gpsScore === '-') {
      // 실제 데이터가 없어도 목표값은 보여줌
      return { rate: 0, actual: 0, target }
    }
    
    if (!target) {
      return { rate: 0, actual: 0, target: 0 }
    }
    
    const actual = parseFloat(gpsScore) * 100 // 0.71 → 71%
    const rate = Math.round((actual / target) * 100)
    return { rate, actual, target }
  }

  // PEI 달성률 계산
  const getPeiAchievement = () => {
    const target = goalData.peiTarget || 0
    
    if (!peiScore || peiScore === '-') {
      // 실제 데이터가 없어도 목표값은 보여줌
      return { rate: 0, actual: 0, target }
    }
    
    if (!target) {
      return { rate: 0, actual: 0, target: 0 }
    }
    
    const actual = parseFloat(peiScore) * 100 // 0.82 → 82%
    const rate = Math.round((actual / target) * 100)
    return { rate, actual, target }
  }

  // Refresh Off 달성률 계산 함수 추가
  const getRefreshOffAchievement = () => {
    if (refreshOffData.usageRate === null) {
      return { rate: 0, actual: 0, target: goalData.refreshOffTarget || 0 }
    }
    const actual = refreshOffData.usageRate
    const target = goalData.refreshOffTarget || 100 // 목표가 없으면 100%로 기본값
    const rate = Math.round((actual / target) * 100)
    return { rate, actual, target }
  }

  // 코칭타임 달성률 계산 함수 (회계연도 누적 기준)
  const getCoachingTimeAchievement = () => {
    if (!coachingTimeData.yearHours || !goalData.coachingTimeTarget) {
      return { rate: 0, actual: 0, target: 0 }
    }
    const actual = coachingTimeData.yearHours
    const target = goalData.coachingTimeTarget
    const rate = Math.round((actual / target) * 100)
    return { rate, actual, target }
  }

  // 매 렌더마다 재계산되던 파생값들을 의존성 기반 메모이즈
  const gpsAchievement = useMemo(() => getGpsAchievement(), [gpsScore, goalData.gpsTarget])
  const peiAchievement = useMemo(() => getPeiAchievement(), [peiScore, goalData.peiTarget])
  const refreshOffAchievement = useMemo(() => getRefreshOffAchievement(), [refreshOffData.usageRate, goalData.refreshOffTarget])
  const coachingTimeAchievement = useMemo(() => getCoachingTimeAchievement(), [coachingTimeData.yearHours, goalData.coachingTimeTarget])

  // 팀 전체 코칭 시간 계산 (배열 변할 때만)
  const totalTeamCoachingHours = useMemo(
    () => teamCoachingData.reduce((sum, member) => sum + member.totalCoachingHours, 0),
    [teamCoachingData]
  )

  // 평가팀 전체 평균 (allTeamData.filter().reduce() 매 렌더 방지)
  const allTeamAverage = useMemo(() => {
    const list = (evaluationData.allTeamData || []).filter((t: any) => t.구분 !== '공통')
    if (list.length === 0) return null
    const sum = list.reduce((s: number, t: any) => s + (parseFloat(t.평균) || 0), 0)
    return sum / list.length
  }, [evaluationData.allTeamData])

  // 팀 파트너 평균
  const teamPartnersAverage = useMemo(() => {
    if (teamPartners.length === 0) return null
    return teamPartners.reduce((s, p) => s + (parseFloat(p.평균) || 0), 0) / teamPartners.length
  }, [teamPartners])

  // 전체 파트너 평균
  const allPartnersAverage = useMemo(() => {
    if (allPartners.length === 0) return null
    return allPartners.reduce((s, p) => s + (parseFloat(p.평균) || 0), 0) / allPartners.length
  }, [allPartners])

  // 팀원 상세 정보 다이얼로그 컴포넌트
  const TeamCoachingDetailDialog = () => (
    <Dialog open={isTeamDetailDialogOpen} onOpenChange={setIsTeamDetailDialogOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            팀원 코칭 시간 상세 (PRJTCD 기준)
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
            <div className="text-sm text-orange-800 dark:text-orange-200">
              <strong>총 {teamCoachingData.length}명</strong>의 팀원 • 
              <strong> 누적 {totalTeamCoachingHours}시간</strong> • 
              평균 {teamCoachingData.length > 0 ? Math.round(totalTeamCoachingHours / teamCoachingData.length) : 0}시간/인
            </div>
          </div>
          
          <TableComponent>
            <TableHeader>
              <TableRow>
                <TableHead>사번</TableHead>
                <TableHead>성명</TableHead>
                <TableHead>조직</TableHead>
                <TableHead>직급</TableHead>
                <TableHead className="text-right">누적 시간</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamCoachingData.map((member) => (
                <TableRow key={member.empno}>
                  <TableCell className="font-mono text-sm">{member.empno}</TableCell>
                  <TableCell className="font-medium">{member.empnm}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{member.org_nm}</TableCell>
                  <TableCell className="text-sm">{member.gradnm}</TableCell>
                  <TableCell className="text-right font-bold text-orange-600">
                    {member.totalCoachingHours}시간
                  </TableCell>
                </TableRow>
              ))}
              {teamCoachingData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    팀원 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </TableComponent>
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <TooltipProvider>
      <div className="relative">


        <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-medium">결과</h2>
        </div>

        {/* 팀원 코칭 시간 상세 다이얼로그 */}
        <TeamCoachingDetailDialog />

        {/* 1행: Util A, B */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Util A Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Util A</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-2">
                <div className="text-2xl font-bold">
                  {utilizationData.utilAAverage !== null ? `${utilizationData.utilAAverage}%` : '-%'}
                </div>
                <div className="text-xs text-gray-400">
                  {utilizationData.utilDate && (
                    <div className="text-xs text-muted-foreground mt-1">
                      대상기간: 2025-04-01 ~ {new Date(utilizationData.utilDate).toLocaleDateString('ko-KR').replace(/\. /g, '-').replace(/\.$/, '')}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>평균: {utilizationData.utilAAverage !== null ? `${utilizationData.utilAAverage}%` : '-%'}</span>
                  <span>기준: 100%</span>
                </div>
                <Progress 
                  value={utilizationData.utilAAverage !== null ? Math.min(utilizationData.utilAAverage, 100) : 0} 
                  className="h-1.5" 
                />
              </div>
              
              {/* 팀 Util A 상세보기 버튼 */}
              {utilizationData.teamDetails && utilizationData.teamDetails.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="mr-2 h-4 w-4" />
                        팀 Util A 상세 보기 ({utilizationData.teamDetails.length}명)
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>팀 Util A 상세 현황</DialogTitle>
                        {utilizationData.utilDate && (
                          <div className="text-sm text-muted-foreground">
                            대상기간: 2025-04-01 ~ {new Date(utilizationData.utilDate).toLocaleDateString('ko-KR').replace(/\. /g, '-').replace(/\.$/, '')}
                          </div>
                        )}
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {utilizationData.utilAAverage !== null ? `${utilizationData.utilAAverage}%` : '-%'}
                          </div>
                          <div className="text-sm text-blue-600 dark:text-blue-400">팀 평균 Util A</div>
                        </div>
                        
                        <TableComponent>
                          <TableHeader>
                            <TableRow>
                              <TableHead>사번</TableHead>
                              <TableHead>이름</TableHead>
                              <TableHead>소속</TableHead>
                              <TableHead className="text-right">Util A (%)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {utilizationData.teamDetails.map((member, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{member.empno}</TableCell>
                                <TableCell>{member.empnm}</TableCell>
                                <TableCell>{member.cm_nm}</TableCell>
                                <TableCell className="text-right">
                                  <span className={`font-bold ${
                                    member.utilA >= 100 ? 'text-green-600' : 
                                    member.utilA >= 80 ? 'text-amber-600' : 'text-red-600'
                                  }`}>
                                    {member.utilA}%
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </TableComponent>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Util B Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Util B</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-2">
                <div className="text-2xl font-bold">
                  {utilizationData.utilBAverage !== null ? `${utilizationData.utilBAverage}%` : '-%'}
                </div>
                <div className="text-xs text-gray-400">
                  {utilizationData.utilDate && (
                    <div className="text-xs text-muted-foreground mt-1">
                      대상기간: 2025-04-01 ~ {new Date(utilizationData.utilDate).toLocaleDateString('ko-KR').replace(/\. /g, '-').replace(/\.$/, '')}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>평균: {utilizationData.utilBAverage !== null ? `${utilizationData.utilBAverage}%` : '-%'}</span>
                  <span>기준: 100%</span>
                </div>
                <Progress 
                  value={utilizationData.utilBAverage !== null ? Math.min(utilizationData.utilBAverage, 100) : 0} 
                  className="h-1.5" 
                />
              </div>
              
              {/* 팀 Util B 상세보기 버튼 */}
              {utilizationData.teamDetails && utilizationData.teamDetails.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="mr-2 h-4 w-4" />
                        팀 Util B 상세 보기 ({utilizationData.teamDetails.length}명)
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>팀 Util B 상세 현황</DialogTitle>
                        {utilizationData.utilDate && (
                          <div className="text-sm text-muted-foreground">
                            대상기간: 2025-04-01 ~ {new Date(utilizationData.utilDate).toLocaleDateString('ko-KR').replace(/\. /g, '-').replace(/\.$/, '')}
                          </div>
                        )}
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {utilizationData.utilBAverage !== null ? `${utilizationData.utilBAverage}%` : '-%'}
                          </div>
                          <div className="text-sm text-green-600 dark:text-green-400">팀 평균 Util B</div>
                        </div>
                        
                        <TableComponent>
                          <TableHeader>
                            <TableRow>
                              <TableHead>사번</TableHead>
                              <TableHead>이름</TableHead>
                              <TableHead>소속</TableHead>
                              <TableHead className="text-right">Util B (%)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {utilizationData.teamDetails.map((member, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{member.empno}</TableCell>
                                <TableCell>{member.empnm}</TableCell>
                                <TableCell>{member.cm_nm}</TableCell>
                                <TableCell className="text-right">
                                  <span className={`font-bold ${
                                    member.utilB >= 100 ? 'text-green-600' : 
                                    member.utilB >= 80 ? 'text-amber-600' : 'text-red-600'
                                  }`}>
                                    {member.utilB}%
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </TableComponent>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 2행: PEI Score, GPS Score, Staff Coaching Time */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* PEI Score Card - 먼저 배치 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                GPS(PEI) Score
                {userInfo?.org_nm && (
                  <span className="text-xs text-muted-foreground font-normal ml-2">
                    - {userInfo.org_nm}
                  </span>
                )}
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-2">
                <div className="text-2xl font-bold">
                  {peiAchievement.actual > 0 ? `${peiAchievement.actual}%` : '-%'}
                </div>
                <div className="text-xs text-gray-400">
                  2606 기준
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>실제: {peiAchievement.actual > 0 ? `${peiAchievement.actual}%` : '-'}</span>
                  <span>목표: {peiAchievement.target > 0 ? `${peiAchievement.target}%` : '-'}</span>
                </div>
                <Progress value={peiAchievement.rate > 0 ? Math.min(peiAchievement.rate, 100) : 0} className="h-1.5" />
                <div className="text-center">
                  <span className={`text-xs font-medium ${peiAchievement.rate >= 100 ? 'text-green-600' : peiAchievement.rate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                    {peiAchievement.rate > 0 ? `달성률 ${peiAchievement.rate}%` : '데이터 없음'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* GPS Score Card - 두 번째 배치 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                GPS(ITS) Score
                {userInfo?.org_nm && (
                  <span className="text-xs text-muted-foreground font-normal ml-2">
                    - {userInfo.org_nm}
                  </span>
                )}
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-500 mb-2 text-left">
                * ITS: intend to stay (조직 잔류 의향)
              </div>
              <div className="flex justify-between items-center mb-2">
                <div className="text-2xl font-bold">
                  {gpsAchievement.actual > 0 ? `${gpsAchievement.actual}%` : '-%'}
                </div>
                <div className="text-xs text-gray-400">
                  2606 기준
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>실제: {gpsAchievement.actual > 0 ? `${gpsAchievement.actual}%` : '-'}</span>
                  <span>목표: {gpsAchievement.target > 0 ? `${gpsAchievement.target}%` : '-'}</span>
                </div>
                <Progress value={gpsAchievement.rate > 0 ? Math.min(gpsAchievement.rate, 100) : 0} className="h-1.5" />
                <div className="text-center">
                  <span className={`text-xs font-medium ${gpsAchievement.rate >= 100 ? 'text-green-600' : gpsAchievement.rate >= 80 ? 'text-amber-600' : gpsAchievement.rate > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {gpsAchievement.rate > 0 ? `달성률 ${gpsAchievement.rate}%` : '데이터 없음'}
                  </span>
                  {gpsAchievement.rate === 0 && (
                    <div className="text-xs text-gray-400 mt-1 text-left">
                      * ITS: intend to stay (조직 잔류 의향)
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Staff Coaching Time Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Coaching Time (회계연도 누적)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-2">
              <div className="text-2xl font-bold">
                {coachingTimeData.yearHours > 0 ? `${coachingTimeData.yearHours} 시간` : '- 시간'}
              </div>
              <div className="flex items-center gap-1">
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-400">
                  {coachingTimeAchievement.rate > 0 ? `${coachingTimeAchievement.rate}%` : '-%'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>실제: {coachingTimeData.yearHours > 0 ? `${coachingTimeData.yearHours} 시간` : '- 시간'}</span>
                <span>목표: {goalData.coachingTimeTarget || '-'} 시간</span>
              </div>
              <Progress 
                value={coachingTimeAchievement.rate > 0 ? Math.min(coachingTimeAchievement.rate, 100) : 0} 
                className="h-1.5" 
              />
              <div className="text-center">
                <span className={`text-xs font-medium ${
                  coachingTimeAchievement.rate >= 100 ? 'text-green-600' : 
                  coachingTimeAchievement.rate >= 80 ? 'text-amber-600' : 
                  coachingTimeAchievement.rate > 0 ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {coachingTimeAchievement.rate > 0 ? `달성률 ${coachingTimeAchievement.rate}%` : '데이터 없음'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground text-center mt-1">
                2025-Q3 ~ 2026-Q2
              </div>
            </div>

            {/* 팀원 코칭 시간 상세보기 추가 */}
            {teamCoachingData.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">팀 전체 누적</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-orange-600">
                      {isLoadingTeamData ? "..." : `${totalTeamCoachingHours}시간`}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsTeamDetailDialogOpen(true)}
                      className="h-6 px-2 text-xs border-orange-300 hover:bg-orange-100"
                      disabled={isLoadingTeamData}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      상세
                    </Button>
                  </div>
                </div>
                
                <div className="text-xs text-orange-600 dark:text-orange-400">
                  팀원 {teamCoachingData.length}명 • 
                  평균 {teamCoachingData.length > 0 ? Math.round(totalTeamCoachingHours / teamCoachingData.length) : 0}시간/인
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        {/* 3행: Refresh Off + Upward Feedback */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Refresh Off Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refresh Off 사용률(%)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-2">
              <div className="text-2xl font-bold">
                {refreshOffData.usageRate !== null ? `${refreshOffData.usageRate}%` : '-%'}
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1">
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-400">
                    {refreshOffAchievement.rate > 0 ? `${refreshOffAchievement.rate}%` : '-%'}
                  </span>
                </div>
                {refreshOffData.baseDate && (
                  <div className="text-xs text-muted-foreground mt-1">
                    기준: {new Date(refreshOffData.baseDate).toLocaleDateString('ko-KR')}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>실제: {refreshOffData.usageRate !== null ? `${refreshOffData.usageRate}%` : '-%'}</span>
                <span>목표: {goalData.refreshOffTarget || '-'}%</span>
              </div>
              <Progress 
                value={refreshOffData.usageRate !== null ? Math.min(refreshOffAchievement.rate, 100) : 0} 
                className="h-1.5" 
              />
              <div className="text-center">
                <span className={`text-xs font-medium ${
                  refreshOffData.usageRate !== null ? (
                    refreshOffAchievement.rate >= 100 ? 'text-green-600' : 
                    refreshOffAchievement.rate >= 80 ? 'text-amber-600' : 'text-red-600'
                  ) : 'text-gray-500'
                }`}>
                  {refreshOffData.usageRate !== null ? `달성률 ${refreshOffAchievement.rate}%` : '데이터 없음'}
                </span>
              </div>
            </div>
            
            {/* 상세 정보 표시 (총시간, 잔여시간, 소진시간) */}
            {refreshOffData.sumTime !== null && (
              <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="text-center">
                    <div className="text-muted-foreground">총시간</div>
                    <div className="font-bold">{refreshOffData.sumTime}h</div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground">잔여시간</div>
                    <div className="font-bold">{refreshOffData.rmnTime}h</div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground">소진시간</div>
                    <div className="font-bold">{refreshOffData.usedTime}h</div>
                  </div>
                </div>
                
                {/* 팀 상세 보기 버튼 */}
                {refreshOffData.teamDetails && refreshOffData.teamDetails.length > 0 && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <Table className="mr-2 h-4 w-4" />
                        팀 상세 데이터 보기 ({refreshOffData.teamDetails.length}명)
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>팀 Refresh Off 상세 현황</DialogTitle>
                        {refreshOffData.baseDate && (
                          <div className="text-sm text-muted-foreground">
                            기준일자: {new Date(refreshOffData.baseDate).toLocaleDateString('ko-KR')}
                          </div>
                        )}
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            총 {refreshOffData.teamDetails.length}명
                          </span>
                          <span className="text-lg font-bold">
                            팀 평균 사용률: {refreshOffData.usageRate}%
                          </span>
                        </div>
                        <TableComponent>
                          <TableHeader>
                            <TableRow>
                              <TableHead>사번</TableHead>
                              <TableHead>이름</TableHead>
                              <TableHead>소속</TableHead>
                              <TableHead className="text-right">총시간</TableHead>
                              <TableHead className="text-right">잔여시간</TableHead>
                              <TableHead className="text-right">소진시간</TableHead>
                              <TableHead className="text-right">사용률(%)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {refreshOffData.teamDetails.map((member, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{member.empno}</TableCell>
                                <TableCell>{member.empnm}</TableCell>
                                <TableCell>{member.cm_nm}</TableCell>
                                <TableCell className="text-right">{member.sumTime.toLocaleString()}h</TableCell>
                                <TableCell className="text-right">{member.rmnTime.toLocaleString()}h</TableCell>
                                <TableCell className="text-right font-bold text-blue-600">
                                  {member.usedTime.toLocaleString()}h
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                  {member.usageRate}%
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </TableComponent>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upward Feedback Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold">Upward Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[120px_1fr]">
              {/* 티어 */}
              <div className="p-6 flex flex-col items-center justify-center border-r border-slate-200 dark:border-slate-600">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">Tier</div>
                <div className={`w-14 h-14 ${getTierColor(perfTier)} rounded-full flex items-center justify-center shadow-lg`}>
                  <span className="text-white font-bold text-xs text-center px-1">
                    {perfTier === "정보 없음" ? "N/A" : perfTier}
                  </span>
                </div>
              </div>
              {/* 코멘트 */}
              <div className="p-6 flex flex-col">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">Comment</div>
                <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {perfComment}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* DoAE Interim 다면평가결과 섹션 */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">DoAE Interim 다면평가결과</h2>

          {/* 파트너 평가결과 Card - Full Width, Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">파트너 평가결과</CardTitle>
              <div className="flex gap-2">
                {userRole.isSecondaryReviewer && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const { ReviewerService } = await import("@/lib/reviewer-service")
                      
                      // 1. 리뷰 대상자의 정규화된 사번으로 팀원 목록 가져오기
                      const targetEmpno = empno || AuthService.getCurrentUser()?.empno
                      const normalizedTargetEmpno = ReviewerService.normalizeEmpno(targetEmpno || '')
                      
                      // 2. a_hr_master에서 팀원들의 사번 목록 가져오기
                      const { data: teamMembers } = await supabase
                        .from("a_hr_master")
                        .select("EMPNO, EMPNM, CM_NM")
                        .eq("TL_EMPNO", normalizedTargetEmpno)
                      
                      if (!teamMembers || teamMembers.length === 0) {
                        setTeamPartners([])
                        setIsTeamPartnersDialogOpen(true)
                        return
                      }
                      
                      // 3. 팀원들의 사번으로 evaluation_partner 조회 (여러 형식 시도)
                      const teamEmpnos = teamMembers.map(m => m.EMPNO)
                      const empnoVariations = teamEmpnos.flatMap(empno => [
                        empno,                          // 095129
                        parseInt(empno),                // 95129 (정수)
                        empno.replace(/^0+/, ''),      // 95129 (문자열)
                      ])
                      
                      const { data } = await supabase
                        .from("evaluation_partner")
                        .select(`
                          사번,
                          성명,
                          평가자,
                          응답수,
                          회신률,
                          소속,
                          직위,
                          "1",
                          "2",
                          "3",
                          "4",
                          합계,
                          평균,
                          등급,
                          "Comment 1",
                          "Comment 2"
                        `)
                        .in("사번", empnoVariations)
                        .order("평균", { ascending: false })
                      
                      // 4. 조회된 데이터의 사번도 정규화
                      const normalizedData = (data as any[] || []).map((partner: any) => ({
                        ...partner,
                        사번: ReviewerService.normalizeEmpno(partner.사번?.toString() || '')
                      }))
                      
                      setTeamPartners(normalizedData)
                      setIsTeamPartnersDialogOpen(true)
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    팀 파트너
                  </Button>
                )}
                {userRole.isMaster && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const { ReviewerService } = await import("@/lib/reviewer-service")
                      
                      // 1. a_hr_master에서 모든 파트너급(TL_EMPNO가 있는) 사번 가져오기
                      const { data: allTeamLeaders } = await supabase
                        .from("a_hr_master")
                        .select("EMPNO, EMPNM, CM_NM")
                        .not("TL_EMPNO", "is", null)
                      
                      if (!allTeamLeaders || allTeamLeaders.length === 0) {
                        // fallback: 전체 조회
                      const { data } = await supabase
                        .from("evaluation_partner")
                        .select(`
                          사번,
                          성명,
                          평가자,
                          응답수,
                          회신률,
                          소속,
                          직위,
                          "1",
                          "2",
                          "3",
                          "4",
                          합계,
                          평균,
                          등급,
                          "Comment 1",
                          "Comment 2"
                        `)
                        .order("평균", { ascending: false })
                        
                        const normalizedData = (data as any[] || []).map((partner: any) => ({
                          ...partner,
                          사번: ReviewerService.normalizeEmpno(partner.사번?.toString() || '')
                        }))
                        
                        setAllPartners(normalizedData)
                        setIsAllPartnersDialogOpen(true)
                        return
                      }
                      
                      // 2. TL들의 사번으로 evaluation_partner 조회 (여러 형식 시도)
                      const allEmpnos = [...new Set(allTeamLeaders.map(m => m.EMPNO))]
                      const empnoVariations = allEmpnos.flatMap(empno => [
                        empno,                          // 095129
                        parseInt(empno),                // 95129 (정수)
                        empno.replace(/^0+/, ''),      // 95129 (문자열)
                      ])
                      
                      const { data } = await supabase
                        .from("evaluation_partner")
                        .select(`
                          사번,
                          성명,
                          평가자,
                          응답수,
                          회신률,
                          소속,
                          직위,
                          "1",
                          "2",
                          "3",
                          "4",
                          합계,
                          평균,
                          등급,
                          "Comment 1",
                          "Comment 2"
                        `)
                        .in("사번", empnoVariations)
                        .order("평균", { ascending: false })
                      
                      // 3. 조회된 데이터의 사번도 정규화
                      const normalizedData = (data as any[] || []).map((partner: any) => ({
                        ...partner,
                        사번: ReviewerService.normalizeEmpno(partner.사번?.toString() || '')
                      }))
                      
                      setAllPartners(normalizedData)
                      setIsAllPartnersDialogOpen(true)
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    전체 파트너
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {evaluationData.loading ? (
                <div className="flex items-center justify-center h-32 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="text-sm text-muted-foreground">로딩 중...</div>
                </div>
              ) : evaluationData.partnerData ? (
                <div className="overflow-x-auto">
                  <TableComponent>
                    <TableHeader>
                      <TableRow>
                        <TableHead>사번</TableHead>
                        <TableHead>성명</TableHead>
                        <TableHead className="text-right">평가자</TableHead>
                        <TableHead className="text-right">응답수</TableHead>
                        <TableHead className="text-right">회신률</TableHead>
                        <TableHead>소속</TableHead>
                        <TableHead>직위</TableHead>
                        <TableHead className="text-right">
                          <Tooltip>
                            <TooltipTrigger>Q1 <Info className="inline h-3 w-3" /></TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              1. 파트너는 Audit Enhancement 관련 목표와 방향을 명확히 공유했나요? (5점 만점)
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-right">
                          <Tooltip>
                            <TooltipTrigger>Q2 <Info className="inline h-3 w-3" /></TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              2. 파트너 주도하에 시간과 자원을 제배분하여 핵심위험과 고객 Value에 집중하는 변화를 가져왔나요? (5점 만점)
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-right">
                          <Tooltip>
                            <TooltipTrigger>Q3 <Info className="inline h-3 w-3" /></TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              3. 파트너는 Audit Enhancement 활동에 적극적으로 참여하여 업무 효율성 향상에 기여했다고 생각하나요? (5점 만점)
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-right">
                          <Tooltip>
                            <TooltipTrigger>Q4 <Info className="inline h-3 w-3" /></TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              4. 파트너는 AI/Digital Tool 활용을 강조하고 주도하였나요? (5점 만점)
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-right">합계</TableHead>
                        <TableHead className="text-right">평균</TableHead>
                        <TableHead>등급</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-mono text-sm">{evaluationData.partnerData.사번}</TableCell>
                        <TableCell className="font-medium">{evaluationData.partnerData.성명}</TableCell>
                        <TableCell className="text-right">{evaluationData.partnerData.평가자}</TableCell>
                        <TableCell className="text-right">{evaluationData.partnerData.응답수}</TableCell>
                        <TableCell className="text-right">{evaluationData.partnerData.회신률}</TableCell>
                        <TableCell className="text-sm">{evaluationData.partnerData.소속}</TableCell>
                        <TableCell>{evaluationData.partnerData.직위}</TableCell>
                        <TableCell className="text-right font-medium">{evaluationData.partnerData['1']}</TableCell>
                        <TableCell className="text-right font-medium">{evaluationData.partnerData['2']}</TableCell>
                        <TableCell className="text-right font-medium">{evaluationData.partnerData['3']}</TableCell>
                        <TableCell className="text-right font-medium">{evaluationData.partnerData['4']}</TableCell>
                        <TableCell className="text-right font-bold">{evaluationData.partnerData.합계}</TableCell>
                        <TableCell className="text-right font-bold">{evaluationData.partnerData.평균}</TableCell>
                        <TableCell>
                          <Badge variant={evaluationData.partnerData.등급 === 'EP' ? 'default' : 'secondary'}>
                            {evaluationData.partnerData.등급}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </TableComponent>
                  
                  {/* 질문 상세 안내 */}
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs space-y-1">
                    <div><strong>Q1:</strong> 파트너는 Audit Enhancement 관련 목표와 방향을 명확히 공유했나요? <span className="text-muted-foreground">(5점 만점)</span></div>
                    <div><strong>Q2:</strong> 파트너 주도하에 시간과 자원을 제배분하여 핵심위험과 고객 Value에 집중하는 변화를 가져왔나요? <span className="text-muted-foreground">(5점 만점)</span></div>
                    <div><strong>Q3:</strong> 파트너는 Audit Enhancement 활동에 적극적으로 참여하여 업무 효율성 향상에 기여했다고 생각하나요? <span className="text-muted-foreground">(5점 만점)</span></div>
                    <div><strong>Q4:</strong> 파트너는 AI/Digital Tool 활용을 강조하고 주도하였나요? <span className="text-muted-foreground">(5점 만점)</span></div>
                  </div>
                  
                  {/* 코멘트 섹션 */}
                  {(evaluationData.partnerData['Comment 1'] || evaluationData.partnerData['Comment 2']) && (
                    <div className="mt-4 space-y-3">
                      {evaluationData.partnerData['Comment 1'] && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                            앞으로 6개월 동안 Audit Enhancement 를 위하여 앞으로 파트너가 가장 집중해야 할 영역은 무엇이라고 생각하나요? <span className="text-muted-foreground">(Comment 200자 내외)</span>
                          </div>
                          <div className="text-sm text-blue-900 dark:text-blue-100">
                            {formatComment(evaluationData.partnerData['Comment 1'])}
                          </div>
                        </div>
                      )}
                      {evaluationData.partnerData['Comment 2'] && (
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <div className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">
                            Audit Enhancement 성공을 위해 파트너 및 DoAE로부터 추가로 필요한 지원은 무엇인가요? <span className="text-muted-foreground">(Comment 200자 내외)</span>
                          </div>
                          <div className="text-sm text-green-900 dark:text-green-100">
                            {formatComment(evaluationData.partnerData['Comment 2'])}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    파트너 평가결과 데이터가 없습니다
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 팀 평가결과 Card - Full Width */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">팀 평가결과 ({(userInfo as any)?.cm_nm || userInfo?.org_nm || '팀'})</CardTitle>
              {evaluationData.allTeamData && evaluationData.allTeamData.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAllTeamDialogOpen(true)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  전 팀 조회
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {evaluationData.loading ? (
                <div className="flex items-center justify-center h-32 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="text-sm text-muted-foreground">로딩 중...</div>
                </div>
              ) : evaluationData.teamData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">팀 평균</div>
                      <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                        {evaluationData.teamData.평균}
                      </div>
                    </div>
                    {allTeamAverage !== null && (
                      <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                        <div className="text-sm text-green-700 dark:text-green-300 mb-1">전체 평균</div>
                        <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                          {allTeamAverage.toFixed(1)}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        팀 Comment
                      </div>
                      <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                        {evaluationData.teamData.주요_Comment || evaluationData.teamData['주요 Comment'] || '코멘트가 없습니다'}
                      </div>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                      <div className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-2">
                        공통 Comment
                      </div>
                      <div className="text-sm text-orange-900 dark:text-orange-100 whitespace-pre-wrap">
                        다양한 사례 제공 요청, DoAE 확산을 위한 communication 필요성, AI/Digital 관련 실용적인 Tool 확산/교육 필요
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    팀 평가결과 데이터가 없습니다
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 전 팀 조회 Dialog */}
          <Dialog open={isAllTeamDialogOpen} onOpenChange={setIsAllTeamDialogOpen}>
            <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>전 팀 평가결과</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <TableComponent>
                  <TableHeader>
                    <TableRow>
                      <TableHead>팀</TableHead>
                      <TableHead>주요 Comment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluationData.allTeamData?.filter((t: any) => t.구분 !== '공통').map((team: any, index: number) => (
                      <TableRow key={index} className={team.구분 === (userInfo as any)?.cm_nm ? 'bg-blue-50 dark:bg-blue-950' : ''}>
                        <TableCell className="font-medium">
                          {team.구분}
                          {team.구분 === (userInfo as any)?.cm_nm && (
                            <Badge variant="default" className="ml-2">내 팀</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm whitespace-pre-wrap max-w-md">
                          {team.주요_Comment || team['주요 Comment'] || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableComponent>
              </div>
            </DialogContent>
          </Dialog>
          {/* 팀 파트너 평가결과 Dialog */}
          <Dialog open={isTeamPartnersDialogOpen} onOpenChange={setIsTeamPartnersDialogOpen}>
            <DialogContent className="max-w-7xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>팀 파트너 평가결과 ({(userInfo as any)?.cm_nm || ''})</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {teamPartners.length > 0 ? (
                  <>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {(teamPartnersAverage ?? 0).toFixed(1)}
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">팀 평균 점수 ({teamPartners.length}명)</div>
                    </div>
                    
                    {teamPartners.map((partner, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center justify-between">
                            <span>{partner.성명} ({partner.사번}) - {partner.직위}</span>
                            <Badge variant={partner.등급 === 'EP' ? 'default' : 'secondary'} className="text-base px-3 py-1">
                              {partner.등급}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* 점수 테이블 */}
                          <TableComponent>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-right">평가자</TableHead>
                                <TableHead className="text-right">응답수</TableHead>
                                <TableHead className="text-right">회신률</TableHead>
                                <TableHead className="text-right">Q1</TableHead>
                                <TableHead className="text-right">Q2</TableHead>
                                <TableHead className="text-right">Q3</TableHead>
                                <TableHead className="text-right">Q4</TableHead>
                                <TableHead className="text-right">합계</TableHead>
                                <TableHead className="text-right">평균</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell className="text-right">{partner.평가자}</TableCell>
                                <TableCell className="text-right">{partner.응답수}</TableCell>
                                <TableCell className="text-right">{partner.회신률}</TableCell>
                                <TableCell className="text-right font-medium">{partner['1']}</TableCell>
                                <TableCell className="text-right font-medium">{partner['2']}</TableCell>
                                <TableCell className="text-right font-medium">{partner['3']}</TableCell>
                                <TableCell className="text-right font-medium">{partner['4']}</TableCell>
                                <TableCell className="text-right font-bold">{partner.합계}</TableCell>
                                <TableCell className="text-right font-bold text-lg">{partner.평균}</TableCell>
                              </TableRow>
                            </TableBody>
                          </TableComponent>
                          
                          {/* 코멘트 섹션 */}
                          {(partner['Comment 1'] || partner['Comment 2']) && (
                            <div className="space-y-3">
                              {partner['Comment 1'] && (
                                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                  <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                                    앞으로 6개월 동안 Audit Enhancement 를 위하여 앞으로 파트너가 가장 집중해야 할 영역은 무엇이라고 생각하나요? <span className="text-muted-foreground">(Comment 200자 내외)</span>
                                  </div>
                                  <div className="text-sm text-blue-900 dark:text-blue-100">
                                    {formatComment(partner['Comment 1'])}
                                  </div>
                                </div>
                              )}
                              {partner['Comment 2'] && (
                                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                                  <div className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">
                                    Audit Enhancement 성공을 위해 파트너 및 DoAE로부터 추가로 필요한 지원은 무엇인가요? <span className="text-muted-foreground">(Comment 200자 내외)</span>
                                  </div>
                                  <div className="text-sm text-green-900 dark:text-green-100">
                                    {formatComment(partner['Comment 2'])}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    팀의 파트너 데이터가 없습니다
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* 전체 파트너 평가결과 Dialog */}
          <Dialog open={isAllPartnersDialogOpen} onOpenChange={setIsAllPartnersDialogOpen}>
            <DialogContent className="max-w-7xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>전체 파트너 평가결과</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {allPartners.length > 0 ? (
                  <>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {(allPartnersAverage ?? 0).toFixed(1)}
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400">전체 평균 점수 ({allPartners.length}명)</div>
                    </div>
                    
                    {allPartners.map((partner, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center justify-between">
                            <span>{partner.성명} ({partner.사번}) - {partner.소속} / {partner.직위}</span>
                            <Badge variant={partner.등급 === 'EP' ? 'default' : 'secondary'} className="text-base px-3 py-1">
                              {partner.등급}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* 점수 테이블 */}
                          <TableComponent>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-right">평가자</TableHead>
                                <TableHead className="text-right">응답수</TableHead>
                                <TableHead className="text-right">회신률</TableHead>
                                <TableHead className="text-right">Q1</TableHead>
                                <TableHead className="text-right">Q2</TableHead>
                                <TableHead className="text-right">Q3</TableHead>
                                <TableHead className="text-right">Q4</TableHead>
                                <TableHead className="text-right">합계</TableHead>
                                <TableHead className="text-right">평균</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell className="text-right">{partner.평가자}</TableCell>
                                <TableCell className="text-right">{partner.응답수}</TableCell>
                                <TableCell className="text-right">{partner.회신률}</TableCell>
                                <TableCell className="text-right font-medium">{partner['1']}</TableCell>
                                <TableCell className="text-right font-medium">{partner['2']}</TableCell>
                                <TableCell className="text-right font-medium">{partner['3']}</TableCell>
                                <TableCell className="text-right font-medium">{partner['4']}</TableCell>
                                <TableCell className="text-right font-bold">{partner.합계}</TableCell>
                                <TableCell className="text-right font-bold text-lg">{partner.평균}</TableCell>
                              </TableRow>
                            </TableBody>
                          </TableComponent>
                          
                          {/* 코멘트 섹션 */}
                          {(partner['Comment 1'] || partner['Comment 2']) && (
                            <div className="space-y-3">
                              {partner['Comment 1'] && (
                                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                  <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                                    앞으로 6개월 동안 Audit Enhancement 를 위하여 앞으로 파트너가 가장 집중해야 할 영역은 무엇이라고 생각하나요? <span className="text-muted-foreground">(Comment 200자 내외)</span>
                                  </div>
                                  <div className="text-sm text-blue-900 dark:text-blue-100">
                                    {formatComment(partner['Comment 1'])}
                                  </div>
                                </div>
                              )}
                              {partner['Comment 2'] && (
                                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                                  <div className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">
                                    Audit Enhancement 성공을 위해 파트너 및 DoAE로부터 추가로 필요한 지원은 무엇인가요? <span className="text-muted-foreground">(Comment 200자 내외)</span>
                                  </div>
                                  <div className="text-sm text-green-900 dark:text-green-100">
                                    {formatComment(partner['Comment 2'])}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    파트너 데이터가 없습니다
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      </div>
    </TooltipProvider>
  )
}
