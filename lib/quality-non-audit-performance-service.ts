import { supabase } from "./supabase"

export interface QualityNonAuditPerformance {
  id?: number
  employee_id: string
  type: '신규' | '기존' | 'none'
  goal_text?: string
  progress_text?: string
  status?: 'Draft' | '작성중' | '완료'
  // 감사 목표 관련 컬럼 추가
  quality_goal?: string
  doae_rate?: number  // DB는 INTEGER이지만 숫자로 처리
  yra_ratio?: number  // DB는 INTEGER이지만 숫자로 처리
  created_at?: string
  updated_at?: string
}

export class QualityNonAuditPerformanceService {
  // 특정 사용자의 최신 레코드 조회 (신규/기존은 세트로)
  static async getByEmployeeId(employeeId: string): Promise<QualityNonAuditPerformance[]> {
    // 사번 정규화 (95129 → 095129)
    const { ReviewerService } = await import("./reviewer-service")
    const normalizedEmployeeId = ReviewerService.normalizeEmpno(employeeId)
    console.log(`🔧 QualityNonAuditPerformanceService: Normalizing employee ID: ${employeeId} → ${normalizedEmployeeId}`)
    
    const { data, error } = await supabase
      .from('quality_non_audit_performance')
      .select('*')
      .eq('employee_id', normalizedEmployeeId)
      .order('created_at', { ascending: false })  // 최신순으로 정렬
    
    if (error) {
      console.error('Error fetching quality non-audit performance:', error)
      throw error
    }
    
    if (!data || data.length === 0) {
      return []
    }
    
    const latestRecord = data[0]
    console.log('🔍 Service - Latest record:', latestRecord)
    
    if (latestRecord.type === 'none') {
      // none 타입이면 그것만 반환
      console.log('✅ Returning none type only')
      return [latestRecord]
    } else {
      // 신규/기존 타입이면 같은 시점의 세트를 찾아서 반환
      console.log('🔍 Looking for 신규/기존 set...')
      
      // 최신 레코드와 비슷한 시간대의 신규/기존 레코드들 찾기
      const latestTime = new Date(latestRecord.created_at!)
      const fiveMinutesAgo = new Date(latestTime.getTime() - 5 * 60 * 1000) // 5분 이내
      
      const recentRecords = data.filter(record => {
        const recordTime = new Date(record.created_at!)
        return recordTime >= fiveMinutesAgo && 
               (record.type === '신규' || record.type === '기존')
      })
      
      console.log('✅ Returning 신규/기존 set:', recentRecords)
      return recentRecords
    }
  }

  // 특정 사용자의 타입별 최신 데이터 조회 (기존 로직)
  static async getByEmployeeIdByType(employeeId: string): Promise<QualityNonAuditPerformance[]> {
    // 사번 정규화 (95129 → 095129)
    const { ReviewerService } = await import("./reviewer-service")
    const normalizedEmployeeId = ReviewerService.normalizeEmpno(employeeId)
    
    const { data, error } = await supabase
      .from('quality_non_audit_performance')
      .select('*')
      .eq('employee_id', normalizedEmployeeId)
      .order('created_at', { ascending: false })  // 최신순으로 정렬
    
    if (error) {
      console.error('Error fetching quality non-audit performance:', error)
      throw error
    }
    
    // 각 타입별로 가장 최신 레코드만 반환
    const latestByType: { [key: string]: QualityNonAuditPerformance } = {}
    
    if (data) {
      for (const record of data) {
        if (!latestByType[record.type]) {
          latestByType[record.type] = record
        }
      }
    }
    
    return Object.values(latestByType)
  }

