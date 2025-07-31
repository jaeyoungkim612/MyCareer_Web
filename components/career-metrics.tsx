"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const data = [
  { month: "Jan", people: 75, collaboration: 68, business: 72, expertise: 70, industry: 65 },
  { month: "Feb", people: 78, collaboration: 70, business: 74, expertise: 72, industry: 68 },
  { month: "Mar", people: 80, collaboration: 75, business: 76, expertise: 75, industry: 70 },
  { month: "Apr", people: 82, collaboration: 78, business: 78, expertise: 77, industry: 73 },
  { month: "May", people: 85, collaboration: 80, business: 80, expertise: 80, industry: 75 },
  { month: "Jun", people: 87, collaboration: 82, business: 83, expertise: 82, industry: 78 },
]

export function CareerMetrics() {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip />
          <Line type="monotone" dataKey="people" name="People" stroke="#ea580c" strokeWidth={2} />
          <Line type="monotone" dataKey="collaboration" name="Collaboration" stroke="#f97316" strokeWidth={2} />
          <Line type="monotone" dataKey="business" name="Business" stroke="#10b981" strokeWidth={2} />
          <Line type="monotone" dataKey="expertise" name="Expertise" stroke="#f59e0b" strokeWidth={2} />
          <Line type="monotone" dataKey="industry" name="Industry" stroke="#ef4444" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
