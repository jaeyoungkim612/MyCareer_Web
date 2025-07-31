"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserCheck, Clock, Users, Building2, Calendar, TrendingUp, BarChart3, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

// Updated dummy data
const resultsData = {
  currentPeriod: "Q4 2023",
  metrics: {
    gpsScore: { target: 8.5, actual: 8.2, previousPeriod: 7.8 },
    peiScore: { target: 8.0, actual: 8.5, previousPeriod: 7.9 },
    upwardFeedback: {
      rating: 4.5,
      previousRating: 4.2,
      strengths: ["리더십", "전략적 사고", "팀 관리"],
      improvements: ["의사소통", "시간 관리"],
    },
    staffCoachingTime: { target: 45, actual: 42, previousPeriod: 40 },
    superOrg: { target: 3, actual: 3, previousPeriod: 2 },
    refreshOff: { target: 90, actual: 88, previousPeriod: 85 },
  },
  timeline: [
    { period: "Q1 2023", gpsScore: 7.5, peiScore: 7.8, staffCoachingTime: 38, superOrg: 2, refreshOff: 82 },
    { period: "Q2 2023", gpsScore: 7.8, peiScore: 7.9, staffCoachingTime: 40, superOrg: 2, refreshOff: 85 },
    { period: "Q3 2023", gpsScore: 7.8, peiScore: 7.9, staffCoachingTime: 40, superOrg: 2, refreshOff: 85 },
    { period: "Q4 2023", gpsScore: 8.2, peiScore: 8.5, staffCoachingTime: 42, superOrg: 3, refreshOff: 88 },
  ],
}

interface ResultsTabProps {
  empno?: string
  readOnly?: boolean
}

