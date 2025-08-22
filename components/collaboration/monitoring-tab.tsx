"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Handshake, Users, Network, TrendingUp, BarChart3, ArrowRight } from "lucide-react"
import { CollaborationService, CollaborationGoal } from "@/lib/collaboration-service"
import { AuthService, User } from "@/lib/auth-service"

// Sample data for demonstration
interface MetricValue {
  count: number
  amount: number
}

interface MetricData {
  target: MetricValue
  actual: MetricValue
  previous: MetricValue
}

interface MonitoringData {
  currentPeriod: string
  metrics: {
    xlosCollaboration: MetricData
    losCollaboration: MetricData
    axNodeCollaboration: MetricData
  }
  recentProjects: {
    name: string
    type: string
    partner: string
    amount: string
    status: string
  }[]
}

const monitoringData: MonitoringData = {
  currentPeriod: "Q4 2023",
  metrics: {
    xlosCollaboration: {
      target: { count: 0, amount: 0 },
      actual: { count: 0, amount: 0 },
      previous: { count: 0, amount: 0 },
    },
    losCollaboration: {
      target: { count: 0, amount: 0 },
      actual: { count: 0, amount: 0 },
      previous: { count: 0, amount: 0 },
    },
    axNodeCollaboration: {
      target: { count: 0, amount: 0 },
      actual: { count: 0, amount: 0 },
      previous: { count: 0, amount: 0 },
    },
  },
  recentProjects: [],
}

interface CollaborationMonitoringTabProps {
  empno?: string
  readOnly?: boolean
}

