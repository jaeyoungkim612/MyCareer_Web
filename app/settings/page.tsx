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
import { useRouter, useSearchParams } from "next/navigation"
import { PasswordUtils } from "@/lib/password-utils"
import { GSPService, type GSPData } from "@/lib/gsp-service"
import { UserInfoMapper, type UserMasterInfo } from "@/data/user-info"
import { Check, X, User, Lock } from "lucide-react"

export default function SettingsPage() {
  const { changePassword, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const shouldRedirectToMain = searchParams.get('redirect') === 'main'
  
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [gspData, setGspData] = useState<GSPData | null>(null)
  const [userInfo, setUserInfo] = useState<UserMasterInfo | null>(null)
  const [isLoadingGSP, setIsLoadingGSP] = useState(false)
  
  // 기본정보 변경 폼 데이터
  const [gspFormData, setGspFormData] = useState({
    보직: "",
    산업전문화: "",
    tfCouncil: "",
    gspFocus30: ""
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
        
        // 비밀번호 변경 완료 후 이동
        if (shouldRedirectToMain || user?.is_password_changed === false) {
          // 최초 로그인 후 비밀번호 변경인 경우 바로 메인으로 (기본정보 변경 건너뛰기)
          console.log("🏠 최초 로그인 후 비밀번호 변경 완료 - 바로 메인으로 이동")
          setTimeout(() => {
            router.push("/")
          }, 1500)
        } else {
          // 일반적인 비밀번호 변경인 경우 현재 페이지 유지
          console.log("🔄 일반 비밀번호 변경 완료 - 현재 페이지 유지")
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



  // 사용자 정보 및 GSP 데이터 로드
  useEffect(() => {
    if (user?.empno) {
      loadUserAndGSPData()
    }
  }, [user?.empno])

  const loadUserAndGSPData = async () => {
    if (!user?.empno) return
    
    setIsLoadingGSP(true)
    try {
      // 1. 먼저 기본 사용자 정보 로드 (a_hr_master + L_직무및활동)
      console.log("🔍 Loading user info for empno:", user.empno)
      const userMasterInfo = await UserInfoMapper.loadUserInfo(user.empno)
      setUserInfo(userMasterInfo)
      
      // 2. GSP 테이블에서 수정/승인 대기 중인 데이터 로드
      const gspStatus = await GSPService.checkGSPStatus(user.empno)
      
      if (gspStatus.exists && gspStatus.data) {
        setGspData(gspStatus.data)
        
        // 현재 값들 설정 (GSP 테이블 값이 있으면 우선, 없으면 기본 사용자 정보)
        const currentValues = {
          보직: gspStatus.data["보직(HC)"] || userMasterInfo?.job_info_nm || "",
          산업전문화: gspStatus.data.산업전문화 || userMasterInfo?.industry_specialization || "",
          tfCouncil: gspStatus.data["Council/TF 등"] || userMasterInfo?.council_tf || "",
          gspFocus30: gspStatus.data["GSP/Focus 30"] || userMasterInfo?.gsp_focus_30 || ""
        }
        
        setGspFormData(currentValues)
        setOriginalValues(currentValues)
        console.log("✅ GSP data loaded with user info fallback:", currentValues)
      } else {
        setGspData(null)
        
        // GSP 테이블에 데이터가 없으면 기본 사용자 정보로 설정
        const baseValues = {
          보직: userMasterInfo?.job_info_nm || "",
          산업전문화: userMasterInfo?.industry_specialization || "",
          tfCouncil: userMasterInfo?.council_tf || "",
          gspFocus30: userMasterInfo?.gsp_focus_30 || ""
        }
        
        setGspFormData(baseValues)
        setOriginalValues(baseValues)
        console.log("✅ Using base user info values:", baseValues)
      }
    } catch (error) {
      console.error("❌ Error loading user/GSP data:", error)
    } finally {
      setIsLoadingGSP(false)
    }
  }

  // 기본정보 변경 처리
  const handleGSPChange = (field: '보직' | '산업전문화' | 'tfCouncil' | 'gspFocus30', value: string) => {
    setGspFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 원본 값들을 저장할 state 추가
  const [originalValues, setOriginalValues] = useState({
    보직: "",
    산업전문화: "",
    tfCouncil: "",
    gspFocus30: ""
  })

  const handleSaveGSP = async () => {
    if (!user?.empno) {
      toast.error("사용자 정보를 찾을 수 없습니다.")
      return
    }

    // 데이터가 로드되었는지 확인
    if (isLoadingGSP) {
      toast.error("데이터를 로드 중입니다. 잠시 후 다시 시도해주세요.")
      return
    }

    // 변경된 항목들만 식별
    const changedItems: Array<{field: string, value: string}> = []
    
    console.log("🔍 변경 감지 디버깅:")
    console.log("현재 값:", gspFormData)
    console.log("원본 값:", originalValues)
    
    if (gspFormData.보직 !== originalValues.보직) {
      console.log("보직 변경됨:", originalValues.보직, "→", gspFormData.보직)
      changedItems.push({field: '보직', value: gspFormData.보직})
    }
    if (gspFormData.산업전문화 !== originalValues.산업전문화) {
      console.log("산업전문화 변경됨:", originalValues.산업전문화, "→", gspFormData.산업전문화)
      changedItems.push({field: '산업전문화', value: gspFormData.산업전문화})
    }
    if (gspFormData.tfCouncil !== originalValues.tfCouncil) {
      console.log("TF&Council 변경됨:", originalValues.tfCouncil, "→", gspFormData.tfCouncil)
      changedItems.push({field: 'TF_Council', value: gspFormData.tfCouncil})
    }
    if (gspFormData.gspFocus30 !== originalValues.gspFocus30) {
      console.log("GSP/Focus30 변경됨:", originalValues.gspFocus30, "→", gspFormData.gspFocus30)
      changedItems.push({field: 'GSP_Focus30', value: gspFormData.gspFocus30})
    }
    
    console.log("변경된 항목들:", changedItems)
    console.log("변경된 항목 수:", changedItems.length)

    // 변경된 항목이 없지만 입력된 값이 있는 경우 (최초 입력)
    if (changedItems.length === 0) {
      // 현재 입력된 값들 중 비어있지 않은 것들을 찾기
      const currentInputs: Array<{field: string, value: string}> = []
      
      if (gspFormData.보직.trim()) {
        currentInputs.push({field: '보직', value: gspFormData.보직})
      }
      if (gspFormData.산업전문화.trim()) {
        currentInputs.push({field: '산업전문화', value: gspFormData.산업전문화})
      }
      if (gspFormData.tfCouncil.trim()) {
        currentInputs.push({field: 'TF_Council', value: gspFormData.tfCouncil})
      }
      if (gspFormData.gspFocus30.trim()) {
        currentInputs.push({field: 'GSP_Focus30', value: gspFormData.gspFocus30})
      }
      
      if (currentInputs.length > 0) {
        console.log("최초 입력으로 감지된 항목들:", currentInputs)
        // 최초 입력된 항목들을 변경된 항목으로 처리
        changedItems.push(...currentInputs)
      } else {
        toast.info("변경된 항목이 없습니다.")
        return
      }
    }

    // 빈 값으로도 변경 신청 가능하도록 검증 제거

    setIsLoadingGSP(true)
    try {
      // 변경된 항목들만 개별적으로 처리
      for (const item of changedItems) {
        const result = await GSPService.updateGSPItem(user.empno, item.field, item.value)
        if (!result.success) {
          throw new Error(`${item.field} 변경 실패: ${result.message}`)
        }
      }
      
      toast.success(`${changedItems.length}개 항목의 변경이 신청되었습니다. 승인을 기다려주세요.`)
      
      // 데이터 새로고침
      console.log("🔄 변경 신청 완료, 데이터 재로드 중...")
      await loadUserAndGSPData()
      console.log("✅ 데이터 재로드 완료, gspData 상태:", gspData)
      
      // 변경신청 완료 후 intro 페이지로 이동
      setTimeout(() => {
        // 페이지 새로고침으로 상태 확실히 반영
        window.location.href = "/"
      }, 1000) // 토스트 메시지를 잠깐 보여준 후 이동
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
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="basic-info" 
                className="flex items-center gap-2"
                disabled={user?.is_password_changed === false || shouldRedirectToMain}
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
                  <h3 className="text-lg font-medium">기본정보 관리</h3>
                  {gspData?.STATUS && (
                    <Badge variant={gspData.STATUS === '승인완료' ? 'default' : 'secondary'}>
                      {gspData.STATUS}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-4">
                  {/* 보직(HC) 입력 */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="position-edit">보직(HC)</Label>
                      {gspData?.["보직_STATUS"] === '승인대기' && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          승인대기
                        </Badge>
                      )}
                    </div>
                    <Input
                      id="position-edit"
                      value={gspFormData.보직}
                      onChange={(e) => handleGSPChange('보직', e.target.value)}
                      placeholder={userInfo?.job_info_nm ? `현재: ${userInfo.job_info_nm}` : "보직을 입력해주세요"}
                      disabled={isLoadingGSP}
                    />
                  </div>

                  {/* 산업전문화(TMA/IMA) 입력 */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="specialty-edit">산업전문화(TMA/IMA)</Label>
                      {gspData?.["산업전문화_STATUS"] === '승인대기' && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          승인대기
                        </Badge>
                      )}
                    </div>
                    <Input
                      id="specialty-edit"
                      value={gspFormData.산업전문화}
                      onChange={(e) => handleGSPChange('산업전문화', e.target.value)}
                      placeholder={userInfo?.industry_specialization ? `현재: ${userInfo.industry_specialization}` : "산업전문화 분야를 입력해주세요"}
                      disabled={isLoadingGSP}
                    />
                  </div>

                  {/* TF&Council 입력 */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="tf-council-edit">TF&Council</Label>
                      {gspData?.["Council_TF_STATUS"] === '승인대기' && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          승인대기
                        </Badge>
                      )}
                    </div>
                    <Input
                      id="tf-council-edit"
                      value={gspFormData.tfCouncil}
                      onChange={(e) => handleGSPChange('tfCouncil', e.target.value)}
                      placeholder={userInfo?.council_tf ? `현재: ${userInfo.council_tf}` : "TF & Council 활동을 입력해주세요"}
                      disabled={isLoadingGSP}
                    />
                  </div>

                  {/* GSP/Focus 30 입력 */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="gsp-focus30-edit">GSP/Focus 30</Label>
                      {gspData?.["GSP_Focus_30_STATUS"] === '승인대기' && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          승인대기
                        </Badge>
                      )}
                    </div>
                    <Input
                      id="gsp-focus30-edit"
                      value={gspFormData.gspFocus30}
                      onChange={(e) => handleGSPChange('gspFocus30', e.target.value)}
                      placeholder={userInfo?.gsp_focus_30 ? `현재: ${userInfo.gsp_focus_30}` : "GSP/Focus 30 내용을 입력해주세요"}
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
