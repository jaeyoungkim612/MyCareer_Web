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
    
    // 최신 ETL_DATE 조회
    const { data: latestDateData } = await supabase
      .from('a_collaboration')
      .select('ETL_DATE')
      .not('ETL_DATE', 'is', null)
      .order('ETL_DATE', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    const latestDate = latestDateData?.ETL_DATE
    console.log(`📅 CollaborationService: Latest ETL_DATE: ${latestDate}`)
    
    if (!latestDate) {
      console.warn('⚠️ No ETL_DATE found in a_collaboration')
      return null
    }
    
    // 사번 변형 목록 생성 (정규화된 사번 + 0 제거 버전)
    const empnoVariants = [
      normalizedEmployeeId,                     // 095129
      normalizedEmployeeId.replace(/^0+/, ''),  // 95129
    ].filter((v, i, a) => a.indexOf(v) === i) // 중복 제거
    
    console.log(`🔍 CollaborationService: Trying empno variants:`, empnoVariants)
    
    // 최신 날짜의 데이터만 조회 (원본 테이블 직접 조회)
    const { data, error } = await supabase
      .from('a_collaboration')
      .select('GUBUN, REFCNT, TOTREV, EMPLNO')
      .in('EMPLNO', empnoVariants)
      .eq('ETL_DATE', latestDate)
      .in('GUBUN', ['X-LoS', 'LoS', 'PwCC'])
    
    if (error) {
      console.error('❌ CollaborationService error:', error)
      return null
    }
    
    console.log('📊 CollaborationService actuals data:', data)
    
    // 같은 GUBUN이 여러 row 있으면 합산
    const result = {
      xlos: { count: 0, amount: 0 },
      los: { count: 0, amount: 0 },
      axnode: { count: 0, amount: 0 }
    };
    
    data?.forEach((row: any) => {
      const count = Number(row.REFCNT) || 0
      const amount = Number(row.TOTREV) || 0
      
      console.log(`  - GUBUN: ${row.GUBUN}, REFCNT: ${row.REFCNT} (${count}), TOTREV: ${row.TOTREV} (${amount})`)
      
      if (row.GUBUN === 'X-LoS') {
        result.xlos.count += count
        result.xlos.amount += amount
      }
      if (row.GUBUN === 'LoS') {
        result.los.count += count
        result.los.amount += amount
      }
      if (row.GUBUN === 'PwCC') {
        result.axnode.count += count
        result.axnode.amount += amount
      }
    });
    
    console.log('✅ CollaborationService result:', result)
    return result;
  }
} 