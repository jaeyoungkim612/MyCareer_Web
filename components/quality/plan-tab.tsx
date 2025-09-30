"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Target, TrendingUp, CheckCircle, Percent, Edit, Save, X, User, CheckCircle2, DollarSign, BarChart3 } from "lucide-react"
import { QualityNonAuditPerformanceService, QualityNonAuditPerformance } from "@/lib/quality-non-audit-performance-service"
import { AuthService } from "@/lib/auth-service"
import { UserInfoMapper } from "@/data/user-info"
import { supabase } from "@/lib/supabase"

// 1. 디폴트 값
const nonAuditDefault = `Quality 향상

효율화 계획

신상품 개발
`;

// 2. 섹션 파싱 함수
function parseNonAuditSections(text: string) {
  console.log('🔍 parseNonAuditSections input:', text);
  const sections = ["Quality 향상", "효율화 계획", "신상품 개발"];
  const result: Record<string, string> = {};
  let current = "";
  let buffer: string[] = [];
  const lines = (text || "").split('\n');
  
  // 설명 문구들을 필터링할 패턴
  const descriptionPatterns = [
    /감사품질 향상을 위한 구체적인 계획과 방법론을 작성하세요/,
    /업무 프로세스 개선 및 효율성 증대 방안을 작성하세요/,
    /새로운 감사 도구나 서비스 개발 계획을 작성하세요/
  ];
  
  console.log('📝 Lines to parse:', lines);
  
  for (const line of lines) {
    const trimmed = line.trim();
    console.log(`📄 Processing line: "${line}" -> trimmed: "${trimmed}"`);
    
    if (sections.includes(trimmed)) {
      if (current) {
        const content = buffer.join('\n').trim();
        result[current] = content;
        console.log(`✅ Saved section "${current}": "${content}"`);
      }
      current = trimmed;
      buffer = [];
      console.log(`🆕 Started new section: "${current}"`);
    } else {
      // 설명 문구가 아닌 경우만 버퍼에 추가
      const isDescriptionLine = descriptionPatterns.some(pattern => pattern.test(trimmed));
      if (!isDescriptionLine) {
        buffer.push(line);
      } else {
        console.log(`🚫 Filtered out description line: "${trimmed}"`);
      }
    }
  }
  
  if (current) {
    const content = buffer.join('\n').trim();
    result[current] = content;
    console.log(`✅ Final section "${current}": "${content}"`);
  }
  
  console.log('🔧 parseNonAuditSections result:', result);
  return result;
}

// 3. View 모드 렌더링 함수
function renderNonAuditView(text: string) {
  if (!text) return <p className="text-sm">입력사항이 없습니다.</p>;
  
  // 설명 문구들을 필터링할 패턴
  const descriptionPatterns = [
    /감사품질 향상을 위한 구체적인 계획과 방법론을 작성하세요/,
    /업무 프로세스 개선 및 효율성 증대 방안을 작성하세요/,
    /새로운 감사 도구나 서비스 개발 계획을 작성하세요/
  ];
  
  const lines = text.split('\n');
  const sections = ["Quality 향상", "효율화 계획", "신상품 개발"];
  
  // 설명 문구 제거
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    return !descriptionPatterns.some(pattern => pattern.test(trimmed));
  });
  
  return filteredLines.map((line, idx) => {
    const trimmed = line.trim();
    if (sections.includes(trimmed)) {
      // 첫 번째 섹션이 아닌 경우 위쪽 마진 추가
      const isFirstSection = idx === 0 || !filteredLines.slice(0, idx).some(prevLine => sections.includes(prevLine.trim()));
      return <p key={idx} className={`font-bold ${!isFirstSection ? 'mt-6' : ''}`}>{trimmed}</p>;
    }
    return <p key={idx} className="text-sm">{line}</p>;
  });
}

interface ExpertisePlanTabProps {
  empno?: string
  readOnly?: boolean
}

