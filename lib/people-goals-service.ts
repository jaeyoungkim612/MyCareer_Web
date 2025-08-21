import { supabase } from "./supabase"

export interface PeopleGoal {
  id?: number
  employee_id: string
  people_goal: string
  gps_score: number
  pei_score: number
  refresh_off_usage_rate: number
  coaching_time?: number
  created_at?: string
  updated_at?: string
}

export class PeopleGoalsService {
  // 최신 목표 가져오기
  static async getLatestGoals(employeeId: string): Promise<PeopleGoal | null> {
    try {
      // 사번 정규화 (95129 → 095129)
      const { ReviewerService } = await import('./reviewer-service')
      const normalizedEmployeeId = ReviewerService.normalizeEmpno(employeeId)
      console.log(`🔧 PeopleGoalsService: Normalizing employee ID: ${employeeId} → ${normalizedEmployeeId}`)
      
      const { data, error } = await supabase
        .from("people_goals")
        .select("*")
        .eq("employee_id", normalizedEmployeeId)
        .order("created_at", { ascending: false })
        .limit(1)
      if (error) return null
      if (!data || data.length === 0) return null
      return data[0]
    } catch (error) {
      return null
    }
  }

  // 새 레코드 추가 (항상 새 행)
  static async saveGoals(
    employeeId: string,
    goals: Omit<PeopleGoal, "id" | "employee_id" | "created_at" | "updated_at">,
  ): Promise<PeopleGoal | null> {
    try {
      // 사번 정규화 (95129 → 095129)
      const { ReviewerService } = await import('./reviewer-service')
      const normalizedEmployeeId = ReviewerService.normalizeEmpno(employeeId)
      console.log(`🔧 PeopleGoalsService: Normalizing employee ID for save: ${employeeId} → ${normalizedEmployeeId}`)
      
      const goalData = {
        employee_id: normalizedEmployeeId,
        ...goals,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await supabase.from("people_goals").insert(goalData).select()
      if (error) throw error
      if (!data || data.length === 0) throw new Error("No data returned after insert")
      return data[0]
    } catch (error) {
      throw error
    }
  }

  // 특정 필드만 업데이트 (항상 새 행)
  static async updateSpecificFields(
    employeeId: string,
    updates: Partial<Omit<PeopleGoal, "id" | "employee_id" | "created_at" | "updated_at">>,
  ): Promise<PeopleGoal | null> {
    try {
      // 사번 정규화 (95129 → 095129)
      const { ReviewerService } = await import('./reviewer-service')
      const normalizedEmployeeId = ReviewerService.normalizeEmpno(employeeId)
      console.log(`🔧 PeopleGoalsService: Normalizing employee ID for update: ${employeeId} → ${normalizedEmployeeId}`)
      
      const latestGoal = await this.getLatestGoals(employeeId)
      const newGoalData = {
        employee_id: normalizedEmployeeId,
        people_goal: updates.people_goal ?? latestGoal?.people_goal ?? "",
        gps_score: updates.gps_score ?? latestGoal?.gps_score ?? 1,
        pei_score: updates.pei_score ?? latestGoal?.pei_score ?? 1,
        refresh_off_usage_rate: updates.refresh_off_usage_rate ?? latestGoal?.refresh_off_usage_rate ?? 0,
        coaching_time: updates.coaching_time ?? latestGoal?.coaching_time ?? 0, // 추가!
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await supabase.from("people_goals").insert(newGoalData).select()
      if (error) throw error
      if (!data || data.length === 0) throw new Error("No data returned after insert")
      return data[0]
    } catch (error) {
      throw error
    }
  }

  // 코칭 시간 통계 (이번 분기, 올해 누적)
  static async getCoachingTimeStats(empno: string, year: number, quarter: number): Promise<{ quarterHours: number, yearHours: number }> {
    const yearQuarter = `${year}-Q${quarter}`;
    // 이번 분기: 여러 row 합산
    const { data: quarterRows, error: qErr } = await supabase
      .from('v_coaching_time_quarterly')
      .select('total_use_time')
      .eq('EMPNO', empno)
      .eq('year_quarter', yearQuarter);
    if (qErr && qErr.code !== 'PGRST116') throw qErr;

    // 올해 누적: input_year로 필터
    const { data: yearRows, error: yErr } = await supabase
      .from('v_coaching_time_quarterly')
      .select('total_use_time')
      .eq('EMPNO', empno)
      .eq('input_year', year.toString());
    if (yErr) throw yErr;

    const quarterHours = (quarterRows ?? []).reduce((sum, row) => sum + Number(row.total_use_time || 0), 0);
    const yearHours = (yearRows ?? []).reduce((sum, row) => sum + Number(row.total_use_time || 0), 0);

    return { quarterHours, yearHours };
  }
} 