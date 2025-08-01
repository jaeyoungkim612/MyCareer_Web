"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Target, TrendingUp, CheckCircle, Percent, Edit, Save, X, User, CheckCircle2 } from "lucide-react"
import { QualityNonAuditPerformanceService, QualityNonAuditPerformance } from "@/lib/quality-non-audit-performance-service"
import { AuthService } from "@/lib/auth-service"
import { UserInfoMapper } from "@/data/user-info"
import { supabase } from "@/lib/supabase"

// 1. 디폴트 값
const nonAuditDefault = `신규 서비스 개발\n\n\n기존 서비스 확장\n`;

// 2. 섹션 파싱 함수
function parseNonAuditSections(text: string) {
  const sections = ["신규 서비스 개발", "기존 서비스 확장"];
  const result: Record<string, string> = {};
  let current = "";
  let buffer: string[] = [];
  const lines = (text || "").split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (sections.includes(trimmed)) {
      if (current) result[current] = buffer.join('\n').trim();
      current = trimmed;
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  if (current) result[current] = buffer.join('\n').trim();
  return result;
}

// 3. View 모드 렌더링 함수
function renderNonAuditView(text: string) {
  if (!text) return <p className="text-sm">입력사항이 없습니다.</p>;
  const lines = text.split('\n');
  const sections = ["신규 서비스 개발", "기존 서비스 확장"];
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (sections.includes(trimmed)) {
      // 첫 번째 섹션이 아닌 경우 위쪽 마진 추가
      const isFirstSection = idx === 0 || !lines.slice(0, idx).some(prevLine => sections.includes(prevLine.trim()));
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

  const [auditMetrics, setAuditMetrics] = useState({
    doaeRate: 0,
    yraRatio: 0,
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
  
  // input refs
  const doaeInputRef = useRef<HTMLInputElement>(null)
  const yraInputRef = useRef<HTMLInputElement>(null)



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
    if (currentUser?.empno) fetchGoal()
    // eslint-disable-next-line
  }, [currentUser])

  async function fetchGoal() {
    setLoading(true)
    try {
      console.log('📖 Fetching goal for employee:', currentUser.empno)
      
      // 모든 관련 레코드 가져오기 (신규/기존/none 타입 모두)
      const { data: allRecords, error } = await supabase
        .from('quality_non_audit_performance')
        .select('*')
        .eq('employee_id', currentUser.empno)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching goal:', error)
        throw error
      }
      
      if (allRecords && allRecords.length > 0) {
        console.log('📊 All records found:', allRecords)
        
        // 최신 레코드에서 공통 정보 가져오기 (Goals, 감사 메트릭, 상태)
        const latestRecord = allRecords[0]
        setGoals(latestRecord.quality_goal || '')
        setAuditMetrics({
          doaeRate: latestRecord.doae_rate || 0,
          yraRatio: latestRecord.yra_ratio || 0
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
        const 신규Record = allRecords.find(r => r.type === '신규')
        const 기존Record = allRecords.find(r => r.type === '기존')
        
        if (noneRecord) {
          // none 타입이 있으면 그것을 사용
          combinedNonAuditText = noneRecord.goal_text || ''
          console.log('✅ Using none type record for non-audit text')
        } else if (신규Record || 기존Record) {
          // 신규/기존 타입이 있으면 합쳐서 표시
          const parts = []
          if (신규Record && 신규Record.goal_text) {
            parts.push('신규 서비스 개발')
            parts.push(신규Record.goal_text)
            parts.push('')
          }
          if (기존Record && 기존Record.goal_text) {
            parts.push('기존 서비스 확장')
            parts.push(기존Record.goal_text)
          }
          combinedNonAuditText = parts.join('\n')
          console.log('✅ Combined 신규/기존 records for non-audit text')
        }
        
        setNonAuditText(combinedNonAuditText)
        
        // 원본 상태도 업데이트
        setOriginalGoals(latestRecord.quality_goal || '')
        setOriginalAuditMetrics({
          doaeRate: latestRecord.doae_rate || 0,
          yraRatio: latestRecord.yra_ratio || 0
        })
        setOriginalNonAuditText(combinedNonAuditText)
        
        console.log('✅ Data loaded successfully')
        console.log('📝 Combined non-audit text:', combinedNonAuditText)
      } else {
        console.log('⚠️ No data found - using defaults')
        setGoals('')
        setAuditMetrics({ doaeRate: 0, yraRatio: 0 })
        setNonAuditText('')
        setCurrentStatus('Draft')
        setLastUpdated(null)
        
        // 원본 상태도 초기화
        setOriginalGoals('')
        setOriginalAuditMetrics({ doaeRate: 0, yraRatio: 0 })
        setOriginalNonAuditText('')
      }
    } catch (error) {
      console.error('Error fetching goal:', error)
    }
    
    setLoading(false)
  }

  const handleEdit = () => {
    setOriginalGoals(goals)
    setOriginalAuditMetrics(auditMetrics)
    setOriginalNonAuditText(nonAuditText)
    setIsEditing(true)
    if (!nonAuditText) setNonAuditText(nonAuditDefault)
  }

  // Updated handleSave to include status parameter like other tabs
  async function handleSave(status: '작성중' | '완료') {
    setLoading(true)
    try {
      console.log('💾 Starting save process...')
      console.log('📝 Goals:', goals)
      console.log('📊 Audit metrics:', auditMetrics)
      console.log('📄 Non-audit text:', nonAuditText)
      
      // Validation
      if (!goals.trim()) {
        alert("Quality Goal을 입력해 주세요.")
        setLoading(false)
        return
      }
      
      // ref를 통해 실제 입력된 값 읽어오기
      const actualDoae = doaeInputRef.current?.value ? Math.round(Number(doaeInputRef.current.value)) : Math.round(auditMetrics.doaeRate)
      const actualYra = yraInputRef.current?.value ? Math.round(Number(yraInputRef.current.value)) : Math.round(auditMetrics.yraRatio)
      
      console.log('🔍 REF values - DoAE:', actualDoae, 'YRA:', actualYra)
      console.log('🔍 REF current values - DoAE input:', doaeInputRef.current?.value, 'YRA input:', yraInputRef.current?.value)
      
      // 공통 감사 목표 및 메트릭 데이터 (정수로 변환)
      const commonData = {
        employee_id: currentUser.empno,
        quality_goal: goals || '',
        doae_rate: isNaN(actualDoae) ? 0 : actualDoae,
        yra_ratio: isNaN(actualYra) ? 0 : actualYra,
        status: status,
        updated_at: new Date().toISOString()
      }

      console.log('🔧 Common data prepared:', commonData)

      // 비감사 텍스트 파싱해서 신규/기존 구분
      const sections = parseNonAuditSections(nonAuditText.trim())
      const has신규 = sections["신규 서비스 개발"] && sections["신규 서비스 개발"].trim()
      const has기존 = sections["기존 서비스 확장"] && sections["기존 서비스 확장"].trim()
      
      console.log('🔍 Parsed sections:', { has신규: !!has신규, has기존: !!has기존 })
      console.log('📝 신규 content:', has신규)
      console.log('📝 기존 content:', has기존)

      if (has신규 && has기존) {
        // 신규와 기존 둘 다 있으면 각각 별도 레코드로 저장
        console.log('💾 Saving as separate 신규/기존 records')
        
        const 신규Record = {
          ...commonData,
          type: '신규',
          goal_text: has신규,
        }
        
        const 기존Record = {
          ...commonData,
          type: '기존', 
          goal_text: has기존,
        }
        
        try {
          const [신규Result, 기존Result] = await Promise.all([
            supabase.from('quality_non_audit_performance').insert(신규Record).select().single(),
            supabase.from('quality_non_audit_performance').insert(기존Record).select().single()
          ])
          
          if (신규Result.error) throw 신규Result.error
          if (기존Result.error) throw 기존Result.error
          
          console.log('✅ 신규 inserted:', 신규Result.data)
          console.log('✅ 기존 inserted:', 기존Result.data)
        } catch (error) {
          console.error('❌ Insert failed:', error)
          throw error
        }
      } else {
        // 신규/기존 구분이 없거나 하나만 있으면 none 타입으로 저장
        console.log('💾 Saving as single none record')
        
        const recordToSave = {
          ...commonData,
          type: 'none',
          goal_text: nonAuditText.trim() || null,
        }

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
      
      alert(status === '작성중' ? "임시저장 완료!" : "최종완료 저장!")

      // 간단하게 데이터 다시 가져오기
      await fetchGoal()
    } catch (error) {
      console.error('Error saving goal:', error)
      alert(`저장 실패: ${error}`)
    }
    setLoading(false)
  }

  // 임시저장
  const handleDraftSave = async () => {
    await handleSave('작성중')
  }
  
  // 최종완료
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
            완료
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
              <Button onClick={handleDraftSave} disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Saving..." : "임시저장"}
              </Button>
              <Button onClick={handleFinalSave} className="bg-green-600 text-white" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Saving..." : "최종완료"}
              </Button>
            </>
          ) : !readOnly && currentStatus !== '완료' ? (
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
            <CardDescription>Your quality objectives and strategy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                {isEditing ? (
                  <Textarea value={goals} onChange={(e) => setGoals(e.target.value)} className="min-h-[60px]" />
                ) : goals ? (
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md min-h-[60px] flex items-start">
                    <p className="text-sm whitespace-pre-line">{goals}</p>
                  </div>
                ) : (
                  <div className="text-muted-foreground italic">목표를 입력하세요</div>
                )}
              </div>
              {/* 뱃지(배지) 렌더링 부분 완전히 제거 */}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metrics Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Audit Metrics Card */}
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-orange-600" />
              감사 목표 (Audit Targets)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-base font-semibold mb-3 block">
                  <Percent className="inline mr-1 h-5 w-5" />
                  DoAE 적용율 (%)
                </label>
                {isEditing ? (
                  <Input
                    ref={doaeInputRef}
                    type="number"
                    value={auditMetrics.doaeRate}
                    onChange={(e) => setAuditMetrics({ ...auditMetrics, doaeRate: e.target.value ? Number(e.target.value) : 0 })}
                    className="text-2xl font-bold min-h-[56px] h-[56px] px-4"
                    placeholder="0"
                  />
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-md min-h-[90px] flex items-center">
                    <span className="text-2xl font-bold">
                      {auditMetrics.doaeRate !== undefined && auditMetrics.doaeRate !== null && auditMetrics.doaeRate !== 0
                        ? auditMetrics.doaeRate
                        : <span className="text-muted-foreground">-</span>
                      }%
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-base font-semibold mb-3 block">
                  <Percent className="inline mr-1 h-5 w-5" />
                  YRA 비율 (%)
                </label>
                {isEditing ? (
                  <Input
                    ref={yraInputRef}
                    type="number"
                    value={auditMetrics.yraRatio}
                    onChange={(e) => setAuditMetrics({ ...auditMetrics, yraRatio: e.target.value ? Number(e.target.value) : 0 })}
                    className="text-2xl font-bold min-h-[56px] h-[56px] px-4"
                    placeholder="0"
                  />
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-md min-h-[90px] flex items-center">
                    <span className="text-2xl font-bold">
                      {auditMetrics.yraRatio !== undefined && auditMetrics.yraRatio !== null && auditMetrics.yraRatio !== 0
                        ? auditMetrics.yraRatio
                        : <span className="text-muted-foreground">-</span>
                      }%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <div className="px-6 pb-2">
            <div className="border-t pt-4 mt-2 space-y-4">
              <h4 className="font-medium text-sm">산정 방식</h4>
              <div className="space-y-2">
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                  <h5 className="font-medium text-sm mb-1">DoAE 적용율:</h5>
                  <p className="text-xs text-muted-foreground">자동화된 감사 시간 / 총 감사 시간 × 100</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                  <h5 className="font-medium text-sm mb-1">YRA 비율:</h5>
                  <p className="text-xs text-muted-foreground">YRA 적용 고객 수 / 총 고객 수 × 100</p>
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 pb-4 mt-auto">
            <p className="text-sm text-muted-foreground">Target Period: 2606</p>
          </div>
        </Card>

        {/* Non-Audit Metrics Card */}
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
                className="min-h-[400px]"
              />
            ) : nonAuditText ? (
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md min-h-[400px]">
                {renderNonAuditView(nonAuditText)}
              </div>
            ) : (
              <div className="text-muted-foreground italic">비감사 목표를 입력하세요</div>
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
