"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, Minus, CheckCircle, Percent, Award, Filter, Edit, Save, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { QualityMonitoringService } from "@/lib/quality-monitoring-service"
import { AuthService, User } from "@/lib/auth-service"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"

function parseNonAuditGoal(text: string) {
  if (!text) return { 신규: "", 기존: "" };
  const 신규Idx = text.indexOf("신규 서비스 개발");
  const 기존Idx = text.indexOf("기존 서비스 확장");
  let 신규 = "";
  let 기존 = "";
  if (신규Idx !== -1 && 기존Idx !== -1) {
    신규 = text.substring(신규Idx + 9, 기존Idx).trim();
    기존 = text.substring(기존Idx + 9).trim();
  } else if (신규Idx !== -1) {
    신규 = text.substring(신규Idx + 9).trim();
  } else if (기존Idx !== -1) {
    기존 = text.substring(기존Idx + 9).trim();
  }
  return { 신규, 기존 };
}

interface ExpertiseMonitoringTabProps {
  empno?: string
  readOnly?: boolean
}

export default function ExpertiseMonitoringTab({ empno, readOnly = false }: ExpertiseMonitoringTabProps = {}) {
  const router = useRouter()

  const handleViewNonAuditDetail = () => {
    router.push("/non-audit-detail")
  }

  // 실제값과 목표값을 받아 상태 자동 판정
  const getStatusBadge = (actual: number, target: number) => {
    if (actual >= target + 5) return <Badge className="bg-green-500">Exceeded</Badge>;
    if (actual >= target) return <Badge className="bg-orange-500">On Track</Badge>;
    return <Badge className="bg-red-500">Needs Attention</Badge>;
  }

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-600" />
  }

  const [targetMetrics, setTargetMetrics] = useState({ doae: 0, yra: 0 })
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [nonAuditGoal, setNonAuditGoal] = useState<{ 신규: string; 기존: string }>({ 신규: "", 기존: "" })

  // --- Non-Audit Status State ---
  const [isEditingNonAuditStatus, setIsEditingNonAuditStatus] = useState(false)
  const [nonAuditStatus, setNonAuditStatus] = useState({
    신규: {
      progress: "프로토타입 개발 완료. 현재 내부 알파 테스트 진행 중이며, 초기 피드백 수집 단계입니다.",
    },
    기존: {
      progress: "서울/경기 지역 완료. 부산/경남 지역 전문가 교육 및 고객 발굴 활동 진행 중입니다.",
    },
  })
  const [originalNonAuditStatus, setOriginalNonAuditStatus] = useState(nonAuditStatus)
  // 비감사 목표 전체 텍스트 (Target)
  const [nonAuditGoalText, setNonAuditGoalText] = useState("")
  // 상태값 (Draft, 작성중, 완료)
  const [performanceStatus, setPerformanceStatus] = useState<{신규: 'Draft'|'작성중'|'완료', 기존: 'Draft'|'작성중'|'완료'}>({신규: 'Draft', 기존: 'Draft'})

  // --- Edit/Save/Cancel Handlers ---
  const handleEditNonAuditStatus = () => {
    setOriginalNonAuditStatus(nonAuditStatus)
    setIsEditingNonAuditStatus(true)
  }
  const handleCancelNonAuditStatus = () => {
    setNonAuditStatus(originalNonAuditStatus)
    setIsEditingNonAuditStatus(false)
  }
  const handleSaveNonAuditStatus = async () => {
    if (!currentUser?.empno) return;
    try {
      console.log('💾 Saving non-audit status...')
      console.log('Status to save:', performanceStatus)
      console.log('Progress to save:', nonAuditStatus)
      
      // 사번 정규화 (95129 → 095129)
      const { ReviewerService } = await import("@/lib/reviewer-service")
      const normalizedEmpno = ReviewerService.normalizeEmpno(currentUser.empno)
      console.log(`🔧 Monitoring: Normalizing empno: ${currentUser.empno} → ${normalizedEmpno}`)
      
      // 기존 모니터링 데이터 불러오기 (정규화된 사번 사용)
      const existingMonitorings = await QualityMonitoringService.getByEmployeeId(normalizedEmpno);
      console.log('📊 Existing monitorings:', existingMonitorings)
      
      // 각 모니터링 타입별로 업데이트/생성
      const typesToProcess = ['none', '신규', '기존']
      
      for (const type of typesToProcess) {
        let newProgressText = ''
        let newStatus = 'Draft'
        
        if (type === 'none') {
          // none 타입은 신규 슬롯의 값 사용
          newProgressText = nonAuditStatus.신규.progress
          newStatus = performanceStatus.신규
        } else if (type === '신규') {
          newProgressText = nonAuditStatus.신규.progress
          newStatus = performanceStatus.신규
        } else if (type === '기존') {
          newProgressText = nonAuditStatus.기존.progress
          newStatus = performanceStatus.기존
        }
        
        // 내용이 있을 때만 저장
        if (newProgressText.trim()) {
          console.log(`📝 Saving ${type}: progress="${newProgressText}", status="${newStatus}"`)
          
          try {
            const monitoringData = {
              employee_id: normalizedEmpno,
              type: type as '신규' | '기존' | 'none',
              progress_text: newProgressText,
              status: newStatus as 'Draft' | '작성중' | '완료'
            }
            
            const result = await QualityMonitoringService.upsert(monitoringData)
            console.log(`✅ ${type} monitoring saved successfully:`, result)
          } catch (error) {
            console.error(`❌ Save failed for ${type}:`, error)
            throw error
          }
        }
      }
      
      setIsEditingNonAuditStatus(false);
      console.log('✅ All non-audit status updates completed')
    } catch (error) {
      console.error('Error saving non-audit status:', error);
    }
  }

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (user) {
      // empno prop이 있으면 해당 사용자, 없으면 로그인한 사용자
      const targetEmpno = empno || user.empno
      setCurrentUser({ ...user, empno: targetEmpno })
    }
  }, [empno])

  useEffect(() => {
    async function fetchTargets() {
      if (!currentUser?.empno) return
      try {
        // 사번 정규화 (95129 → 095129)
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(currentUser.empno)
        console.log(`🔧 Monitoring fetchTargets: Normalizing empno: ${currentUser.empno} → ${normalizedEmpno}`)
        
        // Plan 테이블에서 목표 정보 가져오기 (정규화된 사번 사용)
        const { data: planData, error: planError } = await supabase
          .from('quality_non_audit_performance')
          .select('*')
          .eq('employee_id', normalizedEmpno)
          .order('created_at', { ascending: false })
        
        if (planError) {
          console.error('Error fetching plan data:', planError)
          throw planError
        }
        
        // Monitoring 테이블에서 진행상황 가져오기
        const monitorings = await QualityMonitoringService.getByEmployeeId(normalizedEmpno)
        console.log('🔍 Monitoring Tab - Loaded plan data:', planData)
        console.log('🔍 Monitoring Tab - Loaded monitorings:', monitorings)
        
        if (planData && planData.length > 0) {
          // Plan 데이터에서 목표 정보 가져오기
          const latestPlan = planData[0]
          setTargetMetrics({
            doae: latestPlan.doae_rate || 0,
            yra: latestPlan.yra_ratio || 0,
          })
          
          console.log('🔍 Latest plan record:', latestPlan)
          
          // Plan 데이터에서 목표 텍스트 설정
          if (latestPlan.type === 'none') {
            // none 타입이면 단일 카드로 표시
            console.log('✅ Using NONE type plan data:', latestPlan.goal_text)
            setNonAuditGoalText(latestPlan.goal_text || '')
            setNonAuditGoal({ 신규: "", 기존: "" })
          } else {
            // 신규/기존 타입이면 합쳐서 표시
            console.log('✅ Using 신규/기존 type plan data')
            const 신규Plan = planData.find(p => p.type === '신규')
            const 기존Plan = planData.find(p => p.type === '기존')
            
            // 목표 텍스트 합치기
            const parts = []
            if (신규Plan && 신규Plan.goal_text) {
              parts.push('신규 서비스 개발')
              parts.push(신규Plan.goal_text)
              parts.push('')
            }
            if (기존Plan && 기존Plan.goal_text) {
              parts.push('기존 서비스 확장')
              parts.push(기존Plan.goal_text)
            }
            const combinedGoal = parts.join('\n')
            
            setNonAuditGoalText(combinedGoal)
            setNonAuditGoal(parseNonAuditGoal(combinedGoal))
          }
          
          // Monitoring 데이터에서 진행상황 설정
          const validStatus = ['Draft', '작성중', '완료'];
          const noneMonitoring = monitorings.find(m => m.type === 'none')
          const 신규Monitoring = monitorings.find(m => m.type === '신규')
          const 기존Monitoring = monitorings.find(m => m.type === '기존')
          
          if (latestPlan.type === 'none' || (!신규Monitoring && !기존Monitoring)) {
            // none 타입이거나 모니터링 데이터가 없으면 단순 표시
            setPerformanceStatus({
              신규: validStatus.includes(noneMonitoring?.status || '') ? noneMonitoring?.status as any : 'Draft',
              기존: 'Draft',
            })
            
            setNonAuditStatus({
              신규: { progress: noneMonitoring?.progress_text || '' },
              기존: { progress: '' },
            })
          } else {
            // 신규/기존 모니터링 데이터 설정
            setPerformanceStatus({
              신규: validStatus.includes(신규Monitoring?.status || '') ? 신규Monitoring?.status as any : 'Draft',
              기존: validStatus.includes(기존Monitoring?.status || '') ? 기존Monitoring?.status as any : 'Draft',
            })
            
            setNonAuditStatus({
              신규: { progress: 신규Monitoring?.progress_text || '' },
              기존: { progress: 기존Monitoring?.progress_text || '' },
            })
          }
        }
      } catch (error) {
        console.error('Error fetching targets:', error)
      }
    }
    fetchTargets()
  }, [currentUser])

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold">Quality Monitoring</h2>
          <p className="text-sm text-muted-foreground">Real-time tracking of quality metrics</p>
        </div>
      </div>

      {/* Audit Metrics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-orange-600" />
            감사 성과 (Audit Performance)
          </CardTitle>
          <CardDescription>감사 품질 및 효율성 관련 실적 추적</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {/* DoAE Application Rate */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center">
                    <Percent className="mr-1 h-4 w-4" />
                    DoAE 적용율
                  </span>
                  {getStatusBadge(87, targetMetrics.doae)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">87%</span>
                    <span className="text-sm text-muted-foreground">/ {targetMetrics.doae}%</span>
                  </div>
                  <Progress value={102} className="h-2" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">vs Target</span>
                    <span className="flex items-center text-green-600">
                      {getTrendIcon(3.5)}
                      <span className="ml-1">+3.5%</span>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* YRA Ratio */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center">
                    <Percent className="mr-1 h-4 w-4" />
                    YRA 비율
                  </span>
                  {getStatusBadge(70, targetMetrics.yra)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">70%</span>
                    <span className="text-sm text-muted-foreground">/ {targetMetrics.yra}%</span>
                  </div>
                  <Progress value={93} className="h-2" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">vs Target</span>
                    <span className="flex items-center text-red-600">
                      {getTrendIcon(-5)}
                      <span className="ml-1">-5%</span>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Non-Audit Metrics */}
      {/* 비감사서비스 성과 헤더 (카드 바깥) */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-left">
          <div className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-orange-600" />
            <span className="text-2xl font-bold">비감사서비스 성과 <span className="font-normal text-lg">(Non-Audit Performance)</span></span>
          </div>
          <div className="text-sm text-muted-foreground">비감사서비스 품질 관련 실적 추적</div>
        </div>
        <div className="flex gap-2 justify-end items-center">
          {isEditingNonAuditStatus ? (
            <>
              <Button onClick={handleCancelNonAuditStatus} variant="outline" size="sm">
                <X className="mr-2 h-4 w-4" />취소
              </Button>
              <Button onClick={handleSaveNonAuditStatus} size="sm">
                <Save className="mr-2 h-4 w-4" />저장
              </Button>
            </>
          ) : (
            <Button onClick={handleEditNonAuditStatus} size="sm">
              <Edit className="mr-2 h-4 w-4" />Edit
            </Button>
          )}
        </div>
      </div>
      <Card className="mb-6">
        {/* CardHeader 제거, 내용만 남김 */}
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {(!nonAuditGoal.신규 && !nonAuditGoal.기존) ? (
                <Card className="md:col-span-2">
                  <CardContent>
                    {/* 비감사 목표(Target) 전체를 상단에 표시 */}
                    <div className="mt-4 mb-4 text-xs text-muted-foreground whitespace-pre-line">
                      {nonAuditGoalText || "비감사 목표를 입력하세요"}
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">현재 상태</span>
                        {isEditingNonAuditStatus ? (
                          <Select value={performanceStatus.신규} onValueChange={v => setPerformanceStatus(s => ({...s, 신규: v as any}))}>
                            <SelectTrigger className="w-32 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Draft">Draft</SelectItem>
                              <SelectItem value="작성중">작성중</SelectItem>
                              <SelectItem value="완료">완료</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          performanceStatus.신규 === '완료' ? (
                            <Badge className="bg-green-500">완료</Badge>
                          ) : performanceStatus.신규 === '작성중' ? (
                            <Badge className="bg-orange-500">작성중</Badge>
                          ) : (
                            <Badge className="bg-gray-400">Draft</Badge>
                          )
                        )}
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                        {isEditingNonAuditStatus ? (
                          <Textarea
                            value={nonAuditStatus.신규.progress}
                            onChange={e => setNonAuditStatus(s => ({ ...s, 신규: { progress: e.target.value } }))}
                            className="mb-2"
                          />
                        ) : (
                          <p className="text-sm">{nonAuditStatus.신규.progress || nonAuditStatus.기존.progress || "진행상황을 입력하세요"}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {nonAuditGoal.신규 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">신규 서비스 개발</CardTitle>
                        <CardDescription className="text-xs">
                          {nonAuditGoal.신규}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">현재 상태</span>
                            {isEditingNonAuditStatus ? (
                              <Select value={performanceStatus.신규} onValueChange={v => setPerformanceStatus(s => ({...s, 신규: v as any}))}>
                                <SelectTrigger className="w-32 h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Draft">Draft</SelectItem>
                                  <SelectItem value="작성중">작성중</SelectItem>
                                  <SelectItem value="완료">완료</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              performanceStatus.신규 === '완료' ? (
                                <Badge className="bg-green-500">완료</Badge>
                              ) : performanceStatus.신규 === '작성중' ? (
                                <Badge className="bg-orange-500">작성중</Badge>
                              ) : (
                                <Badge className="bg-gray-400">Draft</Badge>
                              )
                            )}
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                            {isEditingNonAuditStatus ? (
                              <Textarea
                                value={nonAuditStatus.신규.progress}
                                onChange={e => setNonAuditStatus(s => ({ ...s, 신규: { progress: e.target.value } }))}
                                className="mb-2"
                              />
                            ) : (
                              <p className="text-sm">{nonAuditStatus.신규.progress}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {nonAuditGoal.기존 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">기존 서비스 확장</CardTitle>
                        <CardDescription className="text-xs">
                          {nonAuditGoal.기존}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">현재 상태</span>
                            {isEditingNonAuditStatus ? (
                              <Select value={performanceStatus.기존} onValueChange={v => setPerformanceStatus(s => ({...s, 기존: v as any}))}>
                                <SelectTrigger className="w-32 h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Draft">Draft</SelectItem>
                                  <SelectItem value="작성중">작성중</SelectItem>
                                  <SelectItem value="완료">완료</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              performanceStatus.기존 === '완료' ? (
                                <Badge className="bg-green-500">완료</Badge>
                              ) : performanceStatus.기존 === '작성중' ? (
                                <Badge className="bg-orange-500">작성중</Badge>
                              ) : (
                                <Badge className="bg-gray-400">Draft</Badge>
                              )
                            )}
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                            {isEditingNonAuditStatus ? (
                              <Textarea
                                value={nonAuditStatus.기존.progress}
                                onChange={e => setNonAuditStatus(s => ({ ...s, 기존: { progress: e.target.value } }))}
                                className="mb-2"
                              />
                            ) : (
                              <p className="text-sm">{nonAuditStatus.기존.progress}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
