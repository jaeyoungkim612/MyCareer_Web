import { supabase } from "./supabase"

export interface ReviewerInfo {
  NO: string
  사번: string
  성명: string
  'FY26 팀명': string
  'Reviewer 사번': string
  '1차 Reviewer': string
}

export interface UserRole {
  isSelf: boolean
  isReviewer: boolean
  isMaster: boolean
  myInfo: ReviewerInfo | null
  reviewees: ReviewerInfo[]
  allEmployees: ReviewerInfo[]
}

export class ReviewerService {
  // 사번을 6자리로 정규화: 95129 → 095129, 123456 → 123456
  static normalizeEmpno(empno: string): string {
    // 문자열로 변환하고 앞뒤 공백 제거
    const cleanEmpno = String(empno).trim()
    console.log(`🔧 normalizeEmpno: input="${empno}" → clean="${cleanEmpno}"`)
    // 6자리가 되도록 앞에 0을 채움
    const result = cleanEmpno.padStart(6, '0')
    console.log(`🔧 normalizeEmpno: clean="${cleanEmpno}" → padded="${result}"`)
    return result
  }

  // 사번 형식 변환: 097235 → 97235.0 (리뷰어 조회용)
  static formatEmpnoForReviewer(empno: string): string {
    // 앞의 0을 제거하고 뒤에 .0 추가
    const trimmedEmpno = empno.replace(/^0+/, '') || '0'
    return `${trimmedEmpno}.0`
  }

  // 마스터 권한 체크
  static async isMasterUser(empno: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("L_Reviewer_Master")
        .select("사번")
        .eq("사번", empno)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error("❌ Master check error:", error)
        return false
      }

      return !!data
    } catch (error) {
      console.error("❌ Master check error:", error)
      return false
    }
  }

  // 모든 직원 목록 가져오기 (마스터용)
  static async getAllEmployees(): Promise<ReviewerInfo[]> {
    try {
      const { data, error } = await supabase
        .from("L_Reviewer")
        .select("*")
        .order("사번")

      if (error) {
        console.error("❌ Get all employees error:", error)
        return []
      }

      return data || []
    } catch (error) {
      console.error("❌ Get all employees error:", error)
      return []
    }
  }

  // 로그인한 사용자의 역할 정보 조회
  static async getUserRole(empno: string): Promise<UserRole> {
    try {
      console.log("🔍 ReviewerService: Getting user role for empno:", empno)
      
      // 사번 형식 변환
      const reviewerFormatEmpno = this.formatEmpnoForReviewer(empno)
      console.log("🔍 ReviewerService: Converted empno for reviewer search:", reviewerFormatEmpno)

      // L_Reviewer 테이블은 원본 사번(5자리) 사용
      console.log("🔍 ReviewerService: Using original empno for L_Reviewer queries:", empno)
      
      // 병렬로 모든 정보 조회
      const [myInfoResult, revieweesResultOriginal, revieweesResultConverted, isMaster, allEmployees] = await Promise.all([
        // 1. 내 정보 조회 (원본 사번 사용)
        supabase
          .from("L_Reviewer")
          .select("*")
          .eq("사번", empno)
          .single(),
        
        // 2-1. 내가 리뷰어인 팀원들 조회 (원본 사번으로)
        supabase
          .from("L_Reviewer")
          .select("*")
          .eq("Reviewer 사번", empno)
          .order("사번"),
        
        // 2-2. 내가 리뷰어인 팀원들 조회 (변환된 사번으로 - 호환성용)
        supabase
          .from("L_Reviewer")
          .select("*")
          .eq("Reviewer 사번", reviewerFormatEmpno)
          .order("사번"),
        
        // 3. 마스터 권한 확인
        this.isMasterUser(empno),
        
        // 4. 모든 직원 목록 조회 (마스터일 경우 사용)
        this.getAllEmployees()
      ])

      const { data: myInfo, error: myError } = myInfoResult
      const { data: revieweesOriginal, error: revieweesErrorOriginal } = revieweesResultOriginal
      const { data: revieweesConverted, error: revieweesErrorConverted } = revieweesResultConverted

      if (myError && myError.code !== 'PGRST116') {
        console.error("❌ My info query error:", myError)
      }

      if (revieweesErrorConverted) {
        console.error("❌ Reviewees (converted) query error:", revieweesErrorConverted)
      }
      
      if (revieweesErrorOriginal) {
        console.error("❌ Reviewees (original) query error:", revieweesErrorOriginal)
      }
      
      // 두 결과를 합치고 중복 제거 (사번 기준)
      const allReviewees = [...(revieweesConverted || []), ...(revieweesOriginal || [])]
      const uniqueRevieweesMap = new Map()
      allReviewees.forEach(reviewee => {
        uniqueRevieweesMap.set(reviewee.사번, reviewee)
      })
      const reviewees = Array.from(uniqueRevieweesMap.values())
      
      console.log("🔍 ReviewerService: Reviewees found with converted empno:", revieweesConverted?.length || 0)
      console.log("🔍 ReviewerService: Reviewees found with original empno:", revieweesOriginal?.length || 0)
      console.log("🔍 ReviewerService: Total unique reviewees:", reviewees.length)
      console.log("🔍 ReviewerService: Is master user:", isMaster)

      const userRole: UserRole = {
        isSelf: !!myInfo,
        isReviewer: (reviewees && reviewees.length > 0) || false,
        isMaster: isMaster,
        myInfo: myInfo || null,
        reviewees: reviewees || [],
        allEmployees: isMaster ? allEmployees : []
      }

      console.log("✅ User role determined:", {
        isSelf: userRole.isSelf,
        isReviewer: userRole.isReviewer,
        isMaster: userRole.isMaster,
        revieweesCount: userRole.reviewees.length,
        allEmployeesCount: userRole.allEmployees.length
      })
      
      return userRole

    } catch (error) {
      console.error("❌ ReviewerService error:", error)
      return {
        isSelf: false,
        isReviewer: false,
        isMaster: false,
        myInfo: null,
        reviewees: [],
        allEmployees: []
      }
    }
  }

  // 특정 사용자 정보 조회
  static async getReviewerInfo(empno: string): Promise<ReviewerInfo | null> {
    try {
      const { data, error } = await supabase
        .from("L_Reviewer")
        .select("*")
        .eq("사번", empno)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error("❌ Get reviewer info error:", error)
        return null
      }

      return data || null
    } catch (error) {
      console.error("❌ Get reviewer info error:", error)
      return null
    }
  }

  // 팀원 목록 조회 (리뷰어용)
  static async getReviewees(reviewerEmpno: string): Promise<ReviewerInfo[]> {
    try {
      const { data, error } = await supabase
        .from("L_Reviewer")
        .select("*")
        .eq("Reviewer 사번", reviewerEmpno)
        .order("사번")

      if (error) {
        console.error("❌ Get reviewees error:", error)
        return []
      }

      return data || []
    } catch (error) {
      console.error("❌ Get reviewees error:", error)
      return []
    }
  }
} 