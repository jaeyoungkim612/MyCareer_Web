"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Table as TableComponent,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { supabase } from "@/lib/supabase"
import { AuthService } from "@/lib/auth-service"

interface DoAEEvaluationSectionProps {
  empno?: string
  readOnly?: boolean
}

// 6개 평가 문항 (출처: EER 항목들.xlsx Sheet1)
const EER_QUESTIONS: { key: "1" | "2" | "3" | "4" | "5" | "6"; short: string; full: string }[] = [
  { key: "1", short: "Q1", full: "피평가자는 Audit Enhancement 관련 목표와 방향을 명확히 공유했나요?" },
  { key: "2", short: "Q2", full: "피평가자 주도하에 Scope out, 간소화 결정을 하였나요?" },
  { key: "3", short: "Q3", full: "피평가자 주도하에 Real Risk와 관계없는 업무(예: 형식적 보고자료 작성 등)가 제거되었나요?" },
  { key: "4", short: "Q4", full: "Upfront Review를 통하여 기말 감사 업무 방향을 명확히 제시하였나요?" },
  { key: "5", short: "Q5", full: "기말감사 과정에서 민감하거나 어려운 이슈가 발생했을 때, 피평가자가 고객의 상황을 충분히 고려하여 직접적이고 적극적인 커뮤니케이션으로 이슈를 원만하게 해결하였나요?" },
  { key: "6", short: "Q6", full: "피평가자는 AI/Digital Tool 활용을 강조하고 주도하였나요?" },
]

const COMMENT_1_LABEL = "피평가자가 주도적으로 Audit Enhancement를 실천한 구체적인 사례를 기술해 주세요."
const COMMENT_2_LABEL = "앞으로 Audit Enhancement를 위해 피평가자가 특히 더 집중해야 할 역할은 무엇이라고 생각하나요?"

// 코멘트의 번호 항목(1) ... 2) ...) 사이 마지막 마침표를 쉼표로 변환
function formatComment(comment: string | null | undefined): string {
  if (!comment) return ""
  const hasNumberedItems = /\d+\)/g.test(comment)
  if (!hasNumberedItems) return comment

  let result = comment
  const matches = [...comment.matchAll(/(\d+\))/g)]
  if (matches.length > 1) {
    for (let i = 0; i < matches.length - 1; i++) {
      const cur = matches[i]
      const nxt = matches[i + 1]
      if (cur.index !== undefined && nxt.index !== undefined) {
        const segment = comment.substring(cur.index, nxt.index)
        const lastPeriodIdx = segment.lastIndexOf(".")
        if (lastPeriodIdx !== -1) {
          const newSeg = segment.substring(0, lastPeriodIdx) + "," + segment.substring(lastPeriodIdx + 1)
          result = result.substring(0, cur.index) + newSeg + result.substring(nxt.index)
        }
      }
    }
  }
  return result
}

// Yes/No 배지
function YesNoBadge({ value }: { value: any }) {
  const v = String(value ?? "").trim().toLowerCase()
  if (v === "yes" || v === "y" || v === "true") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 border-0">
        Yes
      </Badge>
    )
  }
  if (v === "no" || v === "n" || v === "false") {
    return (
      <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 border-0">
        No
      </Badge>
    )
  }
  return <span className="text-muted-foreground text-sm">-</span>
}

const EER_SELECT = `
  사번,
  성명,
  소속,
  직위,
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "Comment_1",
  "Comment_2"
`

