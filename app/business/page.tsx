"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { BarChart3, Edit2, Check, X, HelpCircle } from "lucide-react"
import { BusinessPlanTab } from "@/components/business/plan-tab"
import { BusinessMonitoringTab } from "@/components/business/status-tab"
import { BusinessSelfAssessmentTab } from "@/components/business/self-assessment-tab"
import { getScoreByCategory, updateScoreByCategory, loadScoresForEmployee } from "@/data/performance-scores"
import { BusinessMetrics } from "@/components/business-metrics"
import { useAuth } from "@/contexts/auth-context"
import { PerformanceScoresService } from "@/lib/performance-scores-service"

export default function BusinessPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("plan")
  const [isEditingScore, setIsEditingScore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [businessScore, setBusinessScore] = useState(getScoreByCategory("Business"))
  const [tempScores, setTempScores] = useState({
    current: businessScore?.currentScore || 0,
    goal: businessScore?.targetScore || 0,
  })

  // 사용자별 점수 로드
  useEffect(() => {
    const loadUserScores = async () => {
      if (user?.empno) {
        setIsLoading(true)
        try {
          await loadScoresForEmployee(user.empno)
          const updatedScore = getScoreByCategory("Business")
          setBusinessScore(updatedScore)
          setTempScores({
            current: updatedScore?.currentScore || 0,
            goal: updatedScore?.targetScore || 0,
          })
        } catch (error) {
          console.error('Error loading user scores:', error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    loadUserScores()
  }, [user?.empno])

  const handleSaveScores = async () => {
    if (businessScore && user?.empno) {
      try {
        console.log('💾 Saving Business scores:', { 
          empno: user.empno, 
          current: tempScores.current, 
          goal: tempScores.goal 
        })
        
        await updateScoreByCategory("Business", tempScores.current, tempScores.goal)
        const updatedScore = getScoreByCategory("Business")
        setBusinessScore(updatedScore)
        
        console.log('✅ Business scores saved successfully')
      } catch (error) {
        console.error('❌ Error saving Business scores:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        alert(`점수 저장 실패: ${errorMessage}`)
      }
    }
    setIsEditingScore(false)
  }

  // 브라우저에서 직접 테스트할 수 있도록 window 객체에 추가
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.empno) {
      (window as any).testPerformanceScores = {
        checkTable: () => PerformanceScoresService.checkTableExists(),
        testInsert: () => PerformanceScoresService.testInsert(user.empno),
        getCurrentScores: () => PerformanceScoresService.getByEmployeeId(user.empno),
        testDirectQuery: async () => {
          const { supabase } = await import('@/lib/supabase')
          console.log('🔍 Testing direct supabase query...')
          const { data, error } = await supabase
            .from('performance_scores')
            .select('*')
            .limit(5)
          console.log('📊 Direct query result:', { data, error })
          return { data, error }
        },
        testRLS: async () => {
          const { supabase } = await import('@/lib/supabase')
          console.log('🔍 Testing RLS policies...')
          const { data, error } = await supabase
            .from('performance_scores')
            .select('count')
          console.log('📊 RLS test result:', { data, error })
          return { data, error }
        },
        empno: user.empno
      }
      console.log('🔧 Test functions available on window.testPerformanceScores:', {
        checkTable: 'Check if table exists',
        testInsert: 'Test simple insert',
        getCurrentScores: 'Get current scores',
        testDirectQuery: 'Test direct supabase query',
        testRLS: 'Test RLS policies',
        empno: user.empno
      })
    }
  }, [user?.empno])

  const handleCancelScores = () => {
    setTempScores({
      current: businessScore?.currentScore || 0,
      goal: businessScore?.targetScore || 0,
    })
    setIsEditingScore(false)
  }

  // businessScore 변경 시 tempScores 동기화
  useEffect(() => {
    if (businessScore) {
      setTempScores({
        current: businessScore.currentScore,
        goal: businessScore.targetScore,
      })
    }
  }, [businessScore])

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center">
              <BarChart3 className="mr-3 h-8 w-8 text-orange-600" />
              Business
            </h1>
            <p className="text-muted-foreground mt-2">Business Development 활동을 계획하고 상태를 관리할 수 있습니다.</p>
          </div>
          <Card className="px-6 py-2 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xs text-orange-600/70 dark:text-orange-400/70 font-medium">자기평가점수</div>
                  <div className="text-xs text-orange-600/70 dark:text-orange-400/70 font-medium">(현재)/(개선목표)</div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-orange-600 dark:text-orange-400">로딩중...</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center">
            <BarChart3 className="mr-3 h-8 w-8 text-orange-600" />
            Business
          </h1>
          <p className="text-muted-foreground mt-2">Business Development 활동을 계획하고 상태를 관리할 수 있습니다.</p>
        </div>

        {/* Score Display - Now on the right */}
        <Card className="px-6 py-2 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          {isEditingScore ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xs text-orange-600/70 dark:text-orange-400/70 font-medium">자기평가점수</div>
                  <div className="text-xs text-orange-600/70 dark:text-orange-400/70 font-medium">(현재)/(개선목표)</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={tempScores.current === 0 ? "" : tempScores.current}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : Number.parseInt(e.target.value);
                      if (!isNaN(value) && value >= 0 && value <= 10) {
                        setTempScores({ ...tempScores, current: value });
                      }
                    }}
                    className="w-16 h-7 text-center font-bold text-sm"
                    min="0"
                    max="10"
                    step="1"
                    placeholder="0"
                  />
                  <span className="text-sm font-medium text-orange-400">/</span>
                  <Input
                    type="number"
                    value={tempScores.goal === 0 ? "" : tempScores.goal}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : Number.parseInt(e.target.value);
                      if (!isNaN(value) && value >= 0 && value <= 10) {
                        setTempScores({ ...tempScores, goal: value });
                      }
                    }}
                    className="w-16 h-7 text-center font-bold text-sm"
                    min="0"
                    max="10"
                    step="1"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="default" className="h-6 px-3 text-xs bg-green-600 hover:bg-green-700" onClick={handleSaveScores}>
                  <Check className="h-3 w-3 mr-1" />
                  저장
                </Button>
                <Button size="sm" variant="outline" className="h-6 px-3 text-xs border-red-200 text-red-600 hover:bg-red-50" onClick={handleCancelScores}>
                  <X className="h-3 w-3 mr-1" />
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xs text-orange-600/70 dark:text-orange-400/70 font-medium">자기평가점수</div>
                  <div className="text-xs text-orange-600/70 dark:text-orange-400/70 font-medium">(현재)/(개선목표)</div>
                </div>
                <div className="flex items-baseline gap-1 mr-6">
                  <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{businessScore?.currentScore}</span>
                  <span className="text-sm font-medium text-orange-400/70">/ {businessScore?.targetScore}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-orange-100 dark:hover:bg-orange-900/20">
                      <HelpCircle className="h-3 w-3 text-orange-400" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-orange-700 dark:text-orange-300">Business 점수 예시</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 text-sm">
                                              <div className="border-l-4 border-green-500 pl-3 py-1">
                          <div className="font-semibold text-green-600">10점: 탁월</div>
                          <div className="text-gray-600 dark:text-gray-300 text-xs">조직 및 본인이 기대하는 역량지표에서 탁월 내외 <span className="font-bold">전반적으로 탁월한 성과를 창출</span>한 수준</div>
                        </div>
                        <div className="border-l-4 border-blue-500 pl-3 py-1">
                          <div className="font-semibold text-blue-600">7-9점: 우수</div>
                          <div className="text-gray-600 dark:text-gray-300 text-xs">조직 및 본인이 기대하는 역량지표에서 탁월 대비 일정 <span className="font-bold">역량에서 기대 이상의 뛰어난 성과를 창출</span>한 수준</div>
                        </div>
                        <div className="border-l-4 border-yellow-500 pl-3 py-1">
                          <div className="font-semibold text-yellow-600">4-6점: 보통</div>
                          <div className="text-gray-600 dark:text-gray-300 text-xs">조직 및 본인이 기대하는 역량지표에서 탁월 대비 일정 <span className="font-bold">역량지표에서 기대만큼의 성과를 창출(100%)</span> 수준</div>
                        </div>
                        <div className="border-l-4 border-red-500 pl-3 py-1">
                          <div className="font-semibold text-red-600">1-3점: 개선 필요</div>
                          <div className="text-gray-600 dark:text-gray-300 text-xs">조직 및 본인이 기대하는 역량지표에서 탁월 달성에 대한 <span className="font-bold">노력이 부족하고 일부 개선이 필요</span>한 수준</div>
                        </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-orange-100 dark:hover:bg-orange-900/20" onClick={() => setIsEditingScore(true)}>
                  <Edit2 className="h-3 w-3 text-orange-500" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Tabs defaultValue="plan" className="space-y-6" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="self-assessment">Self Assessment</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-4">
          <BusinessPlanTab />
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <BusinessMonitoringTab />
        </TabsContent>

        <TabsContent value="self-assessment" className="space-y-4">
          <BusinessSelfAssessmentTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
