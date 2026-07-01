"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs"
import { PerformanceRadarChart } from "@/components/dashboard/performance-radar-chart"
import { LayoutDashboard, RadarIcon, ListChecks, Bell, MessageSquare, RefreshCw, User, Users, Search, Filter, Eye, Edit, Save, X, HelpCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import type { UserMasterInfo } from "@/data/user-info"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AuthService } from "@/lib/auth-service"
import { UserInfoMapper } from "@/data/user-info"
import { ReviewerService, type UserRole } from "@/lib/reviewer-service"
import { PerformanceScoresService, type PerformanceScore } from "@/lib/performance-scores-service"
import { GSPService, type GSPData } from "@/lib/gsp-service"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TeamMemberDetailDialog } from "@/components/team-member-detail-dialog"
import { ApprovalPanel } from "@/components/approval/approval-panel"
import { RejectionNotification } from "@/components/rejection/rejection-notification"
import { useSettings } from "@/contexts/settings-context"

export default function Intro() {
  const { setIsReviewerDialogOpen } = useSettings()
  const [userInfo, setUserInfo] = useState<UserMasterInfo | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentEmpno, setCurrentEmpno] = useState<string>("")
  const [gspData, setGspData] = useState<GSPData | null>(null)
  const [teamMemberInfo, setTeamMemberInfo] = useState<Map<string, UserMasterInfo>>(new Map())
  const [teamPlanAssessmentStatus, setTeamPlanAssessmentStatus] = useState<Map<string, TeamMemberStatus>>(new Map())
  const [employeePhotos, setEmployeePhotos] = useState<Map<string, string>>(new Map()) // 직원 사진 캐시
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

  // 반려 상태 관리
  const [hasRejection, setHasRejection] = useState(false)

  // 스파이더맵 편집 상태 관리
  const [isEditingSpiderMap, setIsEditingSpiderMap] = useState(false)
  const [editingScores, setEditingScores] = useState({
    Business: { current: 0, target: 0 },
    People: { current: 0, target: 0 },
    Collaboration: { current: 0, target: 0 },
    Quality: { current: 0, target: 0 },
    'Industry & TL': { current: 0, target: 0 }
  })

  // 다이얼로그 열림 상태를 전역에 알림
  useEffect(() => {
    setIsReviewerDialogOpen(!!selectedMember)
  }, [selectedMember, setIsReviewerDialogOpen])

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

  // RPC row → TeamMemberStatus 변환 헬퍼
  const rpcRowToMemberStatus = (row: any, originalEmpno: string): TeamMemberStatus => ({
    empno: originalEmpno,
    planStatus: {
      business: row.business_plan_status || null,
      people: row.people_plan_status || null,
      collaboration: row.collaboration_plan_status || null,
      quality: row.quality_plan_status || null,
      industry: row.industry_plan_status || null,
    },
    selfAssessmentStatus: {
      business_mid: row.business_mid_status || null,
      business_final: row.business_final_status || null,
      people_mid: row.people_mid_status || null,
      people_final: row.people_final_status || null,
      collaboration_mid: row.collaboration_mid_status || null,
      collaboration_final: row.collaboration_final_status || null,
      quality_mid: row.quality_mid_status || null,
      quality_final: row.quality_final_status || null,
      industry_mid: row.industry_mid_status || null,
      industry_final: row.industry_final_status || null,
    },
    lastUpdated: row.last_updated || null,
  })

  // 팀원들의 Plan과 Self Assessment 상태 로드 (RPC 1회 호출)
  const loadTeamPlanAssessmentStatus = async (reviewees: any[]) => {
    console.log("🔍 Loading team status via RPC for", reviewees.length, "members")
    const statusMap = new Map<string, TeamMemberStatus>()

    if (reviewees.length === 0) {
      setTeamPlanAssessmentStatus(statusMap)
      return
    }

    try {
      const empnoIndex = new Map<string, string>() // normalized → original
      const empnoList: string[] = []
      for (const r of reviewees) {
        const original = r.사번
        const normalized = ReviewerService.normalizeEmpno(original)
        empnoIndex.set(normalized, original)
        empnoList.push(normalized)
      }

      const { data, error } = await supabase.rpc('get_team_assessment_status', {
        p_empno_list: empnoList,
      })

      if (error) {
        console.error("❌ get_team_assessment_status RPC failed:", error)
        setTeamPlanAssessmentStatus(statusMap)
        return
      }

      for (const row of (data || [])) {
        const original = empnoIndex.get(row.empno) ?? row.empno
        statusMap.set(original, rpcRowToMemberStatus(row, original))
      }

      setTeamPlanAssessmentStatus(statusMap)
      console.log(`✅ Team status loaded via RPC: ${statusMap.size} of ${reviewees.length} members`)
    } catch (error) {
      console.error("❌ loadTeamPlanAssessmentStatus error:", error)
      setTeamPlanAssessmentStatus(statusMap)
    }
  }

  // 🚀 개별 직원 정보 로딩 (지연 로딩용)
  const loadIndividualMemberInfo = async (empno: string, name: string): Promise<UserMasterInfo | null> => {
    try {
      console.log(`🔍 Loading individual info for ${name} (${empno})`)
      
      // 이미 캐시에 있으면 반환
      if (teamMemberInfo.has(empno)) {
        console.log(`✅ Using cached info for ${name}`)
        return teamMemberInfo.get(empno) || null
      }

      // HR 마스터 정보 조회 (사번 정규화 디버깅)
        console.log(`🔍 Original empno: "${empno}" (type: ${typeof empno}, length: ${empno.length})`)
        const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
        console.log(`🔍 Normalized empno: "${normalizedEmpno}" (type: ${typeof normalizedEmpno}, length: ${normalizedEmpno.length})`)
        
        // 먼저 해당 사번이 존재하는지 확인
        console.log(`🔍 About to query a_hr_master with EMPNO = "${normalizedEmpno}"`)
        const { data: testData, error: testError } = await supabase
          .from("a_hr_master")
          .select("EMPNO")
          .eq("EMPNO", normalizedEmpno)
          .limit(1)
        
        console.log(`📊 테스트 조회 결과:`, { 
          queried_empno: normalizedEmpno,
          testData, 
          testError,
          error_code: testError?.code,
          error_message: testError?.message,
          error_details: testError?.details
        })
        
        const { data: hrData, error: hrError } = await supabase
          .from("a_hr_master")
          .select("EMPNO, EMPNM, ORG_NM, JOB_INFO_NM, GRADNM")
        .eq("EMPNO", normalizedEmpno)
          .maybeSingle()
        
        console.log(`🔍 HR 데이터 조회 결과:`, { hrData, hrError })
        
        if (hrError) {
          console.error(`❌ HR 데이터 조회 에러 (${normalizedEmpno}):`, hrError)
        }

        if (hrData) {
        // 사진 정보는 캐시에서 가져오기 (이미 미리 로딩됨)
        const cachedPhotoUrl = employeePhotos.get(empno)

          const memberInfo: UserMasterInfo = {
            empno: hrData.EMPNO,
            empnm: hrData.EMPNM,
            org_nm: hrData.ORG_NM,
            job_info_nm: hrData.JOB_INFO_NM,
            gradnm: hrData.GRADNM,
            photo_url: cachedPhotoUrl,
            pwc_id: "",
          }

        // 캐시에 저장
        setTeamMemberInfo(prev => new Map(prev).set(empno, memberInfo))
        console.log(`✅ Individual info loaded and cached for ${name}`)
        return memberInfo
        } else {
        console.log(`ℹ️ No HR data found for ${name}`)
        return null
        }
      } catch (error) {
      console.log(`❌ Error loading info for ${name}:`, error)
      return null
    }
  }

  // 🚀 개별 직원 평가 상태 로딩 (지연 로딩용) - RPC 1회 호출
  const loadIndividualMemberStatus = async (empno: string, name: string): Promise<TeamMemberStatus | null> => {
    try {
      // 이미 캐시에 있으면 반환
      if (teamPlanAssessmentStatus.has(empno)) {
        return teamPlanAssessmentStatus.get(empno) || null
      }

      const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
      const { data, error } = await supabase.rpc('get_team_assessment_status', {
        p_empno_list: [normalizedEmpno],
      })

      if (error) {
        console.error(`❌ get_team_assessment_status (individual) failed for ${name}:`, error)
        return null
      }

      const row = (data || [])[0]
      if (!row) return null

      const memberStatus = rpcRowToMemberStatus(row, empno)
      setTeamPlanAssessmentStatus(prev => new Map(prev).set(empno, memberStatus))
      return memberStatus
    } catch (error) {
      console.error(`❌ Error loading status for ${name}:`, error)
      return null
    }
  }

  // 📷 직원들의 사진 정보만 배치 로딩 (UI 표시용)
  const loadEmployeePhotos = async (employees: any[]) => {
    try {
      const empnos = employees.map(emp => emp.사번).filter(Boolean)
      if (empnos.length === 0) return

      console.log(`📦 Batch loading HR + photos for ${empnos.length} employees`)

      // ⚡ HR 마스터 + 사진 한 번에 배치 로딩 → teamMemberInfo 캐시 사전 워밍업
      const memberMap = await UserInfoMapper.loadHrBatch(empnos)

      const photosMap = new Map<string, string>()
      memberMap.forEach((info, originalEmpno) => {
        if (info.photo_url) photosMap.set(originalEmpno, info.photo_url)
      })

      setEmployeePhotos(photosMap)
      setTeamMemberInfo(memberMap)
      console.log(`✅ Cache warmed: ${memberMap.size} HR records, ${photosMap.size} photos`)
    } catch (error) {
      console.error("❌ Error loading employee batch:", error)
    }
  }

  // 🚀 "작성내역 보기" 버튼 클릭 핸들러 (지연 로딩)
  const handleViewMemberDetails = async (empno: string, name: string) => {
    try {
      console.log(`🚀 Opening details for ${name} with lazy loading...`)
      
      // 로딩 상태 표시를 위해 일시적으로 로딩 상태로 설정
      setSelectedMember({
        empno,
        name,
        info: null,
        status: null
      })

      // 병렬로 정보와 상태 로딩
      const [memberInfo, memberStatus] = await Promise.all([
        loadIndividualMemberInfo(empno, name),
        loadIndividualMemberStatus(empno, name)
      ])

      // 로딩 완료 후 실제 데이터로 업데이트
      setSelectedMember({
        empno,
        name,
        info: memberInfo,
        status: memberStatus
      })

      console.log(`✅ Details opened for ${name} with lazy loaded data`)
    } catch (error) {
      console.error(`❌ Error opening details for ${name}:`, error)
      // 에러 발생 시 기본 상태로 설정
      setSelectedMember({
        empno,
        name,
        info: null,
        status: null
      })
    }
  }

  // 팀원 상태 새로고침 함수
  const refreshTeamStatus = async (reviewees: any[]) => {
    if (reviewees && reviewees.length > 0) {
      console.log("🔄 Refreshing team status...")
      await loadTeamPlanAssessmentStatus(reviewees)
    }
  }

  // userRole 로딩 완료 시 초기 팀원 상태 로딩
  useEffect(() => {
    if (userRole?.reviewees && userRole.reviewees.length > 0) {
      console.log("🚀 Initial team status loading after userRole loaded")
      refreshTeamStatus(userRole.reviewees)
    }
  }, [userRole])

  // 포커스 시 팀원 상태 새로고침
  useEffect(() => {
    const handleFocus = () => {
      if (userRole?.reviewees && userRole.reviewees.length > 0) {
        console.log("👁️ Page focused - refreshing team status")
        refreshTeamStatus(userRole.reviewees)
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [userRole?.reviewees])

  // GSP 데이터 변경 이벤트 리스너 추가
  useEffect(() => {
    const handleGSPDataChange = () => {
      console.log("🔄 GSP data change event received, refreshing...")
      if (currentEmpno) {
        loadGSPData(currentEmpno)
      }
    }

    window.addEventListener('gspDataChanged', handleGSPDataChange)
    
    return () => {
      window.removeEventListener('gspDataChanged', handleGSPDataChange)
    }
  }, [currentEmpno])

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
            empno: currentUser.empno,
            isSelf: role.isSelf,
            isReviewer: role.isReviewer,
            isMaster: role.isMaster,
            revieweesCount: role.reviewees.length,
            allEmployeesCount: role.allEmployees.length
          })
          
          // 🔍 추가 디버깅: 리뷰어 정보가 없을 때 상세 정보 출력
          if (!role.isReviewer && !role.isMaster) {
            console.log("❓ No reviewer/master role found. User role details:", role)
          }

          // 🚀 성능 개선: 상세 정보는 지연 로딩, 사진만 미리 로딩
          // 리뷰어 권한이 있으면 팀원들의 사진 미리 로딩
          if (role.isReviewer && role.reviewees.length > 0) {
            await loadEmployeePhotos(role.reviewees)
          }

          // 마스터 권한이 있으면 모든 직원들의 사진 미리 로딩
          if (role.isMaster && role.allEmployees.length > 0) {
            await loadEmployeePhotos(role.allEmployees)
          }

          console.log("✅ 초기 로딩 완료 - 사진은 미리 로딩, 상세 정보는 지연 로딩")

          // 현재 사용자에 대한 평가 피드백 로드
          await loadReviewerFeedback(currentUser.empno)
          
          // GSP 데이터 로드
          await loadGSPData(currentUser.empno)
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
        
        // 병렬로 정보 갱신
        const [refreshedInfo, refreshedRole] = await Promise.all([
          UserInfoMapper.loadUserInfo(currentUser.empno),
          ReviewerService.getUserRole(currentUser.empno)
        ])
        
        setUserInfo(refreshedInfo)
        setUserRole(refreshedRole)

        // 🚀 성능 개선: 새로고침에서도 상세 정보는 미리 로딩하지 않음, 사진만 다시 로딩
        // 리뷰어 권한이 있으면 팀원들의 사진 다시 로딩
        if (refreshedRole.isReviewer && refreshedRole.reviewees.length > 0) {
          await loadEmployeePhotos(refreshedRole.reviewees)
        }

        // 마스터 권한이 있으면 모든 직원들의 사진 다시 로딩
        if (refreshedRole.isMaster && refreshedRole.allEmployees.length > 0) {
          await loadEmployeePhotos(refreshedRole.allEmployees)
        }

        console.log("✅ 새로고침 완료 - 사진 갱신, 기존 캐시 유지, 상세 정보는 지연 로딩")

        // 평가 피드백도 갱신
        await loadReviewerFeedback(currentUser.empno)
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

      // 모든 평가자 사번 수집 후 1회 배치 조회 (N+1 → 1쿼리)
      const reviewerEmpnos = Array.from(new Set(
        feedbackData.map((f: any) => f.reviewer_empno).filter(Boolean)
      ))

      const photoMap = new Map<string, string>()
      if (reviewerEmpnos.length > 0) {
        const { data: photosData, error: photoError } = await supabase
          .from("employee_photos")
          .select("empno, photo_url")
          .in("empno", reviewerEmpnos)

        if (photoError) {
          console.error("❌ Batch reviewer photo fetch failed:", photoError)
        } else {
          photosData?.forEach(p => {
            if (p.photo_url) photoMap.set(p.empno, p.photo_url)
          })
        }
      }

      const feedbackWithPhotos = feedbackData.map((feedback: any) => ({
        id: feedback.id,
        name: feedback.reviewer_name,
        role: feedback.reviewer_grade,
        avatar: photoMap.get(feedback.reviewer_empno) || null,
        date: new Date(feedback.created_at).toLocaleDateString('ko-KR'),
        comment: feedback.comment,
      }))

      setReviewerFeedback(feedbackWithPhotos)
      console.log("✅ Reviewer feedback loaded:", feedbackWithPhotos.length, "items")
      
    } catch (error) {
      console.error("Error loading reviewer feedback:", error)
    } finally {
      setIsLoadingFeedback(false)
    }
  }

  // GSP 데이터 로드 (승인받은 값과 승인대기 값을 모두 고려)
  const loadGSPData = async (empno: string) => {
    try {
      const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
      console.log("🔍 Loading GSP data via RPC for empno:", normalizedEmpno)

      // RPC 1회 호출: 최신 레코드 + 4개 필드별 승인완료 값 동시 반환
      const { data, error } = await supabase.rpc('get_gsp_with_approved_values', {
        p_empno: normalizedEmpno,
      })

      if (error) {
        console.error("❌ get_gsp_with_approved_values 실패:", error)
        setGspData(null)
        return
      }

      const row = (data || [])[0]
      if (!row || !row.latest_record) {
        console.log("ℹ️ No GSP data found for user")
        setGspData(null)
        return
      }

      const enhancedData = {
        ...(row.latest_record as GSPData),
        approved_보직: row.approved_보직 ?? null,
        approved_산업전문화: row.approved_산업전문화 ?? null,
        approved_gsp_focus_30: row.approved_gsp_focus_30 ?? null,
        approved_council_tf: row.approved_council_tf ?? null,
      }

      setGspData(enhancedData)
      console.log("✅ GSP data loaded via RPC:", enhancedData)
    } catch (error) {
      console.error("❌ Error loading GSP data:", error)
      setGspData(null)
    }
  }





  // 스파이더맵 편집 시작
  const handleStartEditingSpiderMap = async () => {
    try {
      const currentUser = AuthService.getCurrentUser()
      if (!currentUser?.empno) return

      // 현재 점수를 가져와서 편집 폼에 설정
      const { getAllScores, loadScoresForEmployee } = await import("@/data/performance-scores")
      await loadScoresForEmployee(currentUser.empno)
      const scores = getAllScores()
      
      const scoreData = scores.reduce((acc, score) => {
        acc[score.category] = {
          current: score.currentScore || 0,
          target: score.targetScore || 0
        }
        return acc
      }, {} as any)

      setEditingScores(scoreData)
      setIsEditingSpiderMap(true)
    } catch (error) {
      console.error("점수 로딩 실패:", error)
      setIsEditingSpiderMap(true) // 실패해도 편집 모드는 열기
    }
  }

  // 스파이더맵 편집 취소
  const handleCancelEditingSpiderMap = () => {
    setIsEditingSpiderMap(false)
  }

  // 스파이더맵 점수 저장
  const handleSaveSpiderMapScores = async () => {
    try {
      const currentUser = AuthService.getCurrentUser()
      if (!currentUser?.empno) {
        alert("사용자 정보가 없습니다.")
        return
      }

      // 각 카테고리별로 점수 업데이트
      const { updateScoreByCategory } = await import("@/data/performance-scores")
      
      for (const [category, scores] of Object.entries(editingScores)) {
        await updateScoreByCategory(category, scores.current, scores.target)
      }

      setIsEditingSpiderMap(false)
      alert("점수가 저장되었습니다!")
      
      // 페이지 새로고침으로 스파이더맵 업데이트
      window.location.reload()
    } catch (error) {
      console.error("점수 저장 실패:", error)
      alert("점수 저장에 실패했습니다.")
    }
  }

  // 점수 입력 핸들러
  const handleScoreChange = (category: string, type: 'current' | 'target', value: string) => {
    const numValue = Math.max(0, Math.min(10, Number(value) || 0))
    setEditingScores(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [type]: numValue
      }
    }))
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
  // Plan 은 한글('완료'/'작성중'/'Draft'), Self Assessment 는 영어('submitted'/'draft') 로 저장돼서 양쪽 다 처리
  const renderStatusBadge = (status: string | null | undefined, isSmall = false) => {
    if (!status) {
      return <Badge variant="outline" className={`${isSmall ? 'text-sm' : 'text-base'} bg-gray-100 text-gray-500`}>미작성</Badge>
    }

    switch (status) {
      case '완료':
      case 'submitted':
        return <Badge className={`${isSmall ? 'text-sm' : 'text-base'} bg-green-500 text-white`}>제출</Badge>
      case '작성중':
        return <Badge className={`${isSmall ? 'text-sm' : 'text-base'} bg-orange-500 text-white`}>작성중</Badge>
      case 'Draft':
      case 'draft':
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
              {userRole.isMaster && (
                <Badge variant="default" className="text-xs bg-red-500 hover:bg-red-600">
                  <Eye className="h-3 w-3 mr-1" />
                  마스터 권한 ({userRole.allEmployees.length}명)
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
          <Link href="/guide.html" title="설명서" target="_blank">
            <Bell className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-orange-500 transition-colors" />
          </Link>
        </div>
      </div>

      {/* 메인 탭 */}
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-4">
        <TabsList className={`grid w-full ${
          // 실제 탭 개수에 따라 그리드 설정
          userRole?.isMaster && userRole?.isReviewer && userRole?.reviewees.length > 0 ? 'grid-cols-3' :  // 마스터 + 리뷰어 = 3개 탭
          (userRole?.isMaster || (userRole?.isReviewer && userRole?.reviewees.length > 0)) ? 'grid-cols-2' : // 마스터만 또는 리뷰어만 = 2개 탭
          'grid-cols-1' // 내 평가만
        }`}>
          <TabsTrigger value="my-evaluation" className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            내 평가
          </TabsTrigger>
          {userRole?.isReviewer && userRole?.reviewees.length > 0 && (
            <TabsTrigger value="team-evaluation" className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              평가 대상자 ({userRole.reviewees.length})
            </TabsTrigger>
          )}
          {userRole?.isMaster && (
            <TabsTrigger value="all-evaluation" className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              ALL ({userRole.allEmployees.length})
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
                  {/* 왼쪽 컬럼: 기본 정보 */}
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
                      <div className="flex-1">
                        <span className="text-sm font-medium text-foreground">보직</span>
                        <p className="text-sm text-muted-foreground">
                          {(() => {
                            // 1. 승인완료된 값이 있으면 우선 표시
                            if (gspData?.approved_보직) {
                              return gspData.approved_보직
                            }
                            // 2. 없으면 userInfo에서 가져오기
                            return userInfo?.job_info_nm || "정보 없음"
                          })()}
                        </p>
                        {gspData?.["보직_STATUS"] === '승인대기' && (
                          <div className="flex items-center space-x-1 mt-1">
                            <span className="text-yellow-500 animate-pulse">-</span>
                            <span className="text-xs text-yellow-600">승인대기: {gspData["보직(HC)"]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-foreground">산업전문화</span>
                        <p className="text-sm text-muted-foreground">
                          {(() => {
                            // 1. 승인완료된 값이 있으면 우선 표시
                            if (gspData?.approved_산업전문화) {
                              return gspData.approved_산업전문화
                            }
                            // 2. 없으면 userInfo에서 가져오기
                            return userInfo?.industry_specialization || "정보 없음"
                          })()}
                        </p>
                        {gspData?.["산업전문화_STATUS"] === '승인대기' && (
                          <div className="flex items-center space-x-1 mt-1">
                            <span className="text-yellow-500 animate-pulse">-</span>
                            <span className="text-xs text-yellow-600">승인대기: {gspData["산업전문화"]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Settings 안내 메시지 */}
                    <div className="flex items-center">
                      <span className="text-xs text-gray-400">Settings에서 정보 수정 가능</span>
                    </div>
                  </div>
                  {/* 오른쪽 컬럼: GSP/Focus 30 & TF/Council */}
                  <div className="space-y-4 flex flex-col justify-start">
                    <div className="flex flex-col items-start">
                      <div className="flex items-center space-x-1">
                        <div className="h-2 w-2 bg-gradient-to-r from-yellow-500 to-pink-500 rounded-full"></div>
                        <span className="text-xs font-bold">GSP/Focus 30</span>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {(() => {
                          // 1. 승인완료된 값이 있으면 우선 표시
                          let approvedValue;
                          if (gspData?.approved_gsp_focus_30) {
                            approvedValue = gspData.approved_gsp_focus_30;
                          } else {
                            // 2. 없으면 userInfo에서 가져오기
                            approvedValue = userInfo?.gsp_focus_30;
                          }
                          const displayValue = approvedValue || "정보 없음";
                          return displayValue.length > 50 ? displayValue.substring(0, 50) + "..." : displayValue;
                        })()}
                      </span>
                      {gspData?.["GSP_Focus_30_STATUS"] === '승인대기' && (
                        <div className="flex items-center space-x-1 mt-1">
                          <span className="text-yellow-500 animate-pulse">-</span>
                          <span className="text-xs text-yellow-600">
                            승인대기: {gspData["GSP/Focus 30"] && gspData["GSP/Focus 30"].length > 30 
                              ? gspData["GSP/Focus 30"].substring(0, 30) + "..." 
                              : gspData["GSP/Focus 30"]
                            }
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-start">
                      <div className="flex items-center space-x-1">
                        <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                        <span className="text-xs font-bold">TF & Council</span>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {(() => {
                          // 1. 승인완료된 값이 있으면 우선 표시
                          if (gspData?.approved_council_tf) {
                            return gspData.approved_council_tf
                          }
                          // 2. 없으면 userInfo에서 가져오기
                          return userInfo?.council_tf || "정보 없음"
                        })()}
                      </span>
                      {gspData?.["Council_TF_STATUS"] === '승인대기' && (
                        <div className="flex items-center space-x-1 mt-1">
                          <span className="text-yellow-500 animate-pulse">-</span>
                          <span className="text-xs text-yellow-600">승인대기: {gspData["Council/TF 등"]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 오른쪽: Spider Web Chart */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center justify-between">
                <div className="flex items-center">
                  <RadarIcon className="mr-2 h-5 w-5 text-orange-600" />
                  자기평가점수 Spider Web
                </div>
                {!isEditingSpiderMap && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartEditingSpiderMap}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    편집
                  </Button>
                )}
              </h3>
              
              {isEditingSpiderMap ? (
                // 편집 모드 - 점수 입력 폼
                <div className="bg-white p-6 rounded-md border">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-lg font-medium">점수 편집</h4>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>점수 예시</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3 text-sm">
                            <div className="border-l-4 border-green-500 pl-3 py-2">
                              <div className="font-semibold text-green-600">10점: 탁월</div>
                              <div className="text-gray-600 dark:text-gray-300 text-xs">조직 및 본인이 기대하는 역량지표에서 탁월 내외 <span className="font-bold">전반적으로 탁월한 성과를 창출</span>한 수준</div>
                            </div>
                            <div className="border-l-4 border-blue-500 pl-3 py-2">
                              <div className="font-semibold text-blue-600">7-9점: 우수</div>
                              <div className="text-gray-600 dark:text-gray-300 text-xs">조직 및 본인이 기대하는 역량지표에서 탁월 대비 일정 <span className="font-bold">역량에서 기대 이상의 뛰어난 성과를 창출</span>한 수준</div>
                            </div>
                            <div className="border-l-4 border-yellow-500 pl-3 py-2">
                              <div className="font-semibold text-yellow-600">4-6점: 보통</div>
                              <div className="text-gray-600 dark:text-gray-300 text-xs">조직 및 본인이 기대하는 역량지표에서 <span className="font-bold">적절한 수준의 기대에 부합</span>하는 성과를 창출한 수준</div>
                            </div>
                            <div className="border-l-4 border-orange-500 pl-3 py-2">
                              <div className="font-semibold text-orange-600">1-3점: 개선필요</div>
                              <div className="text-gray-600 dark:text-gray-300 text-xs">조직 및 본인이 기대하는 역량지표에서 <span className="font-bold">기대에 미치지 못하며 개선이 필요</span>한 수준</div>
                            </div>
                            <div className="border-l-4 border-red-500 pl-3 py-2">
                              <div className="font-semibold text-red-600">0점: 미흡</div>
                              <div className="text-gray-600 dark:text-gray-300 text-xs">조직 및 본인이 기대하는 역량지표에서 <span className="font-bold">현저히 부족하여 즉시 개선이 필요</span>한 수준</div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEditingSpiderMap}
                        className="flex items-center gap-1"
                      >
                        <X className="h-4 w-4" />
                        취소
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveSpiderMapScores}
                        className="flex items-center gap-1"
                      >
                        <Save className="h-4 w-4" />
                        저장
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid gap-4">
                    {Object.entries(editingScores).map(([category, scores]) => (
                      <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium text-sm w-32">{category}</div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-yellow-600 font-medium whitespace-nowrap">자기평가:</label>
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              value={scores.current}
                              onChange={(e) => handleScoreChange(category, 'current', e.target.value)}
                              className="w-20 h-8 text-center"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-orange-600 font-medium whitespace-nowrap">개선목표:</label>
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              value={scores.target}
                              onChange={(e) => handleScoreChange(category, 'target', e.target.value)}
                              className="w-20 h-8 text-center"
                            />
                          </div>
                          <span className="text-xs text-gray-500">(0-10점)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // 보기 모드 - 스파이더 차트
                <div className="bg-white p-4 rounded-md min-h-[400px] flex justify-center items-center overflow-hidden">
                  <div className="w-[300px] h-[300px] flex items-center justify-center">
                    <PerformanceRadarChart />
                  </div>
                </div>
              )}
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
                    <p className="text-sm mt-2 whitespace-pre-line">{feedback.comment}</p>
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
        {userRole?.isReviewer && userRole?.reviewees.length > 0 && (
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
                    
                    // 상단의 renderStatusBadge (공용)를 그대로 사용

                    // 완료 판정 헬퍼: Plan은 '완료', Self Assessment는 'submitted' 값 사용
                    const isDone = (s: any) => s === '완료' || s === 'submitted'

                    // 완료율 계산
                    const planStatuses = memberStatus ? Object.values(memberStatus.planStatus) : []
                    const completedPlans = planStatuses.filter(isDone).length
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
                    const completedMidAssessments = midAssessmentStatuses.filter(isDone).length
                    const midAssessmentCompletionRate = Math.round((completedMidAssessments / 5) * 100)

                    // Self Assessment 기말 진행률 계산
                    const finalAssessmentStatuses = memberStatus ? [
                      memberStatus.selfAssessmentStatus.business_final,
                      memberStatus.selfAssessmentStatus.people_final,
                      memberStatus.selfAssessmentStatus.collaboration_final,
                      memberStatus.selfAssessmentStatus.quality_final,
                      memberStatus.selfAssessmentStatus.industry_final
                    ] : []
                    const completedFinalAssessments = finalAssessmentStatuses.filter(isDone).length
                    const finalAssessmentCompletionRate = Math.round((completedFinalAssessments / 5) * 100)
                    
                    return (
                      <Card key={reviewee.사번} className="border-l-4 border-l-blue-200">
                        <CardContent className="p-6">
                          {/* 헤더 */}
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="relative w-12 h-12 flex-shrink-0">
                                {employeePhotos.get(reviewee.사번) ? (
                                  <Image
                                    src={employeePhotos.get(reviewee.사번)!}
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
                                size="lg"
                                onClick={() => handleViewMemberDetails(reviewee.사번, reviewee.성명)}
                                className="text-base"
                              >
                                <Eye className="h-5 w-5 mr-2" />
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

        {/* ALL 탭 (마스터 전용) */}
        {userRole?.isMaster && (
          <TabsContent value="all-evaluation" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  전체 직원 현황 (마스터 권한)
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
                      {/* 모든 직원의 팀 목록 */}
                      {Array.from(new Set(userRole.allEmployees.map(emp => emp['FY26 팀명']).filter(Boolean))).map((team) => (
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
                  {/* 필터링된 전체 직원 목록 */}
                  {userRole.allEmployees
                    .filter(employee => {
                      const matchesSearch = searchTerm === "" || 
                        employee.성명.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        employee.사번.includes(searchTerm)
                      const matchesTeam = teamFilter === "all" || employee['FY26 팀명'] === teamFilter
                      return matchesSearch && matchesTeam
                    })
                    .map((employee, index) => {
                      // 팀원 정보 조회
                      const memberInfo = teamMemberInfo.get(employee.사번)
                      const memberStatus = teamPlanAssessmentStatus.get(employee.사번)

                      return (
                        <Card key={employee.사번} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <Avatar className="h-16 w-16">
                                  {employeePhotos.get(employee.사번) ? (
                                    <AvatarImage 
                                      src={employeePhotos.get(employee.사번)} 
                                      alt={`${employee.성명} Profile`}
                                      className="object-cover"
                                    />
                                  ) : null}
                                  <AvatarFallback className="text-lg font-medium bg-gradient-to-br from-orange-100 to-orange-200 text-orange-800">
                                    {employee.성명.slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-semibold">{employee.성명}</h3>
                                    <Badge variant="outline" className="text-xs">
                                      {employee.사번}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {employee['FY26 팀명'] || "팀 정보 없음"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    리뷰어: {employee['1차 Reviewer'] || "지정되지 않음"}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewMemberDetails(employee.사번, employee.성명)}
                                  className="flex items-center gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  작성내역 보기
                                </Button>
                              </div>
                            </div>
                            
                            {/* 상태 표시 영역 */}
                            <div className="mt-4 pt-4 border-t">
                              <div className="text-xs text-muted-foreground">
                                {memberStatus?.lastUpdated 
                                  ? `최근 업데이트: ${new Date(memberStatus.lastUpdated).toLocaleDateString('ko-KR')}`
                                  : "업데이트 정보 없음"
                                }
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  
                  {/* 검색 결과가 없을 때 */}
                  {userRole.allEmployees.filter(employee => {
                    const matchesSearch = searchTerm === "" || 
                      employee.성명.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      employee.사번.includes(searchTerm)
                    const matchesTeam = teamFilter === "all" || employee['FY26 팀명'] === teamFilter
                    return matchesSearch && matchesTeam
                  }).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>검색 조건에 맞는 직원이 없습니다.</p>
                      <p className="text-sm mt-2">다른 검색어나 필터를 시도해보세요.</p>
                    </div>
                  )}
                  
                  {userRole.allEmployees.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>직원 정보를 불러올 수 없습니다.</p>
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
          onClose={() => {
            setSelectedMember(null)
            setIsReviewerDialogOpen(false)
          }}
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
      
      {/* 승인 요청 패널 (1차 Reviewer에게만 표시) */}
      <ApprovalPanel hasRejection={hasRejection} />
      
      {/* 반려 알림 (반려당한 사용자에게만 표시) */}
      <RejectionNotification onRejectionStatusChange={setHasRejection} />


    </div>
  )
}
