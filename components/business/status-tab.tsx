"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FileText, BarChart3, ArrowUp, ArrowDown, DollarSign, PieChartIcon } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useState, useEffect } from "react"
import type { HrMasterDashboardRow } from "@/data/hr-master-dashboard"
import { supabase } from "@/lib/supabase"
import { AuthService } from "@/lib/auth-service"
import { BusinessGoalsService, type BusinessGoal } from "@/lib/business-goals-service"

// 백만(M) 단위 변환 함수
const toMillion = (value: number | string) => Number(value) / 1_000_000;

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
        // readOnly 모드에서는 전달받은 empno 우선 사용, 일반 모드에서는 로그인 사용자
        const targetEmpno = readOnly 
          ? empno || authUser.empno // readOnly일 때는 전달받은 empno 우선
          : empno || authUser.empno // 일반 모드일 때는 기존 로직
        setCurrentEmployeeId(targetEmpno)
      }
    }
    loadUser()
  }, [empno])

  // empno가 설정되면 budgetData fetch
  useEffect(() => {
    if (!currentEmployeeId) return
    const fetchBudget = async () => {
      const { data, error } = await supabase
        .from("hr_master_dashboard")
        .select("*")
        .eq("EMPNO", currentEmployeeId)
        .single()
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

  // Budget 실데이터 변수 선언 (컴포넌트 전체에서 한 번만 선언)
  const myAuditActual = toMillion(budgetData?.current_audit_revenue ?? 0); // 원 → M
  const myNonAuditActual = toMillion(budgetData?.current_non_audit_revenue ?? 0); // 원 → M
  const myAuditBudget = Number(budgetData?.budget_audit ?? 0); // 이미 M단위
  const myNonAuditBudget = Number(budgetData?.budget_non_audit ?? 0); // 이미 M단위
  const myTotalActual = myAuditActual + myNonAuditActual;
  const myTotalBudget = myAuditBudget + myNonAuditBudget;

  const teamAuditActual = toMillion(budgetData?.dept_revenue_audit ?? 0);
  const teamNonAuditActual = toMillion(budgetData?.dept_revenue_non_audit ?? 0);
  const teamAuditBudget = Number(budgetData?.dept_budget_audit ?? 0);
  const teamNonAuditBudget = Number(budgetData?.dept_budget_non_audit ?? 0);
  const teamTotalActual = teamAuditActual + teamNonAuditActual;
  const teamTotalBudget = teamAuditBudget + teamNonAuditBudget;

  // 신규 BD 금액, UI Revenue 계약금액 실제/예산값 변수 선언 (컴포넌트 상단)
  const actualNewBdAmount = (budgetData?.audit_pjt_amount ?? 0) / 1_000_000; // 백만(M) 단위
  const budgetNewBdAmount = goalData?.new_audit_amount ?? 0; // 백만(M) 단위 그대로
  const actualUiRevenueAmount = (budgetData?.non_audit_pjt_amount ?? 0) / 1_000_000; // 백만(M) 단위
  const budgetUiRevenueAmount = goalData?.ui_revenue_amount ?? 0; // 백만(M) 단위 그대로

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
  }: {
    actual: number
    budget: number
    title: string
    color: string
    trend: string
    displayType?: "percentage" | "count" | "amount" | "tenThousand"
    cardClassName?: string
  }) => {
    const percentage = (actual / budget) * 100
    const isExceeded = actual > budget

    // BarChartComponent 내부 formatDisplayValue 함수에서 'amount' 타입일 때 value를 그대로 사용하고, 단위만 붙임. 추가적인 / 1_000_000 등 연산 제거.
    // 카드 하단, 툴팁 등에서도 변수값 그대로 사용하고, 단위만 붙임.
    const formatDisplayValue = (value: number, type: string, isBudget = false) => {
      switch (type) {
        case "count":
          return `${value}건`
        case "amount":
          return isBudget
            ? `${value.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}M`
            : `${value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`
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
      },
    ]

    // 커스텀 툴팁
    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        // Goal 탭이면 예산 -> 목표로 표시
        const isGoalTab = title.includes('신규 감사 건수') || title.includes('신규 BD 금액') || title.includes('UI Revenue') || title.includes('시간 당 Revenue');
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
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: color }} />
              <span className="text-lg font-semibold text-gray-900">{title}</span>
            </div>
            <div className="flex items-center space-x-1">
              {getTrendIcon(trend)}
              <span className={`text-sm font-medium ${getTrendColor(trend)}`}>{trend}</span>
            </div>
          </div>

          {/* 범례 추가 */}
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-300 border border-gray-400 rounded"></div>
              <span className="text-xs text-gray-600">{(title.includes('신규 감사 건수') || title.includes('신규 BD 금액') || title.includes('UI Revenue') || title.includes('시간 당 Revenue')) ? '목표' : '예산'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: color }}></div>
              <span className="text-xs text-gray-600">실제</span>
            </div>
          </div>

          <div className="mb-6">
            <ResponsiveContainer width="100%" height={100}>
              <BarChart layout="vertical" data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, Math.max(budget * 1.2, actual * 1.1)]}
                  tickFormatter={(value) => formatDisplayValue(value, displayType)}
                />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="actual"
                  fill={color}
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                  name="실제"
                />
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

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm text-gray-500">실제</div>
              <div className="text-xl font-bold text-gray-900">
                {displayType === 'count' ? `${actual}건` :
                  // 목표탭의 '신규 BD 금액', 'UI Revenue 계약금액'만 백만단위 환산 및 콤마
                  (title === '신규 BD 금액' || title === 'UI Revenue 계약금액') ? `${actual.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M` :
                  displayType === 'amount' ? `${actual.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M` :
                  displayType === 'tenThousand' ? `₩ ${actual.toLocaleString('ko-KR')}/h` :
                  actual !== undefined && actual !== null ? `${actual.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M` : '-'}
              </div>
            </div>
            <div className="space-y-1 text-right">
              <div className="text-sm text-gray-500">{(title.includes('신규 감사 건수') || title.includes('신규 BD 금액') || title.includes('UI Revenue') || title.includes('시간 당 Revenue')) ? '목표' : '예산'}</div>
              <div className="text-xl font-bold text-gray-900">
                {displayType === 'count' ? `${budget}건` :
                  displayType === 'amount' ? `${budget.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}M` :
                  displayType === 'tenThousand' ? `₩ ${budget.toLocaleString('ko-KR')}/h` :
                  budget !== undefined && budget !== null ? `${budget.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}M` : '-'}
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <div
              className={`text-sm font-medium ${percentage >= 100 ? "text-green-600" : percentage >= 80 ? "text-amber-600" : "text-red-600"}`}
            >
              {Math.round(percentage)}% {percentage >= 100 ? "초과달성" : "달성"}
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
  }: {
    auditActual: number
    nonAuditActual: number
    totalBudget: number
    title: string
    trend: string
    cardClassName?: string
    isTeam?: boolean
  }) => {
    const totalActual = auditActual + nonAuditActual
    const percentage = Math.round((totalActual / totalBudget) * 100)
    const auditPercentage = Math.round((auditActual / totalActual) * 100)
    const nonAuditPercentage = Math.round((nonAuditActual / totalActual) * 100)

    const formatDisplayValue = (value: number) => {
      return `${value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
    }

    // 막대 그래프 데이터
    const data = [
      {
        name: title,
        budget: totalBudget,
        audit: auditActual,
        nonAudit: nonAuditActual,
      },
    ]

    // 커스텀 툴팁
    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-white p-3 shadow-md rounded-md border">
            <p className="font-medium">{label}</p>
            <p className="text-sm">
              <span className="font-medium">Audit: </span>
              {auditActual.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M ({totalActual > 0 ? Math.round((auditActual / totalActual) * 100) : 0}%)
            </p>
            <p className="text-sm">
              <span className="font-medium">Non-Audit: </span>
              {nonAuditActual.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M ({totalActual > 0 ? Math.round((nonAuditActual / totalActual) * 100) : 0}%)
            </p>
            <p className="text-sm">
              <span className="font-medium">총 실제: </span>
              {totalActual.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M
            </p>
            <p className="text-sm">
              <span className="font-medium">예산: </span>
              {totalBudget.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}M
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
            <div>
              <span className="text-lg font-semibold text-gray-900">{title}</span>
            </div>
            <div className="flex items-center space-x-1">
              {getTrendIcon(trend)}
              <span className={`text-sm font-medium ${getTrendColor(trend)}`}>{trend}</span>
            </div>
          </div>

          {/* 범례 추가 */}
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-300 border border-gray-400 rounded"></div>
              <span className="text-xs text-gray-600">예산</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: auditColor }}></div>
              <span className="text-xs text-gray-600">Audit</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: nonAuditColor }}></div>
              <span className="text-xs text-gray-600">Non-Audit</span>
            </div>
          </div>

          <div className="mb-6">
            <ResponsiveContainer width="100%" height={100}>
              <BarChart layout="vertical" data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, Math.max(totalBudget * 1.2, totalActual * 1.1)]}
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
                <Bar dataKey="audit" stackId="a" fill={auditColor} radius={[0, 0, 0, 0]} barSize={24} name="Audit" />
                <Bar
                  dataKey="nonAudit"
                  stackId="a"
                  fill={nonAuditColor}
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                  name="Non-Audit"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm text-gray-500">실제</div>
              <div className="text-xl font-bold text-gray-900">{totalActual !== undefined && totalActual !== null ? `${totalActual.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M` : '-'}</div>
            </div>
            <div className="space-y-1 text-right">
              <div className="text-sm text-gray-500">예산</div>
              <div className="text-xl font-bold text-gray-900">{totalBudget !== undefined && totalBudget !== null ? `${totalBudget.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}M` : '-'}</div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <div
              className={`text-sm font-medium ${percentage >= 100 ? "text-green-600" : percentage >= 80 ? "text-amber-600" : "text-red-600"}`}
            >
              {percentage}% {percentage >= 100 ? "초과달성" : "달성"}
            </div>
          </div>

          {/* 서비스 구성 정보 */}
          <div className="mt-6 pt-4 border-t space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: auditColor }}></div>
                <span className="text-sm text-gray-600">Audit Service</span>
              </div>
              <div className="text-sm font-medium text-gray-900">
                {auditActual.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M, {totalActual > 0 ? Math.round((auditActual / totalActual) * 100) : 0}%
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: nonAuditColor }}></div>
                <span className="text-sm text-gray-600">Non-Audit Service</span>
              </div>
              <div className="text-sm font-medium text-gray-900">
                {nonAuditActual.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M, {totalActual > 0 ? Math.round((nonAuditActual / totalActual) * 100) : 0}%
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
    { key: "budget", label: "Budget" },
    { key: "goal", label: "목표" },
  ]

  // 총 계약금액 도넛차트용 값
  const totalContractAmount = 1270000000
  const planTotalBudget = 1350000000 // plan-tab의 Total Budget 값
  const totalContractRate = Math.round((totalContractAmount / planTotalBudget) * 100)

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6">
        {tabList.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as "budget" | "goal")}
            className={`px-4 py-2 rounded-t-md border-b-2 transition-colors font-semibold ${activeTab === tab.key ? "border-orange-600 text-orange-600 bg-slate-50" : "border-transparent text-muted-foreground bg-transparent hover:bg-slate-100"}`}
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
            <span className="text-2xl font-bold text-gray-900">Total Budget Overview</span>
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
            />
          </div>

          {/* Audit Budget Overview 섹션 */}
          <div className="mt-12">
            {/* 헤더 */}
            <div className="flex items-center mb-6">
              <FileText className="mr-3 h-6 w-6 text-orange-600" />
              <span className="text-2xl font-bold text-gray-900">Audit Budget Overview</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* My Audit Budget Card */}
              <BarChartComponent
                actual={myAuditActual}
                budget={myAuditBudget}
                title="My Audit Budget"
                color="#f97316"
                trend={`-${Math.round((1 - (myAuditActual / (myAuditBudget || 1))) * 100)}%`}
                displayType="amount"
                cardClassName="shadow-sm border-l-4 border-l-orange-500"
              />

              {/* Team Audit Budget Card */}
              <BarChartComponent
                actual={teamAuditActual}
                budget={teamAuditBudget}
                title="Team Audit Budget"
                color="#ea580c"
                trend={`-${Math.round((1 - (teamAuditActual / (teamAuditBudget || 1))) * 100)}%`}
                displayType="amount"
                cardClassName="shadow-sm border-l-4 border-l-orange-600"
              />
            </div>
          </div>

          {/* Non-Audit Budget Overview 섹션 */}
          <div className="mt-12">
            {/* 헤더 */}
            <div className="flex items-center mb-6">
              <BarChart3 className="mr-3 h-6 w-6 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Non-Audit Budget Overview</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* My Non-Audit Budget Card */}
              <BarChartComponent
                actual={myNonAuditActual}
                budget={myNonAuditBudget}
                title="My Non-Audit Budget"
                color="#10b981"
                trend={`-${Math.round((1 - (myNonAuditActual / (myNonAuditBudget || 1))) * 100)}%`}
                displayType="amount"
                cardClassName="shadow-sm border-l-4 border-l-emerald-500"
              />

              {/* Team Non-Audit Budget Card */}
              <BarChartComponent
                actual={teamNonAuditActual}
                budget={teamNonAuditBudget}
                title="Team Non-Audit Budget"
                color="#059669"
                trend={`-${Math.round((1 - (teamNonAuditActual / (teamNonAuditBudget || 1))) * 100)}%`}
                displayType="amount"
                cardClassName="shadow-sm border-l-4 border-l-emerald-600"
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
              {/* Audit Metrics */}
              <div>
                <div className="flex items-center mb-6">
                  <FileText className="mr-3 h-6 w-6 text-orange-600" />
                  <span className="text-2xl font-bold text-gray-900">Audit</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <BarChartComponent
                    actual={budgetData?.audit_pjt_count ?? 0}
                    budget={goalData?.new_audit_count ?? 0}
                    title="신규 감사 건수"
                    color="#f97316"
                    trend=""
                    displayType="count"
                  />
                  <BarChartComponent
                    actual={actualNewBdAmount}
                    budget={budgetNewBdAmount}
                    title="신규 BD 금액"
                    color="#ea580c"
                    trend=""
                    displayType="amount"
                  />
                  <BarChartComponent
                    actual={goalData?.hourly_revenue ?? 0}
                    budget={goalData?.hourly_revenue ?? 0}
                    title="시간 당 Revenue (만원)"
                    color="#f59e42"
                    trend=""
                    displayType="tenThousand"
                  />
                </div>
              </div>
              {/* Non-Audit Metrics */}
              <div className="mt-12">
                <div className="flex items-center mb-6">
                  <BarChart3 className="mr-3 h-6 w-6 text-blue-600" />
                  <span className="text-2xl font-bold text-gray-900">Non-Audit Service</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <BarChartComponent
                    actual={budgetData?.non_audit_pjt_count ?? 0}
                    budget={goalData?.ui_revenue_count ?? 0}
                    title="UI Revenue 건수"
                    color="#3b82f6"
                    trend=""
                    displayType="count"
                  />
                  <BarChartComponent
                    actual={actualUiRevenueAmount}
                    budget={budgetUiRevenueAmount}
                    title="UI Revenue 계약금액"
                    color="#60a5fa"
                    trend=""
                    displayType="amount"
                  />
                  <BarChartComponent
                    actual={goalData?.non_audit_hourly_revenue ?? 0}
                    budget={goalData?.non_audit_hourly_revenue ?? 0}
                    title="시간 당 Revenue (만원)"
                    color="#60a5fa"
                    trend=""
                    displayType="tenThousand"
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
