import { supabase } from "./supabase"

export interface QualityMonitoring {
  id?: number
  employee_id: string
  type: '신규' | '기존' | 'none'
  progress_text?: string
  status?: 'Draft' | '작성중' | '완료'
  created_at?: string
  updated_at?: string
}

export class QualityMonitoringService {
  // 특정 사용자의 모니터링 데이터 조회
  static async getByEmployeeId(employeeId: string): Promise<QualityMonitoring[]> {
    // 사번 정규화 (95129 → 095129)
    const { ReviewerService } = await import("./reviewer-service")
    const normalizedEmployeeId = ReviewerService.normalizeEmpno(employeeId)
    console.log(`🔧 QualityMonitoringService: Normalizing employee ID: ${employeeId} → ${normalizedEmployeeId}`)
    
    // 정규화된 사번으로 먼저 시도
    let { data, error } = await supabase
      .from('quality_monitoring')
      .select('*')
      .eq('employee_id', normalizedEmployeeId)
      .order('created_at', { ascending: false })
    
    // 정규화된 사번으로 못 찾으면 원본 사번으로 시도
    if ((error || !data || data.length === 0) && normalizedEmployeeId !== employeeId) {
      console.log("🔄 QualityMonitoringService: Trying with original empno:", employeeId)
      const result = await supabase
        .from('quality_monitoring')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
      data = result.data
      error = result.error
    }
    
    if (error) {
      console.error('Error fetching quality monitoring:', error)
      throw error
    }
    
    return data || []
  }

  // 특정 사용자의 특정 타입 조회
  static async getByEmployeeIdAndType(employeeId: string, type: '신규' | '기존' | 'none'): Promise<QualityMonitoring | null> {
    // 사번 정규화 (95129 → 095129)
    const { ReviewerService } = await import("./reviewer-service")
    const normalizedEmployeeId = ReviewerService.normalizeEmpno(employeeId)
    
    const { data, error } = await supabase
      .from('quality_monitoring')
      .select('*')
      .eq('employee_id', normalizedEmployeeId)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (error) {
      console.error('Error fetching quality monitoring by type:', error)
      throw error
    }
    
    return data
  }

  // 모니터링 데이터 생성/업데이트
  static async upsert(monitoring: QualityMonitoring): Promise<QualityMonitoring> {
    // 사번 정규화 (95129 → 095129)
    const { ReviewerService } = await import("./reviewer-service")
    const normalizedEmployeeId = ReviewerService.normalizeEmpno(monitoring.employee_id)
    
    const monitoringToSave = {
      ...monitoring,
      employee_id: normalizedEmployeeId,
      updated_at: new Date().toISOString()
    }
    
    console.log('💾 Attempting to save monitoring data:', monitoringToSave)
    
    try {
      // 먼저 기존 데이터가 있는지 확인
      const existing = await this.getByEmployeeIdAndType(normalizedEmployeeId, monitoring.type!)
      
      if (existing) {
        // 기존 데이터가 있으면 업데이트
        console.log('🔄 Updating existing monitoring record:', existing.id)
        return await this.updateById(existing.id!, {
          progress_text: monitoringToSave.progress_text,
          status: monitoringToSave.status
        })
      } else {
        // 기존 데이터가 없으면 새로 생성
        console.log('➕ Creating new monitoring record')
        const { data, error } = await supabase
          .from('quality_monitoring')
          .insert(monitoringToSave)
          .select()
          .single()
        
        if (error) {
          console.error('Error inserting quality monitoring:', error)
          throw error
        }
        
        return data
      }
    } catch (error) {
      console.error('Error in upsert process:', error)
      throw error
    }
  }

  // ID로 특정 레코드 업데이트
  static async updateById(id: number, updates: Partial<QualityMonitoring>): Promise<QualityMonitoring> {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }
    
    const { data, error } = await supabase
      .from('quality_monitoring')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating quality monitoring:', error)
      throw error
    }
    
    return data
  }

  // 삭제
  static async delete(employeeId: string, type: '신규' | '기존' | 'none'): Promise<void> {
    // 사번 정규화 (95129 → 095129)
    const { ReviewerService } = await import("./reviewer-service")
    const normalizedEmployeeId = ReviewerService.normalizeEmpno(employeeId)
    
    const { error } = await supabase
      .from('quality_monitoring')
      .delete()
      .eq('employee_id', normalizedEmployeeId)
      .eq('type', type)
    
    if (error) {
      console.error('Error deleting quality monitoring:', error)
      throw error
    }
  }

  // Plan에서 목표 텍스트 가져와서 파싱하는 헬퍼 함수
  static async getGoalTextFromPlan(employeeId: string): Promise<string> {
    try {
      // Plan 테이블에서 목표 텍스트 가져오기
      const { ReviewerService } = await import("./reviewer-service")
      const normalizedEmployeeId = ReviewerService.normalizeEmpno(employeeId)
      
      const { data, error } = await supabase
        .from('quality_non_audit_performance')
        .select('goal_text')
        .eq('employee_id', normalizedEmployeeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (error) {
        console.error('Error fetching goal text from plan:', error)
        return ''
      }
      
      return data?.goal_text || ''
    } catch (error) {
      console.error('Error in getGoalTextFromPlan:', error)
      return ''
    }
  }
}