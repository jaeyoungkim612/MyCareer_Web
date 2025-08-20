"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, Minus, CheckCircle, Percent, Award, Filter, Edit, Save, X, Table, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { QualityMonitoringService } from "@/lib/quality-monitoring-service"
import { AuthService, User } from "@/lib/auth-service"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table as TableComponent, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
    if (actual >= target + 5) return <Badge className="bg-red-500">Over Budget</Badge>;
    if (actual >= target) return <Badge className="bg-orange-500">Near Target</Badge>;
    return <Badge className="bg-green-500">On Track</Badge>;
  }

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-red-600" />  // 초과는 나쁨
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-green-600" />  // 절약은 좋음
    return <Minus className="h-4 w-4 text-gray-600" />
  }

  const [targetMetrics, setTargetMetrics] = useState({ 
    yearEndTimeRatio: 0, 
    elInputHours: 0, 
    axTransitionRatio: 0, 
    eerEvaluationScore: 0 
  })
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [nonAuditGoal, setNonAuditGoal] = useState<{ 신규: string; 기존: string }>({ 신규: "", 기존: "" })
  
  // EPC 데이터 state 추가
  const [epcData, setEpcData] = useState<any[]>([])
  const [isLoadingEpc, setIsLoadingEpc] = useState(false)
  const [actualYearEndRatio, setActualYearEndRatio] = useState(0)
  const [totalBudget, setTotalBudget] = useState(0)
  const [totalOccurTime, setTotalOccurTime] = useState(0)
  
  // EL 투입시간 관련 state 추가
  const [actualElInputRatio, setActualElInputRatio] = useState(0)
  const [isLoadingElData, setIsLoadingElData] = useState(false)
  const [elTotalTime, setElTotalTime] = useState(0)
  const [elMyTime, setElMyTime] = useState(0)
  const [elDetailData, setElDetailData] = useState<any[]>([])

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

  // EPC 데이터 가져오기 함수
  const fetchEpcData = async () => {
    if (!currentUser?.empno) return;
    
    setIsLoadingEpc(true);
    try {
      const { ReviewerService } = await import("@/lib/reviewer-service");
      const normalizedEmpno = ReviewerService.normalizeEmpno(currentUser.empno);
      
      const { data, error } = await supabase
        .from('epc_view')
        .select('*')
        .eq('EMPLNO', normalizedEmpno);
      
      if (error) {
        console.error('Error fetching EPC data:', error);
        return;
      }
      
      console.log('📊 EPC Data loaded:', data);
      setEpcData(data || []);
      
      // Year End 시간 비율 계산 (총합)
      if (data && data.length > 0) {
        const totalOccurTimeValue = data.reduce((sum: number, item: any) => sum + (parseFloat(item.OCCURTIME) || 0), 0);
        const totalBudgetValue = data.reduce((sum: number, item: any) => sum + (parseFloat(item.CUMULATIVEBUDGET) || 0), 0);
        const ratio = totalBudgetValue > 0 ? (totalOccurTimeValue / totalBudgetValue) * 100 : 0;
        
        setActualYearEndRatio(Math.round(ratio * 100) / 100); // 소수점 2자리
        setTotalBudget(totalBudgetValue);
        setTotalOccurTime(totalOccurTimeValue);
        
        console.log(`📈 Year End Ratio: ${totalOccurTimeValue}/${totalBudgetValue} = ${ratio}%`);
      }
    } catch (error) {
      console.error('Error loading EPC data:', error);
    } finally {
      setIsLoadingEpc(false);
    }
  };

  // EL 투입시간 비율 계산 함수
  const fetchElInputData = async () => {
    if (!currentUser?.empno) return;
    
    setIsLoadingElData(true);
    try {
      const { ReviewerService } = await import("@/lib/reviewer-service");
      const normalizedEmpno = ReviewerService.normalizeEmpno(currentUser.empno);
      
      // 1. 접속한 사람이 CHARGPTR인 프로젝트들 조회 (직접 테이블에서)
      const { data: chargeProjects, error: chargeError } = await supabase
        .from('a_project_info')
        .select('PRJTCD, PRJTNM, CHARGPTR')
        .eq('CHARGPTR', normalizedEmpno)
        .not('PRJTNM', 'ilike', '%코칭%')
        .not('PRJTNM', 'like', '%24%')
        .not('PRJTNM', 'like', '%2024%');
      
      if (chargeError) {
        console.error('Error fetching charge projects:', chargeError);
        // 에러 시 빈 데이터로 처리
        setActualElInputRatio(0);
        setElTotalTime(0);
        setElMyTime(0);
        setElDetailData([]);
        return;
      }
      
      const projectCodes = (chargeProjects || []).map(item => item.PRJTCD);
      
      if (projectCodes.length > 0) {
        // 2. 해당 프로젝트들의 모든 사람 시간 데이터 조회 (총시간 계산용)
        const { data: allTimeData, error: allTimeError } = await supabase
          .from('v_project_time')
          .select('PRJTCD, EMPNO, EMPNM, total_use_time')
          .in('PRJTCD', projectCodes);
        
        if (allTimeError) {
          console.error('Error fetching all time data:', allTimeError);
          return;
        }
        
        // 3. 내가 투입한 시간만 필터링
        const myTimeData = (allTimeData || []).filter(item => item.EMPNO === normalizedEmpno);
        
        // 4. 프로젝트별 상세 데이터 생성
        const detailData = (chargeProjects || []).map(project => {
          const projectCode = project.PRJTCD;
          const projectName = project.PRJTNM;
          
          // 이 프로젝트의 전체 팀원 시간 합계
          const projectTotalTime = (allTimeData || [])
            .filter(item => item.PRJTCD === projectCode)
            .reduce((sum: number, item: any) => sum + (parseFloat(item.total_use_time) || 0), 0);
          
          // 이 프로젝트에서 내가 투입한 시간
          const myProjectTime = (myTimeData || [])
            .filter(item => item.PRJTCD === projectCode)
            .reduce((sum: number, item: any) => sum + (parseFloat(item.total_use_time) || 0), 0);
          
          // 비율 계산
          const ratio = projectTotalTime > 0 ? (myProjectTime / projectTotalTime) * 100 : 0;
          
          return {
            PRJTCD: projectCode,
            PRJTNM: projectName,
            el_time: myProjectTime,
            total_time: projectTotalTime,
            ratio: Math.round(ratio * 100) / 100
          };
        });
        
        // 5. 전체 합계 계산
        const totalProjectTime = detailData.reduce((sum, item) => sum + item.total_time, 0);
        const myTotalTime = detailData.reduce((sum, item) => sum + item.el_time, 0);
        const overallRatio = totalProjectTime > 0 ? (myTotalTime / totalProjectTime) * 100 : 0;
        
        // 6. State 업데이트
        setElTotalTime(totalProjectTime);
        setElMyTime(myTotalTime);
        setActualElInputRatio(Math.round(overallRatio * 100) / 100);
        setElDetailData(detailData);
        
        console.log(`📈 EL Input Ratio: ${myTotalTime}/${totalProjectTime} = ${overallRatio}%`);
        console.log('📊 EL Detail Data:', detailData);
      } else {
        setActualElInputRatio(0);
        setElTotalTime(0);
        setElMyTime(0);
        setElDetailData([]);
        console.log('📈 No projects where user is CHARGPTR');
      }
      
    } catch (error) {
      console.error('Error loading EL input data:', error);
    } finally {
      setIsLoadingElData(false);
    }
  };

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

  // EPC 데이터 및 EL 데이터 로드
  useEffect(() => {
    if (currentUser?.empno) {
      fetchEpcData();
      fetchElInputData();
    }
  }, [currentUser])

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
          // Plan 데이터에서 목표 정보 가져오기 (새로운 4개 평가 항목)
          const latestPlan = planData[0]
          setTargetMetrics({
            yearEndTimeRatio: latestPlan.year_end_time_ratio || 0,
            elInputHours: latestPlan.el_input_hours || 0,
            axTransitionRatio: latestPlan.ax_transition_ratio || 0,
            eerEvaluationScore: latestPlan.eer_evaluation_score || 0,
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
          <div className="grid gap-6 md:grid-cols-2">
            {/* Year End 이전 시간 비율 */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium flex items-center justify-between">
                  <span className="flex items-center">
                    <Percent className="mr-2 h-5 w-5" />
                    Year End 이전 시간 비율
                  </span>
                  {getStatusBadge(actualYearEndRatio, targetMetrics.yearEndTimeRatio)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-bold">
                      {actualYearEndRatio > 0 ? `${actualYearEndRatio}%` : '-%'}
                    </span>
                    <span className="text-base text-muted-foreground">/ {targetMetrics.yearEndTimeRatio}%</span>
                  </div>
                  
                  {/* 시간 정보 표시 */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded text-center">
                      <div className="text-xs text-muted-foreground">누적 Budget</div>
                      <div className="font-bold">{totalBudget.toLocaleString()}h</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded text-center">
                      <div className="text-xs text-muted-foreground">발생 시간</div>
                      <div className="font-bold">{totalOccurTime.toLocaleString()}h</div>
                    </div>
                  </div>
                  
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                    <div 
                      className="h-full transition-all"
                      style={{ 
                        width: `${targetMetrics.yearEndTimeRatio > 0 ? Math.min((actualYearEndRatio / targetMetrics.yearEndTimeRatio) * 100, 100) : 0}%`,
                        backgroundColor: actualYearEndRatio >= targetMetrics.yearEndTimeRatio ? '#ef4444' : 'hsl(var(--primary))'
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">vs Target</span>
                    <span className="flex items-center">
                      {actualYearEndRatio > 0 && targetMetrics.yearEndTimeRatio > 0 ? (
                        actualYearEndRatio >= targetMetrics.yearEndTimeRatio ? (
                          <span className="text-red-600 flex items-center">
                            {getTrendIcon(actualYearEndRatio - targetMetrics.yearEndTimeRatio)}
                            <span className="ml-1">+{(actualYearEndRatio - targetMetrics.yearEndTimeRatio).toFixed(1)}%</span>
                          </span>
                        ) : (
                          <span className="text-green-600 flex items-center">
                            {getTrendIcon(actualYearEndRatio - targetMetrics.yearEndTimeRatio)}
                            <span className="ml-1">{(actualYearEndRatio - targetMetrics.yearEndTimeRatio).toFixed(1)}%</span>
                          </span>
                        )
                      ) : (
                        <span className="flex items-center text-gray-600">
                          {getTrendIcon(0)}
                          <span className="ml-1">-</span>
                        </span>
                      )}
                    </span>
                  </div>
                  {/* EPC 데이터 보기 버튼 */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full" onClick={fetchEpcData}>
                        <Table className="mr-2 h-4 w-4" />
                        EPC 상세 데이터 보기
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>EPC 데이터 (사번: {currentUser?.empno})</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            총 {epcData.length}개 프로젝트
                          </span>
                          <span className="text-lg font-bold">
                            전체 비율: {actualYearEndRatio}%
                          </span>
                        </div>
                        <TableComponent>
                          <TableHeader>
                            <TableRow>
                              <TableHead>프로젝트 코드</TableHead>
                              <TableHead>프로젝트명</TableHead>
                              <TableHead className="text-right">누적 Budget</TableHead>
                              <TableHead className="text-right">발생 시간</TableHead>
                              <TableHead className="text-right">비율 (%)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoadingEpc ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                  데이터를 불러오는 중...
                                </TableCell>
                              </TableRow>
                            ) : epcData.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                  EPC 데이터가 없습니다.
                                </TableCell>
                              </TableRow>
                            ) : (
                              epcData.map((item, index) => {
                                const ratio = parseFloat(item.CUMULATIVEBUDGET) > 0 
                                  ? (parseFloat(item.OCCURTIME) / parseFloat(item.CUMULATIVEBUDGET)) * 100 
                                  : 0;
                                return (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium">{item.PRJTCD}</TableCell>
                                    <TableCell>{item.PRJTNM || '-'}</TableCell>
                                    <TableCell className="text-right">
                                      {parseFloat(item.CUMULATIVEBUDGET || 0).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {parseFloat(item.OCCURTIME || 0).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right font-bold">
                                      {ratio.toFixed(2)}%
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </TableComponent>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* EL 투입시간 */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium flex items-center justify-between">
                  <span className="flex items-center">
                    <Award className="mr-2 h-5 w-5" />
                    EL 투입시간 비율
                  </span>
                  {getStatusBadge(actualElInputRatio, targetMetrics.elInputHours)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-bold">
                      {isLoadingElData ? "..." : actualElInputRatio > 0 ? `${actualElInputRatio}%` : '-%'}
                    </span>
                    <span className="text-base text-muted-foreground">/ {targetMetrics.elInputHours}%</span>
                  </div>
                  
                  {/* 시간 정보 표시 */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded text-center">
                      <div className="text-xs text-muted-foreground">EL 시간</div>
                      <div className="font-bold">{elMyTime.toLocaleString()}h</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded text-center">
                      <div className="text-xs text-muted-foreground">총 시간</div>
                      <div className="font-bold">{elTotalTime.toLocaleString()}h</div>
                    </div>
                  </div>
                  
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                    <div 
                      className="h-full transition-all"
                      style={{ 
                        width: `${targetMetrics.elInputHours > 0 ? Math.min((actualElInputRatio / targetMetrics.elInputHours) * 100, 100) : 0}%`,
                        backgroundColor: actualElInputRatio >= targetMetrics.elInputHours ? '#ef4444' : 'hsl(var(--primary))'
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">vs Target</span>
                    <span className="flex items-center">
                      {actualElInputRatio > 0 && targetMetrics.elInputHours > 0 ? (
                        actualElInputRatio >= targetMetrics.elInputHours ? (
                          <span className="text-green-600 flex items-center">
                            {getTrendIcon(actualElInputRatio - targetMetrics.elInputHours)}
                            <span className="ml-1">+{(actualElInputRatio - targetMetrics.elInputHours).toFixed(1)}%</span>
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center">
                            {getTrendIcon(actualElInputRatio - targetMetrics.elInputHours)}
                            <span className="ml-1">{(actualElInputRatio - targetMetrics.elInputHours).toFixed(1)}%</span>
                          </span>
                        )
                      ) : (
                        <span className="flex items-center text-gray-600">
                          {getTrendIcon(0)}
                          <span className="ml-1">-</span>
                        </span>
                      )}
                    </span>
                  </div>
                  
                  {/* EL 상세 데이터 다이얼로그 */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full" onClick={fetchElInputData}>
                        <Table className="mr-2 h-4 w-4" />
                        투입시간 상세 보기
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>EL 투입시간 상세 (사번: {currentUser?.empno})</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            총 {elDetailData.length}개 담당 프로젝트
                          </span>
                          <span className="text-lg font-bold">
                            전체 비율: {actualElInputRatio}%
                          </span>
                        </div>
                        <TableComponent>
                          <TableHeader>
                            <TableRow>
                              <TableHead>프로젝트 코드</TableHead>
                              <TableHead>프로젝트명</TableHead>
                              <TableHead className="text-right">EL 시간</TableHead>
                              <TableHead className="text-right">발생 시간</TableHead>
                              <TableHead className="text-right">비율 (%)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoadingElData ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                  데이터를 불러오는 중...
                                </TableCell>
                              </TableRow>
                            ) : elDetailData.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                  담당하는 프로젝트가 없습니다.
                                </TableCell>
                              </TableRow>
                            ) : (
                              elDetailData.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{item.PRJTCD}</TableCell>
                                  <TableCell>{item.PRJTNM || '-'}</TableCell>
                                  <TableCell className="text-right font-bold text-blue-600">
                                    {item.el_time.toLocaleString()}h
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {item.total_time.toLocaleString()}h
                                  </TableCell>
                                  <TableCell className="text-right font-bold">
                                    {item.ratio.toFixed(2)}%
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </TableComponent>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* AX/DX Transition 비율 */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium flex items-center justify-between">
                  <span className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    AX/DX Transition 비율
                  </span>
                  {getStatusBadge(0, targetMetrics.axTransitionRatio)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-bold">-%</span>
                    <span className="text-base text-muted-foreground">/ {targetMetrics.axTransitionRatio}%</span>
                  </div>
                  <Progress value={0} className="h-3" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">vs Target</span>
                    <span className="flex items-center text-gray-600">
                      {getTrendIcon(0)}
                      <span className="ml-1">-</span>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* EER 평가 결과 */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium flex items-center justify-between">
                  <span className="flex items-center">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    EER 평가 결과
                  </span>
                  {getStatusBadge(0, targetMetrics.eerEvaluationScore)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-bold">-</span>
                    <span className="text-base text-muted-foreground">/ {targetMetrics.eerEvaluationScore}</span>
                  </div>
                  <Progress value={0} className="h-3" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">vs Target</span>
                    <span className="flex items-center text-gray-600">
                      {getTrendIcon(0)}
                      <span className="ml-1">-</span>
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
                              <SelectItem value="완료">제출</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          performanceStatus.신규 === '완료' ? (
                            <Badge className="bg-green-500">제출</Badge>
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
                                  <SelectItem value="완료">제출</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              performanceStatus.신규 === '완료' ? (
                                <Badge className="bg-green-500">제출</Badge>
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
                                  <SelectItem value="완료">제출</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              performanceStatus.기존 === '완료' ? (
                                <Badge className="bg-green-500">제출</Badge>
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
