"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { PasswordUtils } from "@/lib/password-utils"
import { Check, X } from "lucide-react"

export default function SettingsPage() {
  const { changePassword, user } = useAuth()
  const router = useRouter()
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  
  // 비밀번호 검증 상태
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    format: false,
    notDefault: false,
    match: false
  })

  const handlePasswordChange = (field: string, value: string) => {
    const newPasswords = {
      ...passwords,
      [field]: value,
    }
    setPasswords(newPasswords)
    
    // 새 비밀번호 또는 확인 비밀번호가 변경될 때 실시간 검증
    if (field === "new" || field === "confirm") {
      const newPassword = field === "new" ? value : newPasswords.new
      const confirmPassword = field === "confirm" ? value : newPasswords.confirm
      
      setPasswordValidation({
        length: newPassword.length >= 8,
        format: /(?=.*[a-zA-Z])(?=.*\d)/.test(newPassword),
        notDefault: newPassword !== '3131',
        match: confirmPassword === newPassword && confirmPassword.length > 0
      })
    }
  }

  const handleSavePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast.error("모든 필드를 입력해주세요")
      return
    }

    // 실시간 검증 상태 체크
    if (!passwordValidation.length || !passwordValidation.format || !passwordValidation.notDefault || !passwordValidation.match) {
      toast.error("비밀번호 요건을 모두 충족해주세요")
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
              placeholder="새로운 비밀번호를 입력하세요"
              disabled={isLoading}
            />
            {/* 비밀번호 요건 표시 */}
            {passwords.new.length > 0 && (
              <div className="space-y-1 text-sm">
                <div className={`flex items-center gap-2 ${passwordValidation.length ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordValidation.length ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  <span>최소 8자 이상</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordValidation.format ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordValidation.format ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  <span>영문과 숫자 포함</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordValidation.notDefault ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordValidation.notDefault ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  <span>기본 비밀번호(3131) 사용 불가</span>
                </div>
              </div>
            )}
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
            {/* 비밀번호 일치 여부 표시 */}
            {passwords.confirm.length > 0 && (
              <div className={`flex items-center gap-2 text-sm ${passwordValidation.match ? 'text-green-600' : 'text-red-500'}`}>
                {passwordValidation.match ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                <span>비밀번호가 일치합니다</span>
              </div>
            )}
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
