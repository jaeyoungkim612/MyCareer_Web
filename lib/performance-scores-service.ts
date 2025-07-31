import { supabase } from './supabase'

export interface PerformanceScore {
  id?: number
  employee_id: string
  business_current_score: number
  business_target_score: number
  people_current_score: number
  people_target_score: number
  collaboration_current_score: number
  collaboration_target_score: number
  quality_current_score: number
  quality_target_score: number
  industry_current_score: number
  industry_target_score: number
  created_at?: string
  updated_at?: string
}

export interface CategoryScore {
  category: string
  currentScore: number
  targetScore: number
  maxScore: number
  icon: string
}

export class PerformanceScoresService {
  // 특정 사용자의 자기평가 점수 조회
  static async getByEmployeeId(employeeId: string): Promise<PerformanceScore | null> {
    console.log('PerformanceScoresService.getByEmployeeId called with:', employeeId)
    
    try {
      const { data, error } = await supabase
        .from('performance_scores')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('❌ Error fetching performance scores:', error)
        throw error
      }

      if (!data) {
        console.log('ℹ️ No performance scores yet for employee:', employeeId, '- will use default values')
        return null
      }

      console.log('Performance scores fetched successfully:', data)
      return data
    } catch (error) {
      console.error('Error in getByEmployeeId:', error)
      return null
    }
  }

  // 자기평가 점수 업데이트 또는 생성
  static async upsert(performanceScore: PerformanceScore): Promise<PerformanceScore | null> {
    console.log('🔄 PerformanceScoresService.upsert called with:', performanceScore)
    
    try {
      // 먼저 기존 데이터가 있는지 확인
      console.log('🔍 Checking existing data for employee_id:', performanceScore.employee_id)
      const existing = await this.getByEmployeeId(performanceScore.employee_id)
      console.log('📊 Existing data:', existing)
      
      if (existing) {
        // 업데이트
        console.log('🔄 Updating existing record...')
        const updateData = {
          business_current_score: performanceScore.business_current_score,
          business_target_score: performanceScore.business_target_score,
          people_current_score: performanceScore.people_current_score,
          people_target_score: performanceScore.people_target_score,
          collaboration_current_score: performanceScore.collaboration_current_score,
          collaboration_target_score: performanceScore.collaboration_target_score,
          quality_current_score: performanceScore.quality_current_score,
          quality_target_score: performanceScore.quality_target_score,
          industry_current_score: performanceScore.industry_current_score,
          industry_target_score: performanceScore.industry_target_score,
        }
        console.log('📝 Update data:', updateData)
        
        const { data, error } = await supabase
          .from('performance_scores')
          .update(updateData)
          .eq('employee_id', performanceScore.employee_id)
          .select()
          .single()

        if (error) {
          console.error('❌ Error updating performance scores:', error)
          console.error('❌ Error details:', JSON.stringify(error, null, 2))
          throw error
        }

        console.log('✅ Performance scores updated successfully:', data)
        return data
      } else {
        // 생성
        console.log('➕ Creating new record...')
        console.log('📝 Insert data:', performanceScore)
        
        const { data, error } = await supabase
          .from('performance_scores')
          .insert([performanceScore])
          .select()
          .single()

        if (error) {
          console.error('❌ Error creating performance scores:', error)
          console.error('❌ Error details:', JSON.stringify(error, null, 2))
          throw error
        }

        console.log('✅ Performance scores created successfully:', data)
        return data
      }
    } catch (error) {
      console.error('❌ Error in upsert:', error)
      console.error('❌ Error details:', JSON.stringify(error, null, 2))
      throw error
    }
  }

  // 카테고리별 점수 업데이트
  static async updateCategoryScores(
    employeeId: string, 
    category: string, 
    currentScore: number, 
    targetScore: number
  ): Promise<PerformanceScore | null> {
    console.log('PerformanceScoresService.updateCategoryScores called with:', {
      employeeId, category, currentScore, targetScore
    })
    
    try {
      const existing = await this.getByEmployeeId(employeeId)
      
      if (!existing) {
        // 새로 생성
        const newPerformanceScore: PerformanceScore = {
          employee_id: employeeId,
          business_current_score: category === 'Business' ? currentScore : 0,
          business_target_score: category === 'Business' ? targetScore : 0,
          people_current_score: category === 'People' ? currentScore : 0,
          people_target_score: category === 'People' ? targetScore : 0,
          collaboration_current_score: category === 'Collaboration' ? currentScore : 0,
          collaboration_target_score: category === 'Collaboration' ? targetScore : 0,
          quality_current_score: category === 'Quality' ? currentScore : 0,
          quality_target_score: category === 'Quality' ? targetScore : 0,
          industry_current_score: category === 'Industry & TL' ? currentScore : 0,
          industry_target_score: category === 'Industry & TL' ? targetScore : 0,
        }
        
        return await this.upsert(newPerformanceScore)
      } else {
        // 기존 데이터 업데이트
        const updatedScores = { ...existing }
        
        switch (category) {
          case 'Business':
            updatedScores.business_current_score = currentScore
            updatedScores.business_target_score = targetScore
            break
          case 'People':
            updatedScores.people_current_score = currentScore
            updatedScores.people_target_score = targetScore
            break
          case 'Collaboration':
            updatedScores.collaboration_current_score = currentScore
            updatedScores.collaboration_target_score = targetScore
            break
          case 'Quality':
            updatedScores.quality_current_score = currentScore
            updatedScores.quality_target_score = targetScore
            break
          case 'Industry & TL':
            updatedScores.industry_current_score = currentScore
            updatedScores.industry_target_score = targetScore
            break
        }
        
        return await this.upsert(updatedScores)
      }
    } catch (error) {
      console.error('Error in updateCategoryScores:', error)
      throw error
    }
  }

  // 테스트용 간단한 insert 함수
  static async testInsert(employeeId: string): Promise<void> {
    console.log('🧪 Testing simple insert for employee_id:', employeeId)
    
    try {
      const testData = {
        employee_id: employeeId,
        business_current_score: 5.0,
        business_target_score: 8.0,
        people_current_score: 6.0,
        people_target_score: 7.0,
        collaboration_current_score: 4.0,
        collaboration_target_score: 9.0,
        quality_current_score: 7.0,
        quality_target_score: 8.5,
        industry_current_score: 6.5,
        industry_target_score: 9.0,
      }
      
      console.log('📝 Test data to insert:', testData)
      
      const { data, error } = await supabase
        .from('performance_scores')
        .insert([testData])
        .select()
      
      if (error) {
        console.error('❌ Test insert failed:', error)
        console.error('❌ Error code:', error.code)
        console.error('❌ Error message:', error.message)
        console.error('❌ Error details:', error.details)
        throw error
      }
      
      console.log('✅ Test insert successful:', data)
    } catch (error) {
      console.error('❌ Test insert error:', error)
      throw error
    }
  }

  // 테이블 존재 확인 함수
  static async checkTableExists(): Promise<boolean> {
    console.log('🔍 Checking if performance_scores table exists...')
    
    try {
      const { data, error } = await supabase
        .from('performance_scores')
        .select('count', { count: 'exact' })
        .limit(1)
      
      if (error) {
        console.error('❌ Table check failed:', error)
        return false
      }
      
      console.log('✅ Table exists, row count:', data)
      return true
    } catch (error) {
      console.error('❌ Table check error:', error)
      return false
    }
  }

  // 데이터베이스 데이터를 CategoryScore 형태로 변환
  static convertToCategoryScores(performanceScore: PerformanceScore | null): CategoryScore[] {
    const defaultScores: CategoryScore[] = [
      {
        category: "Business",
        currentScore: 0,
        targetScore: 0,
        maxScore: 10,
        icon: "BarChart3",
      },
      {
        category: "People",
        currentScore: 0,
        targetScore: 0,
        maxScore: 10,
        icon: "Users",
      },
      {
        category: "Collaboration",
        currentScore: 0,
        targetScore: 0,
        maxScore: 10,
        icon: "Handshake",
      },
      {
        category: "Quality",
        currentScore: 0,
        targetScore: 0,
        maxScore: 10,
        icon: "TrendingUp",
      },
      {
        category: "Industry & TL",
        currentScore: 0,
        targetScore: 0,
        maxScore: 10,
        icon: "Lightbulb",
      },
    ]

    if (!performanceScore) {
      return defaultScores
    }

    return [
      {
        category: "Business",
        currentScore: performanceScore.business_current_score,
        targetScore: performanceScore.business_target_score,
        maxScore: 10,
        icon: "BarChart3",
      },
      {
        category: "People",
        currentScore: performanceScore.people_current_score,
        targetScore: performanceScore.people_target_score,
        maxScore: 10,
        icon: "Users",
      },
      {
        category: "Collaboration",
        currentScore: performanceScore.collaboration_current_score,
        targetScore: performanceScore.collaboration_target_score,
        maxScore: 10,
        icon: "Handshake",
      },
      {
        category: "Quality",
        currentScore: performanceScore.quality_current_score,
        targetScore: performanceScore.quality_target_score,
        maxScore: 10,
        icon: "TrendingUp",
      },
      {
        category: "Industry & TL",
        currentScore: performanceScore.industry_current_score,
        targetScore: performanceScore.industry_target_score,
        maxScore: 10,
        icon: "Lightbulb",
      },
    ]
  }
} 