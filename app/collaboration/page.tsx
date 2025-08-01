"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Handshake, Edit2, Check, X } from "lucide-react"
import { CollaborationPlanTab } from "@/components/collaboration/plan-tab"
import { CollaborationMonitoringTab } from "@/components/collaboration/monitoring-tab"
import { CollaborationSelfAssessmentTab } from "@/components/collaboration/self-assessment-tab"
import { getScoreByCategory, updateScoreByCategory, loadScoresForEmployee } from "@/data/performance-scores"
import { useAuth } from "@/contexts/auth-context"

export default function CollaborationPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("plan")
  const [isEditingScore, setIsEditingScore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [collaborationScore, setCollaborationScore] = useState(getScoreByCategory("Collaboration"))
  const [tempScores, setTempScores] = useState({
    current: collaborationScore?.currentScore || 0,
    goal: collaborationScore?.targetScore || 0,
  })

  // 사용자별 점수 로드
  useEffect(() => {
    const loadUserScores = async () => {
      if (user?.empno) {
        setIsLoading(true)
        try {
          await loadScoresForEmployee(user.empno)
          const updatedScore = getScoreByCategory("Collaboration")
          setCollaborationScore(updatedScore)
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
    if (collaborationScore && user?.empno) {
      try {
        await updateScoreByCategory("Collaboration", tempScores.current, tempScores.goal)
        const updatedScore = getScoreByCategory("Collaboration")
        setCollaborationScore(updatedScore)
      } catch (error) {
        console.error('Error saving scores:', error)
      }
    }
    setIsEditingScore(false)
  }

  const handleCancelScores = () => {
    setTempScores({
      current: collaborationScore?.currentScore || 0,
      goal: collaborationScore?.targetScore || 0,
    })
    setIsEditingScore(false)
  }

  // collaborationScore 변경 시 tempScores 동기화
  useEffect(() => {
    if (collaborationScore) {
      setTempScores({
        current: collaborationScore.currentScore,
        goal: collaborationScore.targetScore,
      })
    }
  }, [collaborationScore])

  if (isLoading) {
    return (
      <div className="space-y-4 p-6 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center">
              <Handshake className="mr-3 h-8 w-8 text-orange-500" />
              Collaboration
            </h1>
            <p className="text-muted-foreground mt-2">collaboration과 관련된 활동을 계획하고 모니터링할 수 있습니다.</p>
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
            <Handshake className="mr-3 h-8 w-8 text-orange-500" />
            Collaboration
          </h1>
          <p className="text-muted-foreground mt-2">collaboration과 관련된 활동을 계획하고 모니터링할 수 있습니다.</p>
        </div>

        {/* Score Display - Now on the right */}
        <Card className="px-4 py-2 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          {isEditingScore ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={tempScores.current === 0 ? "" : tempScores.current}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0 && value <= 10) {
                      setTempScores({ ...tempScores, current: Number(value.toFixed(1)) });
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
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0 && value <= 10) {
                      setTempScores({ ...tempScores, goal: Number(value.toFixed(1)) });
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
                  <span className="text-2xl font-bold text-orange-600">{collaborationScore?.currentScore.toFixed(1)}</span>
                  <span className="text-lg font-medium text-muted-foreground">/ {collaborationScore?.targetScore.toFixed(1)}</span>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="h-6 w-6 ml-2" onClick={() => setIsEditingScore(true)}>
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </Card>
      </div>

      <Tabs defaultValue="plan" className="space-y-6" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="monitoring">Status</TabsTrigger>
          <TabsTrigger value="self-assessment">Self Assessment</TabsTrigger>
        </TabsList>

        <TabsContent value="plan">
          <CollaborationPlanTab />
        </TabsContent>

        <TabsContent value="monitoring">
          <CollaborationMonitoringTab />
        </TabsContent>

        <TabsContent value="self-assessment">
          <CollaborationSelfAssessmentTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
