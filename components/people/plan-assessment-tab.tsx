"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Target } from "lucide-react"
import { Clock, Users, Edit, Save, X, DollarSign, TrendingUp, AlertTriangle, CheckCircle, User, CheckCircle2, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AuthService } from "@/lib/auth-service"
import { UserInfoMapper } from "@/data/user-info"
import { PeopleGoalsService, TeamMemberCoachingData } from "@/lib/people-goals-service"
import { supabase } from "@/lib/supabase"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// 분기별 주 수 계산 함수
function getWeeksInQuarter(year: number, quarter: number) {
  const quarterStartMonth = (quarter - 1) * 3;
  const start = new Date(year, quarterStartMonth, 1);
  const end = new Date(year, quarterStartMonth + 3, 0); // 0일 = 전월 마지막날
  const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;
  return Math.ceil(days / 7);
}

interface PlanAssessmentTabProps {
  empno?: string
  readOnly?: boolean
}

export function PlanAssessmentTab({ empno, readOnly = false }: PlanAssessmentTabProps = {}) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  
  // Status state 추가
  const [currentStatus, setCurrentStatus] = useState<'Draft' | '작성중' | '완료'>('Draft')
  
  // Add lastUpdated state
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  
  // 팀원 코칭 시간 관련 state 추가
  const [teamCoachingData, setTeamCoachingData] = useState<TeamMemberCoachingData[]>([])
  const [isTeamDetailDialogOpen, setIsTeamDetailDialogOpen] = useState(false)
  const [isLoadingTeamData, setIsLoadingTeamData] = useState(false)
  
  const [assessmentData, setAssessmentData] = useState({
    comment: "",
    gpsScore: 50, // 1-100 범위에서 기본값 50
    peiScore: 50, // 1-100 범위에서 기본값 50
    staffCoachingTime: 0,
    superOrg: 0,
    refreshOff: 0,
    coachingTime: 0,
  })
  const [formData, setFormData] = useState(assessmentData)
  const [coachingQuarter, setCoachingQuarter] = useState(0)
  const [coachingYear, setCoachingYear] = useState(0)
  const [coachingYearLabel, setCoachingYearLabel] = useState(0)
  const [coachingQuarterLabel, setCoachingQuarterLabel] = useState({ year: 0, quarter: 0 })
  const [budget, setBudget] = useState<number | null>(null)
  const [cost, setCost] = useState<number | null>(null)

  useEffect(() => {
    loadUserInfoAndInitialize()
  }, [empno, readOnly])

  // 코칭 시간 불러오기 (회계연도 기준: 2025-3Q ~ 2026-2Q)
  // readOnly 모드에서는 탭이 활성화될 때까지 조회 지연
  const [shouldLoadCoaching, setShouldLoadCoaching] = useState(!readOnly)
  
  useEffect(() => {
    const fetchCoaching = async () => {
      if (!currentUser?.empno) {
        console.log("⚠️ PlanAssessmentTab: currentUser.empno가 없어서 코칭 시간 조회를 건너뜁니다")
        return
      }
      
      // readOnly 모드에서는 shouldLoadCoaching이 true가 될 때까지 대기
      if (readOnly && !shouldLoadCoaching) {
        console.log("⚠️ PlanAssessmentTab: readOnly 모드 - 탭 활성화 시 코칭 시간 조회 예정")
        return
      }
      
      const now = new Date()
      const year = now.getFullYear() // 현재 연도 사용
      const quarter = Math.ceil((now.getMonth() + 1) / 3)
      setCoachingQuarterLabel({ year, quarter })
      setCoachingYearLabel(year)
      try {
        const { quarterHours, yearHours } = await PeopleGoalsService.getCoachingTimeStats(currentUser.empno, year, quarter)
        console.log("📊 Plan: 코칭 시간 쿼리 결과 (회계연도 기준):", { 
          quarterHours, 
          yearHours, 
          empno: currentUser.empno, 
          currentQuarter: `${year}-Q${quarter}`,
          fiscalYear: "2025-3Q ~ 2026-2Q"
        })
        setCoachingQuarter(quarterHours)
        setCoachingYear(yearHours)
      } catch (e) {
        console.error("❌ 코칭 시간 쿼리 오류:", {
          error: e,
          errorMessage: (e as Error)?.message,
          errorStack: (e as Error)?.stack,
          empno: currentUser.empno,
          year,
          quarter
        })
      }
    }
    fetchCoaching()
  }, [currentUser, readOnly, shouldLoadCoaching])
  
  // readOnly 모드일 때 컴포넌트가 마운트되면 코칭 데이터 로드 시작
  useEffect(() => {
    if (readOnly && currentUser?.empno) {
      console.log("🔄 PlanAssessmentTab: People 탭 활성화 - 코칭 시간 조회 시작")
      setShouldLoadCoaching(true)
    }
  }, [readOnly, currentUser])

  // 팀원 코칭 시간 데이터 로드
  const [shouldLoadTeamCoaching, setShouldLoadTeamCoaching] = useState(!readOnly)
  
  useEffect(() => {
    const fetchTeamCoachingData = async () => {
      if (!currentUser?.empno) return
      
      // readOnly 모드에서는 shouldLoadTeamCoaching이 true가 될 때까지 대기
      if (readOnly && !shouldLoadTeamCoaching) {
        console.log("⚠️ PlanAssessmentTab: readOnly 모드 - 탭 활성화 시 팀 코칭 데이터 조회 예정")
        return
      }
      
      setIsLoadingTeamData(true)
      try {
        const teamData = await PeopleGoalsService.getTeamCoachingTimeStats(currentUser.empno)
        setTeamCoachingData(teamData)
        console.log("📊 Team coaching data loaded:", teamData)
      } catch (error) {
        console.error("Error loading team coaching data:", error)
      } finally {
        setIsLoadingTeamData(false)
      }
    }
    
    fetchTeamCoachingData()
  }, [currentUser, readOnly, shouldLoadTeamCoaching])
  
  // readOnly 모드일 때 컴포넌트가 마운트되면 팀 코칭 데이터 로드 시작
  useEffect(() => {
    if (readOnly && currentUser?.empno) {
      console.log("🔄 PlanAssessmentTab: People 탭 활성화 - 팀 코칭 데이터 조회 시작")
      setShouldLoadTeamCoaching(true)
    }
  }, [readOnly, currentUser])

  useEffect(() => {
    const fetchBudgetAndCost = async () => {
      if (!currentUser?.empno || !coachingYearLabel) return
      
      // 1. L_Coaching_Budget에서 가장 최근 기준연도의 코칭 예산 가져오기
      let budgetAmount = 0
      try {
        // 사번 정규화 (95129 → 095129)
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(currentUser.empno)
        // L_Coaching_Budget 테이블용 5자리 사번 (098095 → 98095)
        const fiveDigitEmpno = normalizedEmpno.replace(/^0/, '')
        
        console.log(`🔍 Fetching coaching budget: ${currentUser.empno} → ${normalizedEmpno} → ${fiveDigitEmpno}`)
        
        // 가장 최근 기준연도 찾기
        const { data: latestYearData, error: yearError } = await supabase
          .from('L_Coaching_Budget')
          .select('"기준연도"')
          .order('"기준연도"', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        console.log(`🔍 Latest year query result:`, { latestYearData, yearError })
        
        if (latestYearData && !yearError) {
          const latestYear = (latestYearData as any)['기준연도']
          console.log(`📅 Latest coaching budget year: ${latestYear}`)
          
          // 먼저 해당 연도에 어떤 사번들이 있는지 확인
          const { data: allEmpnos, error: empnoError } = await supabase
            .from('L_Coaching_Budget')
            .select('"사번"')
            .eq('"기준연도"', latestYear)
            .limit(10)
          
          console.log(`🔍 Sample empnos in ${latestYear}:`, allEmpnos?.map(row => (row as any)['사번']))
          
          // 여러 사번 형식으로 시도해보기
          const empnoVariations = [
            fiveDigitEmpno,           // 98095
            normalizedEmpno,          // 098095
            currentUser.empno,        // 원본
            fiveDigitEmpno.padStart(6, '0'), // 098095
            fiveDigitEmpno.padStart(5, '0')  // 98095
          ]
          
          console.log(`🔍 Trying empno variations:`, empnoVariations)
          
          let budgetData = null
          let budgetError = null
          let matchedEmpno = null
          
          // 각 사번 형식으로 순차 시도
          for (const empnoVariation of empnoVariations) {
            const { data, error } = await supabase
              .from('L_Coaching_Budget')
              .select('"coaching budget"')
              .eq('"기준연도"', latestYear)
              .eq('"사번"', empnoVariation)
            
            console.log(`🔍 Trying empno "${empnoVariation}":`, { data, error })
            
            if (data && data.length > 0) {
              budgetData = data
              budgetError = error
              matchedEmpno = empnoVariation
              console.log(`✅ Found data with empno: ${empnoVariation}`)
              break
            }
          }
          
          if (budgetData && !budgetError) {
            // 인사팀 수기 입력으로 본부코드가 달라도 동일 금액이 중복 들어오는 케이스 → 중복 금액은 1번만 카운트
            const uniqueBudgets = new Set<number>()
            for (const row of budgetData as any[]) {
              const budgetText = row['coaching budget'] || '0'
              const budget = Number(budgetText.toString().replace(/,/g, '')) || 0
              if (budget > 0) uniqueBudgets.add(budget)
              console.log(`🔍 Budget item: "${budgetText}" → ${budget}`)
            }
            budgetAmount = Array.from(uniqueBudgets).reduce((sum, b) => sum + b, 0)
            console.log(`💰 Total coaching budget for ${matchedEmpno} (dedup ${budgetData.length}→${uniqueBudgets.size}):`, budgetAmount, Array.from(uniqueBudgets))
          } else {
            console.log(`ℹ️ No coaching budget found for any empno variation in year ${latestYear}`)
            console.log(`❌ Tried variations:`, empnoVariations)
          }
        }
      } catch (budgetErr) {
        console.error("코칭 예산 조회 오류:", budgetErr)
      }
      
      // 2. v_coaching_time_quarterly에서 지출 내역 가져오기 (2025-Q2 이후 가장 최근)
      let costAmount = 0
      try {
        console.log(`🗓️ Plan: Fetching most recent coaching cost since 2025-Q2`)
        
        // 사번 170068인 경우 특정 PRJTCD만 필터링
        const isSpecialEmpno = currentUser.empno === '170068';
        const targetPrjtcd = '00184-90-323';
        
        // 사번 정규화
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(currentUser.empno)
        
        let costQuery = supabase
          .from('v_coaching_time_quarterly')
          .select('total_amt, year_quarter')
          .eq('EMPNO', normalizedEmpno)
          .gte('year_quarter', '2025-Q2')
          .order('year_quarter', { ascending: false })
        
        if (isSpecialEmpno) {
          // 170068인 경우 최근 분기의 특정 PRJTCD만 필터링
          costQuery = costQuery.eq('PRJTCD', targetPrjtcd);
          console.log(`🎯 Plan: Special filtering for empno ${currentUser.empno} (${normalizedEmpno}): PRJTCD = ${targetPrjtcd}`);
        }
        
        const { data, error } = await costQuery.limit(1).maybeSingle()
        
        if (error) {
          // 타임아웃 에러나 뷰 조회 실패는 경고만 출력하고 계속 진행
          if (error.code === '57014' || error.code === '42P01' || error.message?.includes('statement timeout') || error.message?.includes('does not exist')) {
            console.warn('⚠️ 코칭 비용 조회 실패 (타임아웃 또는 뷰 없음) - 빈 데이터로 처리:', error.message)
          } else {
          console.error('❌ 코칭 비용 조회 에러:', error)
          console.error('❌ 에러 상세:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          }
        }
        
        if (!error && data) {
          costAmount = Number(data.total_amt || 0)
          console.log(`💰 Plan: Latest coaching cost:`, { 
            empno: currentUser.empno,
            normalizedEmpno,
            latestQuarter: data.year_quarter,
            totalCost: costAmount,
            isSpecialFiltered: isSpecialEmpno,
            ...(isSpecialEmpno && { targetPrjtcd })
          })
        } else if (!error) {
          console.log(`ℹ️ Plan: No coaching cost data found for empno ${currentUser.empno} (${normalizedEmpno})`)
        }
      } catch (costErr) {
        console.error("코칭 지출 조회 오류:", costErr)
      }
      
      setBudget(budgetAmount)
      setCost(costAmount)
      console.log(`📊 Final coaching budget/cost: ${budgetAmount} / ${costAmount}`)
    }
    fetchBudgetAndCost()
  }, [currentUser, coachingYearLabel])

  const loadUserInfoAndInitialize = async () => {
    setIsInitializing(true)
    setDbError(null)
    try {
      const authUser = AuthService.getCurrentUser()
      if (!authUser) throw new Error("로그인된 사용자가 없습니다. 다시 로그인해주세요.")
      
      // readOnly 모드(리뷰어/마스터 리뷰어)에서는 반드시 전달받은 empno 사용
      // 일반 모드에서는 empno가 있으면 그것을, 없으면 로그인 사용자 사용
      const targetEmpno = readOnly 
        ? empno // readOnly일 때는 반드시 전달받은 empno 사용 (리뷰 대상자)
        : (empno || authUser.empno) // 일반 모드일 때는 empno가 있으면 그것을, 없으면 로그인 사용자
      
      console.log(`🔍 PlanAssessmentTab: loadUserInfoAndInitialize - readOnly=${readOnly}, empno=${empno}, targetEmpno=${targetEmpno}`)
      
      if (!targetEmpno) {
        if (readOnly) {
          console.warn('⚠️ PlanAssessmentTab: readOnly 모드인데 empno가 전달되지 않았습니다.')
        }
        throw new Error("사용자 정보를 찾을 수 없습니다.")
      }
      
      setCurrentUser({ ...authUser, empno: targetEmpno })
      
      // 대상 사용자의 정보 가져오기 (Business Plan과 동일한 로직, 사번 정규화)
      try {
        // ReviewerService import 필요
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(targetEmpno)
        console.log(`🔍 Querying HR master with normalized empno: ${targetEmpno} → ${normalizedEmpno}`)
        const { data: hrData, error: hrError } = await supabase
          .from("a_hr_master")
          .select("EMPNO, EMPNM, ORG_NM, JOB_INFO_NM, GRADNM")
          .eq("EMPNO", normalizedEmpno)
          .maybeSingle()
        
        if (hrError) {
          console.error(`❌ HR 데이터 조회 에러 (${normalizedEmpno}):`, hrError)
        }

        if (hrData) {
          setUserInfo({
            empno: hrData.EMPNO,
            empnm: hrData.EMPNM,
            org_nm: hrData.ORG_NM,
            job_info_nm: hrData.JOB_INFO_NM,
            gradnm: hrData.GRADNM,
            pwc_id: hrData.EMPNO,
          })
          console.log("✅ Target user info loaded for:", targetEmpno, hrData.EMPNM, "(direct DB query)")
        } else {
          console.log("ℹ️ No HR data found for target user, using target empno")
          setUserInfo({
            empno: targetEmpno,
            empnm: targetEmpno,
            pwc_id: targetEmpno,
          })
        }
      } catch (error) {
        console.log("ℹ️ Could not load target user info, using target empno:", error)
        setUserInfo({
          empno: targetEmpno,
          empnm: targetEmpno,
          pwc_id: targetEmpno,
        })
      }
      
      // 데이터 로드 (status 포함) - 정규화된 사번 사용
      let peopleGoalsData = null
      try {
        // 사번 정규화 (95129 → 095129)
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(targetEmpno)
        console.log(`🔍 Plan: Querying people_goals with normalized empno: ${targetEmpno} → ${normalizedEmpno}`)
        
        // 정규화된 사번으로 먼저 시도
        let { data, error } = await supabase
          .from("people_goals")
          .select("*")
          .eq("employee_id", normalizedEmpno)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        // 정규화된 사번으로 못 찾으면 원본 사번으로 시도
        if (error || !data) {
          console.log("🔄 PlanAssessmentTab: Trying with original empno:", targetEmpno)
          const result = await supabase
            .from("people_goals")
            .select("*")
            .eq("employee_id", targetEmpno)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          data = result.data
          error = result.error
        }
        
        if (data) {
          peopleGoalsData = data
          console.log("✅ Plan: Found people_goals data:", data)
        } else {
          console.log("ℹ️ Plan: No people_goals data found")
        }
      } catch (dbErr) {
        console.log("ℹ️ Plan: No existing people_goals data found:", dbErr)
      }

      // GPS/PEI 초기값 로드 (가장 최근 연도 데이터에서)
      let initialGpsScore = 50
      let initialPeiScore = 50
      let initialRefreshOff = 95 // 기본값을 95%로 설정
      
      try {
        // 사번 정규화 (95129 → 095129)
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(targetEmpno)
        // GPS/PEI 테이블용 5자리 사번 (098095 → 98095)
        const fiveDigitEmpno = normalizedEmpno.replace(/^0/, '')
        console.log(`🔍 Loading initial GPS/PEI values: ${targetEmpno} → ${normalizedEmpno} → ${fiveDigitEmpno}`)
        
        // 가장 최근 연도 찾기
        const { data: latestYearData, error: yearError } = await supabase
          .from("L_GPS_PEI_Table")
          .select('"연도"')
          .order('"연도"', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (latestYearData && !yearError) {
          const latestYear = String((latestYearData as any)['연도']) // 문자열로 변환 (results-tab.tsx와 동일)
          console.log(`📅 Latest GPS/PEI year: ${latestYear}`)
          
          // 여러 사번 형식으로 시도해보기
          const empnoVariations = [
            fiveDigitEmpno,           // 98095
            normalizedEmpno,          // 098095
            targetEmpno,              // 원본
            fiveDigitEmpno.padStart(6, '0'), // 098095
            fiveDigitEmpno.padStart(5, '0')  // 98095
          ]
          
          console.log(`🔍 Trying GPS/PEI empno variations:`, empnoVariations)
          
          let gpsData = null
          let matchedEmpno = null
          
          // 각 사번 형식으로 순차 시도
          // 에러 메시지에 따르면 "GPS(ItS)"로 되어 있음 - 대소문자 주의
          for (const empnoVariation of empnoVariations) {
            // 먼저 에러 메시지에서 제안한 대로 "GPS(ItS)" 시도
            let { data, error } = await supabase
              .from("L_GPS_PEI_Table")
              .select('"GPS(ItS)", "GPS(PEI)"')
              .eq('"EMPNO"', empnoVariation)
              .eq('"연도"', latestYear)
              .maybeSingle()
            
            // "GPS(ItS)"가 실패하면 "GPS(ITS)" 시도
            if (error && error.message?.includes('does not exist')) {
              console.log(`🔄 Trying "GPS(ITS)" instead of "GPS(ItS)"...`)
              const result = await supabase
                .from("L_GPS_PEI_Table")
                .select('"GPS(ITS)", "GPS(PEI)"')
                .eq('"EMPNO"', empnoVariation)
                .eq('"연도"', latestYear)
                .maybeSingle()
              data = result.data as any
              error = result.error
            }
            
            // 여전히 실패하면 연도 필터 없이 시도
            if (error) {
              console.error(`❌ GPS/PEI 조회 에러 (empno: ${empnoVariation}, 연도: ${latestYear}):`, error)
              console.error('❌ 에러 상세:', JSON.stringify({
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
              }, null, 2))
              
              // 연도 필터 없이 시도
              console.log(`🔄 Trying without year filter...`)
              const altResult = await supabase
                .from("L_GPS_PEI_Table")
                .select('"GPS(ItS)", "GPS(PEI)"')
                .eq('"EMPNO"', empnoVariation)
                .maybeSingle()
              
              if (!altResult.error && altResult.data) {
                console.log(`✅ Found GPS/PEI data without year filter (empno: ${empnoVariation})`)
                gpsData = altResult.data
                matchedEmpno = empnoVariation
                break
              } else if (altResult.error) {
                console.error(`❌ Alternative query also failed:`, altResult.error)
              }
            } else {
              console.log(`🔍 Trying GPS/PEI empno "${empnoVariation}":`, { data, error })
              
              if (data && !error) {
                gpsData = data
                matchedEmpno = empnoVariation
                console.log(`✅ Found GPS/PEI data with empno: ${empnoVariation}`)
                break
              }
            }
          }
          
          if (gpsData) {
            // 0.71 형태를 71%로 변환
            // 컬럼명이 "GPS(ItS)" 또는 "GPS(ITS)"일 수 있음 (대소문자 주의)
            const gpsPeiValue = (gpsData as any)['GPS(PEI)'] || (gpsData as any)['GPS(Pei)'] || (gpsData as any).PEI
            const gpsItsValue = (gpsData as any)['GPS(ItS)'] || (gpsData as any)['GPS(ITS)'] || (gpsData as any).GPS
            
            if (gpsPeiValue && gpsPeiValue !== '-') {
              initialPeiScore = Math.round(parseFloat(gpsPeiValue) * 100)
            }
            if (gpsItsValue && gpsItsValue !== '-') {
              initialGpsScore = Math.round(parseFloat(gpsItsValue) * 100)
            }
            console.log("✅ GPS/PEI 초기값 로드:", { 
              matchedEmpno,
              'GPS(PEI)': gpsPeiValue, 
              'GPS(ITS)': gpsItsValue, 
              initialPeiScore, 
              initialGpsScore 
            })
          } else {
            console.log(`ℹ️ No GPS/PEI data found for any empno variation in year ${latestYear}`)
            console.log(`❌ Tried variations:`, empnoVariations)
          }
        }
      } catch (initialErr) {
        console.log("GPS/PEI 초기값 로드 실패:", initialErr)
      }

      // people_goals 데이터가 있으면 그것을 우선 사용, 없으면 초기값 사용
      if (peopleGoalsData) {
        setAssessmentData({
          comment: peopleGoalsData.people_goal ?? "",
          gpsScore: peopleGoalsData.gps_score ?? initialGpsScore,
          peiScore: peopleGoalsData.pei_score ?? initialPeiScore,
          staffCoachingTime: 0,
          superOrg: 0,
          refreshOff: peopleGoalsData.refresh_off_usage_rate ?? initialRefreshOff,
          coachingTime: peopleGoalsData.coaching_time ?? 0,
        })
        setFormData({
          comment: peopleGoalsData.people_goal ?? "",
          gpsScore: peopleGoalsData.gps_score ?? initialGpsScore,
          peiScore: peopleGoalsData.pei_score ?? initialPeiScore,
          staffCoachingTime: 0,
          superOrg: 0,
          refreshOff: peopleGoalsData.refresh_off_usage_rate ?? initialRefreshOff,
          coachingTime: peopleGoalsData.coaching_time ?? 0,
        })
        // Set status from database
        setCurrentStatus(peopleGoalsData.status || 'Draft')
        // Set lastUpdated from database
        if (peopleGoalsData.updated_at) {
          const date = new Date(peopleGoalsData.updated_at)
          const year = date.getFullYear()
          const month = date.getMonth() + 1
          const day = date.getDate()
          setLastUpdated(`${year}년 ${month}월 ${day}일`)
        }
      } else {
        // 기존 데이터가 없으면 초기값 사용
        setAssessmentData({
          comment: "",
          gpsScore: initialGpsScore,
          peiScore: initialPeiScore,
          staffCoachingTime: 0,
          superOrg: 0,
          refreshOff: initialRefreshOff,
          coachingTime: 0,
        })
        setFormData({
          comment: "",
          gpsScore: initialGpsScore,
          peiScore: initialPeiScore,
          staffCoachingTime: 0,
          superOrg: 0,
          refreshOff: initialRefreshOff,
          coachingTime: 0,
        })
      }
    } catch (error) {
      setDbError(String(error))
    } finally {
      setIsInitializing(false)
    }
  }

  const handleInputChange = (field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = async (status: '작성중' | '완료') => {
    if (!currentUser?.empno) {
      alert("사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.")
      return
    }
    // 제출일 때만 validation 적용
    if (status === '완료' && !formData.comment.trim()) {
      alert("People Goal을 입력해 주세요.")
      return
    }
    setIsLoading(true)
    try {
      // 사번 정규화 (95129 → 095129)
      const { ReviewerService } = await import("@/lib/reviewer-service")
      const normalizedEmpno = ReviewerService.normalizeEmpno(currentUser.empno)
      console.log(`🔧 Plan: Saving with normalized empno: ${currentUser.empno} → ${normalizedEmpno}`)
      
      const insertData = {
        employee_id: normalizedEmpno,
        people_goal: formData.comment,
        gps_score: formData.gpsScore, // 그대로 1-100 정수값 저장
        pei_score: formData.peiScore, // 그대로 1-100 정수값 저장
        refresh_off_usage_rate: formData.refreshOff,
        coaching_time: Number(formData.coachingTime),
        status: status,
        updated_at: new Date().toISOString()
      }
      const { data, error } = await supabase
        .from("people_goals")
        .insert([insertData])
      if (!error) {
        setAssessmentData({
          comment: formData.comment,
          gpsScore: formData.gpsScore,
          peiScore: formData.peiScore,
          staffCoachingTime: 0,
          superOrg: 0,
          refreshOff: formData.refreshOff,
          coachingTime: Number(formData.coachingTime),
        })
        setCurrentStatus(status)
        setIsEditMode(false)
        // Update lastUpdated after successful save
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() + 1
        const day = now.getDate()
        setLastUpdated(`${year}년 ${month}월 ${day}일`)
        alert(status === '작성중' ? "임시저장 완료!" : "제출 완료!")
      } else {
        throw new Error(error.message)
      }
    } catch (error) {
      alert(`저장 실패: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 임시저장
  const handleDraftSave = async () => {
    await handleSave('작성중')
  }
  
  // 최종완료
  const handleFinalSave = async () => {
    await handleSave('완료')
  }

  // 상태 배지 렌더링
  const renderStatusBadge = () => {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline">
          Last updated: {lastUpdated || "-"}
        </Badge>
        {currentStatus === '완료' ? (
          <Badge className="bg-green-500 text-white">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            제출
          </Badge>
        ) : currentStatus === '작성중' ? (
          <Badge className="bg-orange-500 text-white">
            <Save className="mr-1 h-3 w-3" />
            작성중
          </Badge>
        ) : (
          <Badge className="bg-gray-400 text-white">
            Draft
          </Badge>
        )}
      </div>
    )
  }

  const handleCancel = () => {
    setFormData(assessmentData)
    setIsEditMode(false)
  }

  // 팀 전체 코칭 시간 계산
  const totalTeamCoachingHours = teamCoachingData.reduce((sum, member) => sum + member.totalCoachingHours, 0)

  // 팀원 상세 정보 다이얼로그 컴포넌트
  const TeamCoachingDetailDialog = () => (
    <Dialog open={isTeamDetailDialogOpen} onOpenChange={setIsTeamDetailDialogOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-600" />
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
          
          <Table>
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
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )

  // 주간 평균 계산
  const weeks = getWeeksInQuarter(coachingQuarterLabel.year, coachingQuarterLabel.quarter);
  const weeklyAvg = weeks > 0 ? Math.round(coachingQuarter / weeks) : 0;

  const monthlyAvg = cost !== null ? +(cost / 12 / 1000000).toFixed(1) : 0
  const exceeded = (cost !== null && budget !== null && cost > budget)
    ? +((cost - budget) / 1000000).toFixed(1)
    : 0
  // percent 계산 및 JSX에서 cost, budget이 null일 때 안전하게 처리
  const percent = (cost !== null && budget !== null && budget > 0)
    ? Math.round((cost / budget) * 100)
    : 0

  if (isInitializing) {
    return <div className="flex flex-col justify-center items-center h-64 space-y-4">로딩 중...</div>
  }
  if (dbError) {
    return <div className="text-red-500">DB 오류: {dbError}</div>
  }

  return (
    <div className="space-y-6">
      {/* Header with title and user info */}
      <div className="flex items-center justify-between">
        <div>
                          <h2 className="text-lg font-bold">People Plan</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {userInfo ? `${userInfo.empnm} (${userInfo.empno})` : `Employee ID: ${currentUser?.empno || 'Loading...'}`}
              </p>
              {userInfo?.org_nm && (
                <span className="text-xs text-muted-foreground">• {userInfo.org_nm}</span>
              )}
            </div>
            {renderStatusBadge()}
          </div>
        </div>
        <div className="flex gap-2">
          {isEditMode ? (
            <>
              <Button onClick={handleCancel} variant="outline" disabled={isLoading}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              {currentStatus !== '완료' && (
                <Button onClick={handleDraftSave} disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Saving..." : "임시저장"}
                </Button>
              )}
              <Button onClick={handleFinalSave} className="bg-green-600 text-white" disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Saving..." : "제출"}
              </Button>
            </>
          ) : !readOnly ? (
            <Button onClick={() => setIsEditMode(true)} disabled={isLoading}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          ) : null}
        </div>
      </div>


      <div className="grid gap-6 md:grid-cols-1">
        {/* Self Assessment Card (now full width) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5 text-orange-600" />
              Goals
            </CardTitle>

          </CardHeader>
          <CardContent>
            {isEditMode ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="self-comment">평가 의견</Label>
                  <Textarea
                    id="self-comment"
                    value={formData.comment}
                    onChange={(e) => handleInputChange("comment", e.target.value)}
                    placeholder="People 목표와 전략을 입력하세요..."
                    className="min-h-[600px]"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                {formData.comment?.trim() ? (
                  <p className="text-sm whitespace-pre-line">{formData.comment}</p>
                ) : (
                  <div className="text-muted-foreground italic">People 목표와 전략을 입력하세요</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metrics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-orange-600" />
성과 지표
          </CardTitle>

        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* First row: GPS(PEI), GPS(ITS), Refresh Off */}
            <div className="grid grid-cols-3 gap-6">
              {/* GPS(PEI) Score - 먼저 배치 */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="pei-score">GPS(PEI) Score (%)</Label>
                  <span className="text-sm font-medium">
                    {isEditMode ? `${formData.peiScore}%` : `${assessmentData.peiScore}%`}
                  </span>
                </div>
                {isEditMode ? (
                  <div className="flex items-center gap-2">
                    <Slider
                      id="pei-score"
                      min={1}
                      max={100}
                      step={1}
                      value={[formData.peiScore]}
                      onValueChange={(value) => handleInputChange("peiScore", value[0])}
                    />
                    <span className="w-12 text-center">{formData.peiScore}%</span>
                  </div>
                ) : (
                  <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-600 rounded-full"
                      style={{ width: `${assessmentData.peiScore}%` }}
                    ></div>
                  </div>
                )}
              </div>
              {/* GPS(ITS) Score - 두 번째 배치 */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="gps-score">GPS(ITS) Score (%)</Label>
                  <span className="text-sm font-medium">
                    {isEditMode ? `${formData.gpsScore}%` : `${assessmentData.gpsScore}%`}
                  </span>
                </div>
                {isEditMode ? (
                  <div className="flex items-center gap-2">
                    <Slider
                      id="gps-score"
                      min={1}
                      max={100}
                      step={1}
                      value={[formData.gpsScore]}
                      onValueChange={(value) => handleInputChange("gpsScore", value[0])}
                    />
                    <span className="w-12 text-center">{formData.gpsScore}%</span>
                  </div>
                ) : (
                  <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-600 rounded-full"
                      style={{ width: `${assessmentData.gpsScore}%` }}
                    ></div>
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  * ITS: intend to stay (향후 1년)
                </div>
              </div>
              {/* Refresh Off 사용률 - 기존과 동일 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="refresh-off">Refresh Off 사용률(%)</Label>
                  <span className="text-sm font-medium">
                    {isEditMode ? formData.refreshOff : assessmentData.refreshOff}%
                  </span>
                </div>
                {isEditMode ? (
                  <div className="flex items-center gap-2">
                    <Slider
                      id="refresh-off"
                      min={0}
                      max={100}
                      step={1}
                      value={[formData.refreshOff]}
                      onValueChange={(value) => handleInputChange("refreshOff", value[0])}
                    />
                  </div>
                ) : (
                  <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-600 rounded-full"
                      style={{ width: `${assessmentData.refreshOff}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>

            {/* 안내 문구 - 3개 카드 아래 */}
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-600 mt-4">
              <div className="text-sm text-black dark:text-white">
                <strong>안내:</strong> 최초 입력값은 최근 조직의 GPS(PEI)/GPS(ITS) 비율이며, 당기(2606) 조직 목표를 기재부탁드립니다.
              </div>
            </div>

            {/* Enhanced Staff Coaching Time/Budget Section - Full Width */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-orange-600" />
                <Label className="text-lg font-semibold">Staff Coaching Time & Budget</Label>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Time Tracking Card */}
                <Card className="border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
                      <div className="p-2 bg-orange-600 rounded-full">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                      코칭 시간 현황
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 개인 코칭 시간 */}
                    <div className="text-center border-b border-orange-200 dark:border-orange-700 pb-4">
                      <div className="text-5xl font-bold text-orange-900 dark:text-orange-100">
                        {coachingYear}
                      </div>
                      <div className="text-lg text-orange-700 dark:text-orange-300">
                        회계연도 누적 시간 (2025-Q3 ~ 2026-Q2)
                      </div>
                    </div>

                    {/* 팀 코칭 시간 */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-orange-700 dark:text-orange-300">팀 전체 누적</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-orange-900 dark:text-orange-100">
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

                    {/* 목표 시간 섹션 - 기존과 동일하지만 border-top 추가 */}
                    <div className="space-y-2 pt-2 border-t border-orange-200 dark:border-orange-700">
                      {isEditMode ? (
                        <div className="flex items-center justify-between space-y-2">
                          <Label htmlFor="coaching-time">목표 코칭 시간</Label>
                          <div className="flex items-center">
                            <input
                              id="coaching-time"
                              type="text"
                              value={formData.coachingTime === 0 ? "" : formData.coachingTime}
                              onChange={e => {
                                const value = e.target.value;
                                // 빈 문자열이거나 숫자만 허용
                                if (value === "" || /^\d+$/.test(value)) {
                                  handleInputChange("coachingTime", value === "" ? 0 : parseInt(value, 10));
                                }
                              }}
                              placeholder="0"
                              className="w-24 px-2 py-1 rounded border border-orange-300 text-right"
                            />
                            <span className="ml-2">시간</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between text-sm">
                          <span className="text-orange-700 dark:text-orange-300">목표</span>
                          <span className="font-medium text-orange-900 dark:text-orange-100">{assessmentData.coachingTime}시간</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-700 dark:text-orange-300">실제: {coachingYear}시간</span>
                        <span className="font-medium text-orange-900 dark:text-orange-100">
                          목표: {assessmentData.coachingTime}시간
                        </span>
                      </div>
                      <div className="h-3 bg-orange-200 dark:bg-orange-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min((coachingYear / assessmentData.coachingTime) * 100, 100)}%`,
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-orange-600 dark:text-orange-400">0시간</span>
                        <div className="flex items-center gap-1">
                          {coachingYear >= assessmentData.coachingTime ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingUp className="h-3 w-3 text-orange-600" />
                          )}
                          <span className="text-xs font-bold text-orange-700 dark:text-orange-300">
                            {Math.round((coachingYear / assessmentData.coachingTime) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>


                  </CardContent>
                </Card>

                {/* Budget Analysis Card */}
                <Card className="border-red-200 dark:border-red-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                      <div className="p-2 bg-red-600 rounded-full">
                        <DollarSign className="h-4 w-4 text-white" />
                      </div>
                      코칭 예산
                      {cost !== null && budget !== null && budget > 0 && cost > budget && (
                        <div className="ml-auto">
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-full font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            초과
                          </span>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{budget !== null ? `${(budget/1000000).toFixed(1)}백만원` : '-'}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">예산</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{cost !== null ? `${(cost/1000000).toFixed(1)}백만원` : '-'}</div>
                        <div className="text-xs text-red-600 dark:text-red-400">지출</div>
                      </div>
                    </div>

                    <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"
                        style={{ width: `${budget && budget > 0 && cost !== null ? Math.min((cost / budget) * 100, 100) : 0}%` }}
                      ></div>
                      {cost !== null && budget !== null && cost > budget && (
                        <div className="absolute right-0 top-0 h-full w-6 bg-red-700 opacity-60 animate-pulse"></div>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">0백만원</span>
                      <div className="flex items-center gap-1">
                        {cost !== null && budget !== null && budget > 0 && (
                          <>
                            {cost > budget ? (
                              <AlertTriangle className="h-3 w-3 text-red-600" />
                            ) : (
                              <TrendingUp className="h-3 w-3 text-orange-600" />
                            )}
                            <span className="text-xs font-bold text-red-600">{percent}%</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 dark:text-slate-400">초과 금액</span>
                        <span className="text-sm font-bold text-red-600 dark:text-red-400">{exceeded}백만원</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 dark:text-slate-400">월 평균 지출</span>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{monthlyAvg}백만원</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 dark:text-slate-400">예산 대비 지출</span>
                        <span className="text-xs font-bold text-red-600 dark:text-red-400">{percent}%</span>
                      </div>
                    </div>

                    {cost !== null && budget !== null && budget > 0 && cost > budget && (
                      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mt-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-red-700 dark:text-red-300">
                            예산을 {percent - 100}% 초과했습니다. 다음 분기 예산 조정이 필요합니다.
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 팀원 상세 다이얼로그 */}
      <TeamCoachingDetailDialog />
    </div>
  )
}
