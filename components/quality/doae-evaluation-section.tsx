"use client"

import { useEffect, useMemo, useState } from "react"
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

const PARTNER_SELECT = `
  사번,
  성명,
  평가자,
  응답수,
  회신률,
  소속,
  직위,
  "1",
  "2",
  "3",
  "4",
  합계,
  평균,
  등급,
  "Comment 1",
  "Comment 2"
`

export function DoAEEvaluationSection({ empno, readOnly = false }: DoAEEvaluationSectionProps) {
  const [evaluationData, setEvaluationData] = useState<{
    teamData: any | null
    partnerData: any | null
    allTeamData: any[] | null
    loading: boolean
  }>({ teamData: null, partnerData: null, allTeamData: null, loading: true })

  const [userInfo, setUserInfo] = useState<{ cm_nm?: string; org_nm?: string } | null>(null)
  const [userRole, setUserRole] = useState<{ isSecondaryReviewer: boolean; isMaster: boolean }>({
    isSecondaryReviewer: false,
    isMaster: false,
  })

  const [isAllTeamDialogOpen, setIsAllTeamDialogOpen] = useState(false)
  const [isTeamPartnersDialogOpen, setIsTeamPartnersDialogOpen] = useState(false)
  const [isAllPartnersDialogOpen, setIsAllPartnersDialogOpen] = useState(false)
  const [teamPartners, setTeamPartners] = useState<any[]>([])
  const [allPartners, setAllPartners] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const authUser = AuthService.getCurrentUser()
      const targetEmpno = readOnly ? empno : empno || authUser?.empno
      if (!targetEmpno) {
        setEvaluationData({ teamData: null, partnerData: null, allTeamData: null, loading: false })
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

        // 전체 팀 evaluation
        const { data: allTeams } = await supabase
          .from("evaluation_team")
          .select("*")
          .order("평균", { ascending: false })
        const allTeamData = allTeams || null

        // 본인 팀 evaluation (CM_NM 기준)
        let teamData: any = null
        if ((hrData as any)?.CM_NM) {
          const { data } = await supabase
            .from("evaluation_team")
            .select("*")
            .eq("구분", (hrData as any).CM_NM)
            .maybeSingle()
          teamData = data || null
        }

        // 파트너 평가결과 (사번 변형 일괄 .in())
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
        const { data: partnerRows } = await supabase
          .from("evaluation_partner")
          .select(PARTNER_SELECT)
          .in("사번", partnerEmpnoVariations)
          .limit(1)
        const partnerData = partnerRows && partnerRows.length > 0 ? partnerRows[0] : null

        setEvaluationData({ teamData, partnerData, allTeamData, loading: false })
      } catch (err) {
        console.error("❌ DoAE 데이터 조회 에러:", err)
        setEvaluationData({ teamData: null, partnerData: null, allTeamData: null, loading: false })
      }
    }
    load()
  }, [empno, readOnly])

  const allTeamAverage = useMemo(() => {
    const list = (evaluationData.allTeamData || []).filter((t: any) => t.구분 !== "공통")
    if (list.length === 0) return null
    return list.reduce((s: number, t: any) => s + (parseFloat(t.평균) || 0), 0) / list.length
  }, [evaluationData.allTeamData])

  const teamPartnersAverage = useMemo(() => {
    if (teamPartners.length === 0) return null
    return teamPartners.reduce((s, p) => s + (parseFloat(p.평균) || 0), 0) / teamPartners.length
  }, [teamPartners])

  const allPartnersAverage = useMemo(() => {
    if (allPartners.length === 0) return null
    return allPartners.reduce((s, p) => s + (parseFloat(p.평균) || 0), 0) / allPartners.length
  }, [allPartners])

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
      .from("evaluation_partner")
      .select(PARTNER_SELECT)
      .in("사번", empnoVariations)
      .order("평균", { ascending: false })

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
      // fallback: 전체 조회
      const { data } = await supabase
        .from("evaluation_partner")
        .select(PARTNER_SELECT)
        .order("평균", { ascending: false })
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
      .from("evaluation_partner")
      .select(PARTNER_SELECT)
      .in("사번", empnoVariations)
      .order("평균", { ascending: false })

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
            ) : evaluationData.partnerData ? (
              <div className="overflow-x-auto">
                <TableComponent>
                  <TableHeader>
                    <TableRow>
                      <TableHead>사번</TableHead>
                      <TableHead>성명</TableHead>
                      <TableHead className="text-right">평가자</TableHead>
                      <TableHead className="text-right">응답수</TableHead>
                      <TableHead className="text-right">회신률</TableHead>
                      <TableHead>소속</TableHead>
                      <TableHead>직위</TableHead>
                      <TableHead className="text-right">
                        <Tooltip>
                          <TooltipTrigger>Q1 <Info className="inline h-3 w-3" /></TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            1. 파트너는 Audit Enhancement 관련 목표와 방향을 명확히 공유했나요? (5점 만점)
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-right">
                        <Tooltip>
                          <TooltipTrigger>Q2 <Info className="inline h-3 w-3" /></TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            2. 파트너 주도하에 시간과 자원을 제배분하여 핵심위험과 고객 Value에 집중하는 변화를 가져왔나요? (5점 만점)
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-right">
                        <Tooltip>
                          <TooltipTrigger>Q3 <Info className="inline h-3 w-3" /></TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            3. 파트너는 Audit Enhancement 활동에 적극적으로 참여하여 업무 효율성 향상에 기여했다고 생각하나요? (5점 만점)
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-right">
                        <Tooltip>
                          <TooltipTrigger>Q4 <Info className="inline h-3 w-3" /></TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            4. 파트너는 AI/Digital Tool 활용을 강조하고 주도하였나요? (5점 만점)
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-right">합계</TableHead>
                      <TableHead className="text-right">평균</TableHead>
                      <TableHead>등급</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono text-sm">{evaluationData.partnerData.사번}</TableCell>
                      <TableCell className="font-medium">{evaluationData.partnerData.성명}</TableCell>
                      <TableCell className="text-right">{evaluationData.partnerData.평가자}</TableCell>
                      <TableCell className="text-right">{evaluationData.partnerData.응답수}</TableCell>
                      <TableCell className="text-right">{evaluationData.partnerData.회신률}</TableCell>
                      <TableCell className="text-sm">{evaluationData.partnerData.소속}</TableCell>
                      <TableCell>{evaluationData.partnerData.직위}</TableCell>
                      <TableCell className="text-right font-medium">{evaluationData.partnerData["1"]}</TableCell>
                      <TableCell className="text-right font-medium">{evaluationData.partnerData["2"]}</TableCell>
                      <TableCell className="text-right font-medium">{evaluationData.partnerData["3"]}</TableCell>
                      <TableCell className="text-right font-medium">{evaluationData.partnerData["4"]}</TableCell>
                      <TableCell className="text-right font-bold">{evaluationData.partnerData.합계}</TableCell>
                      <TableCell className="text-right font-bold">{evaluationData.partnerData.평균}</TableCell>
                      <TableCell>
                        <Badge variant={evaluationData.partnerData.등급 === "EP" ? "default" : "secondary"}>
                          {evaluationData.partnerData.등급}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </TableComponent>

                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs space-y-1">
                  <div><strong>Q1:</strong> 파트너는 Audit Enhancement 관련 목표와 방향을 명확히 공유했나요? <span className="text-muted-foreground">(5점 만점)</span></div>
                  <div><strong>Q2:</strong> 파트너 주도하에 시간과 자원을 제배분하여 핵심위험과 고객 Value에 집중하는 변화를 가져왔나요? <span className="text-muted-foreground">(5점 만점)</span></div>
                  <div><strong>Q3:</strong> 파트너는 Audit Enhancement 활동에 적극적으로 참여하여 업무 효율성 향상에 기여했다고 생각하나요? <span className="text-muted-foreground">(5점 만점)</span></div>
                  <div><strong>Q4:</strong> 파트너는 AI/Digital Tool 활용을 강조하고 주도하였나요? <span className="text-muted-foreground">(5점 만점)</span></div>
                </div>

                {(evaluationData.partnerData["Comment 1"] || evaluationData.partnerData["Comment 2"]) && (
                  <div className="mt-4 space-y-3">
                    {evaluationData.partnerData["Comment 1"] && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                          앞으로 6개월 동안 Audit Enhancement 를 위하여 앞으로 파트너가 가장 집중해야 할 영역은 무엇이라고 생각하나요? <span className="text-muted-foreground">(Comment 200자 내외)</span>
                        </div>
                        <div className="text-sm text-blue-900 dark:text-blue-100">{formatComment(evaluationData.partnerData["Comment 1"])}</div>
                      </div>
                    )}
                    {evaluationData.partnerData["Comment 2"] && (
                      <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                        <div className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">
                          Audit Enhancement 성공을 위해 파트너 및 DoAE로부터 추가로 필요한 지원은 무엇인가요? <span className="text-muted-foreground">(Comment 200자 내외)</span>
                        </div>
                        <div className="text-sm text-green-900 dark:text-green-100">{formatComment(evaluationData.partnerData["Comment 2"])}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-sm text-muted-foreground">파트너 평가결과 데이터가 없습니다</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 팀 평가결과 카드 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              팀 평가결과 ({userInfo?.cm_nm || userInfo?.org_nm || "팀"})
            </CardTitle>
            {evaluationData.allTeamData && evaluationData.allTeamData.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setIsAllTeamDialogOpen(true)}>
                <Eye className="mr-2 h-4 w-4" />
                전 팀 조회
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {evaluationData.loading ? (
              <div className="flex items-center justify-center h-32 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-sm text-muted-foreground">로딩 중...</div>
              </div>
            ) : evaluationData.teamData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">팀 평균</div>
                    <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{evaluationData.teamData.평균}</div>
                  </div>
                  {allTeamAverage !== null && (
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <div className="text-sm text-green-700 dark:text-green-300 mb-1">전체 평균</div>
                      <div className="text-3xl font-bold text-green-900 dark:text-green-100">{allTeamAverage.toFixed(1)}</div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">팀 Comment</div>
                    <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                      {evaluationData.teamData.주요_Comment || evaluationData.teamData["주요 Comment"] || "코멘트가 없습니다"}
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <div className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-2">공통 Comment</div>
                    <div className="text-sm text-orange-900 dark:text-orange-100 whitespace-pre-wrap">
                      다양한 사례 제공 요청, DoAE 확산을 위한 communication 필요성, AI/Digital 관련 실용적인 Tool 확산/교육 필요
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-sm text-muted-foreground">팀 평가결과 데이터가 없습니다</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 전 팀 조회 Dialog */}
        <Dialog open={isAllTeamDialogOpen} onOpenChange={setIsAllTeamDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>전 팀 평가결과</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <TableComponent>
                <TableHeader>
                  <TableRow>
                    <TableHead>팀</TableHead>
                    <TableHead>주요 Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluationData.allTeamData?.filter((t: any) => t.구분 !== "공통").map((team: any, index: number) => (
                    <TableRow key={index} className={team.구분 === userInfo?.cm_nm ? "bg-blue-50 dark:bg-blue-950" : ""}>
                      <TableCell className="font-medium">
                        {team.구분}
                        {team.구분 === userInfo?.cm_nm && (
                          <Badge variant="default" className="ml-2">내 팀</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-pre-wrap max-w-md">
                        {team.주요_Comment || team["주요 Comment"] || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableComponent>
            </div>
          </DialogContent>
        </Dialog>

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
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{(teamPartnersAverage ?? 0).toFixed(1)}</div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">팀 평균 점수 ({teamPartners.length}명)</div>
                  </div>
                  {teamPartners.map((partner, index) => (
                    <PartnerDetailCard key={index} partner={partner} showOrg={false} />
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
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{(allPartnersAverage ?? 0).toFixed(1)}</div>
                    <div className="text-sm text-green-600 dark:text-green-400">전체 평균 점수 ({allPartners.length}명)</div>
                  </div>
                  {allPartners.map((partner, index) => (
                    <PartnerDetailCard key={index} partner={partner} showOrg={true} />
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

// 파트너 다이얼로그용 상세 카드
function PartnerDetailCard({ partner, showOrg }: { partner: any; showOrg: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>
            {partner.성명} ({partner.사번}) - {showOrg ? `${partner.소속} / ${partner.직위}` : partner.직위}
          </span>
          <Badge variant={partner.등급 === "EP" ? "default" : "secondary"} className="text-base px-3 py-1">
            {partner.등급}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <TableComponent>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">평가자</TableHead>
              <TableHead className="text-right">응답수</TableHead>
              <TableHead className="text-right">회신률</TableHead>
              <TableHead className="text-right">Q1</TableHead>
              <TableHead className="text-right">Q2</TableHead>
              <TableHead className="text-right">Q3</TableHead>
              <TableHead className="text-right">Q4</TableHead>
              <TableHead className="text-right">합계</TableHead>
              <TableHead className="text-right">평균</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-right">{partner.평가자}</TableCell>
              <TableCell className="text-right">{partner.응답수}</TableCell>
              <TableCell className="text-right">{partner.회신률}</TableCell>
              <TableCell className="text-right font-medium">{partner["1"]}</TableCell>
              <TableCell className="text-right font-medium">{partner["2"]}</TableCell>
              <TableCell className="text-right font-medium">{partner["3"]}</TableCell>
              <TableCell className="text-right font-medium">{partner["4"]}</TableCell>
              <TableCell className="text-right font-bold">{partner.합계}</TableCell>
              <TableCell className="text-right font-bold text-lg">{partner.평균}</TableCell>
            </TableRow>
          </TableBody>
        </TableComponent>

        {(partner["Comment 1"] || partner["Comment 2"]) && (
          <div className="space-y-3">
            {partner["Comment 1"] && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                  앞으로 6개월 동안 Audit Enhancement 를 위하여 앞으로 파트너가 가장 집중해야 할 영역은 무엇이라고 생각하나요? <span className="text-muted-foreground">(Comment 200자 내외)</span>
                </div>
                <div className="text-sm text-blue-900 dark:text-blue-100">{formatComment(partner["Comment 1"])}</div>
              </div>
            )}
            {partner["Comment 2"] && (
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">
                  Audit Enhancement 성공을 위해 파트너 및 DoAE로부터 추가로 필요한 지원은 무엇인가요? <span className="text-muted-foreground">(Comment 200자 내외)</span>
                </div>
                <div className="text-sm text-green-900 dark:text-green-100">{formatComment(partner["Comment 2"])}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
