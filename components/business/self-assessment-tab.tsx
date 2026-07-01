"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { AuthService } from "@/lib/auth-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Save, X, CheckCircle2 } from "lucide-react"

const sectionTitles = ["전반적 평가", "주요성과", "어려웠던 점", "향후 계획"];
const defaultComment = sectionTitles.join('\n\n');
const commentPlaceholder = `전반적 평가\n여기에 내용을 입력하세요...\n\n주요성과\n...\n어려웠던 점\n...\n향후 계획\n...`;

function parseSections(comment: string) {
  const result: Record<string, string> = {};
  let current = "";
  let buffer: string[] = [];
  const lines = (comment || "").split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (sectionTitles.includes(trimmed)) {
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

interface BusinessSelfAssessmentTabProps {
  empno?: string
  readOnly?: boolean
}

export function BusinessSelfAssessmentTab({ empno: propEmpno, readOnly = false }: BusinessSelfAssessmentTabProps = {}) {
  const user = AuthService.getCurrentUser()
  const empno = readOnly ? propEmpno : (propEmpno || user?.empno)

  // 중간/기말 평가 데이터
  const [midAssessment, setMidAssessment] = useState<any>(null)
  const [finalAssessment, setFinalAssessment] = useState<any>(null)
  // Edit 상태 및 입력값
  const [isEditingMid, setIsEditingMid] = useState(false)
  const [isEditingFinal, setIsEditingFinal] = useState(false)
  const [editMid, setEditMid] = useState("")
  const [editFinal, setEditFinal] = useState("")
  // 탭 상태
  const [tabValueMid, setTabValueMid] = useState("view")
  const [tabValueFinal, setTabValueFinal] = useState("view")
  // 로딩
  const [loading, setLoading] = useState(false)

  // DB에서 평가 데이터 fetch (최신 이력만)
  const fetchAssessments = async () => {
    if (!empno) {
      console.error("❌ fetchAssessments: empno가 없습니다")
      return
    }
    setLoading(true)
    try {
      // 사번 정규화 (95129 → 095129)
      const { ReviewerService } = await import("@/lib/reviewer-service")
      const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
      console.log(`🔧 BusinessSelfAssessment: Normalizing empno: ${empno} → ${normalizedEmpno}`)
      
      const { data: mid, error: midError } = await supabase
        .from("business_mid_assessments")
        .select("*")
        .eq("empno", normalizedEmpno)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
        
      const { data: final, error: finalError } = await supabase
        .from("business_final_assessments")
        .select("*")
        .eq("empno", normalizedEmpno)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (midError) {
        console.error("❌ Mid assessment fetch error:", midError)
      } else {
        console.log("✅ Mid assessment loaded:", mid)
      }
      
      if (finalError) {
        console.error("❌ Final assessment fetch error:", finalError)
      } else {
        console.log("✅ Final assessment loaded:", final)
      }
      
      setMidAssessment(mid)
      setFinalAssessment(final)
    } catch (e) {
      console.error("❌ fetchAssessments 오류:", e)
      alert("DB에서 평가 데이터를 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssessments()
    // eslint-disable-next-line
  }, [empno])

  // Edit 진입 시 기존 값 세팅 (최신 comment 그대로, 없으면 default)
  const handleEditMid = () => {
    // 이미 편집 중이 아닐 때만 값을 설정
    if (!isEditingMid) {
      setEditMid(midAssessment?.comment || defaultComment)
    }
    setIsEditingMid(true)
    setTabValueMid("edit")
  }
  const handleEditFinal = () => {
    // 이미 편집 중이 아닐 때만 값을 설정
    if (!isEditingFinal) {
      setEditFinal(finalAssessment?.comment || defaultComment)
    }
    setIsEditingFinal(true)
    setTabValueFinal("edit")
  }
  // Cancel
  const handleCancelMid = () => {
    setIsEditingMid(false)
    setTabValueMid("view")
  }
  const handleCancelFinal = () => {
    setIsEditingFinal(false)
    setTabValueFinal("view")
  }

  // 제출된 평가를 다시 수정하기 (status: submitted → draft)
  const handleReopen = async (table: string, kind: "중간평가" | "기말평가", switchToEdit: () => void) => {
    if (!empno) return
    if (!confirm(`제출된 ${kind}를 다시 수정하시겠습니까?\n임시저장(Draft) 상태로 되돌아갑니다.`)) return
    setLoading(true)
    try {
      const { ReviewerService } = await import("@/lib/reviewer-service")
      const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
      const { error } = await supabase
        .from(table)
        .update({ status: 'draft', updated_at: new Date().toISOString() })
        .eq('empno', normalizedEmpno)
      if (error) throw error
      await fetchAssessments()
      switchToEdit()
    } catch (e: any) {
      console.error(`❌ ${kind} 수정 모드 전환 실패:`, e)
      alert(`수정 모드 전환에 실패했습니다.\n${e.message || ""}`)
    } finally {
      setLoading(false)
    }
  }
  const handleReopenMid = () => handleReopen("business_mid_assessments", "중간평가", () => { setIsEditingMid(true); setTabValueMid("edit") })
  const handleReopenFinal = () => handleReopen("business_final_assessments", "기말평가", () => { setIsEditingFinal(true); setTabValueFinal("edit") })
  // 임시저장/제출 (upsert로 저장)
  const handleSaveMid = async (status: "draft" | "submitted") => {
    if (!empno) {
      console.error("❌ 사번이 없습니다:", empno)
      return
    }
    
    // 제출 시 확인 창
    if (status === "submitted") {
      if (!confirm("제출하시겠습니까?\n제출 후에도 '수정하기'로 다시 편집 가능합니다.")) {
        return
      }
    }
    
    setLoading(true)
    try {
      // 사번 정규화 (95129 → 095129)
      const { ReviewerService } = await import("@/lib/reviewer-service")
      const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
      console.log(`🔧 BusinessSelfAssessment: Normalizing empno: ${empno} → ${normalizedEmpno}`)
      
      const payload = {
        empno: normalizedEmpno,
        comment: editMid,
        status,
        updated_at: new Date().toISOString()
        // created_at은 넣지 않음 (DB에서 자동 생성)
      }
      
      console.log("📤 Saving mid assessment:", payload)
      
      // upsert 사용: 기존 데이터가 있으면 update, 없으면 insert
      const { data, error } = await supabase
        .from("business_mid_assessments")
        .upsert(payload, { 
          onConflict: 'empno',
          ignoreDuplicates: false 
        })
        .select();
      
      if (error) {
        console.error("❌ Supabase 에러:", error)
        throw error
      }
      
      console.log("✅ 저장 성공:", data)
      await fetchAssessments()
      setIsEditingMid(false)
      setTabValueMid("view")
      alert(status === "draft" ? "임시저장 완료!" : "제출이 완료되었습니다.\n필요 시 '수정하기' 버튼으로 다시 편집할 수 있습니다.")
    } catch (e: any) {
      console.error("❌ 저장 오류:", e)
      console.error("에러 상세:", {
        message: e.message,
        code: e.code,
        details: e.details,
        hint: e.hint
      })
      alert(`저장에 실패했습니다.\n${e.message || "다시 시도해 주세요."}`)
    } finally {
      setLoading(false)
    }
  }
  const handleSaveFinal = async (status: "draft" | "submitted") => {
    if (!empno) {
      console.error("❌ 사번이 없습니다:", empno)
      return
    }
    
    // 제출 시 확인 창
    if (status === "submitted") {
      if (!confirm("제출하시겠습니까?\n제출 후에도 '수정하기'로 다시 편집 가능합니다.")) {
        return
      }
    }
    
    setLoading(true)
    try {
      // 사번 정규화 (95129 → 095129)
      const { ReviewerService } = await import("@/lib/reviewer-service")
      const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
      console.log(`🔧 BusinessSelfAssessment: Normalizing empno: ${empno} → ${normalizedEmpno}`)
      
      const payload = {
        empno: normalizedEmpno,
        comment: editFinal,
        status,
        updated_at: new Date().toISOString()
        // created_at은 넣지 않음 (DB에서 자동 생성)
      }
      
      console.log("📤 Saving final assessment:", payload)
      
      // upsert 사용: 기존 데이터가 있으면 update, 없으면 insert
      const { data, error } = await supabase
        .from("business_final_assessments")
        .upsert(payload, { 
          onConflict: 'empno',
          ignoreDuplicates: false 
        })
        .select();
      
      if (error) {
        console.error("❌ Supabase 에러:", error)
        throw error
      }
      
      console.log("✅ 저장 성공:", data)
      await fetchAssessments()
      setIsEditingFinal(false)
      setTabValueFinal("view")
      alert(status === "draft" ? "임시저장 완료!" : "제출이 완료되었습니다.\n필요 시 '수정하기' 버튼으로 다시 편집할 수 있습니다.")
    } catch (e: any) {
      console.error("❌ 저장 오류:", e)
      console.error("에러 상세:", {
        message: e.message,
        code: e.code,
        details: e.details,
        hint: e.hint
      })
      alert(`저장에 실패했습니다.\n${e.message || "다시 시도해 주세요."}`)
    } finally {
      setLoading(false)
    }
  }

  // 상태/날짜 뱃지
  const renderBadges = (assessment: any) => (
    <div className="flex items-center gap-2">
      <Badge variant="outline">
        Last updated: {assessment ? (assessment.updated_at ? assessment.updated_at.split("T")[0] : "-") : "-"}
      </Badge>
      {assessment ? (
        assessment.status === "submitted" ? (
          <Badge className="bg-green-500 text-white">제출</Badge>
        ) : (
          <Badge className="bg-orange-500 text-white">임시저장</Badge>
        )
      ) : (
        <Badge className="bg-gray-400 text-white">Draft</Badge>
      )}
    </div>
  )

  // View: 4개 섹션 제목 항상 Bold, 각 제목 아래에 해당 내용(없으면 안내)
  function renderSectionedView(comment: string) {
    if (!comment) return <p className="text-sm">입력사항이 없습니다.</p>;
    const lines = comment.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (sectionTitles.includes(trimmed)) {
        return <p key={idx} className="font-bold mt-4 first:mt-0">{trimmed}</p>;
      }
      // 빈 줄도 렌더링하여 줄바꿈 유지
      if (line.trim() === '') {
        return <div key={idx} className="h-4" />;
      }
      return <p key={idx} className="text-sm whitespace-pre-wrap">{line}</p>;
    });
  }

  // 제출 상태면 Edit 탭/버튼 숨김
  const midSubmitted = midAssessment?.status === "submitted"
  const finalSubmitted = finalAssessment?.status === "submitted"

  return (
    <>
      {/* 중간평가 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-orange-600" />
              중간평가
            </span>
            <div className="flex items-center gap-2">
              {renderBadges(midAssessment)}
              {!readOnly && midSubmitted && (
                <Button variant="outline" size="sm" onClick={handleReopenMid} disabled={loading}>
                  수정하기
                </Button>
              )}
            </div>
          </CardTitle>

        </CardHeader>
        <CardContent>
          <Tabs value={tabValueMid} onValueChange={setTabValueMid} className="space-y-4">
            <TabsList>
              <TabsTrigger
                value="view"
                onClick={() => {
                  setTabValueMid("view")
                }}
              >
                View
              </TabsTrigger>
              {!readOnly && !midSubmitted && (
                <TabsTrigger value="edit" onClick={handleEditMid}>
                  Edit
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="view" className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                {renderSectionedView(midAssessment?.comment)}
              </div>
            </TabsContent>
            {!readOnly && !midSubmitted && (
              <TabsContent value="edit" className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                  <Textarea
                    value={editMid}
                    onChange={e => setEditMid(e.target.value)}
                    placeholder={commentPlaceholder}
                    className="min-h-[300px]"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={handleCancelMid} disabled={loading}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button onClick={() => handleSaveMid("draft") } disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    임시저장
                  </Button>
                  <Button onClick={() => handleSaveMid("submitted") } className="bg-green-600 text-white" disabled={loading}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    제출
                  </Button>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* 기말평가 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-orange-600" />
              기말평가
            </span>
            <div className="flex items-center gap-2">
              {renderBadges(finalAssessment)}
              {!readOnly && finalSubmitted && (
                <Button variant="outline" size="sm" onClick={handleReopenFinal} disabled={loading}>
                  수정하기
                </Button>
              )}
            </div>
          </CardTitle>

        </CardHeader>
        <CardContent>
          <Tabs value={tabValueFinal} onValueChange={setTabValueFinal} className="space-y-4">
            <TabsList>
              <TabsTrigger
                value="view"
                onClick={() => {
                  setTabValueFinal("view")
                }}
              >
                View
              </TabsTrigger>
              {!readOnly && !finalSubmitted && (
                <TabsTrigger value="edit" onClick={handleEditFinal}>
                  Edit
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="view" className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                {renderSectionedView(finalAssessment?.comment)}
              </div>
            </TabsContent>
            {!readOnly && !finalSubmitted && (
              <TabsContent value="edit" className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                  <Textarea
                    value={editFinal}
                    onChange={e => setEditFinal(e.target.value)}
                    placeholder={commentPlaceholder}
                    className="min-h-[300px]"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={handleCancelFinal} disabled={loading}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button onClick={() => handleSaveFinal("draft") } disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    임시저장
                  </Button>
                  <Button onClick={() => handleSaveFinal("submitted") } className="bg-green-600 text-white" disabled={loading}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    제출
                  </Button>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </>
  )
}
