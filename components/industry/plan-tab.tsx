"use client"

import { useState, useEffect } from "react"
import { AuthService } from "@/lib/auth-service"
import { IndustryTLPlanningService, IndustryTLPlanning } from "@/lib/industry-tl-planning-service"
import { UserInfoMapper } from "@/data/user-info"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Target, MessageSquare, Building, Lightbulb, FileText, Plus, Edit, Save, X, User, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface IndustryPlanTabProps {
  empno?: string
  readOnly?: boolean
}

export default function IndustryPlanTab({ empno, readOnly = false }: IndustryPlanTabProps = {}) {
  const [isEditing, setIsEditing] = useState(false)
  const [showAddComment, setShowAddComment] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  
  // Add status management states like other tabs
  const [currentStatus, setCurrentStatus] = useState<'Draft' | '작성중' | '완료'>('Draft')

  // DB와 매핑되는 상태
  const [planningData, setPlanningData] = useState<IndustryTLPlanning | null>(null)
  const [formData, setFormData] = useState<IndustryTLPlanning | null>(null)

  const [reviewerComments] = useState([
    {
      id: 1,
      name: "김영희",
      role: "Partner",
      avatar: "/placeholder.svg?height=40&width=40",
      date: "2025-05-15",
      comment:
        "산업별 전문성 강화 목표가 명확하게 설정되어 있습니다. 특히 금융 산업 디지털 전환 관련 전문성 개발이 시급해 보입니다.",
    },
    {
      id: 2,
      name: "이철수",
      role: "Partner",
      avatar: "/placeholder.svg?height=40&width=40",
      date: "2025-05-10",
      comment:
        "Thought Leadership 활동 계획이 구체적이고 실행 가능해 보입니다. 산업별 네트워킹 강화 방안도 추가로 고려해 주세요.",
    },
  ])

  // 데이터 fetch
  useEffect(() => {
    const fetchData = async () => {
      setIsInitializing(true)
      setDbError(null)
      try {
        const user = AuthService.getCurrentUser()
        if (!user?.empno) throw new Error("로그인된 사용자가 없습니다. 다시 로그인해주세요.")
        
        // readOnly 모드에서는 전달받은 empno 우선 사용, 일반 모드에서는 로그인 사용자
        const targetEmpno = readOnly 
          ? empno || user.empno // readOnly일 때는 전달받은 empno 우선
          : empno || user.empno // 일반 모드일 때는 기존 로직
        setCurrentUser({ ...user, empno: targetEmpno })
        
        // 대상 사용자의 정보 가져오기 (Business Plan과 동일한 로직)
        try {
          const { data: hrData } = await supabase
            .from("a_hr_master")
            .select("EMPNO, EMPNM, ORG_NM, JOB_INFO_NM, GRADNM")
            .eq("EMPNO", targetEmpno)
            .single()

          if (hrData) {
            setUserInfo({
              empno: hrData.EMPNO,
              empnm: hrData.EMPNM,
              org_nm: hrData.ORG_NM,
              job_info_nm: hrData.JOB_INFO_NM,
              gradnm: hrData.GRADNM,
              pwc_id: hrData.EMPNO,
            })
            console.log("✅ Target user info loaded for:", targetEmpno, hrData.EMPNM, "(direct DB query)")
          } else {
            console.log("ℹ️ No HR data found for target user, using target empno")
            setUserInfo({
              empno: targetEmpno,
              empnm: targetEmpno,
              pwc_id: targetEmpno,
            })
          }
        } catch (error) {
          console.log("ℹ️ Could not load target user info, using target empno:", error)
          setUserInfo({
            empno: targetEmpno,
            empnm: targetEmpno,
            pwc_id: targetEmpno,
          })
        }
        const dbData = await IndustryTLPlanningService.getByEmployeeId(targetEmpno)
        if (dbData) {
          setPlanningData(dbData)
          setFormData(dbData)
          
          // Set status from database
          setCurrentStatus(dbData.status || 'Draft')
          
          // Set lastUpdated from database (same format as other tabs)
          if (dbData.updated_at) {
            const date = new Date(dbData.updated_at)
            const year = date.getFullYear()
            const month = date.getMonth() + 1
            const day = date.getDate()
            setLastUpdated(`${year}년 ${month}월 ${day}일`)
          }
        } else {
          // 기본값
          const empty: IndustryTLPlanning = {
            employee_id: targetEmpno,
            goals: "",
            thought_leadership_activities: "",
            tl_revenue_connection: "",
            industry_audit_efficiency: "",
            industry_specialization_participation: "",
            new_service_development: "",
          }
          setPlanningData(empty)
          setFormData(empty)
        }
      } catch (e) {
        setDbError(String(e))
      } finally {
        setIsInitializing(false)
      }
    }
    fetchData()
  }, [empno])

  const handleSave = async (status: '작성중' | '완료') => {
    if (!currentUser?.empno) {
      setDbError("사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.")
      return
    }
    if (!formData) return
    
    // Validation
    if (!formData.goals.trim()) {
      alert("Industry Goal을 입력해 주세요.")
      return
    }
    
    setIsLoading(true)
    try {
      const saved = await IndustryTLPlanningService.upsertPlanning({
        employee_id: currentUser.empno, // 항상 currentUser.empno 사용
        goals: formData.goals,
        thought_leadership_activities: formData.thought_leadership_activities,
        tl_revenue_connection: formData.tl_revenue_connection,
        industry_audit_efficiency: formData.industry_audit_efficiency,
        industry_specialization_participation: formData.industry_specialization_participation,
        new_service_development: formData.new_service_development,
        status: status,
        updated_at: new Date().toISOString()
      })
      if (saved) {
        setPlanningData(saved)
        setFormData(saved)
        setCurrentStatus(status)
        setIsEditing(false)
        
        // Update lastUpdated after successful save
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() + 1
        const day = now.getDate()
        setLastUpdated(`${year}년 ${month}월 ${day}일`)
        
        alert(status === '작성중' ? "임시저장 완료!" : "최종완료 저장!")
      } else {
        throw new Error("저장 실패")
      }
    } catch (e) {
      setDbError(String(e))
    } finally {
      setIsLoading(false)
    }
  }

  // 임시저장
  const handleDraftSave = async () => {
    await handleSave('작성중')
  }
  
  // 최종완료
  const handleFinalSave = async () => {
    await handleSave('완료')
  }

  // 상태 배지 렌더링 (다른 탭들과 동일)
  const renderStatusBadge = () => {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline">
          Last updated: {lastUpdated || "-"}
        </Badge>
        {currentStatus === '완료' ? (
          <Badge className="bg-green-500 text-white">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            완료
          </Badge>
        ) : currentStatus === '작성중' ? (
          <Badge className="bg-orange-500 text-white">
            <Save className="mr-1 h-3 w-3" />
            작성중
          </Badge>
        ) : (
          <Badge className="bg-gray-400 text-white">
            Draft
          </Badge>
        )}
      </div>
    )
  }

  const handleCancel = () => {
    setFormData(planningData)
    setIsEditing(false)
  }

  const handleAddComment = () => {
    if (newComment.trim()) {
      // Add comment logic here
      setNewComment("")
      setShowAddComment(false)
    }
  }

  if (isInitializing) {
    return <div className="flex flex-col justify-center items-center h-64 space-y-4">로딩 중...</div>
  }
  if (dbError) {
    return <div className="text-red-500">DB 오류: {dbError}</div>
  }

  return (
    <div className="space-y-6">
      {/* Header with title and edit buttons - Updated like other tabs */}
      <div className="flex items-center justify-between">
        <div>
                          <h2 className="text-lg font-bold">Industry & TL Planning</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {userInfo ? `${userInfo.empnm} (${userInfo.empno})` : `Employee ID: ${currentUser?.empno || 'Loading...'}`}
              </p>
              {userInfo?.org_nm && (
                <span className="text-xs text-muted-foreground">• {userInfo.org_nm}</span>
              )}
            </div>
            {renderStatusBadge()}
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleCancel} variant="outline" disabled={isLoading}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleDraftSave} disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Saving..." : "임시저장"}
              </Button>
              <Button onClick={handleFinalSave} className="bg-green-600 text-white" disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Saving..." : "최종완료"}
              </Button>
            </>
          ) : !readOnly && currentStatus !== '완료' ? (
            <Button onClick={() => setIsEditing(true)} disabled={isLoading}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          ) : null}
        </div>
      </div>

      {/* Goals Section Only (full width) */}
      <div className="grid gap-6 md:grid-cols-1">
        {/* Goals Card (now full width) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5 text-orange-600" />
              Goals
            </CardTitle>
            <CardDescription>Your industry specialization and thought leadership goals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
              {isEditing ? (
                <Textarea
                  value={formData?.goals || ""}
                  onChange={(e) => setFormData(f => f ? { ...f, goals: e.target.value } : f)}
                  className="min-h-[100px] mb-2"
                  placeholder="산업전문화 목표를 입력하세요"
                />
              ) : (
                <p className="text-sm">{formData?.goals || ""}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Planning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="mr-2 h-5 w-5 text-orange-600" />
            Activity Planning
          </CardTitle>
          <CardDescription>Industry specialization and thought leadership activity plans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* 1. Thought Leadership 활동 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-600" />
                <label className="text-sm font-medium">Thought Leadership 활동(간행물, 기고, 세미나, Workshop)</label>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                {isEditing ? (
                  <Textarea
                    value={formData?.thought_leadership_activities || ""}
                    onChange={(e) => setFormData(f => f ? { ...f, thought_leadership_activities: e.target.value } : f)}
                    className="min-h-[80px]"
                    placeholder="해당 활동 계획을 입력하세요"
                  />
                ) : (
                  <p className="text-sm">{formData?.thought_leadership_activities || ""}</p>
                )}
              </div>
            </div>

            {/* 2. Thought Leadership 활동을 통한 Revenue 연결 또는 성공 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-orange-600" />
                <label className="text-sm font-medium">Thought Leadership 활동을 통한 Revenue 연결 또는 성공</label>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                {isEditing ? (
                  <Textarea
                    value={formData?.tl_revenue_connection || ""}
                    onChange={(e) => setFormData(f => f ? { ...f, tl_revenue_connection: e.target.value } : f)}
                    className="min-h-[80px]"
                    placeholder="Revenue 연결 계획을 입력하세요"
                  />
                ) : (
                  <p className="text-sm">{formData?.tl_revenue_connection || ""}</p>
                )}
              </div>
            </div>

            {/* 3. 산업별 감사 효율화/집중화의 기여도 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-600" />
                <label className="text-sm font-medium">산업별 감사 효율화/집중화의 기여도</label>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                {isEditing ? (
                  <Textarea
                    value={formData?.industry_audit_efficiency || ""}
                    onChange={(e) => setFormData(f => f ? { ...f, industry_audit_efficiency: e.target.value } : f)}
                    className="min-h-[80px]"
                    placeholder="감사 효율화/집중화 계획을 입력하세요"
                  />
                ) : (
                  <p className="text-sm">{formData?.industry_audit_efficiency || ""}</p>
                )}
              </div>
            </div>

            {/* 4. 산업전문화 활동 참여도 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-orange-600" />
                <label className="text-sm font-medium">산업전문화 활동 참여도</label>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                {isEditing ? (
                  <Textarea
                    value={formData?.industry_specialization_participation || ""}
                    onChange={(e) => setFormData(f => f ? { ...f, industry_specialization_participation: e.target.value } : f)}
                    className="min-h-[80px]"
                    placeholder="활동 참여 계획을 입력하세요"
                  />
                ) : (
                  <p className="text-sm">{formData?.industry_specialization_participation || ""}</p>
                )}
              </div>
            </div>

            {/* 5. 산업전문화를 통한 신규 서비스 개발 및 지원 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-orange-600" />
                <label className="text-sm font-medium">산업전문화를 통한 신규 서비스 개발 및 지원</label>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                {isEditing ? (
                  <Textarea
                    value={formData?.new_service_development || ""}
                    onChange={(e) => setFormData(f => f ? { ...f, new_service_development: e.target.value } : f)}
                    className="min-h-[80px]"
                    placeholder="신규 서비스 개발 및 지원 계획을 입력하세요"
                  />
                ) : (
                  <p className="text-sm">{formData?.new_service_development || ""}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">Target Period: 2606</p>
        </CardFooter>
      </Card>
    </div>
  )
}
