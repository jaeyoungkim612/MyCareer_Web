"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs"
import { PerformanceRadarChart } from "@/components/dashboard/performance-radar-chart"
import { LayoutDashboard, RadarIcon, ListChecks, Bell, MessageSquare, RefreshCw, User, Users, Search, Filter, Eye, ArrowRight } from "lucide-react"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

  // 팀원들의 Plan과 Self Assessment 상태 로드
  const loadTeamPlanAssessmentStatus = async (reviewees: any[]) => {
    console.log("🔍 Loading plan and assessment status for", reviewees.length, "team members")
    const statusMap = new Map<string, TeamMemberStatus>()
    
    for (const reviewee of reviewees) {
      try {
        const empno = reviewee.사번
        // 사번 정규화 (95129 → 095129)
        const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
        console.log(`📋 Loading status for ${reviewee.성명} (${empno} → ${normalizedEmpno})`)
        
        // Plan Status 조회 (정규화된 사번 사용)
        const [businessPlan, peoplePlan, collaborationPlan, qualityPlan, industryPlan] = await Promise.all([
          supabase.from('business_goals').select('status, updated_at').eq('employee_id', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('people_goals').select('status, updated_at').eq('employee_id', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('collaborations').select('status, updated_at').eq('employee_id', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('quality_non_audit_performance').select('status, updated_at').eq('employee_id', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('industry_tl_planning').select('status, updated_at').eq('employee_id', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle()
        ])

        // Self Assessment Status 조회 (정규화된 사번 사용)
        const [businessMid, businessFinal, peopleMid, peopleFinal, collaborationMid, collaborationFinal, qualityMid, qualityFinal, industryMid, industryFinal] = await Promise.all([
          supabase.from('business_mid_assessments').select('status, updated_at').eq('empno', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('business_final_assessments').select('status, updated_at').eq('empno', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('people_mid_assessments').select('status, updated_at').eq('empno', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('people_final_assessments').select('status, updated_at').eq('empno', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('collaboration_mid_assessments').select('status, updated_at').eq('empno', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('collaboration_final_assessments').select('status, updated_at').eq('empno', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('quality_mid_assessments').select('status, updated_at').eq('empno', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('quality_final_assessments').select('status, updated_at').eq('empno', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('industry_tl_mid_assessments').select('status, updated_at').eq('empno', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('industry_tl_final_assessments').select('status, updated_at').eq('empno', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle()
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
            pwc_id: hrData.PWC_ID,
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

  // 🚀 개별 직원 평가 상태 로딩 (지연 로딩용)
  const loadIndividualMemberStatus = async (empno: string, name: string): Promise<TeamMemberStatus | null> => {
    try {
      // 사번 정규화 (95129 → 095129)
      const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
      console.log(`📋 Loading individual status for ${name} (${empno} → ${normalizedEmpno})`)
      
      // 이미 캐시에 있으면 반환
      if (teamPlanAssessmentStatus.has(empno)) {
        console.log(`✅ Using cached status for ${name}`)
        return teamPlanAssessmentStatus.get(empno) || null
      }

      // Plan Status 조회 (정규화된 사번 사용)
      const [businessPlan, peoplePlan, collaborationPlan, qualityPlan, industryPlan] = await Promise.all([
        supabase.from('business_goals').select('status, updated_at').eq('employee_id', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('people_goals').select('status, updated_at').eq('employee_id', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('collaborations').select('status, updated_at').eq('employee_id', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('quality_non_audit_performance').select('status, updated_at').eq('employee_id', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('industry_tl_planning').select('status, updated_at').eq('employee_id', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle()
      ])

      // Self Assessment Status 조회 (정규화된 사번 사용)
      const [businessMid, businessFinal, peopleMid, peopleFinal, collaborationMid, collaborationFinal, qualityMid, qualityFinal, industryMid, industryFinal] = await Promise.all([
        supabase.from('business_mid_assessments').select('status, updated_at').eq('empno', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('business_final_assessments').select('status, updated_at').eq('empno', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('people_mid_assessments').select('status, updated_at').eq('empno', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('people_final_assessments').select('status, updated_at').eq('empno', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('collaboration_mid_assessments').select('status, updated_at').eq('empno', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('collaboration_final_assessments').select('status, updated_at').eq('empno', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('quality_mid_assessments').select('status, updated_at').eq('empno', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('quality_final_assessments').select('status, updated_at').eq('empno', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('industry_tl_mid_assessments').select('status, updated_at').eq('empno', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('industry_tl_final_assessments').select('status, updated_at').eq('empno', normalizedEmpno).order('created_at', { ascending: false }).limit(1).maybeSingle()
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

      // 캐시에 저장
      setTeamPlanAssessmentStatus(prev => new Map(prev).set(empno, memberStatus))
      console.log(`✅ Individual status loaded and cached for ${name}`)
      return memberStatus
    } catch (error) {
      console.log(`❌ Error loading status for ${name}:`, error)
      return null
    }
  }

  // 📷 직원들의 사진 정보만 배치 로딩 (UI 표시용)
  const loadEmployeePhotos = async (employees: any[]) => {
    try {
      console.log("📷 Loading employee photos for", employees.length, "employees")
      
      const empnos = employees.map(emp => emp.사번)
      console.log("📷 Original employee numbers:", empnos)
      
      // 사번들을 정규화 (95129 → 095129)
      const normalizedEmpnos = empnos.map(empno => ReviewerService.normalizeEmpno(empno))
      console.log("📷 Normalized employee numbers for photos:", normalizedEmpnos)
      
      if (normalizedEmpnos.length === 0) return

      // 배치로 모든 사진 정보 조회 (정규화된 사번 사용)
      const { data: photosData, error } = await supabase
        .from("employee_photos")
        .select("empno, photo_url")
        .in("empno", normalizedEmpnos)

      if (error) {
        console.error("❌ Error loading employee photos:", error)
        return
      }

      // Map으로 변환하여 캐시에 저장 (원본 사번으로 매핑)
      const photosMap = new Map<string, string>()
      photosData?.forEach(photo => {
        if (photo.photo_url) {
          // 정규화된 사번을 원본 사번으로 역변환해서 매핑
          const originalEmpno = empnos.find(orig => ReviewerService.normalizeEmpno(orig) === photo.empno)
          if (originalEmpno) {
            photosMap.set(originalEmpno, photo.photo_url)
            console.log(`📷 Photo mapped: ${originalEmpno} (${photo.empno}) → ${photo.photo_url}`)
          }
        }
      })

      setEmployeePhotos(photosMap)
      console.log("✅ Employee photos loaded:", photosMap.size, "photos cached")
    } catch (error) {
      console.error("❌ Error loading employee photos:", error)
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

  // GSP 데이터 로드
  const loadGSPData = async (empno: string) => {
    try {
      console.log("🔍 Loading GSP data for empno:", empno)
      
      const gspStatus = await GSPService.checkGSPStatus(empno)
      
      if (gspStatus.exists && gspStatus.data) {
        setGspData(gspStatus.data)
        console.log("✅ GSP data loaded:", {
          status: gspStatus.data.STATUS,
          hasGSP: !!gspStatus.data.GSP,
          hasFocus30: !!gspStatus.data["Focus 30"]
        })
      } else {
        console.log("ℹ️ No GSP data found for user")
        setGspData(null)
      }
    } catch (error) {
      console.error("❌ Error loading GSP data:", error)
      setGspData(null)
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
        return <Badge className={`${isSmall ? 'text-sm' : 'text-base'} bg-green-500 text-white`}>제출</Badge>
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
          <Bell className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-orange-500 transition-colors" />
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
                      <div className="flex-1">
                        <div className="flex items-center space-x-1">
                          <span className="text-sm font-medium text-foreground">보직(HC)</span>
                          {gspData?.["보직_STATUS"] === '승인대기' && (
                            <Badge variant="outline" className="text-xs px-1 py-0 border-yellow-500 text-yellow-600 bg-yellow-50">
                              승인대기
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{(gspData?.["보직(HC)"] && gspData["보직(HC)"].trim()) || userInfo?.job_info_nm || "정보 없음"}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-1">
                          <span className="text-sm font-medium text-foreground">산업전문화</span>
                          {gspData?.["산업전문화_STATUS"] === '승인대기' && (
                            <Badge variant="outline" className="text-xs px-1 py-0 border-yellow-500 text-yellow-600 bg-yellow-50">
                              승인대기
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{(gspData?.["산업전문화"] && gspData["산업전문화"].trim()) || userInfo?.industry_specialization || "정보 없음"}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-1">
                          <span className="text-sm font-medium text-foreground">TF & Council</span>
                          {gspData?.["Council_TF_STATUS"] === '승인대기' && (
                            <Badge variant="outline" className="text-xs px-1 py-0 border-yellow-500 text-yellow-600 bg-yellow-50">
                              승인대기
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{(gspData?.["Council/TF 등"] && gspData["Council/TF 등"].trim()) || userInfo?.council_tf || "정보 없음"}</p>
                      </div>
                    </div>
                  </div>
                  {/* 오른쪽 컬럼: GSP, Focus 30 */}
                  <div className="space-y-4 flex flex-col justify-start">
                    <div className="flex flex-col items-start">
                      <div className="flex items-center space-x-1">
                        <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-xs font-bold">GSP</span>
                        {gspData?.["GSP_STATUS"] === '승인대기' && (
                          <Badge 
                            variant="outline" 
                            className="text-xs px-1 py-0 border-yellow-500 text-yellow-600 bg-yellow-50"
                          >
                            승인대기
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {gspData?.GSP && gspData.GSP.trim() ? 
                          (gspData.GSP.length > 50 ? gspData.GSP.substring(0, 50) + "..." : gspData.GSP) : 
                          "정보 없음"
                        }
                      </span>
                    </div>
                    <div className="flex flex-col items-start">
                      <div className="flex items-center space-x-1">
                        <div className="h-2 w-2 bg-pink-500 rounded-full"></div>
                        <span className="text-xs font-bold">Focus 30</span>
                        {gspData?.["Forcus_30_STATUS"] === '승인대기' && (
                          <Badge 
                            variant="outline" 
                            className="text-xs px-1 py-0 border-yellow-500 text-yellow-600 bg-yellow-50"
                          >
                            승인대기
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {(gspData?.["Forcus 30"] && gspData["Forcus 30"].trim()) || (gspData?.["Focus 30"] && gspData["Focus 30"].trim()) ? 
                          ((gspData["Forcus 30"] || gspData["Focus 30"]).length > 50 ? (gspData["Forcus 30"] || gspData["Focus 30"]).substring(0, 50) + "..." : (gspData["Forcus 30"] || gspData["Focus 30"])) : 
                          "정보 없음"
                        }
                      </span>
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

      {/* My Career+ 바로가기 배너 */}
      <div className="fixed top-1/2 right-4 transform -translate-y-1/2 z-50">
        <a
          href="https://app.powerbi.com/groups/06a9d883-28ef-4d69-8e57-42008ff57fd8/reports/c1a7a139-0d7b-45f1-aa3c-b00f98b1044e/ReportSection70efc05003bf7f842754?experience=power-bi"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center justify-center bg-orange-500 hover:bg-orange-600 text-white px-2 py-6 rounded-l-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 min-h-[120px]"
        >
          <div className="text-xs font-bold mb-1 whitespace-nowrap">
            My Career+
          </div>
          <div className="text-xs whitespace-nowrap mb-1">
            (PowerBI)
          </div>
          <div className="text-xs whitespace-nowrap">
            바로가기
          </div>
          <div className="mt-2 opacity-70 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="h-4 w-4" />
          </div>
        </a>
      </div>
    </div>
  )
}
