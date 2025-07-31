import { supabase } from "./supabase"
import { UserInfoMapper } from "../data/user-info"
import { PasswordUtils } from "./password-utils"

export interface User {
  empno: string
  empnm: string
  pwc_id: string
  is_verified: boolean
  is_password_changed: boolean
}

export interface LoginResult {
  success: boolean
  message: string
  user?: User
  needsVerification?: boolean
  needsPasswordChange?: boolean
  isPasswordError?: boolean
}

export class AuthService {
  // 현재 사용자 정보 가져오기 (24시간 만료 체크)
  static getCurrentUser(): User | null {
    if (typeof window === "undefined") return null

    try {
      const userStr = localStorage.getItem("auth_user")
      const timestampStr = localStorage.getItem("auth_timestamp")
      
      if (!userStr || !timestampStr) {
        return null
      }

      // 24시간 만료 체크
      const now = new Date().getTime()
      const expiryTime = parseInt(timestampStr)
      
      if (now > expiryTime) {
        // 세션 만료 - 자동 로그아웃
        console.log("⏰ Session expired, auto logout")
        this.clearSession()
        return null
      }

      return JSON.parse(userStr)
    } catch {
      return null
    }
  }

  // 세션 정보 완전 삭제 (내부용)
  private static clearSession(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_user")
      localStorage.removeItem("auth_timestamp")
      console.log("🗑️ Session cleared")
    }
  }

  // 인증 상태 확인
  static isAuthenticated(): boolean {
    const user = this.getCurrentUser()
    return user !== null && user.is_verified === true
  }

  // 비밀번호 변경 필요 여부 확인
  static needsPasswordChange(): boolean {
    const user = this.getCurrentUser()
    return user !== null && user.is_verified === true && user.is_password_changed === false
  }

  // 사용자 정보 저장 (24시간 만료)
  static setCurrentUser(user: User): void {
    if (typeof window !== "undefined") {
      const now = new Date().getTime()
      const expiryTime = now + (24 * 60 * 60 * 1000) // 24시간 후
      
      localStorage.setItem("auth_user", JSON.stringify(user))
      localStorage.setItem("auth_timestamp", expiryTime.toString())
      
      console.log("💾 User session saved with 24h expiry:", new Date(expiryTime).toLocaleString())
    }
  }

  // 로그아웃 (세션만 삭제, DB는 유지)
  static logout(): void {
    if (typeof window !== "undefined") {
      this.clearSession()
      UserInfoMapper.clearUserInfo()
      console.log("🚪 User logged out - session cleared, DB preserved")
    }
  }

  // 로그인 시작
  static async initiateLogin(empno: string, password: string): Promise<LoginResult> {
    try {
      console.log("🔍 Starting login process for empno:", empno, "password length:", password.length);

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
        // 🔐 기존 사용자 - 비밀번호 검증
        console.log("🔐 Verifying password for existing user");
        
        const isPasswordValid = PasswordUtils.verifyPassword(password, existingAuth.password_hash);
        
        if (!isPasswordValid) {
          console.error("❌ Invalid password");
          const errorResult = {
            success: false,
            message: "비밀번호가 올바르지 않습니다.",
            isPasswordError: true,
          };
          console.log("🔍 AuthService: Password error result:", errorResult);
          return errorResult;
        }

        // 비밀번호 검증 성공 - 사용자 정보 업데이트
        console.log("📝 Password verified, updating user info");
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
        // 🆕 새 사용자 생성 - 기본 비밀번호 확인
        console.log("🆕 Creating new user, checking default password");
        
        if (password !== "3131") {
          console.error("❌ New user must use default password 3131");
          const errorResult = {
            success: false,
            message: "비밀번호가 올바르지 않습니다.",
            isPasswordError: true,
          };
          console.log("🔍 AuthService: New user password error result:", errorResult);
          return errorResult;
        }

        const defaultPasswordHash = PasswordUtils.getDefaultPasswordHash();
        
        const { data: newData, error: insertError } = await supabase
          .from("local_auth")
          .insert({
            empno: hrData.EMPNO,
            empnm: hrData.EMPNM,
            pwc_id: hrData.PWC_ID,
            password_hash: defaultPasswordHash,
            is_password_changed: false,
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

      console.log("✅ Auth data processed:", { ...authData, password_hash: "[HIDDEN]" });

      // 4. 비밀번호 변경 필요 여부 확인
      const needsPasswordChange = !authData.is_password_changed;

      // 5. 인증된 사용자 정보 localStorage에 저장
      const userData: User = {
        empno: authData.empno,
        empnm: authData.empnm,
        pwc_id: authData.pwc_id,
        is_verified: true,
        is_password_changed: authData.is_password_changed
      };

      this.setCurrentUser(userData);

      console.log("✅ Login successful for:", authData.empnm, "needsPasswordChange:", needsPasswordChange);

      return {
        success: true,
        message: needsPasswordChange ? "비밀번호 변경이 필요합니다." : "로그인 성공",
        user: userData,
        needsPasswordChange: needsPasswordChange,
      };
    } catch (error) {
      console.error("❌ Login error:", error);
      return {
        success: false,
        message: "로그인 처리 중 오류가 발생했습니다.",
      };
    }
  }

  // 비밀번호 변경
  static async changePassword(currentPassword: string, newPassword: string): Promise<{success: boolean; message: string}> {
    try {
      const currentUser = this.getCurrentUser()
      if (!currentUser) {
        return {
          success: false,
          message: "로그인이 필요합니다.",
        }
      }

      console.log("🔄 Changing password for user:", currentUser.empno)

      // 1. 현재 비밀번호 검증
      const { data: authData } = await supabase
        .from("local_auth")
        .select("password_hash")
        .eq("empno", currentUser.empno)
        .single()

      if (!authData) {
        return {
          success: false,
          message: "사용자 정보를 찾을 수 없습니다.",
        }
      }

      const isCurrentPasswordValid = PasswordUtils.verifyPassword(currentPassword, authData.password_hash)
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: "현재 비밀번호가 올바르지 않습니다.",
        }
      }

      // 2. 새 비밀번호 유효성 검사
      const validation = PasswordUtils.validatePasswordStrength(newPassword)
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message,
        }
      }

      // 3. 새 비밀번호 해시화
      const newPasswordHash = PasswordUtils.hashPassword(newPassword)

      // 4. 데이터베이스 업데이트
      const { error } = await supabase
        .from("local_auth")
        .update({
          password_hash: newPasswordHash,
          is_password_changed: true,
          password_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("empno", currentUser.empno)

      if (error) {
        console.error("❌ Password update error:", error)
        return {
          success: false,
          message: "비밀번호 변경 중 오류가 발생했습니다.",
        }
      }

      // 5. 로컬스토리지 사용자 정보 업데이트
      const updatedUser: User = {
        ...currentUser,
        is_password_changed: true
      }
      this.setCurrentUser(updatedUser)

      console.log("✅ Password changed successfully for:", currentUser.empno)

      return {
        success: true,
        message: "비밀번호가 성공적으로 변경되었습니다.",
      }
    } catch (error) {
      console.error("❌ Change password error:", error)
      return {
        success: false,
        message: "비밀번호 변경 중 오류가 발생했습니다.",
      }
    }
  }


}