export function DoAEEvaluationSection({ empno, readOnly = false }: DoAEEvaluationSectionProps) {
  const [evaluationData, setEvaluationData] = useState<{
    partnerRows: any[]
    loading: boolean
  }>({ partnerRows: [], loading: true })

  const [userInfo, setUserInfo] = useState<{ cm_nm?: string; org_nm?: string } | null>(null)
  const [userRole, setUserRole] = useState<{ isSecondaryReviewer: boolean; isMaster: boolean }>({
    isSecondaryReviewer: false,
    isMaster: false,
  })

  const [isTeamPartnersDialogOpen, setIsTeamPartnersDialogOpen] = useState(false)
  const [isAllPartnersDialogOpen, setIsAllPartnersDialogOpen] = useState(false)
  const [teamPartners, setTeamPartners] = useState<any[]>([])
  const [allPartners, setAllPartners] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const authUser = AuthService.getCurrentUser()
      const targetEmpno = readOnly ? empno : empno || authUser?.empno
      if (!targetEmpno) {
        setEvaluationData({ partnerRows: [], loading: false })
        return
      }

      try {
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(targetEmpno)
        const fiveDigitEmpno = normalizedEmpno.replace(/^0/, "")

        // HR (CM_NM, ORG_NM)
        const { data: hrData } = await supabase
          .from("a_hr_master")
          .select("CM_NM, ORG_NM")
          .eq("EMPNO", normalizedEmpno)
          .maybeSingle()
        setUserInfo({ cm_nm: (hrData as any)?.CM_NM, org_nm: (hrData as any)?.ORG_NM })

        // 권한 (현재 로그인 사용자 기준)
        const userRoleInfo = await ReviewerService.getUserRole(authUser?.empno || "")
        setUserRole({ isSecondaryReviewer: userRoleInfo.isReviewer, isMaster: userRoleInfo.isMaster })

        // EER 평가결과 (사번 변형 일괄 .in())
        const partnerEmpnoVariations: (string | number)[] = Array.from(
          new Set(
            [
              parseInt(targetEmpno),
              parseInt(normalizedEmpno),
              parseInt(fiveDigitEmpno),
              targetEmpno,
              normalizedEmpno,
              fiveDigitEmpno,
            ].filter((v: any) => v !== undefined && v !== null && !Number.isNaN(v))
          )
        )
        const { data: partnerRows, error: partnerErr } = await supabase
          .from("EER_Valuation")
          .select(EER_SELECT)
          .in("사번", partnerEmpnoVariations)
        if (partnerErr) console.error("❌ EER_Valuation 조회 실패:", partnerErr)

        setEvaluationData({ partnerRows: partnerRows || [], loading: false })
      } catch (err) {
        console.error("❌ EER 데이터 조회 에러:", err)
        setEvaluationData({ partnerRows: [], loading: false })
      }
    }
    load()
  }, [empno, readOnly])

  // 응답별 Yes 개수 카운트
  const countYes = (row: any) => EER_QUESTIONS.reduce((acc, q) => {
    const v = String(row?.[q.key] ?? "").trim().toLowerCase()
    return acc + (v === "yes" || v === "y" || v === "true" ? 1 : 0)
  }, 0)

  // "팀 파트너" 버튼 핸들러
  const handleLoadTeamPartners = async () => {
    const { ReviewerService } = await import("@/lib/reviewer-service")
    const targetEmpno = empno || AuthService.getCurrentUser()?.empno
    const normalizedTargetEmpno = ReviewerService.normalizeEmpno(targetEmpno || "")

    const { data: teamMembers } = await supabase
      .from("a_hr_master")
      .select("EMPNO, EMPNM, CM_NM")
      .eq("TL_EMPNO", normalizedTargetEmpno)

    if (!teamMembers || teamMembers.length === 0) {
      setTeamPartners([])
      setIsTeamPartnersDialogOpen(true)
      return
    }

    const teamEmpnos = teamMembers.map(m => m.EMPNO)
    const empnoVariations = teamEmpnos.flatMap(e => [e, parseInt(e), e.replace(/^0+/, "")])

    const { data } = await supabase
      .from("EER_Valuation")
      .select(EER_SELECT)
      .in("사번", empnoVariations)
      .order("성명", { ascending: true })

    const normalizedData = (data as any[] || []).map(p => ({
      ...p,
      사번: ReviewerService.normalizeEmpno(p.사번?.toString() || ""),
    }))
    setTeamPartners(normalizedData)
    setIsTeamPartnersDialogOpen(true)
  }

  // "전체 파트너" 버튼 핸들러
  const handleLoadAllPartners = async () => {
    const { ReviewerService } = await import("@/lib/reviewer-service")
    const { data: allTeamLeaders } = await supabase
      .from("a_hr_master")
      .select("EMPNO, EMPNM, CM_NM")
      .not("TL_EMPNO", "is", null)

    if (!allTeamLeaders || allTeamLeaders.length === 0) {
      const { data } = await supabase
        .from("EER_Valuation")
        .select(EER_SELECT)
        .order("성명", { ascending: true })
      const normalizedData = (data as any[] || []).map(p => ({
        ...p,
        사번: ReviewerService.normalizeEmpno(p.사번?.toString() || ""),
      }))
      setAllPartners(normalizedData)
      setIsAllPartnersDialogOpen(true)
      return
    }

    const allEmpnos = [...new Set(allTeamLeaders.map(m => m.EMPNO))]
    const empnoVariations = allEmpnos.flatMap(e => [e, parseInt(e), e.replace(/^0+/, "")])

    const { data } = await supabase
      .from("EER_Valuation")
      .select(EER_SELECT)
      .in("사번", empnoVariations)
      .order("성명", { ascending: true })

    const normalizedData = (data as any[] || []).map(p => ({
      ...p,
      사번: ReviewerService.normalizeEmpno(p.사번?.toString() || ""),
    }))
    setAllPartners(normalizedData)
    setIsAllPartnersDialogOpen(true)
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <h2 className="text-lg font-bold">DoAE Interim 다면평가결과</h2>

        {/* 파트너 평가결과 카드 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">파트너 평가결과</CardTitle>
            <div className="flex gap-2">
              {userRole.isSecondaryReviewer && (
                <Button variant="outline" size="sm" onClick={handleLoadTeamPartners}>
                  <Eye className="mr-2 h-4 w-4" />
                  팀 파트너
                </Button>
              )}
              {userRole.isMaster && (
                <Button variant="outline" size="sm" onClick={handleLoadAllPartners}>
                  <Eye className="mr-2 h-4 w-4" />
                  전체 파트너
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {evaluationData.loading ? (
              <div className="flex items-center justify-center h-32 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-sm text-muted-foreground">로딩 중...</div>
              </div>
            ) : evaluationData.partnerRows.length > 0 ? (
              <div className="space-y-6">
                {/* 응답 건수 요약 */}
                <div className="text-sm text-muted-foreground">
                  총 <span className="font-semibold text-foreground">{evaluationData.partnerRows.length}</span>건의 평가자 응답
                </div>

                {/* Q1~Q6 설명 가이드 (한 번만 표시) */}
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs space-y-1">
                  {EER_QUESTIONS.map(q => (
                    <div key={q.key}>
                      <strong>{q.short}:</strong> {q.full}
                    </div>
                  ))}
                </div>

                {/* 응답 N개 반복 */}
                {evaluationData.partnerRows.map((row, idx) => {
                  const yc = countYes(row)
                  return (
                    <div key={idx} className="space-y-3">
                      <div className="text-sm font-semibold text-muted-foreground">
                        응답 {idx + 1} / {evaluationData.partnerRows.length}
                      </div>
                      <div className="overflow-x-auto">
                        <TableComponent>
                          <TableHeader>
                            <TableRow>
                              <TableHead>사번</TableHead>
                              <TableHead>성명</TableHead>
                              <TableHead>소속</TableHead>
                              <TableHead>직위</TableHead>
                              {EER_QUESTIONS.map(q => (
                                <TableHead key={q.key} className="text-center">
                                  <Tooltip>
                                    <TooltipTrigger className="inline-flex items-center gap-1">
                                      {q.short} <Info className="h-3 w-3" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      {q.short}. {q.full}
                                    </TooltipContent>
                                  </Tooltip>
                                </TableHead>
                              ))}
                              <TableHead className="text-center">Yes 개수</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-mono text-sm">{row.사번}</TableCell>
                              <TableCell className="font-medium">{row.성명}</TableCell>
                              <TableCell className="text-sm">{row.소속}</TableCell>
                              <TableCell>{row.직위}</TableCell>
                              {EER_QUESTIONS.map(q => (
                                <TableCell key={q.key} className="text-center">
                                  <YesNoBadge value={row[q.key]} />
                                </TableCell>
                              ))}
                              <TableCell className="text-center font-bold">
                                {yc} / {EER_QUESTIONS.length}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </TableComponent>
                      </div>

                      {(row.Comment_1 || row.Comment_2) && (
                        <div className="space-y-3">
                          {row.Comment_1 && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                              <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                                {COMMENT_1_LABEL} <span className="text-muted-foreground">(Comment 200자 내외)</span>
                              </div>
                              <div className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                                {formatComment(row.Comment_1)}
                              </div>
                            </div>
                          )}
                          {row.Comment_2 && (
                            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                              <div className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">
                                {COMMENT_2_LABEL} <span className="text-muted-foreground">(Comment 200자 내외)</span>
                              </div>
                              <div className="text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap">
                                {formatComment(row.Comment_2)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {idx < evaluationData.partnerRows.length - 1 && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-2" />
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-sm text-muted-foreground">파트너 평가결과 데이터가 없습니다</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 팀 파트너 평가결과 Dialog */}
        <Dialog open={isTeamPartnersDialogOpen} onOpenChange={setIsTeamPartnersDialogOpen}>
          <DialogContent className="max-w-7xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>팀 파트너 평가결과 ({userInfo?.cm_nm || ""})</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {teamPartners.length > 0 ? (
                <>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {new Set(teamPartners.map(p => p.사번)).size}명 · 총 {teamPartners.length}건 응답
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">팀 파트너 (EER 평가 대상)</div>
                  </div>
                  {Object.entries(groupBy(teamPartners, "사번")).map(([empno, rows]) => (
                    <PartnerDetailCard key={empno} rows={rows} showOrg={false} />
                  ))}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">팀의 파트너 데이터가 없습니다</div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* 전체 파트너 평가결과 Dialog */}
        <Dialog open={isAllPartnersDialogOpen} onOpenChange={setIsAllPartnersDialogOpen}>
          <DialogContent className="max-w-7xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>전체 파트너 평가결과</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {allPartners.length > 0 ? (
                <>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {new Set(allPartners.map(p => p.사번)).size}명 · 총 {allPartners.length}건 응답
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">전체 파트너 (EER 평가 대상)</div>
                  </div>
                  {Object.entries(groupBy(allPartners, "사번")).map(([empno, rows]) => (
                    <PartnerDetailCard key={empno} rows={rows} showOrg={true} />
                  ))}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">파트너 데이터가 없습니다</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

// 사번 등 키 기준으로 그룹핑
function groupBy(rows: any[], key: string): Record<string, any[]> {
  return rows.reduce((acc, r) => {
    const k = String(r[key] ?? "")
    if (!acc[k]) acc[k] = []
    acc[k].push(r)
    return acc
  }, {} as Record<string, any[]>)
}

// 파트너 다이얼로그용 상세 카드 (한 파트너의 여러 응답 묶음)
function PartnerDetailCard({ rows, showOrg }: { rows: any[]; showOrg: boolean }) {
  const head = rows[0]
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>
            {head.성명} ({head.사번}) - {showOrg ? `${head.소속} / ${head.직위}` : head.직위}
          </span>
          <Badge variant="secondary" className="text-base px-3 py-1">
            응답 {rows.length}건
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row, idx) => {
          const yc = EER_QUESTIONS.reduce((acc, q) => {
            const v = String(row?.[q.key] ?? "").trim().toLowerCase()
            return acc + (v === "yes" || v === "y" || v === "true" ? 1 : 0)
          }, 0)
          return (
            <div key={idx} className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground">
                응답 {idx + 1} / {rows.length} · Yes {yc} / {EER_QUESTIONS.length}
              </div>
              <TableComponent>
                <TableHeader>
                  <TableRow>
                    {EER_QUESTIONS.map(q => (
                      <TableHead key={q.key} className="text-center">{q.short}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    {EER_QUESTIONS.map(q => (
                      <TableCell key={q.key} className="text-center">
                        <YesNoBadge value={row[q.key]} />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </TableComponent>

              {(row.Comment_1 || row.Comment_2) && (
                <div className="space-y-3">
                  {row.Comment_1 && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                        {COMMENT_1_LABEL} <span className="text-muted-foreground">(Comment 200자 내외)</span>
                      </div>
                      <div className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                        {formatComment(row.Comment_1)}
                      </div>
                    </div>
                  )}
                  {row.Comment_2 && (
                    <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <div className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">
                        {COMMENT_2_LABEL} <span className="text-muted-foreground">(Comment 200자 내외)</span>
                      </div>
                      <div className="text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap">
                        {formatComment(row.Comment_2)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {idx < rows.length - 1 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-1" />
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
