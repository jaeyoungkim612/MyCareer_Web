"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Target } from "lucide-react"
import { Clock, Users, Edit, Save, X, DollarSign, TrendingUp, AlertTriangle, CheckCircle, User, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AuthService } from "@/lib/auth-service"
import { UserInfoMapper } from "@/data/user-info"
import { PeopleGoalsService } from "@/lib/people-goals-service"
import { supabase } from "@/lib/supabase"

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
  
  const [assessmentData, setAssessmentData] = useState({
    comment: "",
    gpsScore: 1,
    peiScore: 1,
    staffCoachingTime: 0,
    superOrg: 0,
    refreshOff: 0,
    coachingTime: 10, // 목표 코칭 시간 기본값
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
  }, [empno])

  // 코칭 시간 불러오기
  useEffect(() => {
    const fetchCoaching = async () => {
      if (!currentUser?.empno) return
      const now = new Date()
      const year = now.getFullYear()
      const quarter = Math.ceil((now.getMonth() + 1) / 3)
      setCoachingQuarterLabel({ year, quarter })
      setCoachingYearLabel(year)
      try {
        const { quarterHours, yearHours } = await PeopleGoalsService.getCoachingTimeStats(currentUser.empno, year, quarter)
        console.log("코칭 시간 쿼리 결과:", { quarterHours, yearHours, empno: currentUser.empno, year, quarter })
        setCoachingQuarter(quarterHours)
        setCoachingYear(yearHours)
      } catch (e) {
        console.error("코칭 시간 쿼리 오류:", e)
      }
    }
    fetchCoaching()
  }, [currentUser])

  useEffect(() => {
    const fetchBudgetAndCost = async () => {
      if (!currentUser?.empno || !coachingYearLabel) return
      const { data, error } = await supabase
        .from('v_coaching_time_quarterly')
        .select('coaching_budget, total_amt')
        .eq('EMPNO', currentUser.empno)
        .eq('input_year', coachingYearLabel.toString())
      if (!error && data) {
        setBudget(data.reduce((sum, row) => sum + Number(row.coaching_budget || 0), 0))
        setCost(data.reduce((sum, row) => sum + Number(row.total_amt || 0), 0))
      }
    }
    fetchBudgetAndCost()
  }, [currentUser, coachingYearLabel])

  const loadUserInfoAndInitialize = async () => {
    setIsInitializing(true)
    setDbError(null)
    try {
      const authUser = AuthService.getCurrentUser()
      if (!authUser) throw new Error("로그인된 사용자가 없습니다. 다시 로그인해주세요.")
      
      // readOnly 모드에서는 전달받은 empno 우선 사용, 일반 모드에서는 로그인 사용자
      const targetEmpno = readOnly 
        ? empno || authUser.empno // readOnly일 때는 전달받은 empno 우선
        : empno || authUser.empno // 일반 모드일 때는 기존 로직
      
      setCurrentUser({ ...authUser, empno: targetEmpno })
      
      // 대상 사용자의 정보 가져오기 (Business Plan과 동일한 로직)
      try {
        const { data: hrData } = await supabase
          .from("a_hr_master")
          .select("EMPNO, EMPNM, ORG_NM, JOB_INFO_NM, GRADNM")
          .eq("EMPNO", targetEmpno)
          .single()

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
      
      // 데이터 로드 (status 포함)
      try {
        const { data, error } = await supabase
          .from("people_goals")
          .select("*")
          .eq("employee_id", targetEmpno)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        if (data) {
          setAssessmentData({
            comment: data.people_goal ?? "",
            gpsScore: data.gps_score ?? 1,
            peiScore: data.pei_score ?? 1,
            staffCoachingTime: 0,
            superOrg: 0,
            refreshOff: data.refresh_off_usage_rate ?? 0,
            coachingTime: data.coaching_time ?? 40,
          })
          setFormData({
            comment: data.people_goal ?? "",
            gpsScore: data.gps_score ?? 1,
            peiScore: data.pei_score ?? 1,
            staffCoachingTime: 0,
            superOrg: 0,
            refreshOff: data.refresh_off_usage_rate ?? 0,
            coachingTime: data.coaching_time ?? 40,
          })
          // Set status from database
          setCurrentStatus(data.status || 'Draft')
          // Set lastUpdated from database
          if (data.updated_at) {
            const date = new Date(data.updated_at)
            const year = date.getFullYear()
            const month = date.getMonth() + 1
            const day = date.getDate()
            setLastUpdated(`${year}년 ${month}월 ${day}일`)
          }
        }
      } catch (dbErr) {
        console.log("No existing people goals data found")
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
    if (!formData.comment.trim()) {
      alert("People Goal을 입력해 주세요.")
      return
    }
    setIsLoading(true)
    try {
      const insertData = {
        employee_id: currentUser.empno,
        people_goal: formData.comment,
        gps_score: formData.gpsScore,
        pei_score: formData.peiScore,
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
        alert(status === '작성중' ? "임시저장 완료!" : "최종완료 저장!")
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
            완료
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

  // 주간 평균 계산
  const weeks = getWeeksInQuarter(coachingQuarterLabel.year, coachingQuarterLabel.quarter);
  const weeklyAvg = weeks > 0 ? Math.round(coachingQuarter / weeks) : 0;

  const monthlyAvg = cost !== null ? Math.round(cost / 12 / 1000000) : 0
  const exceeded = (cost !== null && budget !== null && cost > budget)
    ? Math.round((cost - budget) / 1000000)
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
          <h2 className="text-2xl font-bold">People Plan</h2>
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
              <Button onClick={handleDraftSave} disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Saving..." : "임시저장"}
              </Button>
              <Button onClick={handleFinalSave} className="bg-green-600 text-white" disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Saving..." : "최종완료"}
              </Button>
            </>
          ) : !readOnly && currentStatus !== '완료' ? (
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
            <CardDescription>Your personal assessment and goals</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditMode ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="self-comment">Assessment Comments</Label>
                  <Textarea
                    id="self-comment"
                    value={formData.comment}
                    onChange={(e) => handleInputChange("comment", e.target.value)}
                    placeholder="Provide your self assessment comments..."
                    className="min-h-[120px]"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                  <p className="text-sm">{formData.comment?.trim() ? formData.comment : "목표가 설정되지 않았습니다."}</p>
                </div>
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
            Performance Metrics
          </CardTitle>
          <CardDescription>Set targets and track your performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* First row: GPS, PEI, Refresh Off */}
            <div className="grid grid-cols-3 gap-6">
              {/* GPS Score */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="gps-score">GPS Score (1-10)</Label>
                  <span className="text-sm font-medium">
                    {isEditMode ? formData.gpsScore : assessmentData.gpsScore}
                  </span>
                </div>
                {isEditMode ? (
                  <div className="flex items-center gap-2">
                    <Slider
                      id="gps-score"
                      min={1}
                      max={10}
                      step={1}
                      value={[formData.gpsScore]}
                      onValueChange={(value) => handleInputChange("gpsScore", value[0])}
                    />
                    <span className="w-8 text-center">{formData.gpsScore}</span>
                  </div>
                ) : (
                  <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-600 rounded-full"
                      style={{ width: `${(assessmentData.gpsScore / 10) * 100}%` }}
                    ></div>
                  </div>
                )}
              </div>
              {/* PEI Score */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="pei-score">PEI Score (1-10)</Label>
                  <span className="text-sm font-medium">
                    {isEditMode ? formData.peiScore : assessmentData.peiScore}
                  </span>
                </div>
                {isEditMode ? (
                  <div className="flex items-center gap-2">
                    <Slider
                      id="pei-score"
                      min={1}
                      max={10}
                      step={1}
                      value={[formData.peiScore]}
                      onValueChange={(value) => handleInputChange("peiScore", value[0])}
                    />
                    <span className="w-8 text-center">{formData.peiScore}</span>
                  </div>
                ) : (
                  <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-600 rounded-full"
                      style={{ width: `${(assessmentData.peiScore / 10) * 100}%` }}
                    ></div>
                  </div>
                )}
              </div>
              {/* Refresh Off 사용률 */}
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
                    <div className="text-center">
                      <div className="text-4xl font-bold text-orange-900 dark:text-orange-100">
                        {coachingQuarter}
                      </div>
                      <div className="text-sm text-orange-700 dark:text-orange-300">
                        시간 ({coachingQuarterLabel.year}년 {coachingQuarterLabel.quarter}분기 기준)
                      </div>
                      <div className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                        {coachingYearLabel}년 누적: <b>{coachingYear}시간</b>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {isEditMode ? (
                        <div className="flex items-center justify-between space-y-2">
                          <Label htmlFor="coaching-time">목표 코칭 시간</Label>
                          <div className="flex items-center">
                            <input
                              id="coaching-time"
                              type="number"
                              min={0}
                              value={formData.coachingTime}
                              onChange={e => handleInputChange("coachingTime", e.target.value)}
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
                        <span className="text-orange-700 dark:text-orange-300">달성</span>
                        <span className="font-medium text-orange-900 dark:text-orange-100">
                          {assessmentData.staffCoachingTime}시간
                        </span>
                      </div>
                      <div className="h-3 bg-orange-200 dark:bg-orange-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min((assessmentData.staffCoachingTime / 40) * 100, 100)}%`,
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-orange-600 dark:text-orange-400">0시간</span>
                        <div className="flex items-center gap-1">
                          {assessmentData.staffCoachingTime >= 40 ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingUp className="h-3 w-3 text-orange-600" />
                          )}
                          <span className="text-xs font-bold text-orange-700 dark:text-orange-300">
                            {Math.round((assessmentData.staffCoachingTime / 40) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-orange-200 dark:border-orange-700">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-orange-700 dark:text-orange-300">주간 평균</span>
                        <span className="text-xs font-medium text-orange-900 dark:text-orange-100">
                          {weeklyAvg}시간/주
                        </span>
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
                      예산 현황
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
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{budget !== null ? `${Math.round(budget/1000000)}M` : '-'}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">예산</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{cost !== null ? `${Math.round(cost/1000000)}M` : '-'}</div>
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
                      <span className="text-xs text-slate-500">0M</span>
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
                        <span className="text-sm font-bold text-red-600 dark:text-red-400">{exceeded}M</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 dark:text-slate-400">월 평균 지출</span>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{monthlyAvg}M</span>
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
    </div>
  )
}
