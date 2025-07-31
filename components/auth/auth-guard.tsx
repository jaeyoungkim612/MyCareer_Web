"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  // 인증이 필요없는 페이지들
  const publicPaths = ["/login", "/verify"]
  const isPublicPath = publicPaths.includes(pathname)

  useEffect(() => {
    // AuthContext가 로딩 중이면 아무것도 하지 않음
    if (isLoading) {
      console.log("🔄 AuthGuard: AuthContext is loading...")
      return
    }

    console.log("🔍 AuthGuard: Checking authentication...")
    console.log("Is authenticated:", isAuthenticated)
    console.log("Current pathname:", pathname)
    console.log("Is public path:", isPublicPath)

    // 인증된 사용자가 로그인 페이지에 있으면 메인으로 리다이렉트
    if (isAuthenticated && isPublicPath) {
      console.log("✅ AuthGuard: Authenticated user on public path, redirecting to /")
      router.push("/")
      return
    }

    // 인증되지 않은 사용자가 보호된 페이지에 있으면 로그인으로 리다이렉트
    if (!isAuthenticated && !isPublicPath) {
      console.log("❌ AuthGuard: Unauthenticated user on protected path, redirecting to /login")
      router.push("/login")
      return
    }

    console.log("🔄 AuthGuard: No redirect needed")
  }, [isAuthenticated, isLoading, pathname, router, isPublicPath])

  // AuthContext 로딩 중일 때
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  // 공개 페이지이거나 인증된 사용자인 경우 children 렌더링
  if (isPublicPath || isAuthenticated) {
    return <>{children}</>
  }

  // 그 외의 경우 (인증되지 않은 사용자가 보호된 페이지에 접근) - 로딩 표시
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
    </div>
  )
}
