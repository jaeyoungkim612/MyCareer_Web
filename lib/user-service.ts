import { supabase } from "./supabase"

// 확장된 사용자 정보 인터페이스
export interface ExtendedUser {
  // 기본 정보
  empno: string
  empnm: string
  pwc_id: string
  is_verified: boolean
  
  // HR 마스터 정보
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
  
  // 사진 정보
  photo_url?: string
  file_name?: string
  uploaded_at?: string
}

// 사용자 정보 조회 결과
export interface UserInfoResult {
  success: boolean
  message: string
  user?: ExtendedUser
}

export class UserService {
  // 사번으로 확장된 사용자 정보 조회
  static async getUserInfo(empno: string): Promise<UserInfoResult> {
    try {
      // 먼저 기본 HR 마스터 정보만 조회
      const { data: hrData, error: hrError } = await supabase
        .from("a_hr_master")
        .select(`
          EMPNO,
          EMPNM,
          PWC_ID,
          CM_NM,
          GRADCD,
          TL_EMPNO,
          POS_YMD,
          JOB_INFO_NM,
          CM_CD,
          EMP_STAT,
          WORK_TYPE_NM,
          ETL_DATE,
          CREATED_DATE,
          LICENSE_CD,
          LICENSE_NM,
          GRADNM,
          COMPANY_NM,
          LOS,
          ORG_CD,
          ORG_NM,
          JOB_GROUP_NM,
          ENG_NM
        `)
        .eq("EMPNO", empno)
        .single()

      if (hrError || !hrData) {
        return {
          success: false,
          message: "사용자 정보를 찾을 수 없습니다.",
        }
      }

      // 사진 정보 별도 조회 (LEFT JOIN 대신 별도 쿼리)
      const { data: photoData } = await supabase
        .from("employee_photos")
        .select("photo_url, file_name, uploaded_at")
        .eq("empno", empno)
        .single()

      // 인증 상태 확인
      const { data: authData } = await supabase
        .from("local_auth")
        .select("is_verified")
        .eq("empno", empno)
        .single()

      const extendedUser: ExtendedUser = {
        empno: hrData.EMPNO,
        empnm: hrData.EMPNM,
        pwc_id: hrData.PWC_ID,
        is_verified: authData?.is_verified || false,
        cm_nm: hrData.CM_NM,
        gradcd: hrData.GRADCD,
        tl_empno: hrData.TL_EMPNO,
        pos_ymd: hrData.POS_YMD,
        job_info_nm: hrData.JOB_INFO_NM,
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
        photo_url: photoData?.photo_url,
        file_name: photoData?.file_name,
        uploaded_at: photoData?.uploaded_at,
      }

      return {
        success: true,
        message: "사용자 정보 조회 성공",
        user: extendedUser,
      }
    } catch (error) {
      console.error("User info error:", error)
      return {
        success: false,
        message: "사용자 정보 조회 중 오류가 발생했습니다.",
      }
    }
  }

  // 현재 로그인한 사용자의 확장 정보 조회
  static async getCurrentUserInfo(): Promise<UserInfoResult> {
    // localStorage에서 현재 사용자 사번 가져오기
    if (typeof window === "undefined") {
      return {
        success: false,
        message: "서버 환경에서는 사용자 정보를 조회할 수 없습니다.",
      }
    }

    try {
      const userStr = localStorage.getItem("auth_user")
      if (!userStr) {
        return {
          success: false,
          message: "로그인된 사용자가 없습니다.",
        }
      }

      const user = JSON.parse(userStr)
      return await this.getUserInfo(user.empno)
    } catch (error) {
      console.error("Current user info error:", error)
      return {
        success: false,
        message: "현재 사용자 정보 조회 중 오류가 발생했습니다.",
      }
    }
  }

  // 사용자 정보를 간단한 형태로 변환 (기존 User 인터페이스와 호환)
  static toBasicUser(extendedUser: ExtendedUser) {
    return {
      empno: extendedUser.empno,
      empnm: extendedUser.empnm,
      pwc_id: extendedUser.pwc_id,
      is_verified: extendedUser.is_verified,
    }
  }
} 