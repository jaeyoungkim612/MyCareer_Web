"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { 
  Building2, 
  Users, 
  Handshake, 
  Award, 
  TrendingUp,
  Calendar,
  MapPin,
  Briefcase,
  Target,
  Star
} from "lucide-react"
import { PerformanceRadarChart } from "@/components/dashboard/performance-radar-chart"
import { BusinessPlanTab } from "@/components/business/plan-tab"
import { BusinessSelfAssessmentTab } from "@/components/business/self-assessment-tab"
import { BusinessMonitoringTab } from "@/components/business/status-tab"
import { PlanAssessmentTab } from "@/components/people/plan-assessment-tab"
import { SelfAssessmentTab } from "@/components/people/self-assessment-tab"
import { ResultsTab } from "@/components/people/results-tab"
import { CollaborationPlanTab } from "@/components/collaboration/plan-tab"
import { CollaborationSelfAssessmentTab } from "@/components/collaboration/self-assessment-tab"
import { CollaborationMonitoringTab } from "@/components/collaboration/monitoring-tab"
import ExpertisePlanTab from "@/components/quality/plan-tab"
import QualitySelfAssessmentTab from "@/components/quality/self-assessment-tab"
import ExpertiseMonitoringTab from "@/components/quality/monitoring-tab"
import IndustryPlanTab from "@/components/industry/plan-tab"
import IndustrySelfAssessmentTab from "@/components/industry/self-assessment-tab"
import IndustryMonitoringTab from "@/components/industry/monitoring-tab"
import { supabase } from "@/lib/supabase"
import { AuthService } from "@/lib/auth-service"
import { Textarea } from "@/components/ui/textarea"

interface TeamMemberDetailDialogProps {
  isOpen: boolean
  onClose: () => void
  empno: string
  memberData?: {
    name: string
    employeeNumber: string
    team: string
    position: string
    profileImage?: string
    department?: string
    specialization?: string
    tfCouncil?: string
    isGSP?: boolean
    isFocus30?: boolean
  }
}