  // 특정 사용자의 특정 타입 조회
  static async getByEmployeeIdAndType(employeeId: string, type: '신규' | '기존' | 'none'): Promise<QualityNonAuditPerformance | null> {
    // 사번 정규화 (95129 → 095129)
    const { ReviewerService } = await import("./reviewer-service")
    const normalizedEmployeeId = ReviewerService.normalizeEmpno(employeeId)
    
    const { data, error } = await supabase
      .from('quality_non_audit_performance')
      .select('*')
      .eq('employee_id', normalizedEmployeeId)
      .eq('type', type)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No data found
        return null
      }
      console.error('Error fetching quality non-audit performance:', error)
      throw error
    }
    
    return data
  }

  // 데이터 저장/업데이트
  static async upsert(performance: QualityNonAuditPerformance): Promise<QualityNonAuditPerformance> {
    const { data, error } = await supabase
      .from('quality_non_audit_performance')
      .upsert(performance)
      .select()
      .single()
    
    if (error) {
      console.error('Error upserting quality non-audit performance:', error)
      throw error
    }
    
    return data
  }

  // 여러 개 동시 저장/업데이트 (룰 베이스, 순서대로 처리)
  static async upsertMultiple(performances: QualityNonAuditPerformance[]): Promise<QualityNonAuditPerformance[]> {
    if (performances.length === 0) return []
    
    const results: QualityNonAuditPerformance[] = []
    const employeeId = performances[0].employee_id
    
    console.log(`📝 Starting upsert for employee: ${employeeId} (${performances.length} records)`)
    
    for (let i = 0; i < performances.length; i++) {
      const performance = performances[i]
      console.log(`📋 Processing ${i + 1}/${performances.length}: type=${performance.type}`)
      
      try {
        // 1. 기존 레코드 확인
        const existing = await this.getByEmployeeIdAndType(performance.employee_id, performance.type)
        
        if (existing) {
          // 2-a. 기존 레코드가 있으면 UPDATE
          console.log(`🔄 Updating existing record: ${performance.type}`)
          const { data, error } = await supabase
            .from('quality_non_audit_performance')
            .update({
              goal_text: performance.goal_text,
              progress_text: performance.progress_text,
              status: performance.status,
              quality_goal: performance.quality_goal,
              doae_rate: performance.doae_rate,
              yra_ratio: performance.yra_ratio,
              updated_at: new Date().toISOString()
            })
            .eq('employee_id', performance.employee_id)
            .eq('type', performance.type)
            .select()
            .single()
          
          if (error) {
            console.error(`❌ Update failed for ${performance.type}:`, error)
            throw error
          }
          
          console.log(`✅ Updated successfully: ${performance.type}`)
          results.push(data)
        } else {
          // 2-b. 새 레코드면 INSERT
          console.log(`➕ Inserting new record: ${performance.type}`)
          const { data, error } = await supabase
            .from('quality_non_audit_performance')
            .insert(performance)
            .select()
            .single()
          
          if (error) {
            console.error(`❌ Insert failed for ${performance.type}:`, error)
            throw error
          }
          
          console.log(`✅ Inserted successfully: ${performance.type}`)
          results.push(data)
        }
      } catch (error) {
        console.error(`💥 Error processing ${performance.type}:`, error)
        // 에러 발생 시 전체 중단하고 에러를 다시 throw
        throw error
      }
    }
    
    console.log(`🎉 Upsert completed: ${results.length}/${performances.length} records processed`)
    return results
  }

  // 삭제
  static async delete(employeeId: string, type: '신규' | '기존' | 'none'): Promise<void> {
    // 사번 정규화 (95129 → 095129)
    const { ReviewerService } = await import("./reviewer-service")
    const normalizedEmployeeId = ReviewerService.normalizeEmpno(employeeId)
    
    const { error } = await supabase
      .from('quality_non_audit_performance')
      .delete()
      .eq('employee_id', normalizedEmployeeId)
      .eq('type', type)
    
    if (error) {
      console.error('Error deleting quality non-audit performance:', error)
      throw error
    }
  }

  // 텍스트를 신규/기존으로 파싱하는 유틸리티 함수
  static parseNonAuditText(text: string): { 신규: string; 기존: string; hasContent: boolean } {
    if (!text) return { 신규: "", 기존: "", hasContent: false };
    
    const 신규Idx = text.indexOf("신규 서비스 개발");
    const 기존Idx = text.indexOf("기존 서비스 확장");
    
    let 신규 = "";
    let 기존 = "";
    let hasContent = false;
    
    if (신규Idx !== -1 && 기존Idx !== -1) {
      신규 = text.substring(신규Idx + "신규 서비스 개발".length, 기존Idx).trim();
      기존 = text.substring(기존Idx + "기존 서비스 확장".length).trim();
      hasContent = true;
    } else if (신규Idx !== -1) {
      신규 = text.substring(신규Idx + "신규 서비스 개발".length).trim();
      hasContent = true;
    } else if (기존Idx !== -1) {
      기존 = text.substring(기존Idx + "기존 서비스 확장".length).trim();
      hasContent = true;
    } else {
      // 키워드가 없으면 전체 텍스트를 'none' 타입으로 처리
      hasContent = text.trim().length > 0;
    }
    
    return { 신규, 기존, hasContent };
  }

  // 신규/기존 텍스트를 합쳐서 기존 포맷으로 변환하는 유틸리티 함수
  static combineToOriginalFormat(신규: string, 기존: string): string {
    let result = "";
    
    if (신규) {
      result += "신규 서비스 개발\n" + 신규;
    }
    
    if (기존) {
      if (result) result += "\n\n";
      result += "기존 서비스 확장\n" + 기존;
    }
    
    return result;
  }
} 