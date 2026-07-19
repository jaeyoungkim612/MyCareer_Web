"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"
import Image from "next/image"
import Link from "next/link"
import { HelpCircle, Bell } from "lucide-react"

export function LoginForm() {
  const [empno, setEmpno] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const passwordErrorRef = useRef<HTMLDivElement>(null) // DOM 직접 조작용
  const router = useRouter()
  const { login } = useAuth()
  


  // passwordError 상태 변경 추적
  useEffect(() => {
    console.log("🔍 LoginForm: passwordError state changed:", passwordError)
  }, [passwordError])

  // 페이지 로드 시 localStorage에서 오류 메시지 복원
  useEffect(() => {
    const savedError = localStorage.getItem('loginPasswordError')
    const savedTime = localStorage.getItem('loginPasswordErrorTime')
    
    if (savedError && savedTime) {
      const errorAge = Date.now() - parseInt(savedTime)
      // 30초 이내의 오류만 복원
      if (errorAge < 30000) {
        console.log("🔄 Restoring password error from localStorage:", savedError)
        showPasswordErrorDirectly(savedError)
        setPasswordError(savedError)
      } else {
        console.log("🗑️ Password error too old, removing from localStorage")
        localStorage.removeItem('loginPasswordError')
        localStorage.removeItem('loginPasswordErrorTime')
      }
    }
  }, [])

  // DOM 직접 조작으로 오류 메시지 표시 (간단한 빨간 텍스트)
  const showPasswordErrorDirectly = (errorMessage: string) => {
    console.log("🎯 DOM Direct: Showing password error:", errorMessage)
    
    // localStorage에 오류 메시지 저장
    localStorage.setItem('loginPasswordError', errorMessage)
    localStorage.setItem('loginPasswordErrorTime', Date.now().toString())
    
    if (passwordErrorRef.current) {
      passwordErrorRef.current.innerHTML = `
        <p class="text-red-600 text-sm mt-2 font-medium">
          ${errorMessage}
        </p>
      `
      passwordErrorRef.current.style.display = 'block'
    }
  }

  // DOM 직접 조작으로 오류 메시지 숨기기
  const hidePasswordErrorDirectly = () => {
    console.log("🎯 DOM Direct: Hiding password error")
    
    // localStorage에서 오류 메시지 제거
    localStorage.removeItem('loginPasswordError')
    localStorage.removeItem('loginPasswordErrorTime')
    
    if (passwordErrorRef.current) {
      passwordErrorRef.current.innerHTML = ''
      passwordErrorRef.current.style.display = 'none'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log("🔒 LoginForm: Form submit prevented and stopped")

    if (!empno.trim()) {
      setMessage("사번을 입력해주세요.")
      return false
    }

    if (!password.trim()) {
      setMessage("비밀번호를 입력해주세요.")
      return false
    }

    // 사번을 6자리로 패딩 (앞에 0 채우기)
    const cleanEmpno = empno.trim().replace(/\D/g, '') // 숫자만 남기기
    const paddedEmpno = cleanEmpno.padStart(6, '0') // 6자리로 0 패딩
    
    console.log(`🔄 LoginForm: 입력된 사번: "${empno.trim()}" → 변환된 사번: "${paddedEmpno}"`)

    setIsLoading(true)
    setMessage("")
    setPasswordError("") // 초기화
    hidePasswordErrorDirectly() // DOM 직접 초기화
    console.log("🔍 LoginForm: Starting login, clearing passwordError")

    try {
      console.log("🔄 LoginForm: Starting login with empno:", paddedEmpno)
      const result = await login(paddedEmpno, password)

      console.log("🔄 LoginForm: Login result:", result)
      console.log("🔍 LoginForm: isPasswordError check:", result.isPasswordError)

      if (result.success) {
        if (result.needsPasswordChange) {
          // 🔄 비밀번호 변경 필요 - Settings로 가서 비밀번호 변경 후 메인으로
          setMessage(result.message)
          toast("비밀번호 변경 필요", {
            description: "기본 비밀번호를 변경해주세요.",
          })
          console.log("🔄 LoginForm: Redirecting to /settings for password change")
          router.push("/settings?redirect=main")
        } else if (result.needsVerification) {
          setMessage(result.message)
          toast("인증 이메일 발송", {
            description: result.message,
          })
        } else if (result.user) {
          toast.success("로그인 성공", {
            description: `환영합니다, ${result.user.empnm}님!`,
          })
          console.log("🚀 LoginForm: Redirecting to /")
          router.push("/")
        }
      } else {
        console.log("❌ LoginForm: Login failed")
        console.log("🔍 LoginForm: result.isPasswordError =", result.isPasswordError)
        console.log("🔍 LoginForm: result.message =", result.message)
        
        // 비밀번호 오류인 경우 비밀번호 입력창 하단에 직접 표시
        if (result.isPasswordError) {
          console.log("🎯 LoginForm: Setting password error message")
          console.log("🔍 LoginForm: Before setPasswordError, current passwordError:", passwordError)
          
          // React 상태 업데이트
          setPasswordError("비밀번호가 올바르지 않습니다.")
          
          // DOM 직접 조작으로 확실히 표시
          showPasswordErrorDirectly("비밀번호가 올바르지 않습니다.")
          
          console.log("🔍 LoginForm: After flushSync + DOM direct call")
          console.log("🚫 LoginForm: LOGIN FAILED - NO NAVIGATION")
          // 로그인 실패 시 여기서 return하여 추가 처리 방지
          return false
        } else {
          console.log("🎯 LoginForm: Setting general error message")
          setMessage(result.message)
        }
        
        toast.error("로그인 실패", {
          description: result.message,
        })
      }
    } catch (error) {
      console.error("Login error:", error)
      setMessage("로그인 처리 중 오류가 발생했습니다.")
      toast.error("오류 발생", {
        description: "로그인 처리 중 오류가 발생했습니다.",
      })
    } finally {
      setIsLoading(false)
      console.log("🔍 LoginForm: handleSubmit completed")
    }
    
    // 함수 종료 시 반드시 false 반환 (추가 form 처리 방지)
    return false
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="w-full max-w-2xl shadow-lg p-10 text-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-8">
            <Image src="/images/pwc_logo_light.png" alt="PwC Logo" width={160} height={80} className="object-contain" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900 mb-2">My Career+</CardTitle>
          <CardDescription className="text-lg text-gray-600 mb-4">사번과 비밀번호로 로그인하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form 
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log("🔒 Form onSubmit: Prevented default")
              handleSubmit(e)
              return false
            }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <label htmlFor="empno" className="text-lg font-semibold text-gray-700">
                사번
              </label>
              <Input
                id="empno"
                type="text"
                placeholder="사번을 입력하세요."
                value={empno}
                onChange={(e) => {
                  setEmpno(e.target.value)
                  // 사번 입력 시 오류 메시지들 초기화
                  if (passwordError) {
                    setPasswordError("")
                    hidePasswordErrorDirectly()
                  }
                  if (message) setMessage("")
                }}
                disabled={isLoading}
                className="w-full h-14 text-2xl px-4"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-lg font-semibold text-gray-700">
                비밀번호
              </label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  // 비밀번호 입력 시 오류 메시지 초기화
                  if (passwordError) {
                    setPasswordError("")
                    hidePasswordErrorDirectly()
                  }
                }}
                disabled={isLoading}
                className={`w-full h-14 text-2xl px-4 ${
                  passwordError ? 'border-red-500 focus:border-red-500' : ''
                }`}
              />
              
              {/* DOM 직접 조작용 컨테이너 */}
              <div ref={passwordErrorRef} style={{ display: 'none' }}></div>
            </div>

            {message && (
              <Alert className={message.includes("발송") ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <AlertDescription className={message.includes("발송") ? "text-green-800" : "text-red-800"}>
                  {message}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white h-14 text-2xl font-bold"
              disabled={isLoading}
            >
              {isLoading ? "처리 중..." : "로그인"}
            </Button>
          </form>

          <div className="mt-8 space-y-4">
            <div className="text-center text-lg text-gray-500">
              <p>최초 로그인 시 기본 비밀번호는 <strong className="text-orange-600">3131</strong>입니다.</p>
            </div>
            
            {/* 시작 안내 페이지 링크 */}
            <div className="text-center">
              <a href="/guide.html" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="lg" className="text-lg font-medium">
                  <Bell className="mr-2 h-5 w-5" />
                  My Career+ 사용법 알아보기
                  <HelpCircle className="ml-2 h-5 w-5" />
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
