import { supabase } from "./supabase"

export interface CollaborationGoal {
  id?: number
  employee_id: string
  business_goal: string
  x_los_target_count: number
  x_los_target_amount: number
  losllk_target_count: number
  losllk_target_amount: number
  ax_node_target_count: number
  ax_node_target_amount: number
  status?: 'Draft' | '작성중' | '완료'
  created_at?: string
  updated_at?: string
}

export class CollaborationService {
  static async getByEmployeeId(employee_id: string): Promise<CollaborationGoal | null> {
    // 사번 정규화 (95129 → 095129)
    const { ReviewerService } = await import('./reviewer-service')
    const normalizedEmployeeId = ReviewerService.normalizeEmpno(employee_id)
    console.log(`🔧 CollaborationService: Normalizing employee ID: ${employee_id} → ${normalizedEmployeeId}`)
    
    const { data, error } = await supabase
      .from("collaborations")
      .select("*")
      .eq("employee_id", normalizedEmployeeId)
      .order("created_at", { ascending: false })
      .limit(1)
    if (error || !data || data.length === 0) return null
    return data[0]
  }

  static async upsertGoal(goal: Omit<CollaborationGoal, "id" | "created_at" | "updated_at">): Promise<CollaborationGoal | null> {
    // 사번 정규화 (95129 → 095129)
    const { ReviewerService } = await import('./reviewer-service')
    const normalizedEmployeeId = ReviewerService.normalizeEmpno(goal.employee_id)
    console.log(`🔧 CollaborationService: Normalizing employee ID for upsert: ${goal.employee_id} → ${normalizedEmployeeId}`)
    
    const normalizedGoal = {
      ...goal,
      employee_id: normalizedEmployeeId
    }
    
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from("collaborations")
      .upsert({ ...normalizedGoal, updated_at: now }, { onConflict: "employee_id" })
      .select()
    if (error || !data || data.length === 0) return null
    return data[0]
  }

  static async getActualsByEmployeeId(employee_id: string): Promise<{
    xlos: { count: number, amount: number },
    los: { count: number, amount: number },
    axnode: { count: number, amount: number }
  } | null> {
    // 사번 정규화 (95129 → 095129)
    const { ReviewerService } = await import('./reviewer-service')
    const normalizedEmployeeId = ReviewerService.normalizeEmpno(employee_id)
    console.log(`🔧 CollaborationService: Normalizing employee ID for actuals: ${employee_id} → ${normalizedEmployeeId}`)
    
    const { data, error } = await supabase
      .from('v_collaboration')
      .select('GUBUN, REFCNT, TOTREV')
      .eq('EMPLNO', normalizedEmployeeId)
      .in('GUBUN', ['X-LoS', 'LoS', 'PwCC']);
    if (error) return null;
    const result = {
      xlos: { count: 0, amount: 0 },
      los: { count: 0, amount: 0 },
      axnode: { count: 0, amount: 0 }
    };
    data?.forEach((row: any) => {
      if (row.GUBUN === 'X-LoS') result.xlos = { count: Number(row.REFCNT), amount: Number(row.TOTREV) };
      if (row.GUBUN === 'LoS') result.los = { count: Number(row.REFCNT), amount: Number(row.TOTREV) };
      if (row.GUBUN === 'PwCC') result.axnode = { count: Number(row.REFCNT), amount: Number(row.TOTREV) };
    });
    return result;
  }
} 