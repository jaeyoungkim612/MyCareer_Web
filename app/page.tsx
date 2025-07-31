"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs"
import { PerformanceRadarChart } from "@/components/dashboard/performance-radar-chart"
import { LayoutDashboard, RadarIcon, ListChecks, Bell, MessageSquare, RefreshCw, User, Users, Search, Filter, Eye } from "lucide-react"
import Image from "next/image"
import { useState, useEffect } from "react"
import type { UserMasterInfo } from "@/data/user-info"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AuthService } from "@/lib/auth-service"
import { UserInfoMapper } from "@/data/user-info"
import { ReviewerService, type UserRole } from "@/lib/reviewer-service"
import { PerformanceScoresService, type PerformanceScore } from "@/lib/performance-scores-service"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TeamMemberDetailDialog } from "@/components/team-member-detail-dialog"

export default function Intro() {
  const [userInfo, setUserInfo] = useState<UserMasterInfo | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentEmpno, setCurrentEmpno] = useState<string>("")
  const [teamMemberInfo, setTeamMemberInfo] = useState<Map<string, UserMasterInfo>>(new Map())
  const [teamPlanAssessmentStatus, setTeamPlanAssessmentStatus] = useState<Map<string, TeamMemberStatus>>(new Map())
  const [activeMainTab, setActiveMainTab] = useState("my-evaluation")
  
  // 검색/필터 상태
  const [searchTerm, setSearchTerm] = useState("")
  const [teamFilter, setTeamFilter] = useState("all")
  
  // 상세보기 모달 상태
  const [selectedMember, setSelectedMember] = useState<{
    empno: string
    name: string
    info: UserMasterInfo | null
    status: TeamMemberStatus | null
  } | null>(null)

  // 팀원 Plan과 Self Assessment 상태 타입 정의
  interface PlanStatus {
    business: 'Draft' | '작성중' | '완료' | null
    people: 'Draft' | '작성중' | '완료' | null
    collaboration: 'Draft' | '작성중' | '완료' | null
    quality: 'Draft' | '작성중' | '완료' | null
    industry: 'Draft' | '작성중' | '완료' | null
  }

  interface SelfAssessmentStatus {
    business_mid: 'Draft' | '작성중' | '완료' | null
    business_final: 'Draft' | '작성중' | '완료' | null
    people_mid: 'Draft' | '작성중' | '완료' | null
    people_final: 'Draft' | '작성중' | '완료' | null
    collaboration_mid: 'Draft' | '작성중' | '완료' | null
    collaboration_final: 'Draft' | '작성중' | '완료' | null
    quality_mid: 'Draft' | '작성중' | '완료' | null
    quality_final: 'Draft' | '작성중' | '완료' | null
    industry_mid: 'Draft' | '작성중' | '완료' | null
    industry_final: 'Draft' | '작성중' | '완료' | null
  }

  interface TeamMemberStatus {
    empno: string
    planStatus: PlanStatus
    selfAssessmentStatus: SelfAssessmentStatus
    lastUpdated: string | null
  }

  // 팀원들의 Plan과 Self Assessment 상태 로드
  const loadTeamPlanAssessmentStatus = async (reviewees: any[]) => {
    console.log("🔍 Loading plan and assessment status for", reviewees.length, "team members")
    const statusMap = new Map<string, TeamMemberStatus>()
    
    for (const reviewee of reviewees) {
      try {
        const empno = reviewee.사번
        console.log(`📋 Loading status for ${reviewee.성명} (${empno})`)
        
        // Plan Status 조회
        const [businessPlan, peoplePlan, collaborationPlan, qualityPlan, industryPlan] = await Promise.all([
          supabase.from('business_goals').select('status, updated_at').eq('employee_id', empno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('people_goals').select('status, updated_at').eq('employee_id', empno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('collaborations').select('status, updated_at').eq('employee_id', empno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('quality_non_audit_performance').select('status, updated_at').eq('employee_id', empno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('industry_tl_planning').select('status, updated_at').eq('employee_id', empno).order('created_at', { ascending: false }).limit(1).maybeSingle()
        ])

        // Self Assessment Status 조회
        const [businessMid, businessFinal, peopleMid, peopleFinal, collaborationMid, collaborationFinal, qualityMid, qualityFinal, industryMid, industryFinal] = await Promise.all([
          supabase.from('business_mid_assessments').select('status, updated_at').eq('empno', empno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('business_final_assessments').select('status, updated_at').eq('empno', empno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('people_mid_assessments').select('status, updated_at').eq('empno', empno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('people_final_assessments').select('status, updated_at').eq('empno', empno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('collaboration_mid_assessments').select('status, updated_at').eq('empno', empno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('collaboration_final_assessments').select('status, updated_at').eq('empno', empno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('quality_mid_assessments').select('status, updated_at').eq('empno', empno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('quality_final_assessments').select('status, updated_at').eq('empno', empno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('industry_tl_mid_assessments').select('status, updated_at').eq('empno', empno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('industry_tl_final_assessments').select('status, updated_at').eq('empno', empno).order('created_at', { ascending: false }).limit(1).maybeSingle()
        ])

        const memberStatus: TeamMemberStatus = {
          empno,
          planStatus: {
            business: businessPlan.data?.status || null,
            people: peoplePlan.data?.status || null,
            collaboration: collaborationPlan.data?.status || null,
            quality: qualityPlan.data?.status || null,
            industry: industryPlan.data?.status || null
          },
          selfAssessmentStatus: {
            business_mid: businessMid.data?.status || null,
            business_final: businessFinal.data?.status || null,
            people_mid: peopleMid.data?.status || null,
            people_final: peopleFinal.data?.status || null,
            collaboration_mid: collaborationMid.data?.status || null,
            collaboration_final: collaborationFinal.data?.status || null,
            quality_mid: qualityMid.data?.status || null,
            quality_final: qualityFinal.data?.status || null,
            industry_mid: industryMid.data?.status || null,
            industry_final: industryFinal.data?.status || null
          },
          lastUpdated: [
            businessPlan.data?.updated_at,
            peoplePlan.data?.updated_at,
            collaborationPlan.data?.updated_at,
            qualityPlan.data?.updated_at,
            industryPlan.data?.updated_at
          ].filter(Boolean).sort().reverse()[0] || null
        }

        statusMap.set(empno, memberStatus)
        console.log(`✅ Status loaded for ${reviewee.성명}`)
      } catch (error) {
        console.log(`ℹ️ Status not available for ${reviewee.성명}:`, error)
      }
    }
    
    setTeamPlanAssessmentStatus(statusMap)
    console.log("✅ Team plan and assessment status loaded:", statusMap.size, "of", reviewees.length, "members")
  }

  // 팀원들의 프로필 정보 로드 (캐시 덮어쓰기 방지를 위해 직접 DB 조회)
  const loadTeamMemberInfo = async (reviewees: any[]) => {
    console.log("🔍 Loading profile info for", reviewees.length, "team members (direct DB query)")
    const infoMap = new Map<string, UserMasterInfo>()
    
    for (const reviewee of reviewees) {
      try {
        // UserInfoMapper 대신 직접 DB 조회로 캐시 오염 방지
        const { data: hrData } = await supabase
          .from("a_hr_master")
          .select("*")
          .eq("EMPNO", reviewee.사번)
          .single()

        if (hrData) {
          // 사진 정보 조회
          const { data: photoData } = await supabase
            .from("employee_photos")
            .select("photo_url")
            .eq("empno", reviewee.사번)
            .single()

          const memberInfo: UserMasterInfo = {
            empno: hrData.EMPNO,
            empnm: hrData.EMPNM,
            org_nm: hrData.ORG_NM,
            job_info_nm: hrData.JOB_INFO_NM,
            gradnm: hrData.GRADNM,
            photo_url: photoData?.photo_url,
            pwc_id: hrData.PWC_ID,
          }

          infoMap.set(reviewee.사번, memberInfo)
          console.log("✅ Profile info loaded for", reviewee.성명, "without cache pollution")
        } else {
          console.log("ℹ️ No HR data found for", reviewee.성명)
        }
      } catch (error) {
        console.log("ℹ️ Profile info not available for", reviewee.성명, ":", error)
      }
    }
    
    setTeamMemberInfo(infoMap)
    console.log("✅ Team member info loaded:", infoMap.size, "of", reviewees.length, "members (cache safe)")
  }

  // 사용자 정보 및 리뷰어 역할 로드
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        // 현재 로그인된 사용자의 사번 가져오기
        const currentUser = AuthService.getCurrentUser()
        if (currentUser?.empno) {
          setCurrentEmpno(currentUser.empno)
          console.log("🔍 Loading user info for empno:", currentUser.empno)
          
          // 병렬로 정보 로드
          const [info, role] = await Promise.all([
            UserInfoMapper.loadUserInfo(currentUser.empno),
            ReviewerService.getUserRole(currentUser.empno)
          ])
          
          setUserInfo(info)
          setUserRole(role)
          
          console.log("✅ User info and role loaded:", {
            userName: info?.empnm,
            isSelf: role.isSelf,
            isReviewer: role.isReviewer,
            revieweesCount: role.reviewees.length
          })

          // 리뷰어 권한이 있으면 팀원들의 상태와 프로필 정보 로드
          if (role.isReviewer && role.reviewees.length > 0) {
            await Promise.all([
              loadTeamPlanAssessmentStatus(role.reviewees),
              loadTeamMemberInfo(role.reviewees)
            ])
          }

          // 현재 사용자에 대한 평가 피드백 로드
          await loadReviewerFeedback(currentUser.empno)
        } else {
          console.error("로그인된 사용자 정보가 없습니다.")
        }
      } catch (error) {
        console.error("사용자 정보 로드 실패:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserInfo()
  }, [])

  // 수동 갱신 함수
  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      // 현재 로그인된 사용자의 사번으로 갱신
      const currentUser = AuthService.getCurrentUser()
      if (currentUser?.empno) {
        console.log("🔄 Refreshing user info for empno:", currentUser.empno)
        const refreshedInfo = await UserInfoMapper.loadUserInfo(currentUser.empno)
        setUserInfo(refreshedInfo)
      } else {
        console.error("로그인된 사용자 정보가 없습니다.")
      }
    } catch (error) {
      console.error("사용자 정보 갱신 실패:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Reviewer Feedback 상태 (실제 DB에서 로드)
  const [reviewerFeedback, setReviewerFeedback] = useState<Array<{
    id: number
    name: string
    role: string
    avatar: string | null
    date: string
    comment: string
  }>>([])
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false)

  // 현재 사용자에 대한 평가 피드백 로드
  const loadReviewerFeedback = async (empno: string) => {
    setIsLoadingFeedback(true)
    try {
      console.log("🔍 Loading reviewer feedback for empno:", empno)
      
      // 현재 사용자가 평가받은 피드백들을 조회 (RPC 함수 사용)
      const { data: feedbackData, error } = await supabase
        .rpc('get_user_received_feedback', { p_empno: empno })

      if (error) {
        console.error('Error loading reviewer feedback:', error)
        return
      }

      if (!feedbackData || !Array.isArray(feedbackData) || feedbackData.length === 0) {
        console.log("ℹ️ No reviewer feedback found")
        setReviewerFeedback([])
        return
      }

      // 각 피드백의 평가자 사진을 가져오기
      const feedbackWithPhotos = await Promise.all(
        feedbackData.map(async (feedback: any) => {
          try {
            // 평가자의 사진 조회
            const { data: photoData } = await supabase
              .from("employee_photos")
              .select("photo_url")
              .eq("empno", feedback.reviewer_empno)
              .single()

            return {
              id: feedback.id,
              name: feedback.reviewer_name,
              role: feedback.reviewer_grade,
              avatar: photoData?.photo_url || null,
              date: new Date(feedback.created_at).toLocaleDateString('ko-KR'),
              comment: feedback.comment
            }
          } catch (error) {
            console.log(`ℹ️ Photo not found for reviewer ${feedback.reviewer_name}`)
            return {
              id: feedback.id,
              name: feedback.reviewer_name,
              role: feedback.reviewer_grade,
              avatar: null,
              date: new Date(feedback.created_at).toLocaleDateString('ko-KR'),
              comment: feedback.comment
            }
          }
        })
      )

      setReviewerFeedback(feedbackWithPhotos)
      console.log("✅ Reviewer feedback loaded:", feedbackWithPhotos.length, "items")
      
    } catch (error) {
      console.error("Error loading reviewer feedback:", error)
    } finally {
      setIsLoadingFeedback(false)
    }
  }

  // 검색/필터 로직
  const filteredReviewees = userRole?.reviewees.filter((reviewee) => {
    const matchesSearch = reviewee.성명.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reviewee.사번.includes(searchTerm)
    const matchesTeam = teamFilter === "all" || reviewee['FY26 팀명'] === teamFilter
    return matchesSearch && matchesTeam
  }) || []

  // 유니크한 팀 목록 생성
  const uniqueTeams = Array.from(new Set(userRole?.reviewees.map(r => r['FY26 팀명']) || []))

  // Status badge 렌더링 함수
  const renderStatusBadge = (status: 'Draft' | '작성중' | '완료' | null | undefined, isSmall = false) => {
    if (!status) {
      return <Badge variant="outline" className={`${isSmall ? 'text-sm' : 'text-base'} bg-gray-100 text-gray-500`}>미작성</Badge>
    }
    
    switch (status) {
      case '완료':
        return <Badge className={`${isSmall ? 'text-sm' : 'text-base'} bg-green-500 text-white`}>완료</Badge>
      case '작성중':
        return <Badge className={`${isSmall ? 'text-sm' : 'text-base'} bg-orange-500 text-white`}>작성중</Badge>
      case 'Draft':
        return <Badge className={`${isSmall ? 'text-sm' : 'text-base'} bg-gray-400 text-white`}>Draft</Badge>
      default:
        return <Badge variant="outline" className={`${isSmall ? 'text-sm' : 'text-base'} bg-gray-100 text-gray-500`}>미작성</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center space-x-2">
          <LayoutDashboard className="h-5 w-5 text-orange-500" />
          <p className="text-sm font-medium">My Career+의 방문을 환영합니다.</p>
          {userRole && (
            <div className="flex items-center space-x-2 ml-4">
              {userRole.isSelf && (
                <Badge variant="outline" className="text-xs">
                  <User className="h-3 w-3 mr-1" />
                  내 평가
                </Badge>
              )}
              {userRole.isReviewer && (
                <Badge variant="outline" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  평가 대상자 ({userRole.reviewees.length}명)
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="사용자 정보 새로고침"
          >
            <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Bell className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-orange-500 transition-colors" />
        </div>
      </div>

      {/* 메인 탭 */}
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-4">
        <TabsList className={`grid w-full ${userRole?.isReviewer ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <TabsTrigger value="my-evaluation" className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            내 평가
          </TabsTrigger>
          {userRole?.isReviewer && (
            <TabsTrigger value="team-evaluation" className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              평가 대상자 ({userRole.reviewees.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* 내 평가 탭 */}
        <TabsContent value="my-evaluation" className="space-y-6">

      {/* 사용자 프로필 및 종합 점수 섹션 */}
      <Card className="border-t-4 border-t-gray-700">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 왼쪽: 사용자 정보 */}
            <div className="space-y-4">
              <div className="flex space-x-6">
                <div className="relative h-28 w-28 flex-shrink-0">
                  <Image
                    src={userInfo?.photo_url || "/placeholder-user.jpg"}
                    alt="Profile"
                    className="rounded-full object-cover border-4 border-orange-500 shadow-lg"
                    fill
                  />
                  <div className="absolute -bottom-1 -right-1 h-8 w-8 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                    <div className="h-3 w-3 bg-white rounded-full"></div>
                  </div>
                </div>
                <div className="space-y-3 flex-1 ml-2">
                  <div>
                    <h2 className="text-2xl font-bold">{userInfo?.empnm}</h2>
                    <p className="text-muted-foreground text-lg">{userInfo?.gradnm}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <p className="text-sm text-muted-foreground">{userInfo?.org_nm}</p>
                    <p className="text-sm text-muted-foreground">{userInfo?.job_info_nm}</p>
                  </div>
                </div>
              </div>

              <div className="border border-border bg-card rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-6">
                  {/* 왼쪽 컬럼: 기존 정보 */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                      <div>
                        <span className="text-sm font-medium text-foreground">소속</span>
                        <p className="text-sm text-muted-foreground">{userInfo?.org_nm}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <span className="text-sm font-medium text-foreground">보직(HC)</span>
                        <p className="text-sm text-muted-foreground">{userInfo?.job_info_nm}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <div>
                        <span className="text-sm font-medium text-foreground">산업전문화</span>
                        <p className="text-sm text-muted-foreground">{userInfo?.industry_specialization || "정보 없음"}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                      <div>
                        <span className="text-sm font-medium text-foreground">TF & Council</span>
                        <p className="text-sm text-muted-foreground">{userInfo?.council_tf || "정보 없음"}</p>
                      </div>
                    </div>
                  </div>
                  {/* 오른쪽 컬럼: GSP, Forcus 30 */}
                  <div className="space-y-4 flex flex-col justify-start">
                    <div className="flex flex-col items-start">
                      <div className="flex items-center space-x-1">
                        <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-xs font-bold">GSP</span>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">Global Strategic Projects</span>
                    </div>
                    <div className="flex flex-col items-start">
                      <div className="flex items-center space-x-1">
                        <div className="h-2 w-2 bg-pink-500 rounded-full"></div>
                        <span className="text-xs font-bold">Forcus 30</span>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">2025년 선정</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 오른쪽: Spider Web Chart */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <RadarIcon className="mr-2 h-5 w-5 text-orange-600" />
                자기평가점수 Spider Web
              </h3>
              <div className="bg-white p-4 rounded-md h-full min-h-[360px] flex justify-center items-center">
                <div className="w-[280px] h-[280px] flex items-center justify-center">
                  <PerformanceRadarChart />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviewer Feedback Card */}
      <Card className="w-full overflow-hidden border-t-4 border-t-gray-700 flex flex-col justify-center">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5 text-orange-600" />
            <span className="text-lg font-bold">평가결과</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reviewerFeedback.map((feedback) => (
              <div key={feedback.id} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    {feedback.avatar ? (
                      <Image
                        src={feedback.avatar}
                        alt={`${feedback.name} Profile`}
                        className="rounded-full object-cover"
                        width={32}
                        height={32}
                      />
                    ) : (
                      <AvatarFallback>{feedback.name.charAt(0)}</AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{feedback.name}</p>
                        <p className="text-xs text-muted-foreground">{feedback.role}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{feedback.date}</p>
                    </div>
                    <p className="text-sm mt-2">{feedback.comment}</p>
                  </div>
                </div>
              </div>
            ))}
            {isLoadingFeedback && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                <span className="ml-2 text-sm text-muted-foreground">평가 결과를 불러오는 중...</span>
              </div>
            )}
            {!isLoadingFeedback && reviewerFeedback.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>아직 평가 결과가 없습니다.</p>
                <p className="text-sm mt-1">평가자가 피드백을 남기면 여기에 표시됩니다.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

          {/* Detailed metrics tabs */}
          <div className="mt-6">
            <Card className="overflow-hidden border-t-4 border-t-gray-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center space-x-2">
                  <ListChecks className="h-4 w-4 text-orange-500" />
                  <CardTitle className="text-lg font-bold">항목별 Performance Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <DashboardTabs />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 팀원 평가 탭 */}
        {userRole?.isReviewer && (
          <TabsContent value="team-evaluation" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  평가 대상자 현황
                </CardTitle>
                
                {/* 검색 및 필터 */}
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="이름 또는 사번으로 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={teamFilter} onValueChange={setTeamFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="팀 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ALL</SelectItem>
                      {uniqueTeams.map((team) => (
                        <SelectItem key={team} value={team}>
                          {team}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {filteredReviewees.map((reviewee, index) => {
                    const memberStatus = teamPlanAssessmentStatus.get(reviewee.사번)
                    const memberInfo = teamMemberInfo.get(reviewee.사번)
                    
                    // Status badge 렌더링 함수
                    const renderStatusBadge = (status: 'Draft' | '작성중' | '완료' | null | undefined, isSmall = false) => {
                      if (!status) {
                        return <Badge variant="outline" className={`${isSmall ? 'text-sm' : 'text-base'} bg-gray-100 text-gray-500`}>미작성</Badge>
                      }
                      
                      switch (status) {
                        case '완료':
                          return <Badge className={`${isSmall ? 'text-sm' : 'text-base'} bg-green-500 text-white`}>완료</Badge>
                        case '작성중':
                          return <Badge className={`${isSmall ? 'text-sm' : 'text-base'} bg-orange-500 text-white`}>작성중</Badge>
                        case 'Draft':
                          return <Badge className={`${isSmall ? 'text-sm' : 'text-base'} bg-gray-400 text-white`}>Draft</Badge>
                        default:
                          return <Badge variant="outline" className={`${isSmall ? 'text-sm' : 'text-base'} bg-gray-100 text-gray-500`}>미작성</Badge>
                      }
                    }
                    
                    // 완료율 계산
                    const planStatuses = memberStatus ? Object.values(memberStatus.planStatus) : []
                    const completedPlans = planStatuses.filter(status => status === '완료').length
                    const totalPlans = 5
                    const planCompletionRate = Math.round((completedPlans / totalPlans) * 100)
                    
                    // Self Assessment 중간 진행률 계산
                    const midAssessmentStatuses = memberStatus ? [
                      memberStatus.selfAssessmentStatus.business_mid,
                      memberStatus.selfAssessmentStatus.people_mid,
                      memberStatus.selfAssessmentStatus.collaboration_mid,
                      memberStatus.selfAssessmentStatus.quality_mid,
                      memberStatus.selfAssessmentStatus.industry_mid
                    ] : []
                    const completedMidAssessments = midAssessmentStatuses.filter(status => status === '완료').length
                    const midAssessmentCompletionRate = Math.round((completedMidAssessments / 5) * 100)
                    
                    // Self Assessment 기말 진행률 계산
                    const finalAssessmentStatuses = memberStatus ? [
                      memberStatus.selfAssessmentStatus.business_final,
                      memberStatus.selfAssessmentStatus.people_final,
                      memberStatus.selfAssessmentStatus.collaboration_final,
                      memberStatus.selfAssessmentStatus.quality_final,
                      memberStatus.selfAssessmentStatus.industry_final
                    ] : []
                    const completedFinalAssessments = finalAssessmentStatuses.filter(status => status === '완료').length
                    const finalAssessmentCompletionRate = Math.round((completedFinalAssessments / 5) * 100)
                    
                    return (
                      <Card key={reviewee.사번} className="border-l-4 border-l-blue-200">
                        <CardContent className="p-6">
                          {/* 헤더 */}
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="relative w-12 h-12 flex-shrink-0">
                                {memberInfo?.photo_url ? (
                                  <Image
                                    src={memberInfo.photo_url}
                                    alt={`${reviewee.성명} Profile`}
                                    className="rounded-full object-cover border-2 border-blue-300"
                                    fill
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                                    {reviewee.성명.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div>
                                <h3 className="font-medium text-xl">{reviewee.성명}</h3>
                                <p className="text-base text-muted-foreground">
                                  사번: {reviewee.사번} • 소속: {reviewee['FY26 팀명']}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              {/* 작성내역 버튼 - 상단으로 이동 */}
                              <Button 
                                variant="outline" 
                                size="lg" // size="sm" → size="lg"
                                onClick={() => setSelectedMember({
                                  empno: reviewee.사번,
                                  name: reviewee.성명,
                                  info: memberInfo || null,
                                  status: memberStatus || null
                                })}
                                className="text-base" // 글씨 크기 추가
                              >
                                <Eye className="h-5 w-5 mr-2" /> {/* h-4 w-4 mr-1 → h-5 w-5 mr-2 */}
                                작성내역
                              </Button>
                            </div>
                          </div>

                          {/* 3개 진행률 바 */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            {/* Plan 진행률 */}
                            <div>
                              <div className="flex justify-between text-sm text-muted-foreground mb-1"> {/* text-xs → text-sm */}
                                <span>Plan 완료</span>
                                <span>{planCompletionRate}%</span>
                              </div>
                              <Progress value={planCompletionRate} className="h-2" />
                            </div>
                            
                            {/* 중간 Self Assessment 진행률 */}
                            <div>
                              <div className="flex justify-between text-sm text-muted-foreground mb-1"> {/* text-xs → text-sm */}
                                <span>중간 자기평가</span>
                                <span>{midAssessmentCompletionRate}%</span>
                              </div>
                              <Progress value={midAssessmentCompletionRate} className="h-2" />
                            </div>
                            
                            {/* 기말 Self Assessment 진행률 */}
                            <div>
                              <div className="flex justify-between text-sm text-muted-foreground mb-1"> {/* text-xs → text-sm */}
                                <span>기말 자기평가</span>
                                <span>{finalAssessmentCompletionRate}%</span>
                              </div>
                              <Progress value={finalAssessmentCompletionRate} className="h-2" />
                            </div>
                          </div>

                          {/* Plan Status */}
                          <div className="mb-4">
                            <h4 className="text-base font-medium mb-3">📋 Plan Status</h4> {/* text-sm → text-base */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                              <div className="text-center p-3 rounded bg-orange-50">
                                <div className="text-sm text-muted-foreground mb-1">Business</div> {/* text-xs → text-sm */}
                                {renderStatusBadge(memberStatus?.planStatus.business, true)}
                                </div>
                                <div className="text-center p-3 rounded bg-blue-50">
                                  <div className="text-sm text-muted-foreground mb-1">People</div> {/* text-xs → text-sm */}
                                  {renderStatusBadge(memberStatus?.planStatus.people, true)}
                                </div>
                                <div className="text-center p-3 rounded bg-green-50">
                                  <div className="text-sm text-muted-foreground mb-1">Collaboration</div> {/* text-xs → text-sm */}
                                  {renderStatusBadge(memberStatus?.planStatus.collaboration, true)}
                                </div>
                                <div className="text-center p-3 rounded bg-purple-50">
                                  <div className="text-sm text-muted-foreground mb-1">Quality</div> {/* text-xs → text-sm */}
                                  {renderStatusBadge(memberStatus?.planStatus.quality, true)}
                                </div>
                                <div className="text-center p-3 rounded bg-indigo-50">
                                  <div className="text-sm text-muted-foreground mb-1">Industry</div> {/* text-xs → text-sm */}
                                  {renderStatusBadge(memberStatus?.planStatus.industry, true)}
                              </div>
                            </div>
                          </div>

                          {/* Self Assessment Status */}
                          <div className="mb-4">
                            <h4 className="text-base font-medium mb-3">📝 Self Assessment Status</h4> {/* text-sm → text-base */}
                            <div className="space-y-2">
                              <div className="grid grid-cols-5 gap-2">
                                <div className="text-center p-2 rounded bg-orange-50">
                                  <div className="text-sm text-muted-foreground mb-1">Business</div> {/* text-xs → text-sm */}
                                  <div className="space-y-1">
                                    <div className="text-sm">중간</div> {/* text-xs → text-sm */}
                                     {renderStatusBadge(memberStatus?.selfAssessmentStatus.business_mid, true)}
                                     <div className="text-sm">기말</div> {/* text-xs → text-sm */}
                                     {renderStatusBadge(memberStatus?.selfAssessmentStatus.business_final, true)}
                                   </div>
                                 </div>
                                 <div className="text-center p-2 rounded bg-blue-50">
                                   <div className="text-sm text-muted-foreground mb-1">People</div> {/* text-xs → text-sm */}
                                   <div className="space-y-1">
                                     <div className="text-sm">중간</div> {/* text-xs → text-sm */}
                                     {renderStatusBadge(memberStatus?.selfAssessmentStatus.people_mid, true)}
                                     <div className="text-sm">기말</div> {/* text-xs → text-sm */}
                                     {renderStatusBadge(memberStatus?.selfAssessmentStatus.people_final, true)}
                                   </div>
                                 </div>
                                 <div className="text-center p-2 rounded bg-green-50">
                                   <div className="text-sm text-muted-foreground mb-1">Collaboration</div> {/* text-xs → text-sm */}
                                   <div className="space-y-1">
                                     <div className="text-sm">중간</div> {/* text-xs → text-sm */}
                                     {renderStatusBadge(memberStatus?.selfAssessmentStatus.collaboration_mid, true)}
                                     <div className="text-sm">기말</div> {/* text-xs → text-sm */}
                                     {renderStatusBadge(memberStatus?.selfAssessmentStatus.collaboration_final, true)}
                                   </div>
                                 </div>
                                 <div className="text-center p-2 rounded bg-purple-50">
                                   <div className="text-sm text-muted-foreground mb-1">Quality</div> {/* text-xs → text-sm */}
                                   <div className="space-y-1">
                                     <div className="text-sm">중간</div> {/* text-xs → text-sm */}
                                     {renderStatusBadge(memberStatus?.selfAssessmentStatus.quality_mid, true)}
                                     <div className="text-sm">기말</div> {/* text-xs → text-sm */}
                                     {renderStatusBadge(memberStatus?.selfAssessmentStatus.quality_final, true)}
                                   </div>
                                 </div>
                                 <div className="text-center p-2 rounded bg-indigo-50">
                                   <div className="text-sm text-muted-foreground mb-1">Industry</div> {/* text-xs → text-sm */}
                                   <div className="space-y-1">
                                     <div className="text-sm">중간</div> {/* text-xs → text-sm */}
                                     {renderStatusBadge(memberStatus?.selfAssessmentStatus.industry_mid, true)}
                                     <div className="text-sm">기말</div> {/* text-xs → text-sm */}
                                     {renderStatusBadge(memberStatus?.selfAssessmentStatus.industry_final, true)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* 업데이트 정보 */}
                          <div className="mt-4 flex justify-between items-center">
                            <div className="text-sm text-muted-foreground"> {/* text-xs → text-sm */}
                              {memberStatus?.lastUpdated 
                                ? `최근 업데이트: ${new Date(memberStatus.lastUpdated).toLocaleDateString('ko-KR')}`
                                : ""
                              }
                            </div>
                            {/* 작성내역 버튼 제거 - 상단으로 이동했으므로 */}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                  
                  {filteredReviewees.length === 0 && userRole.reviewees.length > 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>검색 조건에 맞는 팀원이 없습니다.</p>
                      <p className="text-sm mt-2">다른 검색어나 필터를 시도해보세요.</p>
                    </div>
                  )}
                  
                  {userRole.reviewees.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>현재 리뷰 대상자가 없습니다.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* 팀원 상세보기 다이알로그 */}
      {selectedMember && (
        <TeamMemberDetailDialog
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          empno={selectedMember.empno}
          memberData={{
            name: selectedMember.name,
            employeeNumber: selectedMember.empno,
            team: selectedMember.info?.org_nm || "팀 정보 없음",
            position: selectedMember.info?.gradnm || "직책 정보 없음",
            profileImage: selectedMember.info?.photo_url,
            department: selectedMember.info?.org_nm,
            specialization: "TMT/Bio",
            tfCouncil: "PI, Digital",
            isGSP: true,
            isFocus30: true
          }}
        />
      )}
    </div>
  )
}