export default function ExpertisePlanTab({ empno, readOnly = false }: ExpertisePlanTabProps = {}) {
  const [isEditing, setIsEditing] = useState(false)
  const [showAddComment, setShowAddComment] = useState(false)
  const [newComment, setNewComment] = useState("")

  // Add status management states like other tabs
  const [currentStatus, setCurrentStatus] = useState<'Draft' | '작성중' | '완료'>('Draft')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  // DB 데이터만 사용, 더미 데이터 제거
  const [goals, setGoals] = useState("")
  const [originalGoals, setOriginalGoals] = useState("")

  // 기존 auditMetrics를 새로운 4개 평가 항목으로 변경
  const [auditMetrics, setAuditMetrics] = useState({
    yearEndTimeRatio: 0,        // Year End 이전 시간 비율
    elInputHours: 0,            // EL 투입시간
    axTransitionRatio: 0,       // AX/Transition 비율
    eerEvaluationScore: "Compliant",  // EER 평가 결과 (항상 "Compliant")
  })
  const [originalAuditMetrics, setOriginalAuditMetrics] = useState(auditMetrics)

  // 기존 state 제거 (DB에서만 가져옴)
  const [nonAuditTargets, setNonAuditTargets] = useState({
    newService: "",
    expandService: "",
  })
  const [originalNonAuditTargets, setOriginalNonAuditTargets] = useState(nonAuditTargets)

  // 더미 댓글 제거
  const [reviewerComments, setReviewerComments] = useState<any[]>([])

  const [isEditingNonAudit, setIsEditingNonAudit] = useState(false)
  const [nonAuditText, setNonAuditText] = useState("")
  const [originalNonAuditText, setOriginalNonAuditText] = useState("")

  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [renderKey, setRenderKey] = useState(0)
  

  
  // input refs (EER는 제거됨 - 항상 Compliant)
  const yearEndInputRef = useRef<HTMLInputElement>(null)
  const elInputRef = useRef<HTMLInputElement>(null)
  const axInputRef = useRef<HTMLInputElement>(null)



  useEffect(() => {
    const loadUserData = async () => {
      const user = AuthService.getCurrentUser()
      console.log('👤 Current user:', user)
      
      // empno prop이 있으면 해당 사용자, 없으면 로그인한 사용자
      const targetEmpno = readOnly ? empno : (empno || user?.empno)
      setCurrentUser({ ...user, empno: targetEmpno })
      
      // 대상 사용자의 정보 가져오기 (Business Plan과 동일한 로직, 사번 정규화)
      try {
        if (!targetEmpno) throw new Error("사번이 없습니다.")
        // ReviewerService import 필요
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(targetEmpno)
        console.log(`🔍 Querying HR master with normalized empno: ${targetEmpno} → ${normalizedEmpno}`)
        const { data: hrData, error: hrError } = await supabase
          .from("a_hr_master")
          .select("EMPNO, EMPNM, ORG_NM, JOB_INFO_NM, GRADNM")
          .eq("EMPNO", normalizedEmpno)
          .maybeSingle()
        
        if (hrError) {
          console.error(`❌ HR 데이터 조회 에러 (${normalizedEmpno}):`, hrError)
        }

        if (hrData) {
          setUserInfo({
            empno: hrData.EMPNO,
            empnm: hrData.EMPNM,
            org_nm: hrData.ORG_NM,
            job_info_nm: hrData.JOB_INFO_NM,
            gradnm: hrData.GRADNM,
            pwc_id: hrData.EMPNO,
          })
          console.log("✅ Target user info loaded for:", targetEmpno, hrData.EMPNM, "(direct DB query)")
        } else {
          console.log("ℹ️ No HR data found for target user, using target empno")
          setUserInfo({
            empno: targetEmpno,
            empnm: targetEmpno,
            pwc_id: targetEmpno,
          })
        }
      } catch (error) {
        console.log("ℹ️ Could not load target user info, using target empno:", error)
        setUserInfo({
          empno: targetEmpno,
          empnm: targetEmpno,
          pwc_id: targetEmpno,
        })
      }
    }
    
    loadUserData()
  }, [empno])

  useEffect(() => {
    if (currentUser?.empno) {
      fetchGoal()
    }
    // eslint-disable-next-line
  }, [currentUser])

  async function fetchGoal() {
    setLoading(true)
    try {
      console.log('📖 Fetching goal for employee:', currentUser.empno)
      
      // 사번 정규화 (95129 → 095129)
      const { ReviewerService } = await import("@/lib/reviewer-service")
      const normalizedEmpno = ReviewerService.normalizeEmpno(currentUser.empno)
      console.log(`🔧 Quality Plan fetchGoal: Normalizing empno: ${currentUser.empno} → ${normalizedEmpno}`)
      
      // 모든 관련 레코드 가져오기 (신규/기존/none 타입 모두)
      const { data: allRecords, error } = await supabase
        .from('quality_non_audit_performance')
        .select('*')
        .eq('employee_id', normalizedEmpno)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching goal:', error)
        throw error
      }
      
      if (allRecords && allRecords.length > 0) {
        console.log('📊 All records found:', allRecords)
        
        // 최신 레코드에서 공통 정보 가져오기 (Goals, 새로운 4개 평가 항목, 상태)
        const latestRecord = allRecords[0]
        console.log('🔍 Latest record details:', JSON.stringify(latestRecord, null, 2))
        
        // 순수 목표 설정
        setGoals(latestRecord.quality_goal || '')
        
        // 이제 실제 컬럼에서 직접 읽기
        const yearEnd = latestRecord.year_end_time_ratio || 0;
        const elHours = latestRecord.el_input_hours || 0;
        const axRatio = latestRecord.ax_transition_ratio || 0;
        const eerScore = latestRecord.eer_evaluation_score >= 5.0 ? "Compliant" : "Non-Compliant";
        
        console.log('✅ Loaded from actual columns:', { 
          yearEnd, 
          elHours, 
          axRatio, 
          eerScore,
          raw_eer: latestRecord.eer_evaluation_score 
        });
        
        setAuditMetrics({
          yearEndTimeRatio: yearEnd,
          elInputHours: elHours,
          axTransitionRatio: axRatio,
          eerEvaluationScore: eerScore,
        })
        setCurrentStatus(latestRecord.status || 'Draft')
        
        // 날짜 설정
        if (latestRecord.updated_at) {
          const date = new Date(latestRecord.updated_at)
          const year = date.getFullYear()
          const month = date.getMonth() + 1
          const day = date.getDate()
          setLastUpdated(`${year}년 ${month}월 ${day}일`)
        }
        
        // 비감사 텍스트 처리 - 타입별로 합치기
        let combinedNonAuditText = ''
        
        const noneRecord = allRecords.find(r => r.type === 'none')
        const qualityRecord = allRecords.find(r => r.type === 'Quality향상')
        const 효율화Record = allRecords.find(r => r.type === '효율화계획')
        const 신상품Record = allRecords.find(r => r.type === '신상품개발')
        
        console.log('📊 Found records by type:')
        console.log('  - none:', noneRecord)
        console.log('  - Quality향상:', qualityRecord)
        console.log('  - 효율화계획:', 효율화Record)
        console.log('  - 신상품개발:', 신상품Record)
        
        // 3개 카테고리 타입이 있으면 우선 사용 (최신 저장 방식)
        if (qualityRecord || 효율화Record || 신상품Record) {
          // 3개 카테고리가 있으면 합쳐서 표시
          const parts = []
          if (qualityRecord && qualityRecord.goal_text) {
            console.log('📝 Adding Quality향상 content:', qualityRecord.goal_text)
            parts.push('Quality 향상')
            parts.push(qualityRecord.goal_text)
            parts.push('')
          }
          if (효율화Record && 효율화Record.goal_text) {
            console.log('📝 Adding 효율화계획 content:', 효율화Record.goal_text)
            parts.push('효율화 계획')
            parts.push(효율화Record.goal_text)
            parts.push('')
          }
          if (신상품Record && 신상품Record.goal_text) {
            console.log('📝 Adding 신상품개발 content:', 신상품Record.goal_text)
            parts.push('신상품 개발')
            parts.push(신상품Record.goal_text)
          }
          combinedNonAuditText = parts.join('\n')
          console.log('✅ Combined 3-category records for non-audit text:', combinedNonAuditText)
        } else if (noneRecord) {
          // 3개 카테고리가 없고 none 타입만 있으면 그것을 사용
          combinedNonAuditText = noneRecord.goal_text || ''
          console.log('✅ Using none type record for non-audit text:', combinedNonAuditText)
        }
        
        setNonAuditText(combinedNonAuditText)
        
        // 원본 상태도 업데이트
        setOriginalGoals(latestRecord.quality_goal || '')
        setOriginalAuditMetrics({
          yearEndTimeRatio: yearEnd,
          elInputHours: elHours,
          axTransitionRatio: axRatio,
          eerEvaluationScore: eerScore,
        })
        setOriginalNonAuditText(combinedNonAuditText)
        
        console.log('✅ Data loaded successfully')
        console.log('📝 Combined non-audit text:', combinedNonAuditText)
      } else {
        console.log('⚠️ No data found - using defaults')
        setGoals('')
        setAuditMetrics({ 
          yearEndTimeRatio: 0, 
          elInputHours: 0, 
          axTransitionRatio: 0, 
          eerEvaluationScore: "Compliant" 
        })
        setNonAuditText('')
        setCurrentStatus('Draft')
        setLastUpdated(null)
        
        // 원본 상태도 초기화
        setOriginalGoals('')
        setOriginalAuditMetrics({ 
          yearEndTimeRatio: 0, 
          elInputHours: 0, 
          axTransitionRatio: 0, 
          eerEvaluationScore: "Compliant" 
        })
        setOriginalNonAuditText('')
      }
    } catch (error) {
      console.error('Error fetching goal:', error)
    }
    
    setLoading(false)
  }



  const handleEdit = () => {
    console.log('🖊️ Starting edit mode')
    console.log('📄 Current nonAuditText:', nonAuditText)
    console.log('📄 Current goals:', goals)
    
    setOriginalGoals(goals)
    setOriginalAuditMetrics(auditMetrics)
    setOriginalNonAuditText(nonAuditText)
    setIsEditing(true)
    
    // 비감사 목표가 완전히 비어있을 때만 기본값 설정 (기존 데이터가 있으면 보존)
    const currentText = nonAuditText?.trim() || ''
    const isCompletelyEmpty = !currentText
    
    if (isCompletelyEmpty) {
      console.log('📄 Setting default non-audit text for empty content')
      setNonAuditText(nonAuditDefault)
    }
  }

  // Updated handleSave to include status parameter like other tabs
  async function handleSave(status: '작성중' | '완료') {
    setLoading(true)
    try {
      console.log('🚀 =========================')
      console.log('💾 Starting save process...')
      console.log('📝 Goals:', goals)
      console.log('📊 Audit metrics:', auditMetrics)
      console.log('📄 Non-audit text:', nonAuditText)
      console.log('👤 Current user:', currentUser)
      console.log('🔄 Status:', status)
      
      // 제출일 때만 validation 적용
      if (status === '완료' && !goals.trim()) {
        alert("Quality Goal을 입력해 주세요.")
        setLoading(false)
        return
      }
      
      // 사번 정규화 (95129 → 095129)
      const { ReviewerService } = await import("@/lib/reviewer-service")
      const normalizedEmpno = ReviewerService.normalizeEmpno(currentUser.empno)
      console.log(`🔧 Quality Plan handleSave: Normalizing empno: ${currentUser.empno} → ${normalizedEmpno}`)
      
      // ref를 통해 실제 입력된 값 읽어오기
      const actualYearEnd = yearEndInputRef.current?.value ? Number(yearEndInputRef.current.value) : auditMetrics.yearEndTimeRatio
      const actualElHours = elInputRef.current?.value ? Number(elInputRef.current.value) : auditMetrics.elInputHours
      const actualAxRatio = axInputRef.current?.value ? Number(axInputRef.current.value) : auditMetrics.axTransitionRatio
      // EER 평가 결과는 항상 "Compliant"로 고정
      const actualEerScore = "Compliant"
      
      console.log('🔍 REF values:', { actualYearEnd, actualElHours, actualAxRatio, actualEerScore })
      
      // 이제 실제 컬럼들에 저장
      const commonData = {
        employee_id: normalizedEmpno,
        quality_goal: goals || '',
        year_end_time_ratio: actualYearEnd,
        el_input_hours: actualElHours,
        ax_transition_ratio: actualAxRatio,
        eer_evaluation_score: actualEerScore === "Compliant" ? 5.0 : 0.0, // Compliant = 5점으로 변환
        status: status,
        updated_at: new Date().toISOString()
      }
      
      console.log('💾 Final commonData (with audit metrics):', commonData)
      console.log('🔧 Common data prepared:', commonData)
      
      // 🔥 현재 어떤 경로로 저장하는지 확인
      console.log('🔍 Checking save paths...')
      console.log('❓ Has goals?', !!goals)
      console.log('❓ Has nonAuditText?', !!nonAuditText.trim())
      console.log('❓ Goals value:', goals)
      console.log('❓ NonAuditText value:', nonAuditText)

      // 비감사 텍스트 파싱해서 신규/기존 구분
      const sections = parseNonAuditSections(nonAuditText.trim())
      const hasQuality = sections["Quality 향상"] && sections["Quality 향상"].trim()
      const has효율화 = sections["효율화 계획"] && sections["효율화 계획"].trim()
      const has신상품 = sections["신상품 개발"] && sections["신상품 개발"].trim()
      
      console.log('🔍 Parsed sections:', sections)
      console.log('🔍 hasQuality:', !!hasQuality, 'content:', hasQuality)
      console.log('🔍 has효율화:', !!has효율화, 'content:', has효율화)
      console.log('🔍 has신상품:', !!has신상품, 'content:', has신상품)
      
      console.log('🚩 SAVE PATH DECISION:')
      const hasMultiple = [hasQuality, has효율화, has신상품].filter(Boolean).length > 1
      const hasSingle = [hasQuality, has효율화, has신상품].filter(Boolean).length === 1
      console.log('   Path 1 - Multiple categories:', hasMultiple)
      console.log('   Path 2 - Single category:', hasSingle)
      console.log('   Path 3 - Only goals:', !!(goals && !nonAuditText.trim()))
      console.log('   Path 4 - Both exist:', !!(goals && nonAuditText.trim()))

      if (hasMultiple) {
        // 여러 카테고리가 있으면 각각 별도 레코드로 저장
        console.log('💾 Saving as separate multiple category records')
        
        // 🗑️ 기존 레코드 삭제 (해당 사용자의 모든 Quality 관련 레코드)
        console.log('🗑️ Deleting existing records for user:', normalizedEmpno)
        const { error: deleteError } = await supabase
          .from('quality_non_audit_performance')
          .delete()
          .eq('employee_id', normalizedEmpno)
        
        if (deleteError) {
          console.error('❌ Failed to delete existing records:', deleteError)
          throw deleteError
        }
        console.log('✅ Successfully deleted existing records')
        
        const recordsToSave = []
        
        if (hasQuality) {
          recordsToSave.push({
            employee_id: normalizedEmpno,
            quality_goal: goals || '',
            type: 'Quality향상',
            goal_text: hasQuality,
            year_end_time_ratio: actualYearEnd,
            el_input_hours: actualElHours,
            ax_transition_ratio: actualAxRatio,
            eer_evaluation_score: actualEerScore === "Compliant" ? 5.0 : 0.0,
            status: status,
            updated_at: new Date().toISOString()
          })
        }
        
        if (has효율화) {
          recordsToSave.push({
            employee_id: normalizedEmpno,
            quality_goal: goals || '',
            type: '효율화계획',
            goal_text: has효율화,
            year_end_time_ratio: actualYearEnd,
            el_input_hours: actualElHours,
            ax_transition_ratio: actualAxRatio,
            eer_evaluation_score: actualEerScore === "Compliant" ? 5.0 : 0.0,
            status: status,
            updated_at: new Date().toISOString()
          })
        }
        
        if (has신상품) {
          recordsToSave.push({
            employee_id: normalizedEmpno,
            quality_goal: goals || '',
            type: '신상품개발',
            goal_text: has신상품,
            year_end_time_ratio: actualYearEnd,
            el_input_hours: actualElHours,
            ax_transition_ratio: actualAxRatio,
            eer_evaluation_score: actualEerScore === "Compliant" ? 5.0 : 0.0,
            status: status,
            updated_at: new Date().toISOString()
          })
        }
        
        console.log('💾 Records to save:', recordsToSave)
        
        try {
          const insertPromises = recordsToSave.map(record => 
            supabase.from('quality_non_audit_performance').insert(record).select().single()
          )
          
          const results = await Promise.all(insertPromises)
          
          for (let i = 0; i < results.length; i++) {
            if (results[i].error) throw results[i].error
            console.log(`✅ Record ${i+1} inserted:`, results[i].data)
          }
          
          console.log('✅ All multiple category records saved successfully')
        } catch (error) {
          console.error('❌ Multiple category insert failed:', error)
          throw error
        }
      } else {
        // 단일 카테고리이거나 구분이 없으면 적절한 타입으로 저장
        console.log('💾 Saving as single record')
        
        // 🗑️ 기존 레코드 삭제 (해당 사용자의 모든 Quality 관련 레코드)
        console.log('🗑️ Deleting existing records for user:', normalizedEmpno)
        const { error: deleteError } = await supabase
          .from('quality_non_audit_performance')
          .delete()
          .eq('employee_id', normalizedEmpno)
        
        if (deleteError) {
          console.error('❌ Failed to delete existing records:', deleteError)
          throw deleteError
        }
        console.log('✅ Successfully deleted existing records')
        
        // 단일 카테고리 타입 결정
        let singleType = 'none'
        if (hasQuality) singleType = 'Quality향상'
        else if (has효율화) singleType = '효율화계획'
        else if (has신상품) singleType = '신상품개발'
        
        const recordToSave = {
          employee_id: normalizedEmpno,
          quality_goal: goals || '',
          type: singleType,
          goal_text: nonAuditText.trim() || null,
          year_end_time_ratio: actualYearEnd,
          el_input_hours: actualElHours,
          ax_transition_ratio: actualAxRatio,
          eer_evaluation_score: actualEerScore === "Compliant" ? 5.0 : 0.0,
          status: status,
          updated_at: new Date().toISOString()
        }
        
        console.log('💾 Final recordToSave (single type):', recordToSave)

        try {
          const { data, error } = await supabase
            .from('quality_non_audit_performance')
            .insert(recordToSave)
            .select()
            .single()
          
          if (error) {
            console.error('❌ Insert failed:', error)
            throw error
          }
          
          console.log('✅ Inserted successfully:', data)
        } catch (error) {
          console.error('❌ Error during insert:', error)
          throw error
        }
      }

      // Update states and UI after successful save
      setCurrentStatus(status)
      setIsEditing(false)
      
      // Update lastUpdated after successful save
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const day = now.getDate()
      setLastUpdated(`${year}년 ${month}월 ${day}일`)
      
      alert(status === '작성중' ? "임시저장 완료!" : "제출 완료!")

      // 저장 성공 후 원본 상태 업데이트
      setOriginalGoals(goals)
      setOriginalAuditMetrics({
        yearEndTimeRatio: isNaN(actualYearEnd) ? 0 : actualYearEnd,
        elInputHours: isNaN(actualElHours) ? 0 : actualElHours,
        axTransitionRatio: isNaN(actualAxRatio) ? 0 : actualAxRatio,
        eerEvaluationScore: actualEerScore,
      })
      setOriginalNonAuditText(nonAuditText)

      // 데이터 다시 가져오기
      await fetchGoal()
      
      // 🔔 Monitoring Tab에게 데이터 변경 알림
      window.dispatchEvent(new CustomEvent('qualityPlanDataChanged', { 
        detail: { empno: normalizedEmpno, action: 'saved', status } 
      }))
      console.log('🔔 Dispatched qualityPlanDataChanged event')
    } catch (error) {
      console.error('❌ MAIN CATCH ERROR - Save failed completely:', error)
      console.error('❌ Error type:', typeof error)
      console.error('❌ Error message:', (error as any)?.message)
      console.error('❌ Full error details:', JSON.stringify(error, null, 2))
      alert(`저장 실패: ${(error as any)?.message || error}`)
    }
    
    console.log('🏁 handleSave finished')
    setLoading(false)
  }

  // 임시저장
  const handleDraftSave = async () => {
    await handleSave('작성중')
  }
  
  // 제출
  const handleFinalSave = async () => {
    await handleSave('완료')
  }

  // 상태 배지 렌더링 (다른 탭들과 동일)
  const renderStatusBadge = () => {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline">
          Last updated: {lastUpdated || "-"}
        </Badge>
        {currentStatus === '완료' ? (
          <Badge className="bg-green-500 text-white">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            제출
          </Badge>
        ) : currentStatus === '작성중' ? (
          <Badge className="bg-orange-500 text-white">
            <Save className="mr-1 h-3 w-3" />
            작성중
          </Badge>
        ) : (
          <Badge className="bg-gray-400 text-white">
            Draft
          </Badge>
        )}
      </div>
    )
  }

  const handleCancel = () => {
    setGoals(originalGoals)
    setAuditMetrics(originalAuditMetrics)
    setNonAuditText(originalNonAuditText)
    setIsEditing(false)
  }

  const handleAddComment = () => {
    if (newComment.trim()) {
      const newReviewerComment = {
        id: reviewerComments.length + 1,
        name: "현재 사용자",
        role: "Manager",
        avatar: "/placeholder.svg?height=40&width=40",
        comment: newComment,
        date: new Date().toISOString().split("T")[0],
      }
      setReviewerComments([...reviewerComments, newReviewerComment])
      setNewComment("")
      setShowAddComment(false)
    }
  }

  return (
    <div className="space-y-6" key={renderKey}>
      {/* Header with title and edit buttons - Updated like other tabs */}
      <div className="flex items-center justify-between">
        <div>
                          <h2 className="text-lg font-bold">Quality Plan</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {userInfo ? `${userInfo.empnm} (${userInfo.empno})` : `Employee ID: ${currentUser?.empno || 'Loading...'}`}
              </p>
              {userInfo?.org_nm && (
                <span className="text-xs text-muted-foreground">• {userInfo.org_nm}</span>
              )}
            </div>
            {renderStatusBadge()}
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleCancel} variant="outline" disabled={loading}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              {currentStatus !== '완료' && (
                <Button onClick={handleDraftSave} disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Saving..." : "임시저장"}
                </Button>
              )}
              <Button onClick={handleFinalSave} className="bg-green-600 text-white" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Saving..." : "제출"}
              </Button>
            </>
          ) : !readOnly ? (
            <Button onClick={handleEdit} disabled={loading}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          ) : null}
        </div>
      </div>

      {/* Goals Section Only (full width) */}
      <div className="grid gap-6 md:grid-cols-1">
        {/* Goals Card (now full width) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5 text-orange-600" />
              Goals
            </CardTitle>

          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="품질 목표와 전략을 입력하세요..."
                className="min-h-[600px]"
              />
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                  {goals ? (
                    <p className="text-sm whitespace-pre-line">{goals}</p>
                  ) : (
                    <div className="text-muted-foreground italic">품질 목표와 전략을 입력하세요</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metrics Section - 감사목표와 비감사목표를 같은 행에 배치 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Audit Metrics Card - 왼쪽 */}
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-orange-600" />
  감사 목표
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {/* 4개 항목을 2x2 그리드로 배치 */}
            <div className="grid gap-4 grid-cols-2">
              {/* 첫 번째 행 */}
              {/* Year End 이전 시간 비율 */}
              <div>
                <label className="text-sm font-semibold mb-2 block">
                  <Percent className="inline mr-1 h-4 w-4" />
                  Year End 이전 시간 비율 (%)
                </label>
                {isEditing ? (
                  <Input
                    ref={yearEndInputRef}
                    type="text"
                    value={auditMetrics.yearEndTimeRatio === 0 ? "" : auditMetrics.yearEndTimeRatio}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^\d+$/.test(value)) {
                        const numValue = value === "" ? 0 : parseInt(value, 10);
                        setAuditMetrics(prev => ({ ...prev, yearEndTimeRatio: numValue }));
                      }
                    }}
                    className="text-xl font-bold min-h-[48px] h-[48px] px-3"
                    placeholder="0"
                  />
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md min-h-[70px] flex items-center">
                    <span className="text-xl font-bold">
                      {auditMetrics.yearEndTimeRatio !== undefined && auditMetrics.yearEndTimeRatio !== null && auditMetrics.yearEndTimeRatio !== 0
                        ? auditMetrics.yearEndTimeRatio
                        : <span className="text-muted-foreground">-</span>
                      }%
                    </span>
                  </div>
                )}
              </div>

              {/* EL 투입시간 비율 */}
              <div>
                <label className="text-sm font-semibold mb-2 block">
                  <User className="inline mr-1 h-4 w-4" />
                  EL 투입시간 비율 (%)
                </label>
                {isEditing ? (
                  <Input
                    ref={elInputRef}
                    type="text"
                    value={auditMetrics.elInputHours === 0 ? "" : auditMetrics.elInputHours}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^\d+$/.test(value)) {
                        const numValue = value === "" ? 0 : parseInt(value, 10);
                        setAuditMetrics(prev => ({ ...prev, elInputHours: numValue }));
                      }
                    }}
                    className="text-xl font-bold min-h-[48px] h-[48px] px-3"
                    placeholder="0"
                  />
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md min-h-[70px] flex items-center">
                    <span className="text-xl font-bold">
                      {auditMetrics.elInputHours !== undefined && auditMetrics.elInputHours !== null && auditMetrics.elInputHours !== 0
                        ? auditMetrics.elInputHours
                        : <span className="text-muted-foreground">-</span>
                      }%
                    </span>
                  </div>
                )}
              </div>

              {/* 두 번째 행 */}
              {/* AX/DX Transition 비율 */}
              <div>
                <label className="text-sm font-semibold mb-2 block">
                  <TrendingUp className="inline mr-1 h-4 w-4" />
                  AX/DX Transition 비율 (%)
                </label>
                {isEditing ? (
                  <Input
                    ref={axInputRef}
                    type="text"
                    value={auditMetrics.axTransitionRatio === 0 ? "" : auditMetrics.axTransitionRatio}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^\d+$/.test(value)) {
                        const numValue = value === "" ? 0 : parseInt(value, 10);
                        setAuditMetrics(prev => ({ ...prev, axTransitionRatio: numValue }));
                      }
                    }}
                    className="text-xl font-bold min-h-[48px] h-[48px] px-3"
                    placeholder="0"
                  />
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md min-h-[70px] flex items-center">
                    <span className="text-xl font-bold">
                      {auditMetrics.axTransitionRatio !== undefined && auditMetrics.axTransitionRatio !== null && auditMetrics.axTransitionRatio !== 0
                        ? auditMetrics.axTransitionRatio
                        : <span className="text-muted-foreground">-</span>
                      }%
                    </span>
                  </div>
                )}
              </div>

              {/* EER 평가 결과 */}
              <div>
                <label className="text-sm font-semibold mb-2 block">
                  <CheckCircle className="inline mr-1 h-4 w-4" />
                  EER 평가 결과
                </label>
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md min-h-[70px] flex items-center">
                  <span className="text-xl font-bold text-black dark:text-white">
                    Compliant
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
          <div className="px-6 pb-2">
            <div className="border-t pt-4 mt-2 space-y-4">
              <h4 className="font-medium text-sm">산정 방식</h4>
              <div className="space-y-2">
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                  <h5 className="font-medium text-sm mb-1">Year End 이전 시간 비율:</h5>
                  <p className="text-xs text-muted-foreground">현재누적발생 / 현재 Budget 누적(EPC 상 기존 계산 비율)</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                  <h5 className="font-medium text-sm mb-1">EL 투입시간 비율:</h5>
                  <p className="text-xs text-muted-foreground">담당 프로젝트 총 시간 대비 EL 투입 시간 비율 (%)</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                  <h5 className="font-medium text-sm mb-1">AX/DX Transition 비율:</h5>
                  <p className="text-xs text-muted-foreground">담당 Engagement의 총감사시간대비 AX/DX Transition 시간</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                  <h5 className="font-medium text-sm mb-1">EER 평가 결과:</h5>
                  <p className="text-xs text-muted-foreground">파트너별 Engagement 선정 후 평가 예정 (기본값: Compliant)</p>
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 pb-4 mt-auto">
            <p className="text-sm text-muted-foreground">Target Period: 2606</p>
          </div>
        </Card>

        {/* Non-Audit Metrics Card - 오른쪽 */}
        <Card className="flex flex-col h-full">
          <CardHeader className="flex items-start justify-between">
            <div className="text-left flex-1">
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-orange-600" />
비감사 목표
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {isEditing ? (
              <Textarea
                value={nonAuditText}
                onChange={e => setNonAuditText(e.target.value)}
                placeholder="비감사 목표를 입력하세요"
                className="min-h-[600px]"
              />
            ) : nonAuditText ? (
              <div className="bg-slate-50 dark:bg-slate-900 p-12 rounded-md min-h-[640px]">
                {renderNonAuditView(nonAuditText)}
              </div>
            ) : (
              <div className="text-muted-foreground italic min-h-[600px] flex items-center justify-center">비감사 목표를 입력하세요</div>
            )}
          </CardContent>
          <div className="px-6 pb-4 mt-auto">
            <p className="text-sm text-muted-foreground">Target Period: 2606</p>
          </div>
        </Card>
      </div>


    </div>
  )
}
