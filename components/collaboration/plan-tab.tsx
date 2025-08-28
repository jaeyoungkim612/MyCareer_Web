"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Handshake, Users, Network, Edit, Save, MessageSquare, TrendingUp, Target, X, User, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { CollaborationService } from "@/lib/collaboration-service"
import { AuthService } from "@/lib/auth-service"
import { BusinessGoalsService } from "@/lib/business-goals-service"
import { UserInfoMapper } from "@/data/user-info"
import { supabase } from "@/lib/supabase"

// Initial data for demonstration - 더미 데이터 제거
const initialPlanData = {
  selfAssessment: {
    comment: "",  // ← 빈 값으로 변경
    xlosCollaboration: { count: 0, amount: 0 },    // ← 0으로 변경
    losCollaboration: { count: 0, amount: 0 },     // ← 0으로 변경
    axNodeCollaboration: { count: 0, amount: 0 },  // ← 0으로 변경
  },
  reviewerComments: [
    // 더미 댓글들도 제거
  ],
  lastUpdated: null,
}

// 타입 정의 수정
interface MetricData {
  count: number;
  amount: number;
}

interface SelfAssessment {
  comment: string;
  xlosCollaboration: MetricData;
  losCollaboration: MetricData;
  axNodeCollaboration: MetricData;
}

type MetricField = 'count' | 'amount';
type MetricType = keyof Omit<SelfAssessment, 'comment'>;
type FormField = keyof SelfAssessment;

// 금액 표시용 (100 → "100백만원", 1200 → "1,200백만원")
function formatAmountM(amount: number | undefined | null) {
  return `${Math.ceil(amount ?? 0).toLocaleString()}백만원`
}

interface CollaborationPlanTabProps {
  empno?: string
  readOnly?: boolean
}

