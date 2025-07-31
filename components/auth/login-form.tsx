"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"
import Image from "next/image"

export function LoginForm() {
  const [empno, setEmpno] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!empno.trim()) {
      setMessage("사번을 입력해주세요.")
      return
    }

    // 사번을 6자리로 패딩 (앞에 0 채우기)
    const cleanEmpno = empno.trim().replace(/\D/g, '') // 숫자만 남기기
    const paddedEmpno = cleanEmpno.padStart(6, '0') // 6자리로 0 패딩
    
    console.log(`🔄 LoginForm: 입력된 사번: "${empno.trim()}" → 변환된 사번: "${paddedEmpno}"`)

    setIsLoading(true)
    setMessage("")

    try {
      console.log("🔄 LoginForm: Starting login with empno:", paddedEmpno)
      const result = await login(paddedEmpno)

      console.log("🔄 LoginForm: Login result:", result)

      if (result.success) {
        if (result.needsVerification) {
          setMessage(result.message)
          toast({
            title: "인증 이메일 발송",
            description: result.message,
            variant: "default",
          })
        } else if (result.user) {
          toast({
            title: "로그인 성공",
            description: `환영합니다, ${result.user.empnm}님!`,
            variant: "default",
          })
          console.log("🚀 LoginForm: Redirecting to /")
          router.push("/")
        }
      } else {
        setMessage(result.message)
        toast({
          title: "로그인 실패",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Login error:", error)
      setMessage("로그인 처리 중 오류가 발생했습니다.")
      toast({
        title: "오류 발생",
        description: "로그인 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="w-full max-w-2xl shadow-lg p-10 text-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-8">
            <Image src="/images/pwc_logo_light.png" alt="PwC Logo" width={160} height={80} className="object-contain" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900 mb-2">My Career+</CardTitle>
          <CardDescription className="text-lg text-gray-600 mb-4">사번으로 로그인하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="empno" className="text-lg font-semibold text-gray-700">
                사번
              </label>
              <Input
                id="empno"
                type="text"
                placeholder="사번을 입력하세요."
                value={empno}
                onChange={(e) => setEmpno(e.target.value)}
                disabled={isLoading}
                className="w-full h-14 text-2xl px-4"
              />
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

          <div className="mt-8 text-center text-lg text-gray-500">
            <p>사번만 입력하면 바로 로그인됩니다.</p>
            <p className="mt-2">문의사항이 있으시면 Assurance DA로 연락해주세요.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
