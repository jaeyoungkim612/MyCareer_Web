"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { AuthService } from "@/lib/auth-service"
import Image from "next/image"

export default function VerifyPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token")
      const empno = searchParams.get("empno")

      if (!token || !empno) {
        setMessage("유효하지 않은 인증 링크입니다.")
        setIsSuccess(false)
        setIsLoading(false)
        return
      }

      try {
        const result = await AuthService.verifyEmail(token, empno)
        setMessage(result.message)
        setIsSuccess(result.success)

        if (result.success) {
          // 인증 성공 시 3초 후 대시보드로 이동
          setTimeout(() => {
            router.push("/")
          }, 3000)
        }
      } catch (error) {
        console.error("Verification error:", error)
        setMessage("인증 처리 중 오류가 발생했습니다.")
        setIsSuccess(false)
      } finally {
        setIsLoading(false)
      }
    }

    verifyEmail()
  }, [searchParams, router])

  const handleGoToLogin = () => {
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* 로고 및 제목 */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <Image src="/images/pwc_logo_dark.png" alt="PwC Logo" width={120} height={45} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">My Career+</h1>
            <p className="text-gray-600">이메일 인증</p>
          </div>
        </div>

        {/* 인증 결과 */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {isLoading ? (
                <Loader2 className="h-12 w-12 animate-spin text-orange-600" />
              ) : isSuccess ? (
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              ) : (
                <XCircle className="h-12 w-12 text-red-600" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {isLoading ? "인증 처리 중..." : isSuccess ? "인증 성공" : "인증 실패"}
            </CardTitle>
            <CardDescription>
              {isLoading
                ? "이메일 인증을 처리하고 있습니다."
                : isSuccess
                  ? "이메일 인증이 완료되었습니다."
                  : "인증에 실패했습니다."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <Alert className={isSuccess ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <AlertDescription className={isSuccess ? "text-green-800" : "text-red-800"}>{message}</AlertDescription>
              </Alert>
            )}

            {!isLoading && (
              <div className="space-y-3">
                {isSuccess ? (
                  <div className="text-center text-sm text-gray-600">
                    <p>잠시 후 자동으로 대시보드로 이동합니다...</p>
                  </div>
                ) : (
                  <Button onClick={handleGoToLogin} className="w-full bg-orange-600 hover:bg-orange-700">
                    로그인 페이지로 이동
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
