"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const { changePassword, user } = useAuth()
  const router = useRouter()
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handlePasswordChange = (field: string, value: string) => {
    setPasswords((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSavePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast.error("모든 필드를 입력해주세요")
      return
    }

    if (passwords.new !== passwords.confirm) {
      toast.error("새로운 비밀번호가 일치하지 않습니다")
      return
    }

    if (passwords.new.length < 8) {
      toast.error("비밀번호는 최소 8자 이상이어야 합니다")
      return
    }

    setIsLoading(true)

    try {
      console.log("🔄 Settings: 비밀번호 변경 요청")
      const result = await changePassword(passwords.current, passwords.new)

      if (result.success) {
        // 성공 후 폼 초기화
        setPasswords({
          current: "",
          new: "",
          confirm: "",
        })

        toast.success(result.message)
        
        // 🎯 최초 비밀번호 변경 완료 시 intro 페이지로 즉시 이동
        if (user?.is_password_changed === false) {
          console.log("🚀 Settings: 최초 비밀번호 변경 완료, intro 페이지로 즉시 이동")
          router.push("/")
        }
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("❌ Settings: 비밀번호 변경 오류:", error)
      toast.error("비밀번호 변경 중 오류가 발생했습니다")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto pt-2 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>비밀번호 변경</CardTitle>
          <CardDescription>
            {user?.is_password_changed === false 
              ? "최초 로그인 시 비밀번호를 변경해주세요. (현재 비밀번호: 3131)"
              : "보안을 위해 정기적으로 비밀번호를 변경해주세요."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">현재 비밀번호</Label>
            <Input 
              id="current-password" 
              type="password" 
              value={passwords.current}
              onChange={(e) => handlePasswordChange("current", e.target.value)}
              placeholder="현재 비밀번호를 입력하세요"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">새로운 비밀번호</Label>
            <Input 
              id="new-password" 
              type="password" 
              value={passwords.new}
              onChange={(e) => handlePasswordChange("new", e.target.value)}
              placeholder="새로운 비밀번호를 입력하세요 (최소 8자)"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">새로운 비밀번호 확인</Label>
            <Input 
              id="confirm-password" 
              type="password" 
              value={passwords.confirm}
              onChange={(e) => handlePasswordChange("confirm", e.target.value)}
              placeholder="새로운 비밀번호를 다시 입력하세요"
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSavePassword} className="w-full" disabled={isLoading}>
            {isLoading ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
