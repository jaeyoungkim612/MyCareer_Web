"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, Edit2, Check, X } from "lucide-react"
import { PlanAssessmentTab } from "@/components/people/plan-assessment-tab"
import { ResultsTab } from "@/components/people/results-tab"
import { SelfAssessmentTab } from "@/components/people/self-assessment-tab"
import { getScoreByCategory, updateScoreByCategory, loadScoresForEmployee } from "@/data/performance-scores"
import { PeopleMetrics } from "@/components/people-metrics"
import { useAuth } from "@/contexts/auth-context"

export default function PeoplePage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("plan-assessment")
  const [isEditingScore, setIsEditingScore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [peopleScore, setPeopleScore] = useState(getScoreByCategory("People"))
  const [tempScores, setTempScores] = useState({
    current: peopleScore?.currentScore || 0,
    goal: peopleScore?.targetScore || 0,
  })

  // 사용자별 점수 로드
  useEffect(() => {
    const loadUserScores = async () => {
      if (user?.empno) {
        setIsLoading(true)
        try {
          await loadScoresForEmployee(user.empno)
          const updatedScore = getScoreByCategory("People")
          setPeopleScore(updatedScore)
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
    if (peopleScore && user?.empno) {
      try {
        await updateScoreByCategory("People", tempScores.current, tempScores.goal)
        const updatedScore = getScoreByCategory("People")
        setPeopleScore(updatedScore)
      } catch (error) {
        console.error('Error saving scores:', error)
      }
    }
    setIsEditingScore(false)
  }

  const handleCancelScores = () => {
    setTempScores({
      current: peopleScore?.currentScore || 0,
      goal: peopleScore?.targetScore || 0,
    })
    setIsEditingScore(false)
  }

  // peopleScore 변경 시 tempScores 동기화
  useEffect(() => {
    if (peopleScore) {
      setTempScores({
        current: peopleScore.currentScore,
        goal: peopleScore.targetScore,
      })
    }
  }, [peopleScore])

  if (isLoading) {
    return (
      <div className="space-y-4 p-6 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center">
              <Users className="mr-3 h-8 w-8 text-orange-600" />
              People
            </h1>
            <p className="text-muted-foreground mt-2">People과 관련된 활동을 계획하고 모니터링할 수 있습니다.</p>
          </div>
          <Card className="px-4 py-2 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <span className="text-xs text-muted-foreground">자기평가점수</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-orange-600">로딩중...</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center">
            <Users className="mr-3 h-8 w-8 text-orange-600" />
            People
          </h1>
          <p className="text-muted-foreground mt-2">People과 관련된 활동을 계획하고 모니터링할 수 있습니다.</p>
        </div>

        <Card className="px-4 py-2 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          {isEditingScore ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={tempScores.current === 0 ? "" : tempScores.current}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number.parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      setTempScores({ ...tempScores, current: value });
                    }
                  }}
                  className="w-16 h-8 text-center font-bold"
                  min="0"
                  max="10"
                  step="0.1"
                  placeholder="0"
                />
                <span className="text-sm font-medium">/</span>
                <Input
                  type="number"
                  value={tempScores.goal === 0 ? "" : tempScores.goal}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number.parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      setTempScores({ ...tempScores, goal: value });
                    }
                  }}
                  className="w-16 h-8 text-center font-bold"
                  min="0"
                  max="10"
                  step="0.1"
                  placeholder="0"
                />
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveScores}>
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelScores}>
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <span className="text-xs text-muted-foreground">자기평가점수</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-orange-600">{peopleScore?.currentScore}</span>
                  <span className="text-lg font-medium text-muted-foreground">/ {peopleScore?.targetScore}</span>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="h-6 w-6 ml-2" onClick={() => setIsEditingScore(true)}>
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </Card>
      </div>

      <Tabs defaultValue="plan-assessment" className="space-y-6" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plan-assessment">Plan</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="self-assessment">Self Assessment</TabsTrigger>
        </TabsList>

        <TabsContent value="plan-assessment">
          <PlanAssessmentTab />
        </TabsContent>

        <TabsContent value="status">
          <ResultsTab />
        </TabsContent>

        <TabsContent value="self-assessment">
          <SelfAssessmentTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
