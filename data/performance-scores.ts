import { PerformanceScoresService, CategoryScore } from "@/lib/performance-scores-service"

export interface PerformanceScore {
  category: string
  currentScore: number
  targetScore: number
  maxScore: number
  icon: string
}

// 캐시된 점수들
let cachedScores: CategoryScore[] = []
let currentEmployeeId: string | null = null

// 사용자별 점수 로드
export const loadScoresForEmployee = async (employeeId: string): Promise<void> => {
  if (currentEmployeeId === employeeId && cachedScores.length > 0) {
    return // 이미 로드됨
  }
  
  try {
    const dbScores = await PerformanceScoresService.getByEmployeeId(employeeId)
    cachedScores = PerformanceScoresService.convertToCategoryScores(dbScores)
    currentEmployeeId = employeeId
  } catch (error) {
    console.error('Error loading scores for employee:', error)
    // 에러시 기본값 사용
    cachedScores = PerformanceScoresService.convertToCategoryScores(null)
    currentEmployeeId = employeeId
  }
}

export const getScoreByCategory = (category: string): PerformanceScore | undefined => {
  return cachedScores.find((score) => score.category === category)
}

export const getTotalScore = (): number => {
  if (cachedScores.length === 0) return 0
  const total = cachedScores.reduce((sum, score) => sum + score.currentScore, 0)
  return Math.round(total / cachedScores.length)
}

export const getTotalTargetScore = (): number => {
  if (cachedScores.length === 0) return 0
  const total = cachedScores.reduce((sum, score) => sum + score.targetScore, 0)
  return Math.round(total / cachedScores.length)
}

// 점수를 업데이트하는 함수 - 이제 데이터베이스에 저장됨
export const updateScoreByCategory = async (category: string, currentScore: number, targetScore: number): Promise<void> => {
  if (!currentEmployeeId) {
    console.error('No employee ID set for updating scores')
    return
  }

  try {
    await PerformanceScoresService.updateCategoryScores(currentEmployeeId, category, currentScore, targetScore)
    
    // 캐시 업데이트
    const scoreIndex = cachedScores.findIndex((score) => score.category === category)
    if (scoreIndex !== -1) {
      cachedScores[scoreIndex].currentScore = currentScore
      cachedScores[scoreIndex].targetScore = targetScore
    }
  } catch (error) {
    console.error('Error updating score by category:', error)
    throw error
  }
}

// 모든 점수 반환
export const getAllScores = (): CategoryScore[] => {
  return cachedScores
}
