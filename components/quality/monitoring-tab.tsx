"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, Minus, CheckCircle, Percent, Award, Filter, Edit, Save, X, Table, Eye, BarChart3 } from "lucide-react"
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
  if (!text) return { Quality향상: "", 효율화계획: "", 신상품개발: "" };
  const qualityIdx = text.indexOf("Quality 향상");
  const 효율화Idx = text.indexOf("효율화 계획");
  const 신상품Idx = text.indexOf("신상품 개발");
  
  let Quality향상 = "";
  let 효율화계획 = "";
  let 신상품개발 = "";
  
  // 설명 문구들을 필터링할 패턴
  const descriptionPatterns = [
    /감사품질 향상을 위한 구체적인 계획과 방법론을 작성하세요\.?/,
    /업무 프로세스 개선 및 효율성 증대 방안을 작성하세요\.?/,
    /새로운 감사 도구나 서비스 개발 계획을 작성하세요\.?/
  ];
  
  const indices = [
    { type: "Quality 향상", idx: qualityIdx, key: "Quality향상" },
    { type: "효율화 계획", idx: 효율화Idx, key: "효율화계획" },
    { type: "신상품 개발", idx: 신상품Idx, key: "신상품개발" }
  ].filter(item => item.idx !== -1).sort((a, b) => a.idx - b.idx);
  
  for (let i = 0; i < indices.length; i++) {
    const current = indices[i];
    const next = indices[i + 1];
    const startIdx = current.idx + current.type.length;
    const endIdx = next ? next.idx : text.length;
    
    let content = text.substring(startIdx, endIdx).trim();
    
    // 설명 문구 제거
    const lines = content.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmed = line.trim();
      return !descriptionPatterns.some(pattern => pattern.test(trimmed));
    });
    content = filteredLines.join('\n').trim();
    
    if (current.key === "Quality향상") Quality향상 = content;
    else if (current.key === "효율화계획") 효율화계획 = content;
    else if (current.key === "신상품개발") 신상품개발 = content;
  }
  
  return { Quality향상, 효율화계획, 신상품개발 };
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
  const [nonAuditGoal, setNonAuditGoal] = useState<{ Quality향상: string; 효율화계획: string; 신상품개발: string }>({ Quality향상: "", 효율화계획: "", 신상품개발: "" })
  
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
    Quality향상: {
      progress: "",
    },
    효율화계획: {
      progress: "",
    },
    신상품개발: {
      progress: "",
    },
  })
  const [originalNonAuditStatus, setOriginalNonAuditStatus] = useState(nonAuditStatus)
  // 비감사 목표 전체 텍스트 (Target)
  const [nonAuditGoalText, setNonAuditGoalText] = useState("")
  // 상태값 (Draft, 작성중, 완료)
  const [performanceStatus, setPerformanceStatus] = useState<{Quality향상: 'Draft'|'작성중'|'완료', 효율화계획: 'Draft'|'작성중'|'완료', 신상품개발: 'Draft'|'작성중'|'완료'}>({Quality향상: 'Draft', 효율화계획: 'Draft', 신상품개발: 'Draft'})
  
  // 실적 데이터 state 추가
  const [performanceData, setPerformanceData] = useState<any>(null)
  const [performanceLoading, setPerformanceLoading] = useState(false)

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
      
      // 프로젝트 코드 필터링: 중간 부분이 01 또는 11인 것만 선택
      const filteredProjectCodes = (chargeProjects || [])
        .map(item => item.PRJTCD)
        .filter(code => {
          // 프로젝트 코드가 XXXXX-XX-XXX 형태에서 중간 XX가 01 또는 11인지 확인
          const parts = code.split('-');
          if (parts.length >= 2) {
            const middlePart = parts[1];
            return middlePart === '01' || middlePart === '11';
          }
          return false;
        });
      
      console.log('📊 Original project codes:', (chargeProjects || []).map(item => item.PRJTCD));
      console.log('📊 Filtered project codes (01, 11 only):', filteredProjectCodes);
      
      if (filteredProjectCodes.length > 0) {
        // 2. 해당 프로젝트들의 모든 사람 시간 데이터 조회 (총시간 계산용)
        const { data: allTimeData, error: allTimeError } = await supabase
          .from('v_project_time')
          .select('PRJTCD, EMPNO, EMPNM, total_use_time')
          .in('PRJTCD', filteredProjectCodes);
        
        if (allTimeError) {
          console.error('Error fetching all time data:', allTimeError);
          return;
        }
        
        // 3. 내가 투입한 시간만 필터링
        const myTimeData = (allTimeData || []).filter(item => item.EMPNO === normalizedEmpno);
        
        // 4. 프로젝트별 상세 데이터 생성 - 필터링된 프로젝트 중 시간 데이터가 있는 것만
        const filteredChargeProjects = (chargeProjects || []).filter(project => 
          filteredProjectCodes.includes(project.PRJTCD)
        );
        
        const detailData = filteredChargeProjects
          .map(project => {
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
          })
          .filter(item => item.total_time > 0) // 시간 데이터가 있는 것만 필터링
          .sort((a, b) => b.ratio - a.ratio); // 비율 높은 순으로 정렬
        
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
        console.log('📈 No filtered projects (01, 11 only) where user is CHARGPTR');
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
      
      // 각 모니터링 타입별로 업데이트/생성 (3개 카테고리)
      const typesToProcess = ['none', 'Quality향상', '효율화계획', '신상품개발']
      
      for (const type of typesToProcess) {
        let newProgressText = ''
        let newStatus = 'Draft'
        
        if (type === 'none') {
          // none 타입은 Quality향상 슬롯의 값 사용
          newProgressText = nonAuditStatus.Quality향상.progress
          newStatus = performanceStatus.Quality향상
        } else if (type === 'Quality향상') {
          newProgressText = nonAuditStatus.Quality향상.progress
          newStatus = performanceStatus.Quality향상
        } else if (type === '효율화계획') {
          newProgressText = nonAuditStatus.효율화계획.progress
          newStatus = performanceStatus.효율화계획
        } else if (type === '신상품개발') {
          newProgressText = nonAuditStatus.신상품개발.progress
          newStatus = performanceStatus.신상품개발
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

  // 실적 데이터 가져오기 함수
  const fetchPerformanceData = async () => {
    if (!currentUser?.empno) return;
    
    setPerformanceLoading(true);
    try {
      console.log('📊 Fetching performance data for employee:', currentUser.empno);
      
      // 사번 정규화
      const { ReviewerService } = await import("@/lib/reviewer-service");
      const normalizedEmpno = ReviewerService.normalizeEmpno(currentUser.empno);
      console.log(`🔧 Performance: Normalizing empno: ${currentUser.empno} → ${normalizedEmpno}`);
      
      // hr_master_dashboard 뷰에서 데이터 가져오기
      const { data, error } = await supabase
        .from('hr_master_dashboard')
        .select(`
          EMPNO,
          EMPNM,
          current_audit_revenue,
          current_audit_adjusted_em,
          current_audit_em,
          current_non_audit_revenue,
          current_non_audit_adjusted_em,
          current_non_audit_em,
          total_current_revenue,
          total_current_adjusted_em,
          total_current_em
        `)
        .eq('EMPNO', normalizedEmpno)
        .maybeSingle();
      
      if (error) {
        console.error('❌ Performance data fetch error:', error);
        throw error;
      }
      
      if (data) {
        console.log('✅ Performance data loaded:', data);
        setPerformanceData(data);
      } else {
        console.log('ℹ️ No performance data found');
        setPerformanceData(null);
      }
    } catch (error) {
      console.error('❌ Error fetching performance data:', error);
      setPerformanceData(null);
    }
    
    setPerformanceLoading(false);
  };

  // EPC 데이터 및 EL 데이터 로드
  useEffect(() => {
    if (currentUser?.empno) {
      fetchEpcData();
      fetchElInputData();
      fetchPerformanceData();
    }
  }, [currentUser])

  // Plan 데이터 재로딩 함수
  const refetchTargets = async () => {
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
        console.log('🔍 Monitoring - Latest plan data:', latestPlan)
        
        setTargetMetrics({
          yearEndTimeRatio: Number(latestPlan.year_end_time_ratio) || 0,
          elInputHours: Number(latestPlan.el_input_hours) || 0,
          axTransitionRatio: Number(latestPlan.ax_transition_ratio) || 0,
          eerEvaluationScore: Number(latestPlan.eer_evaluation_score) || 0,
        })
        
        console.log('✅ Monitoring - Target metrics set:', {
          yearEndTimeRatio: Number(latestPlan.year_end_time_ratio) || 0,
          elInputHours: Number(latestPlan.el_input_hours) || 0,
          axTransitionRatio: Number(latestPlan.ax_transition_ratio) || 0,
          eerEvaluationScore: Number(latestPlan.eer_evaluation_score) || 0,
        })
        
        console.log('🔍 Latest plan record:', latestPlan)
        
        // Plan 데이터에서 목표 텍스트 설정 (3개 카테고리)
        if (latestPlan.type === 'none') {
          // none 타입이면 단일 카드로 표시
          console.log('✅ Using NONE type plan data:', latestPlan.goal_text)
          setNonAuditGoalText(latestPlan.goal_text || '')
          setNonAuditGoal({ Quality향상: "", 효율화계획: "", 신상품개발: "" })
        } else {
          // 3개 카테고리 타입이면 합쳐서 표시
          console.log('✅ Using 3-category type plan data')
          const qualityPlan = planData.find(p => p.type === 'Quality향상')
          const 효율화Plan = planData.find(p => p.type === '효율화계획')
          const 신상품Plan = planData.find(p => p.type === '신상품개발')
          
          // 목표 텍스트 합치기
          const parts = []
          if (qualityPlan && qualityPlan.goal_text) {
            parts.push('Quality 향상')
            parts.push(qualityPlan.goal_text)
            parts.push('')
          }
          if (효율화Plan && 효율화Plan.goal_text) {
            parts.push('효율화 계획')
            parts.push(효율화Plan.goal_text)
            parts.push('')
          }
          if (신상품Plan && 신상품Plan.goal_text) {
            parts.push('신상품 개발')
            parts.push(신상품Plan.goal_text)
          }
          const combinedGoal = parts.join('\n')
          
          setNonAuditGoalText(combinedGoal)
          setNonAuditGoal(parseNonAuditGoal(combinedGoal))
        }
        
        // Monitoring 데이터에서 진행상황 설정 (3개 카테고리)
        const validStatus = ['Draft', '작성중', '완료'];
        const noneMonitoring = monitorings.find((m: any) => m.type === 'none')
        const qualityMonitoring = monitorings.find((m: any) => m.type === 'Quality향상')
        const 효율화Monitoring = monitorings.find((m: any) => m.type === '효율화계획')
        const 신상품Monitoring = monitorings.find((m: any) => m.type === '신상품개발')
        
        if (latestPlan.type === 'none' || (!qualityMonitoring && !효율화Monitoring && !신상품Monitoring)) {
          // none 타입이거나 모니터링 데이터가 없으면 단순 표시
          setPerformanceStatus({
            Quality향상: validStatus.includes(noneMonitoring?.status || '') ? noneMonitoring?.status as any : 'Draft',
            효율화계획: 'Draft',
            신상품개발: 'Draft',
          })
          
          setNonAuditStatus({
            Quality향상: { progress: noneMonitoring?.progress_text || '' },
            효율화계획: { progress: '' },
            신상품개발: { progress: '' },
          })
        } else {
          // 3개 카테고리 모니터링 데이터 설정
          setPerformanceStatus({
            Quality향상: validStatus.includes(qualityMonitoring?.status || '') ? qualityMonitoring?.status as any : 'Draft',
            효율화계획: validStatus.includes(효율화Monitoring?.status || '') ? 효율화Monitoring?.status as any : 'Draft',
            신상품개발: validStatus.includes(신상품Monitoring?.status || '') ? 신상품Monitoring?.status as any : 'Draft',
          })
          
          setNonAuditStatus({
            Quality향상: { progress: qualityMonitoring?.progress_text || '' },
            효율화계획: { progress: 효율화Monitoring?.progress_text || '' },
            신상품개발: { progress: 신상품Monitoring?.progress_text || '' },
          })
        }
      }
    } catch (error) {
      console.error('Error fetching targets:', error)
    }
  }

  useEffect(() => {
    refetchTargets()
  }, [currentUser])

  // 🔄 Plan 데이터 변경 감지를 위한 폴링 또는 이벤트 리스너
  useEffect(() => {
    if (!currentUser?.empno) return

    // Plan 데이터 변경 이벤트 리스너
    const handlePlanDataChange = (event: CustomEvent) => {
      console.log('🔔 Monitoring: Received qualityPlanDataChanged event:', event.detail)
      // 같은 사용자의 변경사항만 처리
      const { ReviewerService } = require("@/lib/reviewer-service")
      const normalizedEmpno = ReviewerService.normalizeEmpno(currentUser.empno)
      
      if (event.detail?.empno === normalizedEmpno) {
        console.log('✅ Monitoring: Plan data changed for current user, refreshing...')
        // 편집 중이 아닐 때만 리프레시 (입력 중인 데이터 보호)
        if (!isEditingNonAuditStatus) {
          refetchTargets()
        }
      }
    }

    // 이벤트 리스너 등록
    window.addEventListener('qualityPlanDataChanged', handlePlanDataChange as EventListener)

    // 편집 중이 아닐 때만 자동 새로고침 (입력 중인 데이터 보호)
    const interval = setInterval(() => {
      if (!isEditingNonAuditStatus) {
        console.log('🔄 Monitoring: Polling Plan data for updates...')
        refetchTargets()
      }
    }, 10000) // 10초로 늘리고 편집 중이 아닐 때만

    return () => {
      window.removeEventListener('qualityPlanDataChanged', handlePlanDataChange as EventListener)
      clearInterval(interval)
    }
  }, [currentUser, isEditingNonAuditStatus])

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold">Quality Monitoring</h2>

        </div>
      </div>

      {/* Audit Metrics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-orange-600" />
감사 성과
          </CardTitle>

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
                            총 {elDetailData.length}개 담당 프로젝트 (중간코드 01, 11만 포함)
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
                                  담당하는 프로젝트가 없습니다 (중간코드 01, 11 조건).
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
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center space-x-6">
                  {/* Compliant 카드 - 선택된 상태 */}
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-green-500 bg-green-50 dark:bg-green-900/20 rounded-lg shadow-md w-[160px] h-[140px]">
                    <CheckCircle className="h-10 w-10 text-green-600 mb-4" />
                    <span className="text-xl font-bold text-green-700 dark:text-green-300">Compliant</span>
                  </div>
                  
                  {/* Non-compliant 카드 - 비선택된 상태 */}
                  <div className="flex flex-col items-center justify-center p-8 border border-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg w-[160px] h-[140px] opacity-60">
                    <X className="h-10 w-10 text-gray-400 mb-4" />
                    <span className="text-xl font-bold text-gray-500">Non-compliant</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>



      {/* Non-Audit Metrics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-orange-600" />
            비감사서비스 성과
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 justify-end items-center mb-4">
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
          <div className="space-y-4">
            {/* 3개 카테고리가 있는지 확인 */}
            {(() => {
              const categories = [
                { key: 'Quality향상', title: 'Quality 향상', goal: nonAuditGoal.Quality향상 },
                { key: '효율화계획', title: '효율화 계획', goal: nonAuditGoal.효율화계획 },
                { key: '신상품개발', title: '신상품 개발', goal: nonAuditGoal.신상품개발 }
              ].filter(cat => cat.goal && cat.goal.trim());
              
              if (categories.length === 0) {
                // 카테고리가 없으면 단일 카드
                return (
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
                          <Select value={performanceStatus.Quality향상} onValueChange={v => setPerformanceStatus(s => ({...s, Quality향상: v as any}))}>
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
                          performanceStatus.Quality향상 === '완료' ? (
                            <Badge className="bg-green-500">제출</Badge>
                          ) : performanceStatus.Quality향상 === '작성중' ? (
                            <Badge className="bg-orange-500">작성중</Badge>
                          ) : (
                            <Badge className="bg-gray-400">Draft</Badge>
                          )
                        )}
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                        {isEditingNonAuditStatus ? (
                          <Textarea
                            value={nonAuditStatus.Quality향상.progress}
                            onChange={e => setNonAuditStatus(s => ({ ...s, Quality향상: { progress: e.target.value } }))}
                            className="mb-2"
                          />
                        ) : (
                          <p className="text-sm">{nonAuditStatus.Quality향상.progress || "진행상황을 입력하세요"}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              } else {
                // 3개 카테고리 표시: 3개까지는 한 행, 3개 다 있으면 다음 행에 추가
                const hasAll3 = categories.length === 3;
                return (
                  <div className="space-y-4">
                    {/* 첫 번째 행: 최대 3개 */}
                    <div className={`grid gap-4 ${categories.length === 1 ? 'md:grid-cols-1' : categories.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                      {categories.map(category => (
                        <Card key={category.key}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">{category.title}</CardTitle>
                            <CardDescription className="text-xs">
                              {category.goal}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">현재 상태</span>
                                {isEditingNonAuditStatus ? (
                                  <Select value={performanceStatus[category.key as keyof typeof performanceStatus]} onValueChange={v => setPerformanceStatus(s => ({...s, [category.key]: v as any}))}>
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
                                  performanceStatus[category.key as keyof typeof performanceStatus] === '완료' ? (
                                    <Badge className="bg-green-500">제출</Badge>
                                  ) : performanceStatus[category.key as keyof typeof performanceStatus] === '작성중' ? (
                                    <Badge className="bg-orange-500">작성중</Badge>
                                  ) : (
                                    <Badge className="bg-gray-400">Draft</Badge>
                                  )
                                )}
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                                {isEditingNonAuditStatus ? (
                                  <Textarea
                                    value={nonAuditStatus[category.key as keyof typeof nonAuditStatus].progress}
                                    onChange={e => setNonAuditStatus(s => ({ ...s, [category.key]: { progress: e.target.value } }))}
                                    className="mb-2"
                                  />
                                ) : (
                                  <p className="text-sm">{nonAuditStatus[category.key as keyof typeof nonAuditStatus].progress || "진행상황을 입력하세요"}</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              }
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics Section - 비감사서비스 성과 하단으로 이동 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5 text-orange-600" />
            실적 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          {performanceLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-muted-foreground">실적 데이터 로딩 중...</div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* 감사 실적 카드 */}
                <Card className="border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                      <div className="p-2 bg-blue-600 rounded-full">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                      감사 실적
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Adjusted EM */}
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                          {performanceData?.current_audit_adjusted_em 
                            ? `${Math.round(Number(performanceData.current_audit_adjusted_em) / 1000000).toLocaleString('ko-KR')}백만원`
                            : '-'
                          }
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-300">Adjusted EM</div>
                      </div>
                      
                      {/* EM */}
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                          {performanceData?.current_audit_em 
                            ? `${Math.round(Number(performanceData.current_audit_em) / 1000000).toLocaleString('ko-KR')}백만원`
                            : '-'
                          }
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-300">EM</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 비감사 실적 카드 */}
                <Card className="border-green-200 dark:border-green-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
                      <div className="p-2 bg-green-600 rounded-full">
                        <TrendingUp className="h-4 w-4 text-white" />
                      </div>
                      비감사 실적
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Adjusted EM */}
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-xl font-bold text-green-900 dark:text-green-100">
                          {performanceData?.current_non_audit_adjusted_em 
                            ? `${Math.round(Number(performanceData.current_non_audit_adjusted_em) / 1000000).toLocaleString('ko-KR')}백만원`
                            : '-'
                          }
                        </div>
                        <div className="text-xs text-green-700 dark:text-green-300">Adjusted EM</div>
                      </div>
                      
                      {/* EM */}
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-xl font-bold text-green-900 dark:text-green-100">
                          {performanceData?.current_non_audit_em 
                            ? `${Math.round(Number(performanceData.current_non_audit_em) / 1000000).toLocaleString('ko-KR')}백만원`
                            : '-'
                          }
                        </div>
                        <div className="text-xs text-green-700 dark:text-green-300">EM</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">
                  * 데이터 기준: {performanceData?.EMPNO ? `${performanceData.EMPNM} (${performanceData.EMPNO})` : '현재 사용자'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
