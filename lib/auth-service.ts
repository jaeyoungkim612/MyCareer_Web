import { supabase } from "./supabase"
import { UserInfoMapper } from "../data/user-info"

export interface User {
  empno: string
  empnm: string
  pwc_id: string
  is_verified: boolean
}

export interface LoginResult {
  success: boolean
  message: string
  user?: User
  needsVerification?: boolean
}

export class AuthService {
  // 현재 사용자 정보 가져오기
  static getCurrentUser(): User | null {
    if (typeof window === "undefined") return null

    try {
      const userStr = localStorage.getItem("auth_user")
      return userStr ? JSON.parse(userStr) : null
    } catch {
      return null
    }
  }

  // 인증 상태 확인
  static isAuthenticated(): boolean {
    const user = this.getCurrentUser()
    return user !== null && user.is_verified === true
  }

  // 사용자 정보 저장
  static setCurrentUser(user: User): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_user", JSON.stringify(user))
    }
  }

  // 로그아웃 시 UserInfoMapper도 초기화
  static logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_user")
      UserInfoMapper.clearUserInfo()
    }
  }

  // 로그인 시작
  static async initiateLogin(empno: string): Promise<LoginResult> {
    try {
      console.log("🔍 Starting login process for empno:", empno);

      // 1. HR 마스터에서 사용자 정보 조회
      const { data: hrData, error: hrError } = await supabase
        .from("a_hr_master")
        .select("EMPNO, EMPNM, PWC_ID")
        .eq("EMPNO", empno)
        .single();

      if (hrError || !hrData) {
        console.error("❌ HR data not found:", hrError);
        return {
          success: false,
          message: "등록되지 않은 사번입니다.",
        };
      }

      console.log("✅ HR data found:", hrData);

      // 2. UserInfoMapper에 사용자 정보 로드
      await UserInfoMapper.loadUserInfo(empno)

      // 3. local_auth에서 기존 사용자 확인
      const { data: existingAuth } = await supabase
        .from("local_auth")
        .select("*")
        .eq("empno", hrData.EMPNO)
        .single();

      let authData;

      if (existingAuth) {
        // 기존 사용자 업데이트
        console.log("📝 Updating existing user in local_auth");
        const { data: updatedData, error: updateError } = await supabase
          .from("local_auth")
          .update({
            empnm: hrData.EMPNM,
            pwc_id: hrData.PWC_ID,
            is_verified: true,
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("empno", hrData.EMPNO)
          .select("*")
          .single();

        if (updateError) {
          console.error("❌ Update error:", updateError);
          return {
            success: false,
            message: "로그인 처리 중 오류가 발생했습니다.",
          };
        }
        authData = updatedData;
      } else {
        // 새 사용자 생성
        console.log("➕ Creating new user in local_auth");
        const { data: newData, error: insertError } = await supabase
          .from("local_auth")
          .insert({
            empno: hrData.EMPNO,
            empnm: hrData.EMPNM,
            pwc_id: hrData.PWC_ID,
            is_verified: true,
            last_login: new Date().toISOString(),
          })
          .select("*")
          .single();

        if (insertError) {
          console.error("❌ Insert error:", insertError);
          return {
            success: false,
            message: "로그인 처리 중 오류가 발생했습니다.",
          };
        }
        authData = newData;
      }

      if (!authData) {
        return {
          success: false,
          message: "로그인 처리 중 오류가 발생했습니다.",
        };
      }

      console.log("✅ Auth data processed:", authData);

      // 4. 인증된 사용자 정보 localStorage에 저장
      this.setCurrentUser({
        empno: authData.empno,
        empnm: authData.empnm,
        pwc_id: authData.pwc_id,
        is_verified: true,
      });

      console.log("✅ Login successful for:", authData.empnm);

      return {
        success: true,
        message: "로그인 성공",
        user: {
          empno: authData.empno,
          empnm: authData.empnm,
          pwc_id: authData.pwc_id,
          is_verified: true,
        },
      };
    } catch (error) {
      console.error("❌ Login error:", error);
      return {
        success: false,
        message: "로그인 처리 중 오류가 발생했습니다.",
      };
    }
  }

  // 개발용 완전 삭제 (수정됨)
  static async deleteUserCompletely(): Promise<{ success: boolean; message: string }> {
    try {
      const currentUser = this.getCurrentUser()
      if (!currentUser) {
        return {
          success: false,
          message: "삭제할 사용자 정보가 없습니다.",
        }
      }

      console.log("🗑️ 사용자 완전 삭제 시작:", currentUser.empno)

      // 1. Supabase 데이터베이스에서 삭제
      const { error } = await supabase.from("local_auth").delete().eq("empno", currentUser.empno)

      if (error) {
        console.error("❌ Database delete error:", error)
        return {
          success: false,
          message: "데이터베이스 삭제 중 오류가 발생했습니다: " + error.message,
        }
      }

      console.log("✅ 데이터베이스에서 사용자 삭제 완료")

      // 2. 로컬스토리지에서 삭제
      this.logout()
      console.log("✅ 로컬스토리지에서 사용자 삭제 완료")

      return {
        success: true,
        message: `사용자 ${currentUser.empnm}(${currentUser.empno})의 정보가 완전히 삭제되었습니다.`,
      }
    } catch (error) {
      console.error("❌ Complete delete error:", error)
      return {
        success: false,
        message: "삭제 처리 중 오류가 발생했습니다: " + (error as Error).message,
      }
    }
  }
}
