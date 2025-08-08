"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { GSPService } from "@/lib/gsp-service"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  // 인증이 필요없는 페이지들
  const publicPaths = ["/login", "/verify"]
  const isPublicPath = publicPaths.includes(pathname)
  const isSettingsPath = pathname === "/settings"
  const isGSPInputPath = pathname === "/gsp-input"

  // GSP 입력 필요 여부 체크 함수
  const checkGSPInputNeeded = async () => {
    if (!user?.empno) return

    try {
      const gspStatus = await GSPService.checkGSPStatus(user.empno)
      
      if (gspStatus.needsInput) {
        console.log("🎯 AuthGuard: User needs GSP input, redirecting to /gsp-input")
        router.push("/gsp-input")
      }
    } catch (error) {
      console.error("❌ AuthGuard: Error checking GSP status:", error)
    }
  }

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

    // 🔐 인증된 사용자 중 비밀번호 변경이 필요한 사용자 체크
    if (isAuthenticated && user && !isSettingsPath && !isGSPInputPath) {
      if (user.is_password_changed === false) {
        console.log("🔄 AuthGuard: User needs password change, redirecting to /settings")
        router.push("/settings")
        return
      }
    }

    // 🎯 비밀번호 변경이 완료된 사용자의 GSP 입력 상태 체크
    if (isAuthenticated && user && user.is_password_changed === true && !isGSPInputPath && !isSettingsPath) {
      // GSP 입력 필요 여부 체크 (비동기)
      checkGSPInputNeeded()
    }

    console.log("🔄 AuthGuard: No redirect needed")
  }, [isAuthenticated, isLoading, pathname, router, isPublicPath, user, isSettingsPath, isGSPInputPath])

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
    // 🔐 비밀번호 변경이 필요한 사용자는 settings 페이지만 접근 가능
    if (isAuthenticated && user && user.is_password_changed === false && !isSettingsPath) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
        </div>
      )
    }
    
    return <>{children}</>
  }

  // 그 외의 경우 (인증되지 않은 사용자가 보호된 페이지에 접근) - 로딩 표시
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
    </div>
  )
}
