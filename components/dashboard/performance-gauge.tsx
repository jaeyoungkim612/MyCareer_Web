"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useTheme } from "next-themes"

interface PerformanceGaugeProps {
  title: string
  value: number
  target: number
  icon: React.ComponentType<{ className?: string }>
}

export function PerformanceGauge({ title, value = 0, target = 0, icon: Icon }: PerformanceGaugeProps) {
  const { theme } = useTheme()

  // Ensure values are numbers and not undefined/null
  const safeValue = typeof value === "number" && !isNaN(value) ? value : 0
  const safeTarget = typeof target === "number" && !isNaN(target) && target > 0 ? target : 1

  const percentage = Math.round((safeValue / safeTarget) * 100)

  // Determine color based on percentage
  const getColor = () => {
    if (percentage >= 80) return theme === "dark" ? "text-green-400" : "text-green-600"
    if (percentage >= 60) return theme === "dark" ? "text-orange-400" : "text-orange-600"
    return theme === "dark" ? "text-red-400" : "text-red-600"
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className={`h-4 w-4 ${getColor()}`} />}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center">
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full">
            <svg className="h-full w-full" viewBox="0 0 100 100">
              <circle className="stroke-muted-foreground/20" cx="50" cy="50" r="40" strokeWidth="10" fill="none" />
              <circle
                className={`stroke-current ${getColor()}`}
                cx="50"
                cy="50"
                r="40"
                strokeWidth="10"
                fill="none"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * percentage) / 100}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{percentage}%</span>
              <span className="text-xs text-muted-foreground">of target</span>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Current</span>
            <span className="font-medium">{safeValue.toLocaleString()}</span>
          </div>
          <Progress value={percentage} className="h-1.5" />
          <div className="flex items-center justify-between text-sm">
            <span>Target</span>
            <span className="font-medium">{safeTarget.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
