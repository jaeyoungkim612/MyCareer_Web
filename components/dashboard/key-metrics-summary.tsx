"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, Users, Target, Award } from "lucide-react"

export function KeyMetricsSummary() {
  const metrics = [
    {
      title: "Business",
      value: 82,
      target: 85,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "People",
      value: 85,
      target: 80,
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Collaboration",
      value: 78,
      target: 75,
      icon: Target,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Quality",
      value: 76,
      target: 80,
      icon: Award,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon
        const percentage = Math.round((metric.value / metric.target) * 100)

        return (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <div className={`p-2 rounded-full ${metric.bgColor}`}>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}%</div>
              <p className="text-xs text-muted-foreground">
                목표: {metric.target}% (달성률: {percentage}%)
              </p>
              <Progress value={percentage} className="mt-2" />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