export function CollaborationMonitoringTab({ empno, readOnly = false }: CollaborationMonitoringTabProps = {}) {
  const [period, setPeriod] = useState(monitoringData.currentPeriod)
  const [userGoal, setUserGoal] = useState<CollaborationGoal | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [actuals, setActuals] = useState<{ xlos: { count: number, amount: number }, los: { count: number, amount: number }, axnode: { count: number, amount: number } } | null>(null)

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (user) {
      // readOnly 모드에서는 전달받은 empno 우선 사용, 일반 모드에서는 로그인 사용자
      const targetEmpno = readOnly 
        ? empno || user.empno // readOnly일 때는 전달받은 empno 우선
        : empno || user.empno // 일반 모드일 때는 기존 로직
      setCurrentUser({ ...user, empno: targetEmpno })
    }
  }, [empno])

  useEffect(() => {
    async function fetchGoalAndActuals() {
      if (!currentUser?.empno) return setLoading(false)
      const [goal, actuals] = await Promise.all([
        CollaborationService.getByEmployeeId(currentUser.empno),
        CollaborationService.getActualsByEmployeeId(currentUser.empno)
      ])
      setUserGoal(goal)
      setActuals(actuals)
      setLoading(false)
    }
    fetchGoalAndActuals()
  }, [currentUser])

  // 목표값을 userGoal에서 가져와서 monitoringData에 반영
  const mergedMonitoringData = JSON.parse(JSON.stringify(monitoringData))
  if (userGoal) {
    mergedMonitoringData.metrics.xlosCollaboration.target.count = userGoal.x_los_target_count
    mergedMonitoringData.metrics.xlosCollaboration.target.amount = userGoal.x_los_target_amount
    mergedMonitoringData.metrics.losCollaboration.target.count = userGoal.losllk_target_count
    mergedMonitoringData.metrics.losCollaboration.target.amount = userGoal.losllk_target_amount
    mergedMonitoringData.metrics.axNodeCollaboration.target.count = userGoal.ax_node_target_count
    mergedMonitoringData.metrics.axNodeCollaboration.target.amount = userGoal.ax_node_target_amount
  }
  // 실적값을 actuals에서 가져와서 반영 (금액은 백만단위로 변환, 소수점 버림)
  if (actuals) {
    mergedMonitoringData.metrics.xlosCollaboration.actual.count = actuals.xlos.count
    mergedMonitoringData.metrics.xlosCollaboration.actual.amount = Math.floor(actuals.xlos.amount / 1_000_000)
    mergedMonitoringData.metrics.losCollaboration.actual.count = actuals.los.count
    mergedMonitoringData.metrics.losCollaboration.actual.amount = Math.floor(actuals.los.amount / 1_000_000)
    mergedMonitoringData.metrics.axNodeCollaboration.actual.count = actuals.axnode.count
    mergedMonitoringData.metrics.axNodeCollaboration.actual.amount = Math.floor(actuals.axnode.amount / 1_000_000)
  }

  function formatNumber(n: number) {
    return n?.toLocaleString() ?? "0"
  }

  if (loading) return <div className="flex flex-col justify-center items-center h-64 space-y-4">로딩 중...</div>

  const getStatusColor = (actual: number, target: number): string => {
    const percentage = (actual / target) * 100
    if (percentage >= 100) return "text-green-600"
    if (percentage >= 85) return "text-orange-600"
    return "text-red-600"
  }

  const getStatusBadge = (actual: number, target: number) => {
    const percentage = (actual / target) * 100
    if (percentage >= 100) return <Badge className="bg-green-600">Exceeded</Badge>
    if (percentage >= 85) return <Badge className="bg-orange-600">On Track</Badge>
    return <Badge variant="destructive">Needs Attention</Badge>
  }

  const getTrend = (current: number, previous: number) => {
    const diff = current - previous
    if (diff > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (diff < 0) return <TrendingUp className="h-4 w-4 text-red-600 transform rotate-180" />
    return <ArrowRight className="h-4 w-4 text-orange-600" />
  }

  const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold">Collaboration Monitoring</h2>
        {/* 기간(Period) selector 제거됨 */}
      </div>

      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* X-Los Collaboration Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">X-Los 협업</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 건수 */}
            <div>
              <div className="flex justify-between items-end mb-1">
                <span className="text-sm text-muted-foreground">건수</span>
                <span className="text-xs text-muted-foreground text-right">목표: {formatNumber(mergedMonitoringData.metrics.xlosCollaboration.target.count)}건</span>
              </div>
              <div className="text-2xl font-bold">{mergedMonitoringData.metrics.xlosCollaboration.actual.count}건</div>
              <Progress value={(mergedMonitoringData.metrics.xlosCollaboration.actual.count / mergedMonitoringData.metrics.xlosCollaboration.target.count) * 100} className="h-2 mt-2" />
              <div className="mt-1 text-xs text-right text-gray-500">달성률: {Math.round((mergedMonitoringData.metrics.xlosCollaboration.actual.count / mergedMonitoringData.metrics.xlosCollaboration.target.count) * 100)}%</div>
            </div>
            {/* 금액 */}
            <div>
              <div className="flex justify-between items-end mb-1">
                <span className="text-sm text-muted-foreground">금액</span>
                <span className="text-xs text-muted-foreground text-right">목표: {Math.ceil(mergedMonitoringData.metrics.xlosCollaboration.target.amount).toLocaleString()}백만원</span>
              </div>
              <div className="text-2xl font-bold">{Math.ceil(mergedMonitoringData.metrics.xlosCollaboration.actual.amount).toLocaleString()}백만원</div>
              <Progress value={(mergedMonitoringData.metrics.xlosCollaboration.actual.amount / mergedMonitoringData.metrics.xlosCollaboration.target.amount) * 100} className="h-2 mt-2" />
              <div className="mt-1 text-xs text-right text-gray-500">달성률: {Math.round((mergedMonitoringData.metrics.xlosCollaboration.actual.amount / mergedMonitoringData.metrics.xlosCollaboration.target.amount) * 100)}%</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">대상기간은 25년 6월 이후 부터 입니다</p>
          </CardContent>
        </Card>

        {/* Los내 Collaboration Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Los내 협업</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 건수 */}
            <div>
              <div className="flex justify-between items-end mb-1">
                <span className="text-sm text-muted-foreground">건수</span>
                <span className="text-xs text-muted-foreground text-right">목표: {formatNumber(mergedMonitoringData.metrics.losCollaboration.target.count)}건</span>
              </div>
              <div className="text-2xl font-bold">{mergedMonitoringData.metrics.losCollaboration.actual.count}건</div>
              <Progress value={(mergedMonitoringData.metrics.losCollaboration.actual.count / mergedMonitoringData.metrics.losCollaboration.target.count) * 100} className="h-2 mt-2" />
              <div className="mt-1 text-xs text-right text-gray-500">달성률: {Math.round((mergedMonitoringData.metrics.losCollaboration.actual.count / mergedMonitoringData.metrics.losCollaboration.target.count) * 100)}%</div>
            </div>
            {/* 금액 */}
            <div>
              <div className="flex justify-between items-end mb-1">
                <span className="text-sm text-muted-foreground">금액</span>
                <span className="text-xs text-muted-foreground text-right">목표: {Math.ceil(mergedMonitoringData.metrics.losCollaboration.target.amount).toLocaleString()}백만원</span>
              </div>
              <div className="text-2xl font-bold">{Math.ceil(mergedMonitoringData.metrics.losCollaboration.actual.amount).toLocaleString()}백만원</div>
              <Progress value={(mergedMonitoringData.metrics.losCollaboration.actual.amount / mergedMonitoringData.metrics.losCollaboration.target.amount) * 100} className="h-2 mt-2" />
              <div className="mt-1 text-xs text-right text-gray-500">달성률: {Math.round((mergedMonitoringData.metrics.losCollaboration.actual.amount / mergedMonitoringData.metrics.losCollaboration.target.amount) * 100)}%</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">대상기간은 25년 6월 이후 부터 입니다</p>
          </CardContent>
        </Card>

        {/* AX Node Collaboration Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">AX Node 협업</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 건수 */}
            <div>
              <div className="flex justify-between items-end mb-1">
                <span className="text-sm text-muted-foreground">건수</span>
                <span className="text-xs text-muted-foreground text-right">목표: {formatNumber(mergedMonitoringData.metrics.axNodeCollaboration.target.count)}건</span>
              </div>
              <div className="text-2xl font-bold">{mergedMonitoringData.metrics.axNodeCollaboration.actual.count}건</div>
              <Progress value={(mergedMonitoringData.metrics.axNodeCollaboration.actual.count / mergedMonitoringData.metrics.axNodeCollaboration.target.count) * 100} className="h-2 mt-2" />
              <div className="mt-1 text-xs text-right text-gray-500">달성률: {Math.round((mergedMonitoringData.metrics.axNodeCollaboration.actual.count / mergedMonitoringData.metrics.axNodeCollaboration.target.count) * 100)}%</div>
            </div>
            {/* 금액 */}
            <div>
              <div className="flex justify-between items-end mb-1">
                <span className="text-sm text-muted-foreground">금액</span>
                <span className="text-xs text-muted-foreground text-right">목표: {Math.ceil(mergedMonitoringData.metrics.axNodeCollaboration.target.amount).toLocaleString()}백만원</span>
              </div>
              <div className="text-2xl font-bold">{Math.ceil(mergedMonitoringData.metrics.axNodeCollaboration.actual.amount).toLocaleString()}백만원</div>
              <Progress value={(mergedMonitoringData.metrics.axNodeCollaboration.actual.amount / mergedMonitoringData.metrics.axNodeCollaboration.target.amount) * 100} className="h-2 mt-2" />
              <div className="mt-1 text-xs text-right text-gray-500">달성률: {Math.round((mergedMonitoringData.metrics.axNodeCollaboration.actual.amount / mergedMonitoringData.metrics.axNodeCollaboration.target.amount) * 100)}%</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">대상기간은 25년 6월 이후 부터 입니다</p>
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
                    {formatNumber(
                      mergedMonitoringData.metrics.xlosCollaboration.actual.count +
                      mergedMonitoringData.metrics.losCollaboration.actual.count +
                      mergedMonitoringData.metrics.axNodeCollaboration.actual.count
                    )}건
                  </td>
                  <td className="p-4 text-right text-muted-foreground">
                    {formatNumber(
                      mergedMonitoringData.metrics.xlosCollaboration.target.count +
                      mergedMonitoringData.metrics.losCollaboration.target.count +
                      mergedMonitoringData.metrics.axNodeCollaboration.target.count
                    )}건
                  </td>
                  <td className="p-4 text-right">
                    {(
                      ((mergedMonitoringData.metrics.xlosCollaboration.actual.count +
                        mergedMonitoringData.metrics.losCollaboration.actual.count +
                        mergedMonitoringData.metrics.axNodeCollaboration.actual.count) /
                        (mergedMonitoringData.metrics.xlosCollaboration.target.count +
                          mergedMonitoringData.metrics.losCollaboration.target.count +
                          mergedMonitoringData.metrics.axNodeCollaboration.target.count)) *
                      100
                    ).toFixed(1)}
                    %
                    <Progress
                      value={
                        ((mergedMonitoringData.metrics.xlosCollaboration.actual.count +
                          mergedMonitoringData.metrics.losCollaboration.actual.count +
                          mergedMonitoringData.metrics.axNodeCollaboration.actual.count) /
                          (mergedMonitoringData.metrics.xlosCollaboration.target.count +
                            mergedMonitoringData.metrics.losCollaboration.target.count +
                            mergedMonitoringData.metrics.axNodeCollaboration.target.count)) *
                        100
                      }
                      className="h-1.5 mt-2"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">총 협업 수익</td>
                  <td className="p-4 text-right font-bold text-2xl">
                    {Math.ceil(
                      mergedMonitoringData.metrics.xlosCollaboration.actual.amount +
                      mergedMonitoringData.metrics.losCollaboration.actual.amount +
                      mergedMonitoringData.metrics.axNodeCollaboration.actual.amount
                    ).toLocaleString()}백만원
                  </td>
                  <td className="p-4 text-right text-muted-foreground">
                    {Math.ceil(
                      mergedMonitoringData.metrics.xlosCollaboration.target.amount +
                      mergedMonitoringData.metrics.losCollaboration.target.amount +
                      mergedMonitoringData.metrics.axNodeCollaboration.target.amount
                    ).toLocaleString()}백만원
                  </td>
                  <td className="p-4 text-right">
                    {(
                      ((mergedMonitoringData.metrics.xlosCollaboration.actual.amount +
                        mergedMonitoringData.metrics.losCollaboration.actual.amount +
                        mergedMonitoringData.metrics.axNodeCollaboration.actual.amount) /
                        (mergedMonitoringData.metrics.xlosCollaboration.target.amount +
                          mergedMonitoringData.metrics.losCollaboration.target.amount +
                          mergedMonitoringData.metrics.axNodeCollaboration.target.amount)) *
                      100
                    ).toFixed(1)}
                    %
                    <Progress
                      value={
                        ((mergedMonitoringData.metrics.xlosCollaboration.actual.amount +
                          mergedMonitoringData.metrics.losCollaboration.actual.amount +
                          mergedMonitoringData.metrics.axNodeCollaboration.actual.amount) /
                          (mergedMonitoringData.metrics.xlosCollaboration.target.amount +
                            mergedMonitoringData.metrics.losCollaboration.target.amount +
                            mergedMonitoringData.metrics.axNodeCollaboration.target.amount)) *
                        100
                      }
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
  )
}
