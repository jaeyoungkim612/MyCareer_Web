import { supabase } from "./supabase"

export interface QualityGoal {
  id?: number
  employee_id: string
  quality_goal: string
  doae_rate: number
  yra_ratio: number
  non_audit_goal: string
  created_at?: string
  updated_at?: string
  performance?: string // 신규/기존 서비스 진행상황 JSON 문자열
  performance_status?: string // 비감사서비스 성과 상태(pending, in_progress, completed)
}

export class QualityGoalsService {
  static async getByEmployeeId(employee_id: string): Promise<QualityGoal | null> {
    // 사번 정규화 (95129 → 095129)
    const { ReviewerService } = await import('./reviewer-service')
    const normalizedEmployeeId = ReviewerService.normalizeEmpno(employee_id)
    console.log(`🔧 QualityGoalsService: Normalizing employee ID: ${employee_id} → ${normalizedEmployeeId}`)
    
    const { data, error } = await supabase
      .from("quality_goals")
      .select("*")
      .eq("employee_id", normalizedEmployeeId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  }

  static async upsertGoal(goal: Omit<QualityGoal, "id" | "created_at" | "updated_at">): Promise<QualityGoal | null> {
    // 사번 정규화 (95129 → 095129)
    const { ReviewerService } = await import('./reviewer-service')
    const normalizedEmployeeId = ReviewerService.normalizeEmpno(goal.employee_id)
    console.log(`🔧 QualityGoalsService: Normalizing employee ID for upsert: ${goal.employee_id} → ${normalizedEmployeeId}`)
    
    const normalizedGoal = {
      ...goal,
      employee_id: normalizedEmployeeId
    }
    
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("quality_goals")
      .upsert({ ...normalizedGoal, updated_at: now }, { onConflict: "employee_id" })
      .select()
      .maybeSingle();
    if (error || !data) return null;
    return data;
  }
} 