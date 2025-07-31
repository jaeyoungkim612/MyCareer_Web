"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import QualityPlanTab from "./quality/plan-tab"
import QualityMonitoringTab from "./quality/monitoring-tab"
import QualitySelfAssessmentTab from "./quality/self-assessment-tab"
import { TrendingUp, Target } from "lucide-react"

interface QualityMetric {
  id: string
  name: string
  value: number
  target: number
  unit: string
  trend: "up" | "down" | "stable"
  status: "good" | "warning" | "critical"
}

const qualityMetrics: QualityMetric[] = [
  {
    id: "defect-rate",
    name: "결함률",
    value: 2.1,
    target: 3.0,
    unit: "%",
    trend: "down",
    status: "good",
  },
  {
    id: "customer-satisfaction",
    name: "고객 만족도",
    value: 4.7,
    target: 4.5,
    unit: "/5",
    trend: "up",
    status: "good",
  },
  {
    id: "code-coverage",
    name: "코드 커버리지",
    value: 87,
    target: 90,
    unit: "%",
    trend: "up",
    status: "warning",
  },
  {
    id: "response-time",
    name: "응답 시간",
    value: 1.2,
    target: 1.0,
    unit: "초",
    trend: "stable",
    status: "warning",
  },
]

const getStatusColor = (status: string) => {
  switch (status) {
    case "good":
      return "text-green-600 bg-green-50 border-green-200"
    case "warning":
      return "text-yellow-600 bg-yellow-50 border-yellow-200"
    case "critical":
      return "text-red-600 bg-red-50 border-red-200"
    default:
      return "text-gray-600 bg-gray-50 border-gray-200"
  }
}

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case "up":
      return <TrendingUp className="h-4 w-4 text-green-600" />
    case "down":
      return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
    default:
      return <Target className="h-4 w-4 text-gray-600" />
  }
}

export function QualityMetrics() {
  return (
    <div className="space-y-6">
      <div>
                    <h2 className="text-xl font-bold tracking-tight">Quality</h2>
        <p className="text-muted-foreground">품질 관리 및 개선 활동을 계획하고 모니터링합니다.</p>
      </div>

      <Tabs defaultValue="plan" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="self-assessment">Self Assessment</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-4">
          <QualityPlanTab />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <QualityMonitoringTab />
        </TabsContent>

        <TabsContent value="self-assessment" className="space-y-4">
          <QualitySelfAssessmentTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ExpertiseMetrics alias for backward compatibility
export const ExpertiseMetrics = QualityMetrics

export default QualityMetrics
