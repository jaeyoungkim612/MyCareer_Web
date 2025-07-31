import { createClient } from "@supabase/supabase-js"

// 환경변수 완전히 무시하고 실제 값 하드코딩
const supabaseUrl = "https://ekmymbjlqazsclzxxizs.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrbXltYmpscWF6c2Nsenh4aXpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyMjIzMDAsImV4cCI6MjA2NTc5ODMwMH0.fRhzwYIv33fTlwfn3sn20PI9X2fsrAFKe3QFZuyLV7s"

// 연결 확인용 로그
console.log("🔗 연결 중인 Supabase URL:", supabaseUrl)
console.log("🔑 사용 중인 Key (앞 30자):", supabaseAnonKey.substring(0, 30) + "...")

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface BusinessGoal {
  id?: number
  employee_id: string
  business_goal: string
  new_audit_count: number
  new_audit_amount: number
  hourly_revenue: number
  ui_revenue_count: number
  ui_revenue_amount: number
  non_audit_hourly_revenue: number
  audit_adjusted_em: number
  non_audit_adjusted_em: number
  created_at?: string
  updated_at?: string
}

// 연결 테스트만 하는 함수 (더미 데이터 삽입 안함)
export async function testConnection() {
  try {
    console.log("Testing Supabase connection...")

    // 단순히 테이블 존재 여부만 확인
    const { data, error } = await supabase.from("business_goals").select("count", { count: "exact", head: true })

    if (error) {
      console.error("Connection test failed:", error)
      return { success: false, error: error.message }
    }

    console.log("Connection test successful")
    return { success: true, message: "Connection successful" }
  } catch (error) {
    console.error("Connection test error:", error)
    return { success: false, error: String(error) }
  }
}

// 기존 testAndInsertData 함수는 제거하고 testConnection으로 대체
export const testAndInsertData = testConnection
