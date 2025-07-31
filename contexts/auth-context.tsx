"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { AuthService } from "@/lib/auth-service"

interface AuthContextType {
  user: any
  isAuthenticated: boolean
  isLoading: boolean
  login: (empno: string, password: string) => Promise<any>
  logout: () => void
  verifyToken: (token: string) => Promise<any>
  changePassword: (currentPassword: string, newPassword: string) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 초기 인증 상태 확인
    console.log("🔄 AuthContext: Checking initial auth state...")
    const currentUser = AuthService.getCurrentUser()
    if (currentUser) {
      console.log("✅ AuthContext: User found in localStorage:", currentUser.empnm)
      setUser(currentUser)
      setIsAuthenticated(true)
    } else {
      console.log("❌ AuthContext: No user found in localStorage")
    }
    setIsLoading(false)
    console.log("✅ AuthContext: Initial auth check completed")
  }, [])

  const login = async (empno: string, password: string) => {
    console.log("🔄 AuthContext: Starting login for empno:", empno)
    setIsLoading(true)
    const result = await AuthService.initiateLogin(empno, password)
    console.log("🔄 AuthContext: AuthService result:", result)
    
    if (result.success && result.user) {
      console.log("✅ AuthContext: Setting user and authenticated state")
      setUser(result.user)
      setIsAuthenticated(true)
      console.log("✅ AuthContext: State updated - user:", result.user.empnm, "authenticated: true")
    } else {
      console.log("❌ AuthContext: Login failed or no user data")
    }
    setIsLoading(false)
    return result
  }

  const logout = () => {
    console.log("🚪 AuthContext: Starting logout process")
    setIsLoading(true)
    AuthService.logout()
    setUser(null)
    setIsAuthenticated(false)
    setIsLoading(false)
    console.log("✅ AuthContext: User logged out, state cleared")
  }

  const verifyToken = async (token: string) => {
    // 이 함수는 실제로는 사용되지 않지만 컨텍스트 타입을 위해 유지
    return { success: false, message: "Not implemented" }
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    console.log("🔄 AuthContext: Changing password")
    setIsLoading(true)
    const result = await AuthService.changePassword(currentPassword, newPassword)
    
    if (result.success) {
      // 비밀번호 변경 성공 시 사용자 상태 업데이트
      const updatedUser = AuthService.getCurrentUser()
      if (updatedUser) {
        setUser(updatedUser)
        console.log("✅ AuthContext: User state updated after password change")
      }
    }
    
    setIsLoading(false)
    return result
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        verifyToken,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