export function TeamMemberDetailDialog({ 
  isOpen, 
  onClose, 
  empno, 
  memberData 
}: TeamMemberDetailDialogProps) {
  const [activeMainTab, setActiveMainTab] = useState("business")
  const [activeSubTabs, setActiveSubTabs] = useState({
    business: "plan",
    people: "plan",
    collaboration: "plan", 
    quality: "plan",
    industry: "plan"
  })
  const [targetUserInfo, setTargetUserInfo] = useState<any>(null)
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(true)
  
  // 코멘트 관련 state
  const [reviewComment, setReviewComment] = useState("")
  const [existingFeedback, setExistingFeedback] = useState<any>(null)
  const [isSavingComment, setIsSavingComment] = useState(false)
  const [isLoadingComment, setIsLoadingComment] = useState(false)
  const [currentReviewer, setCurrentReviewer] = useState<any>(null)

  const handleSubTabChange = (mainTab: string, subTab: string) => {
    setActiveSubTabs(prev => ({
      ...prev,
      [mainTab]: subTab
    }))
  }

  // 현재 리뷰어의 기존 코멘트 로드
  const loadExistingComment = async () => {
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser?.empno || !empno) return

    setIsLoadingComment(true)
    try {
      // 사번 정규화 (95129 → 095129)
      const { ReviewerService } = await import("@/lib/reviewer-service")
      const normalizedReviewedEmpno = ReviewerService.normalizeEmpno(empno)
      const normalizedReviewerEmpno = ReviewerService.normalizeEmpno(currentUser.empno)
      console.log(`🔧 TeamMemberDetailDialog: Normalizing empnos for feedback: ${empno} → ${normalizedReviewedEmpno}, ${currentUser.empno} → ${normalizedReviewerEmpno}`)
      
      // RLS 정책을 우회하기 위해 직접 쿼리 실행
      const { data: feedback, error } = await supabase.rpc('get_reviewer_feedback', {
        p_reviewed_empno: normalizedReviewedEmpno,
        p_reviewer_empno: normalizedReviewerEmpno
      })

      if (error) {
        console.error('Error loading existing feedback:', error)
        // 만약 함수가 없다면 기본 쿼리로 시도
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('reviewer_feedback')
          .select('*')
          .eq('reviewed_empno', normalizedReviewedEmpno)
          .eq('reviewer_empno', normalizedReviewerEmpno)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (!fallbackError && fallbackData) {
          setExistingFeedback(fallbackData)
          setReviewComment(fallbackData.comment)
        } else {
          setExistingFeedback(null)
          setReviewComment("")
        }
      } else if (feedback && feedback.length > 0) {
        setExistingFeedback(feedback[0])
        setReviewComment(feedback[0].comment)
      } else {
        setExistingFeedback(null)
        setReviewComment("")
      }

      // 현재 리뷰어 정보와 사진 조회
      const [hrData, photoData] = await Promise.all([
        supabase
          .from('a_hr_master')
          .select('EMPNO, EMPNM, GRADNM')
          .eq('EMPNO', currentUser.empno)
          .single(),
        supabase
          .from('employee_photos')
          .select('photo_url')
          .eq('empno', currentUser.empno)
          .single()
      ])

      if (hrData.data) {
        setCurrentReviewer({
          ...hrData.data,
          photo_url: photoData.data?.photo_url || null
        })
      }

    } catch (error) {
      console.error('Error loading existing comment:', error)
    } finally {
      setIsLoadingComment(false)
    }
  }

  // 코멘트 저장
  const saveComment = async () => {
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser?.empno || !empno || !currentReviewer) return

    if (!reviewComment.trim()) {
      alert('코멘트를 입력해주세요.')
      return
    }

    setIsSavingComment(true)
    try {
      if (existingFeedback) {
        // 기존 피드백 업데이트 - RPC 함수 사용
        const { error } = await supabase.rpc('update_reviewer_feedback', {
          p_feedback_id: existingFeedback.id,
          p_comment: reviewComment.trim()
        })

        if (error) {
          console.error('Error updating feedback:', error)
          // RPC 함수가 없다면 직접 업데이트 시도
          const { error: directError } = await supabase
            .from('reviewer_feedback')
            .update({
              comment: reviewComment.trim(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingFeedback.id)
            
          if (directError) {
            console.error('Direct update also failed:', directError)
            alert('코멘트 수정에 실패했습니다.')
            return
          }
        }

        console.log('✅ Feedback updated successfully')
        alert('코멘트가 수정되었습니다.')
      } else {
        // 사번 정규화 (95129 → 095129)
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedReviewedEmpno = ReviewerService.normalizeEmpno(empno)
        const normalizedReviewerEmpno = ReviewerService.normalizeEmpno(currentUser.empno)
        
        // 새 피드백 생성 - RPC 함수 사용
        const { error } = await supabase.rpc('insert_reviewer_feedback', {
          p_reviewed_empno: normalizedReviewedEmpno,
          p_reviewer_empno: normalizedReviewerEmpno,
          p_reviewer_name: currentReviewer.EMPNM,
          p_reviewer_grade: currentReviewer.GRADNM,
          p_comment: reviewComment.trim()
        })

        if (error) {
          console.error('Error saving feedback:', error)
          // RPC 함수가 없다면 RLS를 비활성화하고 직접 삽입 시도
          const { error: directError } = await supabase
            .from('reviewer_feedback')
            .insert([{
              reviewed_empno: normalizedReviewedEmpno,
              reviewer_empno: normalizedReviewerEmpno,
              reviewer_name: currentReviewer.EMPNM,
              reviewer_grade: currentReviewer.GRADNM,
              comment: reviewComment.trim()
            }])

          if (directError) {
            console.error('Direct insert also failed:', directError)
            alert('코멘트 저장에 실패했습니다. 관리자에게 문의하세요.')
            return
          }
        }

        console.log('✅ Feedback saved successfully')
        alert('코멘트가 저장되었습니다.')
      }

      // 저장 후 다시 로드
      await loadExistingComment()

    } catch (error) {
      console.error('Error saving comment:', error)
      alert('코멘트 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSavingComment(false)
    }
  }

  // 선택한 팀원의 상세 정보 조회
  useEffect(() => {
    const fetchTargetUserInfo = async () => {
      if (!empno) return
      
      setIsLoadingUserInfo(true)
      try {
        // 사번 정규화 (95129 → 095129)
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
        console.log(`🔍 TeamMemberDetailDialog: Normalizing empno: ${empno} → ${normalizedEmpno}`)
        
        // a_hr_master 테이블에서 해당 empno의 정보 조회 (GRADNM 포함)
        const { data, error } = await supabase
          .from('a_hr_master')
          .select('EMPNO, EMPNM, ORG_NM, JOB_INFO_NM, GRADNM')
          .eq('EMPNO', normalizedEmpno)
          .maybeSingle()
        
        console.log(`🔍 TeamMemberDetailDialog: Query result for ${normalizedEmpno}:`, { data, error })
        
        if (error) {
          console.error('Error fetching target user info:', error)
        } else {
          setTargetUserInfo(data)
        }
      } catch (error) {
        console.error('Error fetching target user info:', error)
      } finally {
        setIsLoadingUserInfo(false)
      }
    }

    fetchTargetUserInfo()
    loadExistingComment()
  }, [empno])

  if (!memberData) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden">
        <DialogHeader>
                          <DialogTitle className="text-xl font-bold">작성내역</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-12 gap-4 h-[calc(90vh-100px)]">
          {/* 왼쪽 영역: 기존 팀원 상세 정보 */}
          <div className="col-span-8 overflow-y-auto space-y-6">
            {/* Enhanced Profile Section */}
            <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left: Profile Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-28 w-28">
                        <AvatarImage 
                          src={targetUserInfo?.PHOTO_URL || memberData.profileImage || "/placeholder-user.jpg"} 
                          alt={memberData.name}
                        />
                        <AvatarFallback className="text-xl">
                          {memberData.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{memberData.name}</h2>
                      <p className="text-xl text-muted-foreground">{targetUserInfo?.GRADNM || memberData.position}</p>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-orange-600" />
                      <span className="text-base text-muted-foreground">소속:</span>
                      <span className="text-base font-medium">{targetUserInfo?.ORG_NM || memberData.department || "정보 없음"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-orange-600" />
                      <span className="text-base text-muted-foreground">보직(HC):</span>
                      <span className="text-base font-medium">{targetUserInfo?.JOB_INFO_NM || "정보 없음"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-orange-600" />
                      <span className="text-base text-muted-foreground">산업전문화:</span>
                      <span className="text-base font-medium">{targetUserInfo?.INDUSTRY_SPEC || memberData.specialization || "TMT/Bio"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-orange-600" />
                      <span className="text-base text-muted-foreground">TF & Council:</span>
                      <span className="text-base font-medium">{targetUserInfo?.TF_COUNCIL || memberData.tfCouncil || "PI, Digital"}</span>
                    </div>
                  </div>

                  {/* GSP and Focus 30 Indicators */}
                  <div className="flex gap-4 pt-4">
                    {targetUserInfo?.GSP_YN === 'Y' && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-base font-medium text-orange-600">GSP</span>
                        <span className="text-base text-muted-foreground">Global Strategic Projects</span>
                      </div>
                    )}
                    {targetUserInfo?.FOCUS_30_YN === 'Y' && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                        <span className="text-base font-medium text-pink-600">Focus 30</span>
                        <span className="text-base text-muted-foreground">2025년 선정</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Spider Chart */}
                <div className="lg:w-80 flex justify-center items-center">
                  <PerformanceRadarChart empno={empno} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="business" className="text-sm sm:text-base">
                Business
              </TabsTrigger>
              <TabsTrigger value="people" className="text-sm sm:text-base">
                People
              </TabsTrigger>
              <TabsTrigger value="collaboration" className="text-sm sm:text-base">
                Collaboration
              </TabsTrigger>
              <TabsTrigger value="quality" className="text-sm sm:text-base">
                Quality
              </TabsTrigger>
              <TabsTrigger value="industry" className="text-sm sm:text-base">
                Industry & TL
              </TabsTrigger>
            </TabsList>

            {/* Business Tab */}
            <TabsContent value="business" className="mt-4">
              <Tabs value={activeSubTabs.business} onValueChange={(value) => handleSubTabChange("business", value)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="plan">Plan</TabsTrigger>
                  <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
                  <TabsTrigger value="self-assessment">Self Assessment</TabsTrigger>
                </TabsList>
                <TabsContent value="plan" className="mt-4">
                  <BusinessPlanTab empno={empno} readOnly={true} />
                </TabsContent>
                <TabsContent value="monitoring" className="mt-4">
                  <BusinessMonitoringTab empno={empno} readOnly={true} />
                </TabsContent>
                <TabsContent value="self-assessment" className="mt-4">
                  <BusinessSelfAssessmentTab empno={empno} readOnly={true} />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* People Tab */}
            <TabsContent value="people" className="mt-4">
              <Tabs value={activeSubTabs.people} onValueChange={(value) => handleSubTabChange("people", value)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="plan">Plan</TabsTrigger>
                  <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
                  <TabsTrigger value="self-assessment">Self Assessment</TabsTrigger>
                </TabsList>
                <TabsContent value="plan" className="mt-4">
                  <PlanAssessmentTab empno={empno} readOnly={true} />
                </TabsContent>
                <TabsContent value="monitoring" className="mt-4">
                  <ResultsTab empno={empno} readOnly={true} />
                </TabsContent>
                <TabsContent value="self-assessment" className="mt-4">
                  <SelfAssessmentTab empno={empno} readOnly={true} />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Collaboration Tab */}
            <TabsContent value="collaboration" className="mt-4">
              <Tabs value={activeSubTabs.collaboration} onValueChange={(value) => handleSubTabChange("collaboration", value)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="plan">Plan</TabsTrigger>
                  <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
                  <TabsTrigger value="self-assessment">Self Assessment</TabsTrigger>
                </TabsList>
                <TabsContent value="plan" className="mt-4">
                  <CollaborationPlanTab empno={empno} readOnly={true} />
                </TabsContent>
                <TabsContent value="monitoring" className="mt-4">
                  <CollaborationMonitoringTab empno={empno} readOnly={true} />
                </TabsContent>
                <TabsContent value="self-assessment" className="mt-4">
                  <CollaborationSelfAssessmentTab empno={empno} readOnly={true} />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Quality Tab */}
            <TabsContent value="quality" className="mt-4">
              <Tabs value={activeSubTabs.quality} onValueChange={(value) => handleSubTabChange("quality", value)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="plan">Plan</TabsTrigger>
                  <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
                  <TabsTrigger value="self-assessment">Self Assessment</TabsTrigger>
                </TabsList>
                <TabsContent value="plan" className="mt-4">
                  <ExpertisePlanTab empno={empno} readOnly={true} />
                </TabsContent>
                <TabsContent value="monitoring" className="mt-4">
                  <ExpertiseMonitoringTab empno={empno} readOnly={true} />
                </TabsContent>
                <TabsContent value="self-assessment" className="mt-4">
                  <QualitySelfAssessmentTab empno={empno} readOnly={true} />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Industry & TL Tab */}
            <TabsContent value="industry" className="mt-4">
              <Tabs value={activeSubTabs.industry} onValueChange={(value) => handleSubTabChange("industry", value)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="plan">Plan</TabsTrigger>
                  <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
                  <TabsTrigger value="self-assessment">Self Assessment</TabsTrigger>
                </TabsList>
                <TabsContent value="plan" className="mt-4">
                  <IndustryPlanTab empno={empno} readOnly={true} />
                </TabsContent>
                <TabsContent value="monitoring" className="mt-4">
                  <IndustryMonitoringTab empno={empno} readOnly={true} />
                </TabsContent>
                <TabsContent value="self-assessment" className="mt-4">
                  <IndustrySelfAssessmentTab empno={empno} readOnly={true} />
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
          </div>

          {/* 오른쪽 영역: 평가 코멘트 작성 */}
          <div className="col-span-4 border-l pl-4 space-y-4 overflow-y-auto">
            <div className="sticky top-0 bg-background pb-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Star className="h-6 w-6 text-orange-500" />
                평가 코멘트
              </h3>
              <p className="text-base text-muted-foreground">
                {memberData?.name}님에 대한 평가를 작성해주세요
              </p>
            </div>

            {isLoadingComment ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                <span className="ml-2 text-sm text-muted-foreground">로딩 중...</span>
              </div>
            ) : (
              <div className="space-y-4">
                                 {/* 평가자 정보 */}
                 {currentReviewer && (
                   <Card>
                     <CardContent className="p-4">
                       <div className="flex items-center gap-3">
                         <Avatar className="h-12 w-12">
                           {currentReviewer.photo_url ? (
                             <AvatarImage 
                               src={currentReviewer.photo_url} 
                               alt={`${currentReviewer.EMPNM} Profile`}
                               className="object-cover"
                             />
                           ) : (
                             <AvatarFallback>{currentReviewer.EMPNM?.charAt(0)}</AvatarFallback>
                           )}
                         </Avatar>
                         <div>
                           <p className="text-base font-medium">{currentReviewer.EMPNM}</p>
                           <p className="text-base text-muted-foreground">{currentReviewer.GRADNM}</p>
                         </div>
                       </div>
                     </CardContent>
                   </Card>
                 )}

                {/* 코멘트 작성 영역 */}
                <div className="space-y-3">
                  <label htmlFor="reviewComment" className="text-base font-medium">
                    평가 코멘트 {existingFeedback ? "(수정)" : "(새 작성)"}
                  </label>
                  <Textarea
                    id="reviewComment"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="팀원에 대한 평가를 구체적으로 작성해주세요..."
                    className="min-h-[200px] resize-none text-base"
                  />
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>{reviewComment.length}/2000자</span>
                    {existingFeedback && (
                      <span>
                        마지막 수정: {new Date(existingFeedback.updated_at).toLocaleDateString('ko-KR')}
                      </span>
                    )}
                  </div>
                </div>

                {/* 저장 버튼 */}
                <Button 
                  onClick={saveComment}
                  disabled={isSavingComment || !reviewComment.trim()}
                  className="w-full text-base"
                >
                  {isSavingComment ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Star className="h-5 w-5 mr-2" />
                      {existingFeedback ? "코멘트 수정" : "코멘트 저장"}
                    </>
                  )}
                </Button>

                {/* 기존 코멘트 미리보기 */}
                {existingFeedback && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">현재 저장된 코멘트</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-base whitespace-pre-line">{existingFeedback.comment}</p>
                      <div className="mt-2 text-sm text-muted-foreground">
                        작성일: {new Date(existingFeedback.created_at).toLocaleDateString('ko-KR')}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 