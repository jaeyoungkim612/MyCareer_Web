"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { TopNav } from "@/components/top-nav"
import React from "react"

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

  if (isLoginPage) {
    // 로그인 페이지는 사이드바/탑바 없이 children만!
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        {children}
      </div>
    )
  }

  // 그 외 페이지는 기존 레이아웃
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <TopNav />
        <div className="container mx-auto p-6 max-w-7xl bg-gray-50 dark:bg-gray-900 flex-1">
          <main className="w-full">{children}</main>
        </div>
      </div>
    </div>
  )
}