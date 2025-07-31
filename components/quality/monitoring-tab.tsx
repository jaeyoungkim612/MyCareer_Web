"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, Minus, CheckCircle, Percent, Award, Filter, Edit, Save, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { QualityNonAuditPerformanceService } from "@/lib/quality-non-audit-performance-service"
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
  // 상태값 (pending, in_progress, completed)
  const [performanceStatus, setPerformanceStatus] = useState<{신규: 'pending'|'in_progress'|'completed', 기존: 'pending'|'in_progress'|'completed'}>({신규: 'pending', 기존: 'pending'})

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
      
      // 기존 데이터 불러오기
      const existingPerformances = await QualityNonAuditPerformanceService.getByEmployeeId(currentUser.empno);
      console.log('📊 Existing performances:', existingPerformances)
      
      // 각 레코드를 직접 업데이트
      for (const performance of existingPerformances) {
        console.log(`🔄 Updating record ID ${performance.id}, type: ${performance.type}`)
        
        let newProgressText = ''
        let newStatus = 'pending'
        
        if (performance.type === 'none') {
          // none 타입은 신규 슬롯의 값 사용
          newProgressText = nonAuditStatus.신규.progress
          newStatus = performanceStatus.신규
        } else if (performance.type === '신규') {
          newProgressText = nonAuditStatus.신규.progress
          newStatus = performanceStatus.신규
        } else if (performance.type === '기존') {
          newProgressText = nonAuditStatus.기존.progress
          newStatus = performanceStatus.기존
        }
        
        console.log(`📝 Updating ${performance.type}: progress="${newProgressText}", status="${newStatus}"`)
        
        // 직접 supabase로 업데이트
        const { data, error } = await supabase
          .from('quality_non_audit_performance')
          .update({
            progress_text: newProgressText,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', performance.id)
          .select()
        
        if (error) {
          console.error(`❌ Update failed for ${performance.type}:`, error)
          throw error
        }
        
        console.log(`✅ Updated successfully: ${performance.type}`, data)
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
        // 새로운 quality_non_audit_performance 테이블에서 데이터 가져오기
        const performances = await QualityNonAuditPerformanceService.getByEmployeeId(currentUser.empno)
        console.log('🔍 Monitoring Tab - Loaded performances:', performances)
        
        if (performances.length > 0) {
          // 첫 번째 레코드에서 감사 메트릭 가져오기 (모든 타입에 동일하게 저장됨)
          const firstRecord = performances[0]
          setTargetMetrics({
            doae: firstRecord.doae_rate || 0,
            yra: firstRecord.yra_ratio || 0,
          })
          
          // 최신 레코드부터 확인 (created_at DESC로 정렬되어 있음)
          const latestRecord = performances[0]
          console.log('🔍 Latest record:', latestRecord)
          
          if (latestRecord.type === 'none') {
            // 최신 레코드가 none 타입이면 단일 카드로 표시
            console.log('✅ Using NONE type data (latest):', latestRecord.goal_text)
            setNonAuditGoalText(latestRecord.goal_text || '')
            setNonAuditGoal({ 신규: "", 기존: "" }) // none 타입은 단일 카드로 표시
            
            // none 타입 상태 설정
            const validStatus = ['pending', 'in_progress', 'completed'];
            setPerformanceStatus({
              신규: validStatus.includes(latestRecord.status || '') ? latestRecord.status as any : 'pending',
              기존: 'pending',
            })
            
            // none 타입 진행상황 설정
            setNonAuditStatus({
              신규: { progress: latestRecord.progress_text || '' },
              기존: { progress: '' },
            })
          } else {
            // 최신 레코드가 신규/기존 타입이면 기존 로직 사용
            console.log('✅ Using 신규/기존 type data (latest)')
            const 신규Performance = performances.find(p => p.type === '신규')
            const 기존Performance = performances.find(p => p.type === '기존')
            
            const combinedGoal = QualityNonAuditPerformanceService.combineToOriginalFormat(
              신규Performance?.goal_text || '',
              기존Performance?.goal_text || ''
            )
            setNonAuditGoalText(combinedGoal)
            setNonAuditGoal(parseNonAuditGoal(combinedGoal))
            
            // 신규/기존 상태 설정
            const validStatus = ['pending', 'in_progress', 'completed'];
            setPerformanceStatus({
              신규: validStatus.includes(신규Performance?.status || '') ? 신규Performance?.status as any : 'pending',
              기존: validStatus.includes(기존Performance?.status || '') ? 기존Performance?.status as any : 'pending',
            })
            
            // 신규/기존 진행상황 설정
            setNonAuditStatus({
              신규: { progress: 신규Performance?.progress_text || '' },
              기존: { progress: 기존Performance?.progress_text || '' },
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
        <Button onClick={() => window.location.reload()} variant="outline" size="sm">
          강제 새로고침
        </Button>
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
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">On Track</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          performanceStatus.신규 === 'completed' ? (
                            <Badge className="bg-green-500">Completed</Badge>
                          ) : performanceStatus.신규 === 'in_progress' ? (
                            <Badge className="bg-orange-500">On Track</Badge>
                          ) : (
                            <Badge className="bg-gray-400">Pending</Badge>
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
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_progress">On Track</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              performanceStatus.신규 === 'completed' ? (
                                <Badge className="bg-green-500">Completed</Badge>
                              ) : performanceStatus.신규 === 'in_progress' ? (
                                <Badge className="bg-orange-500">On Track</Badge>
                              ) : (
                                <Badge className="bg-gray-400">Pending</Badge>
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
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_progress">On Track</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              performanceStatus.기존 === 'completed' ? (
                                <Badge className="bg-green-500">Completed</Badge>
                              ) : performanceStatus.기존 === 'in_progress' ? (
                                <Badge className="bg-orange-500">On Track</Badge>
                              ) : (
                                <Badge className="bg-gray-400">Pending</Badge>
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
