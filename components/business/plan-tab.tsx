"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  FileText,
  BarChart3,
  Edit,
  Save,
  Clock,
  Building2,
  X,
  Target,
  PieChart,
  AlertCircle,
  Database,
  RefreshCw,
  User,
  CheckCircle2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { BusinessGoalsService } from "@/lib/business-goals-service"
import { testConnection, supabase } from "@/lib/supabase"
import { AuthService } from "@/lib/auth-service"
import { UserInfoMapper } from "@/data/user-info"
import type { HrMasterDashboardRow } from "@/data/hr-master-dashboard"

interface BusinessPlanTabProps {
  empno?: string
  readOnly?: boolean
}

export function BusinessPlanTab({ empno, readOnly = false }: BusinessPlanTabProps = {}) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "error">("connected") // 기본값을 connected로 설정
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [budgetData, setBudgetData] = useState<{
    budget_audit: number;
    budget_non_audit: number;
    current_audit_adjusted_em: number;
    current_non_audit_adjusted_em: number;
  } | null>(null)

  // 현재 사용자 ID (props에서 받은 empno 또는 로그인한 사용자)
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>("")

  // Add lastUpdated state
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  
  // Status state 추가
  const [currentStatus, setCurrentStatus] = useState<'Draft' | '작성중' | '완료'>('Draft')

  // formData의 모든 숫자 필드는 string으로 관리
  const [formData, setFormData] = useState({
    businessGoal: "",
    newAuditCount: "0",
    newAuditAmount: "0",
    hourlyRevenue: "0",
    uiRevenueCount: "0",
    uiRevenueAmount: "0",
    nonAuditHourlyRevenue: "0",
  })

  // 천 단위 콤마 함수 (이것만 남기세요!)
  const formatNumberWithCommas = (value: string) => {
    if (!value) return ""
    const num = Number(value.replace(/,/g, ""))
    if (isNaN(num)) return ""
    return num.toLocaleString("ko-KR")
  }

  // 천 단위 구분자 제거 함수
  const removeCommas = (value: string): string => {
    return value.replace(/,/g, '')
  }

  // 숫자 입력 처리 함수
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const numericValue = removeCommas(value)
    // 숫자만 허용
    if (numericValue === '' || /^\d*$/.test(numericValue)) {
      setFormData((prev) => ({ ...prev, [name]: numericValue }))
    }
  }

  // 원본 데이터 저장 (변경 감지용)
  const [originalData, setOriginalData] = useState(formData)

  // 컴포넌트 마운트 시 사용자 정보 로드 및 데이터 초기화
  useEffect(() => {
    loadUserInfoAndInitialize()
  }, [empno])

  // currentEmployeeId가 설정된 후 데이터 로드
  useEffect(() => {
    if (currentEmployeeId && connectionStatus === "connected") {
      loadLatestGoals()
    }
  }, [currentEmployeeId, connectionStatus])

  useEffect(() => {
    if (currentEmployeeId) {
      fetchBudgetData(currentEmployeeId)
    }
  }, [currentEmployeeId])

  // hr_master_dashboard에서 예산 정보 가져오기
  const fetchBudgetData = async (empno: string) => {
    try {
      console.log("조회할 사번:", empno); // ← 이 줄 추가
      const { data, error } = await supabase
        .from("hr_master_dashboard")
        .select("budget_audit, budget_non_audit, current_audit_adjusted_em, current_non_audit_adjusted_em")
        .eq("EMPNO", empno)
        .single()
      console.log("Supabase 응답:", { data, error }); // ← 이 줄 추가
      if (!error && data) {
        console.log("받은 데이터:", data); // ← 이 줄 추가
        setBudgetData({
          budget_audit: data.budget_audit ?? 0,
          budget_non_audit: data.budget_non_audit ?? 0,
          current_audit_adjusted_em: data.current_audit_adjusted_em ?? 0,
          current_non_audit_adjusted_em: data.current_non_audit_adjusted_em ?? 0,
        })
      } else {
        console.log("데이터 없음 또는 에러"); // ← 이 줄 추가
        setBudgetData(null)
      }
    } catch (e) {
      console.log("에러 발생:", e); // ← 이 줄 추가
      setBudgetData(null)
    }
  }

  const loadUserInfoAndInitialize = async () => {
    console.log("🔍 BusinessPlanTab: Quick initialization...")

    try {
      // 1. 현재 로그인한 사용자 정보 가져오기 (즉시 조회)
      const authUser = AuthService.getCurrentUser()
      if (!authUser) {
        throw new Error("로그인된 사용자가 없습니다. 다시 로그인해주세요.")
      }

      // readOnly 모드에서는 전달받은 empno 우선 사용, 일반 모드에서는 로그인 사용자
      const targetEmpno = readOnly 
        ? empno || authUser.empno // readOnly일 때는 전달받은 empno 우선
        : empno || authUser.empno // 일반 모드일 때는 기존 로직
      
      setCurrentUser(authUser)
      setCurrentEmployeeId(targetEmpno)
      console.log("✅ Target empno set:", targetEmpno)

      // 2. 대상 사용자의 정보 가져오기
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
            pwc_id: hrData.EMPNO, // 대상 사용자의 empno 사용
          })
          console.log("✅ Target user info loaded for:", targetEmpno, hrData.EMPNM, "(direct DB query)")
        } else {
          console.log("ℹ️ No HR data found for target user, using target empno")
          // 대상 사용자 empno로 fallback
          setUserInfo({
            empno: targetEmpno,
            empnm: targetEmpno,
            pwc_id: targetEmpno,
          })
        }
      } catch (error) {
        console.log("ℹ️ Could not load target user info, using target empno:", error)
        // 대상 사용자 empno로 fallback
        setUserInfo({
          empno: targetEmpno,
          empnm: targetEmpno,
          pwc_id: targetEmpno,
        })
      }

      console.log("✅ Component initialization completed")
      
    } catch (error) {
      console.error("❌ Component initialization failed:", error)
      setConnectionStatus("error")
      setDbError(String(error))
    } finally {
      setIsInitializing(false) // 즉시 로딩 완료
    }
  }

  const loadLatestGoals = async () => {
    if (!currentEmployeeId) return;
    try {
      const { data, error } = await supabase
        .from("business_goals")
        .select("*")
        .eq("employee_id", currentEmployeeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data) {
        setFormData({
          businessGoal: data.business_goal || "",
          newAuditCount: data.new_audit_count?.toString() || "0",
          newAuditAmount: data.new_audit_amount?.toString() || "0",
          hourlyRevenue: data.hourly_revenue?.toString() || "0",
          uiRevenueCount: data.ui_revenue_count?.toString() || "0",
          uiRevenueAmount: data.ui_revenue_amount?.toString() || "0",
          nonAuditHourlyRevenue: data.non_audit_hourly_revenue?.toString() || "0",
        });
        setOriginalData({
          businessGoal: data.business_goal || "",
          newAuditCount: data.new_audit_count?.toString() || "0",
          newAuditAmount: data.new_audit_amount?.toString() || "0",
          hourlyRevenue: data.hourly_revenue?.toString() || "0",
          uiRevenueCount: data.ui_revenue_count?.toString() || "0",
          uiRevenueAmount: data.ui_revenue_amount?.toString() || "0",
          nonAuditHourlyRevenue: data.non_audit_hourly_revenue?.toString() || "0",
        });
        // Set status from database
        setCurrentStatus(data.status || 'Draft');
        // Set lastUpdated from database
        if (data.updated_at) {
          const date = new Date(data.updated_at)
          const year = date.getFullYear()
          const month = date.getMonth() + 1
          const day = date.getDate()
          setLastUpdated(`${year}년 ${month}월 ${day}일`)
        }
      }
    } catch {}
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // 변경된 필드만 감지하고 정확한 필드명으로 매핑
  const getChangedFields = () => {
    const changes: Record<string, any> = {}

    if (formData.businessGoal !== originalData.businessGoal) {
      changes.business_goal = formData.businessGoal
    }
    if (formData.newAuditCount !== originalData.newAuditCount) {
      changes.new_audit_count = Number(formData.newAuditCount.replace(/,/g, "")) || 0
    }
    if (formData.newAuditAmount !== originalData.newAuditAmount) {
      changes.new_audit_amount = Number(formData.newAuditAmount.replace(/,/g, "")) || 0
    }
    if (formData.hourlyRevenue !== originalData.hourlyRevenue) {
      changes.hourly_revenue = Number(formData.hourlyRevenue.replace(/,/g, "")) || 0
    }
    if (formData.uiRevenueCount !== originalData.uiRevenueCount) {
      changes.ui_revenue_count = Number(formData.uiRevenueCount.replace(/,/g, "")) || 0
    }
    if (formData.uiRevenueAmount !== originalData.uiRevenueAmount) {
      changes.ui_revenue_amount = Number(formData.uiRevenueAmount.replace(/,/g, "")) || 0
    }
    if (formData.nonAuditHourlyRevenue !== originalData.nonAuditHourlyRevenue) {
      changes.non_audit_hourly_revenue = Number(formData.nonAuditHourlyRevenue.replace(/,/g, "")) || 0
    }

    console.log("Detected changes:", changes)
    return changes
  }

  const handleSave = async (status: '작성중' | '완료') => {
    if (!currentEmployeeId) {
      alert("사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.")
      return
    }
    if (!formData.businessGoal.trim()) {
      alert("Business Goal을 입력해 주세요.");
      return;
    }
    setIsLoading(true)
    try {
      const insertData = {
        employee_id: currentEmployeeId,
        business_goal: formData.businessGoal,
        new_audit_count: Number(formData.newAuditCount || 0),
        new_audit_amount: Number(formData.newAuditAmount || 0),
        hourly_revenue: Number(formData.hourlyRevenue || 0),
        ui_revenue_count: Number(formData.uiRevenueCount || 0),
        ui_revenue_amount: Number(formData.uiRevenueAmount || 0),
        non_audit_hourly_revenue: Number(formData.nonAuditHourlyRevenue || 0),
        status: status,
        updated_at: new Date().toISOString()
      }
      const { data, error } = await supabase
        .from("business_goals")
        .insert([insertData])
      if (!error) {
        setOriginalData({ ...formData })
        setCurrentStatus(status)
        setIsEditing(false)
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
    setIsEditing(false)
    setFormData({ ...originalData }) // 원래 데이터로 복원
  }

  const formatCurrency = (value: string | number) => {
    const num = Number.parseInt(String(value), 10)
    return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(num)
  }

  // 천 단위 구분자가 포함된 값 표시 함수
  const displayFormattedValue = (value: string | number): string => {
    const num = Number.parseInt(String(value), 10)
    return num > 0 ? num.toLocaleString('ko-KR') : '0'
  }

  // 백만(M) 단위 포맷 함수
  const formatMillion = (value: number | string) => {
    const num = Number(value)
    if (isNaN(num)) return "-"
    return `${(num / 1_000_000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}M`
  }

  // 백만(M) 단위 변환 함수
  const toMillionString = (value: number | string) => {
    const num = Number(value);
    if (isNaN(num)) return '-';
    if (num < 0) {
      return `(-)${Math.abs(num / 1_000_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}M`;
    }
    return `${(num / 1_000_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}M`;
  };

  // 초기화 중일 때 (빠른 로딩)
  if (isInitializing) {
    return (
      <div className="flex flex-col justify-center items-center h-32 space-y-2">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
        <p className="text-sm text-muted-foreground">초기화 중...</p>
      </div>
    )
  }

  // 데이터베이스 오류가 있을 때
  if (dbError) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>데이터베이스 연결 실패: {dbError}</AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>연결 재시도</CardTitle>
            <CardDescription>데이터베이스 연결을 다시 시도합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadUserInfoAndInitialize} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              다시 연결 시도
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with title and edit buttons */}
      <div className="flex items-center justify-between">
        <div>
                          <h2 className="text-lg font-bold">Business Plan</h2> {/* 제목만 남김 */}
          <div className="flex items-center gap-4"> {/* gap-2 → gap-4로 확대 */}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {userInfo ? `${userInfo.empnm} (${userInfo.empno})` : `Employee ID: ${currentUser?.empno || 'Loading...'}`}
              </p>
              {userInfo?.org_nm && (
                <span className="text-xs text-muted-foreground">• {userInfo.org_nm}</span>
              )}
            </div>
            {renderStatusBadge()} {/* 상태 배지를 사용자 정보 옆으로 이동 */}
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
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
            <Button onClick={() => setIsEditing(true)} disabled={isLoading}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          ) : null}
        </div>
      </div>


      <div className="grid gap-6 md:grid-cols-1">
        {/* Goals Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5 text-orange-600" />
              Goals
            </CardTitle>
            <CardDescription>Your business objectives and strategy</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessGoal">Business Strategy</Label>
                  <Textarea
                    id="businessGoal"
                    name="businessGoal"
                    value={formData.businessGoal}
                    onChange={handleChange}
                    placeholder="Describe your business strategy and goals..."
                    className="min-h-[120px]"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                  <p className="text-sm">{formData.businessGoal || "목표가 설정되지 않았습니다."}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Budget Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="mr-2 h-5 w-5 text-orange-600" />
              My Budget(TBA 기준)
            </CardTitle>
            <CardDescription>Set your budget targets for the current period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              {/* Total Budget (합산, 원단위) */}
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-foreground">Total Budget</span>
                </div>
                <span className="text-lg font-bold text-foreground mt-1 block">
                  {budgetData
                    ? `₩${(Number(budgetData.budget_audit) + Number(budgetData.budget_non_audit)).toLocaleString('ko-KR')}`
                    : "-"}
                </span>
              </div>
              {/* 감사 Budget (DB에서, 원단위) */}
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-foreground">감사 Budget</span>
                </div>
                <span className="text-lg font-bold text-foreground mt-1 block">
                  {budgetData ? `₩${Number(budgetData.budget_audit).toLocaleString('ko-KR')}` : "-"}
                </span>
                {/* Audit Adjusted EM (실제 값 표시, M단위) */}
                <div className="flex items-center gap-2 mt-4">
                  <FileText className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-foreground">Audit Adjusted EM</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-bold text-foreground">{budgetData ? `₩${toMillionString(budgetData.current_audit_adjusted_em)}` : '-'}</span>
                </div>
              </div>
              {/* 비감사서비스 Budget (DB에서, 원단위) */}
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-foreground">비감사서비스 Budget</span>
                </div>
                <span className="text-lg font-bold text-foreground mt-1 block">
                  {budgetData ? `₩${Number(budgetData.budget_non_audit).toLocaleString('ko-KR')}` : "-"}
                </span>
                {/* Non Audit Adjusted EM (실제 값 표시, M단위) */}
                <div className="flex items-center gap-2 mt-4">
                  <BarChart3 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-foreground">Non Audit Adjusted EM</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-bold text-foreground">{budgetData ? `₩${toMillionString(budgetData.current_non_audit_adjusted_em)}` : '-'}</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground text-left">Target period: 2606</p>
          </CardFooter>
        </Card>
      </div>

      {/* Audit Metrics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5 text-orange-600" />
            Audit BD 목표(계약기준)
          </CardTitle>
          <CardDescription>Set your audit business targets for the current period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* New Audit Count */}
              <div className="space-y-2">
                <Label htmlFor="newAuditCount">신규 감사 건수</Label>
                {isEditing ? (
                  <Input
                    id="newAuditCount"
                    name="newAuditCount"
                    type="number"
                    min="0"
                    value={formData.newAuditCount}
                    onChange={handleChange}
                  />
                ) : (
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-orange-600" />
                    <span className="text-lg font-bold">{formData.newAuditCount} 건</span>
                  </div>
                )}
              </div>

              {/* New Audit Amount */}
              <div className="space-y-2">
                <Label htmlFor="newAuditAmount">신규 BD 금액</Label>
                {isEditing ? (
                  <div className="flex items-center">
                    <Input
                      id="newAuditAmount"
                      name="newAuditAmount"
                      type="text"
                      value={displayFormattedValue(formData.newAuditAmount)}
                      onChange={handleNumberChange}
                      placeholder="0"
                      style={{ width: "100%" }}
                    />
                    <span className="ml-2">M</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-orange-600" />
                    <span className="text-lg font-bold">₩{Number(formData.newAuditAmount).toLocaleString("ko-KR")}M</span>
                  </div>
                )}
              </div>

              {/* 시간 당 Revenue */}
              <div className="space-y-2">
                <Label>시간 당 Revenue</Label>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  {isEditing ? (
                    <>
                      <Input
                        id="hourlyRevenue"
                        name="hourlyRevenue"
                        type="text"
                        value={displayFormattedValue(formData.hourlyRevenue)}
                        onChange={handleNumberChange}
                        className="w-28 text-lg font-bold px-2 py-1"
                        style={{ minWidth: 0, width: "6.5rem" }}
                        placeholder="0"
                      />
                      <span className="text-lg font-bold">/h</span>
                    </>
                  ) : (
                    <span className="text-lg font-bold">₩ {Number(formData.hourlyRevenue).toLocaleString()}/h</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground text-left">Target period: 2606</p>
        </CardFooter>
      </Card>

      {/* Non-Audit Metrics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5 text-orange-600" />
            Non-Audit BD 목표(계약기준)
          </CardTitle>
          <CardDescription>Set your non-audit business targets for the current period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* UI Revenue Count */}
              <div className="space-y-2">
                <Label htmlFor="uiRevenueCount">UI Revenue 건수</Label>
                {isEditing ? (
                  <Input
                    id="uiRevenueCount"
                    name="uiRevenueCount"
                    type="number"
                    min="0"
                    value={formData.uiRevenueCount}
                    onChange={handleChange}
                  />
                ) : (
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-orange-600" />
                    <span className="text-lg font-bold">{formData.uiRevenueCount} 건</span>
                  </div>
                )}
              </div>

              {/* UI Revenue Amount */}
              <div className="space-y-2">
                <Label htmlFor="uiRevenueAmount">UI Revenue 계약금액</Label>
                {isEditing ? (
                  <div className="flex items-center">
                    <Input
                      id="uiRevenueAmount"
                      name="uiRevenueAmount"
                      type="text"
                      value={displayFormattedValue(formData.uiRevenueAmount)}
                      onChange={handleNumberChange}
                      placeholder="0"
                      style={{ width: "100%" }}
                    />
                    <span className="ml-2">M</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-orange-600" />
                    <span className="text-lg font-bold">₩{Number(formData.uiRevenueAmount).toLocaleString("ko-KR")}M</span>
                  </div>
                )}
              </div>

              {/* Non-Audit 시간 당 Revenue */}
              <div className="space-y-2">
                <Label>시간 당 Revenue</Label>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  {isEditing ? (
                    <>
                      <Input
                        id="nonAuditHourlyRevenue"
                        name="nonAuditHourlyRevenue"
                        type="text"
                        value={displayFormattedValue(formData.nonAuditHourlyRevenue)}
                        onChange={handleNumberChange}
                        className="w-28 text-lg font-bold px-2 py-1"
                        style={{ minWidth: 0, width: "6.5rem" }}
                        placeholder="0"
                      />
                      <span className="text-lg font-bold">/h</span>
                    </>
                  ) : (
                    <span className="text-lg font-bold">
                      ₩ {Number(formData.nonAuditHourlyRevenue).toLocaleString()}/h
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground text-left">Target period: 2606</p>
        </CardFooter>
      </Card>
    </div>
  )
}
