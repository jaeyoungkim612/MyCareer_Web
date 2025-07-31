"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, CheckCircle, AlertCircle, Calendar } from "lucide-react"

export function RecentActivities() {
  const activities = [
    {
      id: 1,
      user: "Alex Kim",
      action: "completed",
      target: "Q2 Financial Audit",
      time: "2 hours ago",
      type: "audit",
      status: "completed",
    },
    {
      id: 2,
      user: "Sarah Park",
      action: "submitted",
      target: "Tax Advisory Report",
      time: "5 hours ago",
      type: "tax",
      status: "pending",
    },
    {
      id: 3,
      user: "David Lee",
      action: "updated",
      target: "Client Feedback Survey",
      time: "Yesterday",
      type: "client",
      status: "in-progress",
    },
    {
      id: 4,
      user: "Michelle Cho",
      action: "initiated",
      target: "Digital Transformation Project",
      time: "Yesterday",
      type: "digital",
      status: "started",
    },
    {
      id: 5,
      user: "James Park",
      action: "scheduled",
      target: "Industry Forum Meeting",
      time: "2 days ago",
      type: "industry",
      status: "scheduled",
    },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "in-progress":
        return <AlertCircle className="h-4 w-4 text-blue-600" />
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />
    }
  }

  const getTypeBadge = (type: string) => {
    const badges = {
      audit: { label: "audit", className: "bg-orange-100 text-orange-800" },
      tax: { label: "tax", className: "bg-green-100 text-green-800" },
      client: { label: "client", className: "bg-blue-100 text-blue-800" },
      digital: { label: "digital", className: "bg-purple-100 text-purple-800" },
      industry: { label: "industry", className: "bg-yellow-100 text-yellow-800" },
    }

    const badge = badges[type as keyof typeof badges] || badges.audit
    return <Badge className={badge.className}>{badge.label}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-4">
              <Avatar className="h-8 w-8">
                <AvatarImage src={`/placeholder.svg?height=32&width=32`} />
                <AvatarFallback>
                  {activity.user
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">
                    <span className="text-blue-600">{activity.user}</span> {activity.action}{" "}
                    <span className="font-semibold">{activity.target}</span>
                  </p>
                  {getStatusIcon(activity.status)}
                </div>
                <div className="flex items-center space-x-2">
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                  {getTypeBadge(activity.type)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
