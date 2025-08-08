"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { PasswordUtils } from "@/lib/password-utils"
import { GSPService, type GSPData } from "@/lib/gsp-service"
import { Check, X, User, Lock } from "lucide-react"

export default function SettingsPage() {
  const { changePassword, user } = useAuth()
  const router = useRouter()
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [gspData, setGspData] = useState<GSPData | null>(null)
  const [isLoadingGSP, setIsLoadingGSP] = useState(false)
  
  // 기본정보 변경 폼 데이터
  const [gspFormData, setGspFormData] = useState({
    gsp: "",
    focus30: ""
  })
  
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
        
        // 🎯 최초 비밀번호 변경 완료 시 GSP 입력 상태 확인 후 이동
        // 비밀번호 변경이 성공하면 항상 GSP 상태 확인
        console.log("🚀 Settings: 비밀번호 변경 완료, GSP 상태 확인 중...")
        await checkGSPAndRedirect()
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

  // GSP 입력 상태 확인 후 적절한 페이지로 리다이렉트
  const checkGSPAndRedirect = async () => {
    if (!user?.empno) {
      router.push("/")
      return
    }

    try {
      const gspStatus = await GSPService.checkGSPStatus(user.empno)
      
      if (gspStatus.needsInput) {
        console.log("🎯 Settings: User needs GSP input, redirecting to /gsp-input")
        router.push("/gsp-input")
      } else {
        console.log("🚀 Settings: GSP not needed or already completed, redirecting to /")
        router.push("/")
      }
    } catch (error) {
      console.error("❌ Settings: Error checking GSP status:", error)
      router.push("/")
    }
  }

  // GSP 데이터 로드
  useEffect(() => {
    if (user?.empno) {
      loadGSPData()
    }
  }, [user?.empno])

  const loadGSPData = async () => {
    if (!user?.empno) return
    
    setIsLoadingGSP(true)
    try {
      const gspStatus = await GSPService.checkGSPStatus(user.empno)
      
      if (gspStatus.exists && gspStatus.data) {
        setGspData(gspStatus.data)
        setGspFormData({
          gsp: gspStatus.data.GSP || "",
          focus30: gspStatus.data["Focus 30"] || ""
        })
      } else {
        setGspData(null)
        setGspFormData({ gsp: "", focus30: "" })
      }
    } catch (error) {
      console.error("❌ Error loading GSP data:", error)
    } finally {
      setIsLoadingGSP(false)
    }
  }

  // 기본정보 변경 처리
  const handleGSPChange = (field: 'gsp' | 'focus30', value: string) => {
    setGspFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveGSP = async () => {
    if (!user?.empno) {
      toast.error("사용자 정보를 찾을 수 없습니다.")
      return
    }

    if (!gspFormData.gsp.trim() || !gspFormData.focus30.trim()) {
      toast.error("GSP와 Focus 30을 모두 입력해주세요.")
      return
    }

    setIsLoadingGSP(true)
    try {
      const result = await GSPService.updateGSP(user.empno, gspFormData.gsp, gspFormData.focus30)
      
      if (result.success) {
        toast.success("기본정보 변경이 신청되었습니다. 승인을 기다려주세요.")
        await loadGSPData() // 데이터 새로고침
        
        // 변경신청 완료 후 intro 페이지로 이동
        setTimeout(() => {
          router.push("/")
        }, 1500) // 토스트 메시지를 잠깐 보여준 후 이동
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("❌ GSP 변경 오류:", error)
      toast.error("기본정보 변경 중 오류가 발생했습니다.")
    } finally {
      setIsLoadingGSP(false)
    }
  }

  return (
    <div className="container mx-auto pt-2 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>
            {user?.is_password_changed === false ? "최초 설정" : "설정"}
          </CardTitle>
          <CardDescription>
            {user?.is_password_changed === false 
              ? "최초 로그인 시 비밀번호 변경 후 기본정보를 입력해주세요."
              : "계정 정보 및 기본정보를 관리합니다."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={user?.is_password_changed === false ? "password" : "basic-info"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="basic-info" 
                className="flex items-center gap-2"
                disabled={user?.is_password_changed === false}
              >
                <User className="h-4 w-4" />
                기본정보 변경
              </TabsTrigger>
              <TabsTrigger value="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                비밀번호 변경
              </TabsTrigger>
            </TabsList>
            
            {/* 기본정보 변경 탭 */}
            <TabsContent value="basic-info" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">GSP & Focus 30</h3>
                  {gspData?.STATUS && (
                    <Badge variant={gspData.STATUS === '승인완료' ? 'default' : 'secondary'}>
                      {gspData.STATUS}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-4">
                  {/* GSP 입력 */}
                  <div className="space-y-2">
                    <Label htmlFor="gsp-edit">GSP</Label>
                    <Textarea
                      id="gsp-edit"
                      value={gspFormData.gsp}
                      onChange={(e) => handleGSPChange('gsp', e.target.value)}
                      placeholder="GSP 내용을 입력해주세요"
                      className="min-h-[150px]"
                      disabled={isLoadingGSP}
                    />
                  </div>

                  {/* Focus 30 입력 */}
                  <div className="space-y-2">
                    <Label htmlFor="focus30-edit">Focus 30</Label>
                    <Textarea
                      id="focus30-edit"
                      value={gspFormData.focus30}
                      onChange={(e) => handleGSPChange('focus30', e.target.value)}
                      placeholder="Focus 30 내용을 입력해주세요"
                      className="min-h-[150px]"
                      disabled={isLoadingGSP}
                    />
                  </div>

                  {/* 변경 신청 버튼 */}
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveGSP}
                      disabled={isLoadingGSP}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {isLoadingGSP ? "처리 중..." : "변경 신청"}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 비밀번호 변경 탭 */}
            <TabsContent value="password" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">비밀번호 변경</h3>
                  <p className="text-sm text-muted-foreground">
                    {user?.is_password_changed === false 
                      ? "최초 로그인 시 비밀번호를 변경해주세요. (현재 비밀번호: 3131)"
                      : "보안을 위해 정기적으로 비밀번호를 변경해주세요."
                    }
                  </p>
                </div>
                
                <div className="space-y-4">
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
                  
                  {/* 비밀번호 변경 버튼 */}
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSavePassword} 
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isLoading ? "변경 중..." : "비밀번호 변경"}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
