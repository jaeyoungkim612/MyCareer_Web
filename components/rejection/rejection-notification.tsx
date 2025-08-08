"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { GSPService } from "@/lib/gsp-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Settings } from "lucide-react"
import { useRouter } from "next/navigation"

interface RejectionNotificationProps {
  className?: string
  onRejectionStatusChange?: (hasRejection: boolean) => void
}

export function RejectionNotification({ className = "", onRejectionStatusChange }: RejectionNotificationProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [isRejected, setIsRejected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const checkRejectionStatus = async () => {
    if (!user?.empno) return

    try {
      const result = await GSPService.checkGSPStatus(user.empno)
      
      // 상태가 '반려'인 경우
      if (result.exists && result.data?.STATUS === '반려') {
        setIsRejected(true)
        onRejectionStatusChange?.(true)
        console.log("📢 RejectionNotification: User has rejected GSP")
      } else {
        setIsRejected(false)
        onRejectionStatusChange?.(false)
      }
    } catch (error) {
      console.error("❌ RejectionNotification: Error checking rejection status:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user?.empno) {
      checkRejectionStatus()
      
      // 30초마다 상태 확인
      const interval = setInterval(checkRejectionStatus, 30000)
      return () => clearInterval(interval)
    }
  }, [user?.empno])

  const handleGoToSettings = () => {
    router.push("/settings")
  }

  if (isLoading || !isRejected) {
    return null
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <Card className="w-80 border-amber-200 bg-amber-50 shadow-lg rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-amber-800">GSP 및 Focus 30 검토 요청</CardTitle>
          </div>
          <CardDescription className="text-amber-700">
            제출해 주신 내용에 대해 일부 보완이 필요합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-amber-700 mb-4">
            더 나은 내용으로 개선해 보시기 바랍니다.
          </p>
          <div className="flex justify-end">
            <Button 
              onClick={handleGoToSettings}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              size="sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              내용 수정하기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
