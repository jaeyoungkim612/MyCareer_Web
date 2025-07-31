import crypto from 'crypto'

export class PasswordUtils {
  // 비밀번호 해싱 (PBKDF2 + Salt)
  static hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex')
    return `${salt}:${hash}`
  }

  // 비밀번호 검증
  static verifyPassword(password: string, hashedPassword: string): boolean {
    try {
      const [salt, hash] = hashedPassword.split(':')
      if (!salt || !hash) return false
      
      const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex')
      return hash === verifyHash
    } catch (error) {
      console.error('Password verification error:', error)
      return false
    }
  }

  // 기본 비밀번호 "3131"의 고정 해시값 생성
  static getDefaultPasswordHash(): string {
    // 고정된 Salt로 일관된 해시값 생성 (모든 새 사용자가 같은 기본 비밀번호 해시를 가지도록)
    const salt = 'defaultsalt123456'
    const hash = crypto.pbkdf2Sync('3131', salt, 10000, 64, 'sha256').toString('hex')
    return `${salt}:${hash}`
  }

  // 기본 비밀번호인지 확인
  static isDefaultPassword(hashedPassword: string): boolean {
    return hashedPassword === this.getDefaultPasswordHash()
  }

  // 비밀번호 강도 검증
  static validatePasswordStrength(password: string): { isValid: boolean; message: string } {
    if (password.length < 8) {
      return { isValid: false, message: "비밀번호는 최소 8자 이상이어야 합니다." }
    }

    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      return { isValid: false, message: "비밀번호는 영문과 숫자를 포함해야 합니다." }
    }

    if (password === '3131') {
      return { isValid: false, message: "기본 비밀번호는 사용할 수 없습니다." }
    }

    return { isValid: true, message: "사용 가능한 비밀번호입니다." }
  }
}