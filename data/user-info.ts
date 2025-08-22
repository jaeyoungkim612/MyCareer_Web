import { supabase } from "../lib/supabase"

// HR 마스터에서 가져올 수 있는 모든 사용자 정보 인터페이스
export interface UserMasterInfo {
  empno: string
  empnm: string
  pwc_id: string
  cm_nm?: string
  gradcd?: string
  tl_empno?: string
  pos_ymd?: string
  job_info_nm?: string
  cm_cd?: string
  emp_stat?: string
  work_type_nm?: string
  etl_date?: string
  created_date?: string
  license_cd?: string
  license_nm?: string
  gradnm?: string
  company_nm?: string
  los?: string
  org_cd?: string
  org_nm?: string
  job_group_nm?: string
  eng_nm?: string
  photo_url?: string
  file_name?: string
  uploaded_at?: string
  last_updated?: string // 마지막 갱신 시간 추가
  // L_직무및활동 테이블에서 가져올 정보
  industry_specialization?: string // 산업전문화
  council_tf?: string // Council/TF 등
  gsp_focus_30?: string // GSP/Focus 30
}

// 사용자 정보 매핑 객체
export class UserInfoMapper {
  private static userInfo: UserMasterInfo | null = null
  private static readonly CACHE_DURATION = 60 * 60 * 1000 // 1시간 (밀리초)

  // localStorage에 저장
  static saveToStorage(): void {
    if (this.userInfo) {
      localStorage.setItem("user_info", JSON.stringify(this.userInfo))
    }
  }

  // localStorage에서 불러오기
  static loadFromStorage(): UserMasterInfo | null {
    try {
      const str = localStorage.getItem("user_info")
      if (str) {
        this.userInfo = JSON.parse(str)
        return this.userInfo
      }
    } catch (error) {
      console.error("localStorage에서 사용자 정보 불러오기 실패:", error)
    }
    return null
  }

  // 캐시가 유효한지 확인 (1시간 이내인지)
  static isCacheValid(): boolean {
    if (!this.userInfo?.last_updated) return false
    
    const lastUpdated = new Date(this.userInfo.last_updated).getTime()
    const now = new Date().getTime()
    return (now - lastUpdated) < this.CACHE_DURATION
  }

  // 사번으로 HR 마스터 + employee_photos + L_직무및활동에서 정보 가져오기
  static async loadUserInfo(empno: string): Promise<UserMasterInfo | null> {
    try {
      console.log("🔍 Loading user info for empno:", empno)
      
      // 1. HR 마스터 정보 조회
      const { data: hrData, error: hrError } = await supabase
        .from("a_hr_master")
        .select("*")
        .eq("EMPNO", empno)
        .single()

      if (hrError || !hrData) {
        console.error("❌ HR 마스터 정보 조회 실패:", hrError)
        return null
      }
      console.log("✅ HR 마스터 정보 조회 성공:", hrData.EMPNM)

      // 2. 사진 정보는 employee_photos에서만 조회 (empno 소문자)
      const { data: photoData } = await supabase
        .from("employee_photos")
        .select("file_name, photo_url, uploaded_at")
        .eq("empno", empno)
        .single()
      console.log("📷 Photo data:", photoData ? "found" : "not found")

      // 3. L_직무및활동 테이블에서 산업전문화, Council/TF, GSP/Focus 30 정보 조회
      const { data: jobActivityData, error: jobError } = await supabase
        .from("L_직무및활동")
        .select("산업전문화, \"Council/TF 등\", \"GSP/Focus 30\"")
        .eq("사번", empno)
        .single()
      
      if (jobError) {
        console.warn("⚠️ L_직무및활동 정보 조회 실패:", jobError)
      } else {
        console.log("✅ L_직무및활동 정보 조회 성공:", jobActivityData)
      }

      // 4. 매핑
      const userInfo: UserMasterInfo = {
        empno: hrData.EMPNO,
        empnm: hrData.EMPNM,
        pwc_id: hrData.PWC_ID,
        cm_nm: hrData.CM_NM,
        gradcd: hrData.GRADCD,
        tl_empno: hrData.TL_EMPNO,
        pos_ymd: hrData.POS_YMD,
        // L_직무및활동 테이블의 "보직"만 사용
        job_info_nm: (jobActivityData as any)?.["보직"] || null,
        cm_cd: hrData.CM_CD,
        emp_stat: hrData.EMP_STAT,
        work_type_nm: hrData.WORK_TYPE_NM,
        etl_date: hrData.ETL_DATE,
        created_date: hrData.CREATED_DATE,
        license_cd: hrData.LICENSE_CD,
        license_nm: hrData.LICENSE_NM,
        gradnm: hrData.GRADNM,
        company_nm: hrData.COMPANY_NM,
        los: hrData.LOS,
        org_cd: hrData.ORG_CD,
        org_nm: hrData.ORG_NM,
        job_group_nm: hrData.JOB_GROUP_NM,
        eng_nm: hrData.ENG_NM,
        // 사진 정보는 오직 employee_photos에서만
        photo_url: photoData?.photo_url,
        file_name: photoData?.file_name,
        uploaded_at: photoData?.uploaded_at,
        // L_직무및활동 테이블에서 가져온 정보
        industry_specialization: (jobActivityData as any)?.["산업전문화"] || null,
        council_tf: (jobActivityData as any)?.["Council/TF 등"] || null,
        gsp_focus_30: (jobActivityData as any)?.["GSP/Focus 30"] || null,
        last_updated: new Date().toISOString(),
      }

      console.log("🎯 Final user info assembled:", {
        empno: userInfo.empno,
        empnm: userInfo.empnm,
        job_info_nm: userInfo.job_info_nm,
        job_info_source: (jobActivityData as any)?.["보직"] ? "L_직무및활동" : "없음",
        industry_specialization: userInfo.industry_specialization,
        council_tf: userInfo.council_tf,
        gsp_focus_30: userInfo.gsp_focus_30
      })

      this.userInfo = userInfo
      this.saveToStorage()
      return userInfo
    } catch (error) {
      console.error("❌ 사용자 정보 로드 오류:", error)
      return null
    }
  }