export function ResultsTab({ empno, readOnly = false }: ResultsTabProps = {}) {
  const [period, setPeriod] = useState(resultsData.currentPeriod)
  const [isPerfEdit, setIsPerfEdit] = useState(false)
  const [perfTier, setPerfTier] = useState("HP")
  const [perfComment, setPerfComment] = useState(
    "탁월한 리더십과 팀워크를 바탕으로 프로젝트를 성공적으로 이끌었으며, 동료들과의 소통 능력이 매우 뛰어납니다. 새로운 과제에 대한 빠른 적응력과 문제 해결 능력도 돋보입니다. 또한, 팀원들의 성장을 적극적으로 지원하며 긍정적인 조직 문화를 조성하는 데 큰 기여를 하였습니다."
  )
  const [tempTier, setTempTier] = useState(perfTier)
  const [tempComment, setTempComment] = useState(perfComment)

  const getStatusColor = (actual: number, target: number) => {
    const percentage = (actual / target) * 100
    if (percentage >= 100) return "text-green-600"
    if (percentage >= 85) return "text-orange-600"
    return "text-red-600"
  }

  const getStatusBadge = (actual: number, target: number) => {
    const percentage = (actual / target) * 100
    if (percentage >= 100) return <Badge className="bg-green-600">목표 초과</Badge>
    if (percentage >= 85) return <Badge className="bg-orange-600">진행 중</Badge>
    return <Badge variant="destructive">주의 필요</Badge>
  }

  const getTrend = (current: number, previous: number) => {
    const diff = current - previous
    if (diff > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (diff < 0) return <TrendingUp className="h-4 w-4 text-red-600 transform rotate-180" />
    return <ArrowRight className="h-4 w-4 text-orange-600" />
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "EP":
        return "bg-[#DE6100]"
      case "HP":
        return "bg-[#E76200]"
      case "ME":
        return "bg-orange-500"
      default:
        return "bg-slate-500"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-medium">결과</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm">기간:</span>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="기간 선택" />
            </SelectTrigger>
            <SelectContent>
              {resultsData.timeline.map((item) => (
                <SelectItem key={item.period} value={item.period}>
                  {item.period}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* GPS Score Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GPS Score</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-2">
              <div className="text-2xl font-bold">{resultsData.metrics.gpsScore.actual}/10</div>
              <div className="flex items-center gap-1">
                {getTrend(resultsData.metrics.gpsScore.actual, resultsData.metrics.gpsScore.previousPeriod)}
                <span
                  className={`text-xs ${getStatusColor(resultsData.metrics.gpsScore.actual, resultsData.metrics.gpsScore.target)}`}
                >
                  {(
                    ((resultsData.metrics.gpsScore.actual - resultsData.metrics.gpsScore.previousPeriod) /
                      resultsData.metrics.gpsScore.previousPeriod) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>LoS 평균: {resultsData.metrics.gpsScore.target}</span>
                <span>이전: {resultsData.metrics.gpsScore.previousPeriod}</span>
              </div>
              <Progress value={(resultsData.metrics.gpsScore.actual / 10) * 100} className="h-1.5" />
            </div>
            <div className="mt-3 flex justify-end">
              {getStatusBadge(resultsData.metrics.gpsScore.actual, resultsData.metrics.gpsScore.target)}
            </div>
          </CardContent>
        </Card>

        {/* PEI Score Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PEI Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-2">
              <div className="text-2xl font-bold">{resultsData.metrics.peiScore.actual}/10</div>
              <div className="flex items-center gap-1">
                {getTrend(resultsData.metrics.peiScore.actual, resultsData.metrics.peiScore.previousPeriod)}
                <span
                  className={`text-xs ${getStatusColor(resultsData.metrics.peiScore.actual, resultsData.metrics.peiScore.target)}`}
                >
                  {(
                    ((resultsData.metrics.peiScore.actual - resultsData.metrics.peiScore.previousPeriod) /
                      resultsData.metrics.peiScore.previousPeriod) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>LoS 평균: {resultsData.metrics.peiScore.target}</span>
                <span>이전: {resultsData.metrics.peiScore.previousPeriod}</span>
              </div>
              <Progress value={(resultsData.metrics.peiScore.actual / 10) * 100} className="h-1.5" />
            </div>
            <div className="mt-3 flex justify-end">
              {getStatusBadge(resultsData.metrics.peiScore.actual, resultsData.metrics.peiScore.target)}
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
              <div className="text-2xl font-bold">{resultsData.metrics.staffCoachingTime.actual} 시간</div>
              <div className="flex items-center gap-1">
                {getTrend(
                  resultsData.metrics.staffCoachingTime.actual,
                  resultsData.metrics.staffCoachingTime.previousPeriod,
                )}
                <span
                  className={`text-xs ${getStatusColor(resultsData.metrics.staffCoachingTime.actual, resultsData.metrics.staffCoachingTime.target)}`}
                >
                  {(
                    ((resultsData.metrics.staffCoachingTime.actual -
                      resultsData.metrics.staffCoachingTime.previousPeriod) /
                      resultsData.metrics.staffCoachingTime.previousPeriod) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>LoS 평균: {resultsData.metrics.staffCoachingTime.target} 시간</span>
                <span>이전: {resultsData.metrics.staffCoachingTime.previousPeriod} 시간</span>
              </div>
              <Progress
                value={
                  (resultsData.metrics.staffCoachingTime.actual / resultsData.metrics.staffCoachingTime.target) * 100
                }
                className="h-1.5"
              />
            </div>
            <div className="mt-3 flex justify-end">
              {getStatusBadge(
                resultsData.metrics.staffCoachingTime.actual,
                resultsData.metrics.staffCoachingTime.target,
              )}
            </div>
          </CardContent>
        </Card>

        {/* Refresh Off Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refresh Off 사용률(%)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-2">
              <div className="text-2xl font-bold">{resultsData.metrics.refreshOff.actual}%</div>
              <div className="flex items-center gap-1">
                {getTrend(resultsData.metrics.refreshOff.actual, resultsData.metrics.refreshOff.previousPeriod)}
                <span
                  className={`text-xs ${getStatusColor(resultsData.metrics.refreshOff.actual, resultsData.metrics.refreshOff.target)}`}
                >
                  {(
                    ((resultsData.metrics.refreshOff.actual - resultsData.metrics.refreshOff.previousPeriod) /
                      resultsData.metrics.refreshOff.previousPeriod) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>LoS 평균: {resultsData.metrics.refreshOff.target}%</span>
                <span>이전: {resultsData.metrics.refreshOff.previousPeriod}%</span>
              </div>
              <Progress
                value={(resultsData.metrics.refreshOff.actual / resultsData.metrics.refreshOff.target) * 100}
                className="h-1.5"
              />
            </div>
            <div className="mt-3 flex justify-end">
              {getStatusBadge(resultsData.metrics.refreshOff.actual, resultsData.metrics.refreshOff.target)}
            </div>
          </CardContent>
        </Card>

        {/* Upward Feedback Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold">성과평가</CardTitle>
            {isPerfEdit ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setIsPerfEdit(false); setTempTier(perfTier); setTempComment(perfComment); }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => { setIsPerfEdit(false); setPerfTier(tempTier); setPerfComment(tempComment); }}>
                  Save
                </Button>
              </div>
            ) : !readOnly ? (
              <Button size="sm" onClick={() => setIsPerfEdit(true)}>
                Edit
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[120px_1fr]">
              {/* 티어 */}
              <div className="p-6 flex flex-col items-center justify-center border-r border-slate-200 dark:border-slate-600">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">Tier</div>
                <div className={`w-14 h-14 ${getTierColor(isPerfEdit ? tempTier : perfTier)} rounded-full flex items-center justify-center shadow-lg`}>
                  <span className="text-white font-bold text-xl">
                    {isPerfEdit ? (
                      <select
                        className="bg-transparent text-white font-bold text-xl outline-none"
                        value={tempTier}
                        onChange={e => setTempTier(e.target.value)}
                        style={{
                          background: "transparent",
                          color: "white",
                          textAlign: "center",
                          width: "56px"
                        }}
                      >
                        <option style={{ color: "white", background: "#2563eb" }} value="EP">EP</option>
                        <option style={{ color: "white", background: "#E76200" }} value="HP">HP</option>
                        <option style={{ color: "white", background: "#f59e42" }} value="ME">ME</option>
                      </select>
                    ) : perfTier}
                  </span>
                </div>
              </div>
              {/* 코멘트 */}
              <div className="p-6 flex flex-col">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">Comment</div>
                {isPerfEdit ? (
                  <Textarea
                    value={tempComment}
                    onChange={e => setTempComment(e.target.value)}
                    className="min-h-[120px]"
                  />
                ) : (
                  <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {perfComment}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
