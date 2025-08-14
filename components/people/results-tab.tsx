"use client"

import { useState, useEffect } from "react"
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

  // HR 정보 로드
  useEffect(() => {
    const loadUserInfo = async () => {
      const user = AuthService.getCurrentUser()
      const targetEmpno = readOnly ? empno : (empno || user?.empno)
      
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
        
        // HR 정보, GPS/PEI 실데이터, 목표 데이터, 성과평가 데이터, Refresh Off 데이터를 동시에 가져오기
        const [hrResult, scoreResult, goalResult, performanceResult, refreshOffResult] = await Promise.all([
          supabase
            .from("a_hr_master")
            .select("EMPNO, EMPNM, ORG_NM, JOB_INFO_NM, GRADNM")
            .eq("EMPNO", normalizedEmpno)
            .maybeSingle(),
          supabase
            .from("L_GPS_PEI_Table")
            .select("GPS, PEI")
            .eq("EMPNO", fiveDigitEmpno)
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
        const { data: scoreData, error: scoreError } = scoreResult
        const { data: goalDataResult, error: goalError } = goalResult
        const { data: performanceData, error: performanceError } = performanceResult
        const { data: refreshOffDataResult, error: refreshOffError } = refreshOffResult
        
        if (hrError) {
          console.error(`❌ HR 데이터 조회 에러 (${normalizedEmpno}):`, hrError)
        }
        
        if (scoreError) {
          console.error(`❌ GPS/PEI 데이터 조회 에러:`, scoreError)
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

        // HR 정보 설정
        if (hrData) {
          setUserInfo({
            empno: hrData.EMPNO,
            empnm: hrData.EMPNM,
            org_nm: hrData.ORG_NM,
            job_info_nm: hrData.JOB_INFO_NM,
            gradnm: hrData.GRADNM,
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
          setGpsScore(scoreData.GPS)
          setPeiScore(scoreData.PEI)
          console.log("✅ GPS/PEI actual data loaded:", scoreData)
        }
        
        // 목표 데이터 설정
        if (goalDataResult) {
          setGoalData({
            gpsTarget: goalDataResult.gps_score,
            peiTarget: goalDataResult.pei_score,
            refreshOffTarget: goalDataResult.refresh_off_usage_rate,
            coachingTimeTarget: goalDataResult.coaching_time
          })
          console.log("✅ Goal data loaded:", goalDataResult)
        }

        // 코칭타임 실적 데이터 조회
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
            // ⚡ 병렬 처리: 모든 팀원 데이터를 한번에 조회
            const [leaveResult, utilizationResult, utilDateResult] = await Promise.all([
              // 휴가 정보 조회
              supabase
                .from("a_leave_info")
                .select("EMPNO, SUM_TIME, RMN_TIME, BASE_YMD")
                .in("EMPNO", teamEmpnos)
                .order("BASE_YMD", { ascending: false }),
              
              // 활용률 정보 조회
              supabase
                .from("v_employee_core")
                .select("EMPNO, EMPNM, CM_NM, UTIL_A, UTIL_B, BASE_YMD")
                .in("EMPNO", teamEmpnos),
              
              // 최신 활용률 날짜 조회
              supabase
                .from("a_utilization")
                .select("UTIL_DATE")
                .in("EMPNO", teamEmpnos)
                .order("UTIL_DATE", { ascending: false })
                .limit(1)
            ])
            
            const { data: leaveData, error: leaveError } = leaveResult
            const { data: utilData, error: utilError } = utilizationResult
            const { data: utilDateData } = utilDateResult
            
            if (leaveError) {
              console.log("❌ 팀원 휴가 데이터 조회 에러:", leaveError)
              return
            }
            
            if (utilError) {
              console.log("❌ 팀원 활용률 데이터 조회 에러:", utilError)
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
  }, [empno, readOnly])

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

  // GPS 달성률 계산
  const getGpsAchievement = () => {
    if (!gpsScore || gpsScore === '-' || !goalData.gpsTarget) return { rate: 0, actual: 0, target: 0 }
    const actual = parseFloat(gpsScore) * 100 // 0.71 → 71%
    const target = goalData.gpsTarget // 이미 1-100 범위
    const rate = Math.round((actual / target) * 100)
    return { rate, actual, target }
  }

  // PEI 달성률 계산
  const getPeiAchievement = () => {
    if (!peiScore || peiScore === '-' || !goalData.peiTarget) return { rate: 0, actual: 0, target: 0 }
    const actual = parseFloat(peiScore) * 100 // 0.82 → 82%
    const target = goalData.peiTarget // 이미 1-100 범위
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

  // 코칭타임 달성률 계산 함수 추가
  const getCoachingTimeAchievement = () => {
    if (!coachingTimeData.quarterHours || !goalData.coachingTimeTarget) {
      return { rate: 0, actual: 0, target: 0 }
    }
    const actual = coachingTimeData.quarterHours
    const target = goalData.coachingTimeTarget
    const rate = Math.round((actual / target) * 100)
    return { rate, actual, target }
  }

  const gpsAchievement = getGpsAchievement()
  const peiAchievement = getPeiAchievement()
  const refreshOffAchievement = getRefreshOffAchievement()
  const coachingTimeAchievement = getCoachingTimeAchievement()

  return (
    <TooltipProvider>
      <div className="relative">


        <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-medium">결과</h2>
        </div>

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
                  팀 평균
                  {utilizationData.utilDate && (
                    <div className="text-xs text-muted-foreground mt-1">
                      기준: {new Date(utilizationData.utilDate).toLocaleDateString('ko-KR')}
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
                            기준일자: {new Date(utilizationData.utilDate).toLocaleDateString('ko-KR')}
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
                  팀 평균
                  {utilizationData.utilDate && (
                    <div className="text-xs text-muted-foreground mt-1">
                      기준: {new Date(utilizationData.utilDate).toLocaleDateString('ko-KR')}
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
                            기준일자: {new Date(utilizationData.utilDate).toLocaleDateString('ko-KR')}
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

        {/* 2행: GPS Score, PEI Score, Staff Coaching Time */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* GPS Score Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                GPS Score
                {userInfo?.org_nm && (
                  <span className="text-xs text-muted-foreground font-normal ml-2">
                    - {userInfo.org_nm}
                  </span>
                )}
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-2">
                <div className="text-2xl font-bold">
                  {gpsAchievement.actual > 0 ? `${gpsAchievement.actual}%` : '-%'}
                </div>
                <div className="text-xs text-gray-400">
                  FY25 기준
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
                </div>
              </div>
            </CardContent>
          </Card>

        {/* PEI Score Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              PEI Score
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
                FY25 기준
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

        {/* Staff Coaching Time Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Coaching Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-2">
              <div className="text-2xl font-bold">
                {coachingTimeData.quarterHours > 0 ? `${coachingTimeData.quarterHours} 시간` : '- 시간'}
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
                <span>실제: {coachingTimeData.quarterHours > 0 ? `${coachingTimeData.quarterHours} 시간` : '- 시간'}</span>
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
            </div>

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
      </div>
      </div>
    </TooltipProvider>
  )
}
