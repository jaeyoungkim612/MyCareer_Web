import { supabase } from "./supabase"

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
  created_at?: string
  updated_at?: string
}

export class BusinessGoalsService {
  static async getByEmployeeId(employee_id: string): Promise<BusinessGoal | null> {
    // 사번 정규화 (95129 → 095129)
    const { ReviewerService } = await import('./reviewer-service')
    const normalizedEmployeeId = ReviewerService.normalizeEmpno(employee_id)
    console.log(`🔧 BusinessGoalsService: Normalizing employee ID: ${employee_id} → ${normalizedEmployeeId}`)
    
    const { data, error } = await supabase
      .from("business_goals")
      .select("*")
      .eq("employee_id", normalizedEmployeeId)
      .order("created_at", { ascending: false })
      .limit(1)
    if (error || !data || data.length === 0) return null
    return data[0]
  }

  static async upsertGoal(goal: Omit<BusinessGoal, "id" | "created_at" | "updated_at">): Promise<BusinessGoal | null> {
    // 사번 정규화 (95129 → 095129)
    const { ReviewerService } = await import('./reviewer-service')
    const normalizedEmployeeId = ReviewerService.normalizeEmpno(goal.employee_id)
    console.log(`🔧 BusinessGoalsService: Normalizing employee ID for upsert: ${goal.employee_id} → ${normalizedEmployeeId}`)
    
    const normalizedGoal = {
      ...goal,
      employee_id: normalizedEmployeeId
    }
    
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from("business_goals")
      .upsert({ ...normalizedGoal, updated_at: now }, { onConflict: "employee_id" })
      .select()
    if (error || !data || data.length === 0) return null
    return data[0]
  }
}
