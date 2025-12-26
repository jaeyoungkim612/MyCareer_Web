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

  // 사번을 5자리로 변환: 099284 → 99284 (L_Reviewer 테이블용)
  static convertTo5DigitEmpno(empno: string): string {
    // 앞의 0을 제거하여 5자리로 변환
    const trimmedEmpno = empno.replace(/^0+/, '') || '0'
    return trimmedEmpno
  }

  // 마스터 권한 체크
  static async isMasterUser(empno: string): Promise<boolean> {
    try {
      const fiveDigitEmpno = this.convertTo5DigitEmpno(empno)
      console.log("🔍 Master check: Original empno:", empno, "→ 5-digit:", fiveDigitEmpno)
      
      // 원본 사번과 5자리 사번 둘 다 시도
      const [originalResult, fiveDigitResult] = await Promise.all([
        supabase
          .from("L_Reviewer_Master")
          .select("사번")
          .eq("사번", empno)
          .single(),
        supabase
          .from("L_Reviewer_Master")
          .select("사번")
          .eq("사번", fiveDigitEmpno)
          .single()
      ])

      const { data: originalData, error: originalError } = originalResult
      const { data: fiveDigitData, error: fiveDigitError } = fiveDigitResult

      if (originalError && originalError.code !== 'PGRST116') {
        console.error("❌ Master check error (original):", originalError)
      }
      
      if (fiveDigitError && fiveDigitError.code !== 'PGRST116') {
        console.error("❌ Master check error (5-digit):", fiveDigitError)
      }

      const isMaster = !!(originalData || fiveDigitData)
      console.log("🔍 Master check result:", {
        originalFound: !!originalData,
        fiveDigitFound: !!fiveDigitData,
        isMaster
      })

      return isMaster
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

      // 사번 정규화 처리
      return (data || []).map(employee => ({
        ...employee,
        사번: this.normalizeEmpno(employee.사번), // 사번 정규화: 95129 → 095129
        'Reviewer 사번': this.normalizeEmpno(employee['Reviewer 사번']) // 리뷰어 사번도 정규화
      }))
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
      const fiveDigitEmpno = this.convertTo5DigitEmpno(empno)
      console.log("🔍 ReviewerService: Original empno:", empno)
      console.log("🔍 ReviewerService: 5-digit empno:", fiveDigitEmpno)
      console.log("🔍 ReviewerService: Reviewer format empno:", reviewerFormatEmpno)
      
      // 병렬로 모든 정보 조회
      const [myInfoResult, myInfo5DigitResult, revieweesResultOriginal, revieweesResult5Digit, revieweesResultConverted, isMaster, allEmployees] = await Promise.all([
        // 1-1. 내 정보 조회 (원본 사번 사용)
        supabase
          .from("L_Reviewer")
          .select("*")
          .eq("사번", empno)
          .single(),
        
        // 1-2. 내 정보 조회 (5자리 사번 사용)
        supabase
          .from("L_Reviewer")
          .select("*")
          .eq("사번", fiveDigitEmpno)
          .single(),
        
        // 2-1. 내가 리뷰어인 팀원들 조회 (원본 사번으로)
        supabase
          .from("L_Reviewer")
          .select("*")
          .eq("Reviewer 사번", empno)
          .order("사번"),
        
        // 2-2. 내가 리뷰어인 팀원들 조회 (5자리 사번으로)
        supabase
          .from("L_Reviewer")
          .select("*")
          .eq("Reviewer 사번", fiveDigitEmpno)
          .order("사번"),
        
        // 2-3. 내가 리뷰어인 팀원들 조회 (변환된 사번으로 - 호환성용)
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
      const { data: myInfo5Digit, error: myError5Digit } = myInfo5DigitResult
      const { data: revieweesOriginal, error: revieweesErrorOriginal } = revieweesResultOriginal
      const { data: reviewees5Digit, error: revieweesError5Digit } = revieweesResult5Digit
      const { data: revieweesConverted, error: revieweesErrorConverted } = revieweesResultConverted

      if (myError && myError.code !== 'PGRST116') {
        console.error("❌ My info query error (original):", myError)
      }
      
      if (myError5Digit && myError5Digit.code !== 'PGRST116') {
        console.error("❌ My info query error (5-digit):", myError5Digit)
      }

      if (revieweesErrorOriginal) {
        console.error("❌ Reviewees (original) query error:", revieweesErrorOriginal)
      }
      
      if (revieweesError5Digit) {
        console.error("❌ Reviewees (5-digit) query error:", revieweesError5Digit)
      }
      
      if (revieweesErrorConverted) {
        console.error("❌ Reviewees (converted) query error:", revieweesErrorConverted)
      }
      
      // 내 정보는 둘 중 하나라도 성공하면 사용
      const finalMyInfo = myInfo || myInfo5Digit
      
      // 세 가지 결과를 합치고 중복 제거 (사번 기준)
      const allReviewees = [...(revieweesOriginal || []), ...(reviewees5Digit || []), ...(revieweesConverted || [])]
      const uniqueRevieweesMap = new Map()
      allReviewees.forEach(reviewee => {
        uniqueRevieweesMap.set(reviewee.사번, reviewee)
      })
      const reviewees = Array.from(uniqueRevieweesMap.values()).map(reviewee => ({
        ...reviewee,
        사번: this.normalizeEmpno(reviewee.사번), // 사번 정규화: 95129 → 095129
        'Reviewer 사번': this.normalizeEmpno(reviewee['Reviewer 사번']) // 리뷰어 사번도 정규화
      }))
      
      console.log("🔍 ReviewerService: My info found with original empno:", !!myInfo)
      console.log("🔍 ReviewerService: My info found with 5-digit empno:", !!myInfo5Digit)
      console.log("🔍 ReviewerService: Reviewees found with original empno:", revieweesOriginal?.length || 0)
      console.log("🔍 ReviewerService: Reviewees found with 5-digit empno:", reviewees5Digit?.length || 0)
      console.log("🔍 ReviewerService: Reviewees found with converted empno:", revieweesConverted?.length || 0)
      console.log("🔍 ReviewerService: Total unique reviewees:", reviewees.length)
      console.log("🔍 ReviewerService: Is master user:", isMaster)

      const userRole: UserRole = {
        isSelf: !!finalMyInfo,
        isReviewer: (reviewees && reviewees.length > 0) || false,
        isMaster: isMaster,
        myInfo: finalMyInfo || null,
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

      // 사번 정규화 처리
      return (data || []).map(reviewee => ({
        ...reviewee,
        사번: this.normalizeEmpno(reviewee.사번), // 사번 정규화: 95129 → 095129
        'Reviewer 사번': this.normalizeEmpno(reviewee['Reviewer 사번']) // 리뷰어 사번도 정규화
      }))
    } catch (error) {
      console.error("❌ Get reviewees error:", error)
      return []
    }
  }
} 