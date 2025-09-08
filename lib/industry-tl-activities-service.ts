import { supabase } from "./supabase"

export interface IndustryTLActivity {
  id?: number
  employee_id: string // 사번 필드 추가
  date: string // YYYY-MM-DD
  category: '산업전문화' | '감사효율화' | '신규 Product' | 'TL 활동' | 'BD활동' | '기타'
  title: string
  description?: string
  target?: string
  status: 'Start' | 'In Progress' | 'Completed'
  created_at?: string
  updated_at?: string
}

export class IndustryTLActivitiesService {
  static async getAll(): Promise<IndustryTLActivity[]> {
    const { data, error } = await supabase
      .from("industry_tl_activities")
      .select("*")
      .order("date", { ascending: false })
    if (error) throw error
    return data || []
  }

  // 특정 사용자의 활동만 조회
  static async getByEmployeeId(employee_id: string): Promise<IndustryTLActivity[]> {
    // 사번 정규화 (95129 → 095129)
    const { ReviewerService } = await import('./reviewer-service')
    const normalizedEmployeeId = ReviewerService.normalizeEmpno(employee_id)
    console.log(`🔧 IndustryTLActivitiesService: Normalizing employee ID: ${employee_id} → ${normalizedEmployeeId}`)
    
    // 정규화된 사번으로 먼저 시도
    let { data, error } = await supabase
      .from("industry_tl_activities")
      .select("*")
      .eq("employee_id", normalizedEmployeeId)
      .order("date", { ascending: false })
    
    // 정규화된 사번으로 못 찾으면 원본 사번으로 시도
    if ((error || !data || data.length === 0) && normalizedEmployeeId !== employee_id) {
      console.log("🔄 IndustryTLActivitiesService: Trying with original empno:", employee_id)
      const result = await supabase
        .from("industry_tl_activities")
        .select("*")
        .eq("employee_id", employee_id)
        .order("date", { ascending: false })
      data = result.data
      error = result.error
    }
    
    if (error) throw error
    return data || []
  }

  static async getById(id: number): Promise<IndustryTLActivity | null> {
    const { data, error } = await supabase
      .from("industry_tl_activities")
      .select("*")
      .eq("id", id)
      .maybeSingle()
    if (error) throw error
    return data
  }

  static async insert(activity: Omit<IndustryTLActivity, "id" | "created_at" | "updated_at">): Promise<IndustryTLActivity | null> {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from("industry_tl_activities")
      .insert({ ...activity, created_at: now, updated_at: now })
      .select()
      .maybeSingle()
    if (error) throw error
    return data
  }

  static async update(id: number, changes: Partial<IndustryTLActivity>): Promise<IndustryTLActivity | null> {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from("industry_tl_activities")
      .update({ ...changes, updated_at: now })
      .eq("id", id)
      .select()
      .maybeSingle()
    if (error) throw error
    return data
  }

  static async delete(id: number): Promise<boolean> {
    const { error } = await supabase
      .from("industry_tl_activities")
      .delete()
      .eq("id", id)
    if (error) throw error
    return true
  }
} 