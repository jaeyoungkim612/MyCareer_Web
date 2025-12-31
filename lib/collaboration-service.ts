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
    try {
      // 사번 정규화 (95129 → 095129)
      const { ReviewerService } = await import('./reviewer-service')
      const normalizedEmployeeId = ReviewerService.normalizeEmpno(employee_id)
      console.log(`🔧 CollaborationService: Normalizing employee ID for actuals: ${employee_id} → ${normalizedEmployeeId}`)
      
      // 최신 ETL_DATE 조회
      const { data: latestDateData, error: dateError } = await supabase
        .from('a_collaboration')
        .select('ETL_DATE')
        .not('ETL_DATE', 'is', null)
        .order('ETL_DATE', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (dateError) {
        console.error('❌ Error fetching latest ETL_DATE:', dateError)
        return null
      }
      
      const latestDate = latestDateData?.ETL_DATE
      console.log(`📅 CollaborationService: Latest ETL_DATE: ${latestDate}`)
      
      if (!latestDate) {
        console.warn('⚠️ No ETL_DATE found in a_collaboration table')
        return {
          xlos: { count: 0, amount: 0 },
          los: { count: 0, amount: 0 },
          axnode: { count: 0, amount: 0 }
        }
      }
      
      // 사번 변형 목록 생성
      // DB 규칙: 5자리는 앞에 0 붙여서 6자리, 일반적으로 6자리
      const stripped = normalizedEmployeeId.replace(/^0+/, '') // 앞의 0 모두 제거
      const empnoVariants = [
        normalizedEmployeeId,                     // 원본 (예: 130130, 095129)
        stripped,                                 // 0 제거 (예: 130130, 95129)
        stripped.padStart(6, '0'),                // 6자리로 패딩 (예: 130130, 095129)
      ].filter((v, i, a) => a.indexOf(v) === i) // 중복 제거
      
      console.log(`🔍 CollaborationService: Trying empno variants:`, empnoVariants)
      console.log(`🔍 Query conditions:`, {
        empnoVariants,
        latestDate,
        gubunFilter: ['X', 'I']
      })
      
      // 최신 날짜의 데이터만 조회 (원본 테이블 직접 조회)
      // GUBUN 코드: X = X-LoS, I = LoS (P는 제외)
      const { data, error, count } = await supabase
        .from('a_collaboration')
        .select('GUBUN, REFCNT, TOTREV, EMPLNO, ETL_DATE', { count: 'exact' })
        .in('EMPLNO', empnoVariants)
        .eq('ETL_DATE', latestDate)
        .in('GUBUN', ['X', 'I'])
      
      if (error) {
        console.error('❌ CollaborationService query error:', error)
        return {
          xlos: { count: 0, amount: 0 },
          los: { count: 0, amount: 0 },
          axnode: { count: 0, amount: 0 }
        }
      }
      
      console.log(`📊 CollaborationService: Found ${count} rows`)
      console.log('📊 CollaborationService actuals data:', data)
      
      if (!data || data.length === 0) {
        console.warn('⚠️ No collaboration data found for this employee')
        console.warn('💡 Tip: Check if EMPLNO in a_collaboration matches:', empnoVariants)
        return {
          xlos: { count: 0, amount: 0 },
          los: { count: 0, amount: 0 },
          axnode: { count: 0, amount: 0 }
        }
      }
      
      // 같은 GUBUN이 여러 row 있으면 합산
      const result = {
        xlos: { count: 0, amount: 0 },
        los: { count: 0, amount: 0 },
        axnode: { count: 0, amount: 0 }
      };
      
      data?.forEach((row: any) => {
        const count = Number(row.REFCNT) || 0
        const amount = Number(row.TOTREV) || 0
        
        console.log(`  - EMPLNO: ${row.EMPLNO}, GUBUN: ${row.GUBUN}, REFCNT: ${row.REFCNT} (${count}), TOTREV: ${row.TOTREV} (${amount}), ETL_DATE: ${row.ETL_DATE}`)
        
        // GUBUN 코드 매핑: X = X-LoS, I = LoS
        if (row.GUBUN === 'X') {
          result.xlos.count += count
          result.xlos.amount += amount
        }
        if (row.GUBUN === 'I') {
          result.los.count += count
          result.los.amount += amount
        }
        // AX Node는 DB에 데이터 없음 (항상 0)
      });
      
      console.log('✅ CollaborationService final result:', result)
      return result;
    } catch (e) {
      console.error('❌ CollaborationService unexpected error:', e)
      return {
        xlos: { count: 0, amount: 0 },
        los: { count: 0, amount: 0 },
        axnode: { count: 0, amount: 0 }
      }
    }
  }
} 