  // 현재 저장된 사용자 정보 가져오기 (캐시 우선, 필요시 갱신)
  static async getUserInfo(): Promise<UserMasterInfo | null> {
    // 1. 먼저 localStorage에서 불러오기
    if (!this.userInfo) {
      this.loadFromStorage()
    }

    // 2. 캐시가 유효하면 그대로 사용
    if (this.userInfo && this.isCacheValid()) {
      return this.userInfo
    }

    // 3. 캐시가 없거나 만료되었으면 DB에서 갱신
    if (this.userInfo?.empno) {
      console.log("사용자 정보 캐시 만료, DB에서 갱신 중...")
      return await this.loadUserInfo(this.userInfo.empno)
    }

    return this.userInfo
  }

  // 수동으로 DB에서 갱신
  static async refreshUserInfo(): Promise<UserMasterInfo | null> {
    if (this.userInfo?.empno) {
      console.log("사용자 정보 수동 갱신 중...")
      return await this.loadUserInfo(this.userInfo.empno)
    }
    return null
  }

  // 사용자 정보 초기화
  static clearUserInfo(): void {
    this.userInfo = null
    localStorage.removeItem("user_info")
  }

  // 사용자 정보가 있는지 확인
  static hasUserInfo(): boolean {
    return this.userInfo !== null
  }

  // 기본 정보만 가져오기
  static getBasicInfo() {
    if (!this.userInfo) return null
    
    return {
      empno: this.userInfo.empno,
      empnm: this.userInfo.empnm,
      pwc_id: this.userInfo.pwc_id,
    }
  }

  // 조직 정보만 가져오기
  static getOrganizationInfo() {
    if (!this.userInfo) return null
    
    return {
      org_cd: this.userInfo.org_cd,
      org_nm: this.userInfo.org_nm,
      company_nm: this.userInfo.company_nm,
      los: this.userInfo.los,
      job_group_nm: this.userInfo.job_group_nm,
    }
  }

  // 직급 정보만 가져오기
  static getPositionInfo() {
    if (!this.userInfo) return null
    
    return {
      gradcd: this.userInfo.gradcd,
      gradnm: this.userInfo.gradnm,
      job_info_nm: this.userInfo.job_info_nm,
      work_type_nm: this.userInfo.work_type_nm,
    }
  }

  // 팀 정보만 가져오기
  static getTeamInfo() {
    if (!this.userInfo) return null
    
    return {
      cm_cd: this.userInfo.cm_cd,
      cm_nm: this.userInfo.cm_nm,
      tl_empno: this.userInfo.tl_empno,
    }
  }

  // 라이센스 정보만 가져오기
  static getLicenseInfo() {
    if (!this.userInfo) return null
    
    return {
      license_cd: this.userInfo.license_cd,
      license_nm: this.userInfo.license_nm,
    }
  }

  // 사진 정보만 가져오기
  static getPhotoInfo() {
    if (!this.userInfo) return null
    
    return {
      photo_url: this.userInfo.photo_url,
      file_name: this.userInfo.file_name,
      uploaded_at: this.userInfo.uploaded_at,
    }
  }
}

// 사용자 정보 유틸리티 함수들
export const userInfoUtils = {
  // 사용자 이름 포맷팅
  formatUserName: (user: UserMasterInfo) => {
    return `${user.empnm} (${user.empno})`
  },

  // 사용자 직급 표시
  formatUserPosition: (user: UserMasterInfo) => {
    if (user.gradnm && user.job_info_nm) {
      return `${user.gradnm} / ${user.job_info_nm}`
    }
    return user.job_info_nm || user.gradnm || "직급 정보 없음"
  },

  // 사용자 조직 표시
  formatUserOrganization: (user: UserMasterInfo) => {
    if (user.org_nm && user.company_nm) {
      return `${user.company_nm} / ${user.org_nm}`
    }
    return user.org_nm || user.company_nm || "조직 정보 없음"
  },

  // 사용자 팀 표시
  formatUserTeam: (user: UserMasterInfo) => {
    return user.cm_nm || "팀 정보 없음"
  },

  // 사용자 사진 URL 가져오기 (기본 이미지 대체)
  getUserPhotoUrl: (user: UserMasterInfo) => {
    return user.photo_url || "/placeholder-user.jpg"
  },
} 