export function CollaborationPlanTab({ empno, readOnly = false }: CollaborationPlanTabProps = {}) {
  const [planData, setPlanData] = useState(initialPlanData)
  const [isEditMode, setIsEditMode] = useState(false)
  const [formData, setFormData] = useState(initialPlanData.selfAssessment)
  const [isLoading, setIsLoading] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  
  // Add status management states like business/plan-tab.tsx
  const [currentStatus, setCurrentStatus] = useState<'Draft' | '작성중' | '완료'>('Draft')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    const loadUserData = async () => {
      const user = AuthService.getCurrentUser()
      if (user) {
        // empno prop이 있으면 해당 사용자, 없으면 로그인한 사용자
        const targetEmpno = readOnly ? empno : (empno || user.empno)
        setCurrentUser({ ...user, empno: targetEmpno })
        
        // 대상 사용자의 정보 가져오기 (Business Plan과 동일한 로직, 사번 정규화)
        try {
          if (!targetEmpno) throw new Error("사번이 없습니다.")
          // ReviewerService import 필요
          const { ReviewerService } = await import("@/lib/reviewer-service")
          const normalizedEmpno = ReviewerService.normalizeEmpno(targetEmpno)
          console.log(`🔍 Querying HR master with normalized empno: ${targetEmpno} → ${normalizedEmpno}`)
          const { data: hrData, error: hrError } = await supabase
            .from("a_hr_master")
            .select("EMPNO, EMPNM, ORG_NM, JOB_INFO_NM, GRADNM")
            .eq("EMPNO", normalizedEmpno)
            .maybeSingle()
          
          if (hrError) {
            console.error(`❌ HR 데이터 조회 에러 (${normalizedEmpno}):`, hrError)
          }

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
      }
    }
    
    loadUserData()
  }, [empno])

  useEffect(() => {
    if (currentUser?.empno) fetchPlanData()
    // eslint-disable-next-line
  }, [currentUser])

  async function fetchPlanData() {
    setIsLoading(true)
    setDbError(null)
    try {
      const empno = currentUser?.empno
      const goal = await CollaborationService.getByEmployeeId(empno)
      console.log("[DEBUG] fetch goal", goal)
      if (goal) {
        setPlanData({
          ...planData,
          selfAssessment: {
            comment: goal.business_goal,
            xlosCollaboration: {
              count: goal.x_los_target_count,
              amount: goal.x_los_target_amount,
            },
            losCollaboration: {
              count: goal.losllk_target_count,
              amount: goal.losllk_target_amount,
            },
            axNodeCollaboration: {
              count: goal.ax_node_target_count,
              amount: goal.ax_node_target_amount,
            },
          },
        })
        setFormData({
          comment: goal.business_goal,
          xlosCollaboration: {
            count: goal.x_los_target_count,
            amount: goal.x_los_target_amount,
          },
          losCollaboration: {
            count: goal.losllk_target_count,
            amount: goal.losllk_target_amount,
          },
          axNodeCollaboration: {
            count: goal.ax_node_target_count,
            amount: goal.ax_node_target_amount,
          },
        })
        
        // Set status from database
        setCurrentStatus(goal.status || 'Draft')
        
        // Set lastUpdated from database
        if (goal.updated_at) {
          const date = new Date(goal.updated_at)
          const year = date.getFullYear()
          const month = date.getMonth() + 1
          const day = date.getDate()
          setLastUpdated(`${year}년 ${month}월 ${day}일`)
        }
      } else {
        setPlanData(initialPlanData)
        setFormData(initialPlanData.selfAssessment)
      }
    } catch (e) {
      setDbError("DB에서 데이터를 불러오지 못했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: FormField, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleMetricChange = (metric: MetricType, field: MetricField, value: string) => {
    setFormData((prev: SelfAssessment) => ({
      ...prev,
      [metric]: {
        ...prev[metric],
        [field]: Number(value) || 0,
      },
    }))
  }

  // Updated handleSave to include status and updated_at
  const handleSave = async (status: '작성중' | '완료') => {
    setIsLoading(true)
    setDbError(null)
    try {
      const empno = currentUser?.empno
      if (!empno) throw new Error("로그인 필요")
      // 제출일 때만 validation 적용
      if (status === '완료' && !formData.comment.trim()) {
        alert("Collaboration Strategy를 입력해 주세요.")
        return
      }
      
      // Use direct supabase insert to include status
      const insertData = {
        employee_id: empno,
        business_goal: formData.comment ?? "",
        x_los_target_count: formData.xlosCollaboration.count ?? 0,
        x_los_target_amount: formData.xlosCollaboration.amount ?? 0,
        losllk_target_count: formData.losCollaboration.count ?? 0,
        losllk_target_amount: formData.losCollaboration.amount ?? 0,
        ax_node_target_count: formData.axNodeCollaboration.count ?? 0,
        ax_node_target_amount: formData.axNodeCollaboration.amount ?? 0,
        status: status,
        updated_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from("collaborations")
        .upsert([insertData], { 
          onConflict: 'employee_id',
          ignoreDuplicates: false 
        })
        
      if (!error) {
        setCurrentStatus(status)
        setIsEditMode(false)
        // Update lastUpdated after successful save
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() + 1
        const day = now.getDate()
        setLastUpdated(`${year}년 ${month}월 ${day}일`)
        alert(status === '작성중' ? "임시저장 완료!" : "제출 완료!")
        await fetchPlanData()
      } else {
        throw new Error(error.message)
      }
    } catch (e) {
      setDbError("저장 실패: " + String(e))
      console.error("DB 저장 에러:", e)
    } finally {
      setIsLoading(false)
    }
  }

  // 임시저장
  const handleDraftSave = async () => {
    await handleSave('작성중')
  }
  
  // 제출
  const handleFinalSave = async () => {
    await handleSave('완료')
  }

  // 상태 배지 렌더링 (business/plan-tab.tsx와 동일)
  const renderStatusBadge = () => {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline">
          Last updated: {lastUpdated || "-"}
        </Badge>
        {currentStatus === '완료' ? (
          <Badge className="bg-green-500 text-white">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            제출
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
    setFormData(planData.selfAssessment)
    setIsEditMode(false)
  }

  if (isLoading) return <div className="flex flex-col justify-center items-center h-64 space-y-4">로딩 중...</div>
  if (dbError) return <div className="text-red-500">{dbError}</div>

  return (
    <div className="space-y-6">
      {/* Header with title and edit buttons - Updated like business/plan-tab.tsx */}
      <div className="flex items-center justify-between">
        <div>
                          <h2 className="text-lg font-bold">Collaboration Plan</h2>
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
          {isEditMode ? (
            <>
              <Button onClick={handleCancel} variant="outline" disabled={isLoading}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              {currentStatus !== '완료' && (
                <Button onClick={handleDraftSave} disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Saving..." : "임시저장"}
                </Button>
              )}
              <Button onClick={handleFinalSave} className="bg-green-600 text-white" disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Saving..." : "제출"}
              </Button>
            </>
          ) : !readOnly ? (
            <Button onClick={() => setIsEditMode(true)} disabled={isLoading}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        {/* Self Assessment Card (now full width) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5 text-orange-600" />
              Goals
            </CardTitle>

          </CardHeader>
          <CardContent>
            {isEditMode ? (
              <Textarea
                id="self-comment"
                value={formData.comment ?? ""}
                onChange={(e) => handleInputChange("comment", e.target.value)}
                placeholder="협업 목표와 전략을 입력하세요..."
                className="min-h-[600px]"
              />
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                  {planData.selfAssessment.comment ? (
                    <p className="text-sm whitespace-pre-line">{planData.selfAssessment.comment}</p>
                  ) : (
                    <div className="text-muted-foreground italic">협업 목표와 전략을 입력하세요</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Collaboration Metrics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-orange-600" />
협업 목표 지표
          </CardTitle>

        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* X-Los Collaboration */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <Handshake className="mr-2 h-4 w-4 text-orange-600" />
                  X-Los 협업
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="xlos-count">목표 건수</Label>
                  {isEditMode ? (
                    <Input
                      id="xlos-count"
                      type="number"
                      min={0}
                      value={formData.xlosCollaboration.count || ""}
                      onChange={e => handleMetricChange("xlosCollaboration", "count", e.target.value)}
                      placeholder="0"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lg">
                        {planData.selfAssessment.xlosCollaboration.count || "-"}
                      </span>
                      <span className="text-sm text-muted-foreground">건</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="xlos-amount">목표 금액 (백만원)</Label>
                  {isEditMode ? (
                    <Input
                      id="xlos-amount"
                      type="number"
                      min={0}
                      value={formData.xlosCollaboration.amount || ""}
                      onChange={e => handleMetricChange("xlosCollaboration", "amount", e.target.value)}
                      placeholder="0"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lg">
                        {planData.selfAssessment.xlosCollaboration.amount ? 
                          `${formatAmountM(planData.selfAssessment.xlosCollaboration.amount)}` : 
                          "-"
                        }
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">대상기간은 25년 6월 이후 부터 입니다</p>
                </div>
              </CardContent>
            </Card>

            {/* Los내 Collaboration */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <Users className="mr-2 h-4 w-4 text-orange-600" />
                  Los내 협업
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="los-count">목표 건수</Label>
                  {isEditMode ? (
                    <Input
                      id="los-count"
                      type="number"
                      min={0}
                      value={formData.losCollaboration.count || ""}
                      onChange={e => handleMetricChange("losCollaboration", "count", e.target.value)}
                      placeholder="0"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lg">
                        {planData.selfAssessment.losCollaboration.count || "-"}
                      </span>
                      <span className="text-sm text-muted-foreground">건</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="los-amount">목표 금액 (백만원)</Label>
                  {isEditMode ? (
                    <Input
                      id="los-amount"
                      type="number"
                      min={0}
                      value={formData.losCollaboration.amount || ""}
                      onChange={e => handleMetricChange("losCollaboration", "amount", e.target.value)}
                      placeholder="0"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lg">
                        {planData.selfAssessment.losCollaboration.amount ? 
                          `${formatAmountM(planData.selfAssessment.losCollaboration.amount)}` : 
                          "-"
                        }
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">대상기간은 25년 6월 이후 부터 입니다</p>
                </div>
              </CardContent>
            </Card>

            {/*  AX Node Collaboration */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <Network className="mr-2 h-4 w-4 text-orange-600" />
                  AX Node 협업
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="specialized-count">목표 건수</Label>
                  {isEditMode ? (
                    <Input
                      id="specialized-count"
                      type="number"
                      min={0}
                      value={formData.axNodeCollaboration.count || ""}
                      onChange={e => handleMetricChange("axNodeCollaboration", "count", e.target.value)}
                      placeholder="0"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lg">
                        {planData.selfAssessment.axNodeCollaboration.count || "-"}
                      </span>
                      <span className="text-sm text-muted-foreground">건</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialized-amount">목표 금액 (백만원)</Label>
                  {isEditMode ? (
                    <Input
                      id="specialized-amount"
                      type="number"
                      min={0}
                      value={formData.axNodeCollaboration.amount || ""}
                      onChange={e => handleMetricChange("axNodeCollaboration", "amount", e.target.value)}
                      placeholder="0"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lg">
                        {planData.selfAssessment.axNodeCollaboration.amount ? 
                          `${formatAmountM(planData.selfAssessment.axNodeCollaboration.amount)}` : 
                          "-"
                        }
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">대상기간은 25년 6월 이후 부터 입니다</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">Target period: 2606</p>
        </CardFooter>
      </Card>
    </div>
  )
}
