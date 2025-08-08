"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

import { UserCheck, Clock, Calendar, BarChart3, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { AuthService } from "@/lib/auth-service"

// 실제 데이터는 추후 DB에서 가져올 예정

interface ResultsTabProps {
  empno?: string
  readOnly?: boolean
}

export function ResultsTab({ empno, readOnly = false }: ResultsTabProps = {}) {
  const [perfTier] = useState("HP")
  const [perfComment] = useState(
    "탁월한 리더십과 팀워크를 바탕으로 프로젝트를 성공적으로 이끌었으며, 동료들과의 소통 능력이 매우 뛰어납니다. 새로운 과제에 대한 빠른 적응력과 문제 해결 능력도 돋보입니다. 또한, 팀원들의 성장을 적극적으로 지원하며 긍정적인 조직 문화를 조성하는 데 큰 기여를 하였습니다."
  )
  
  // HR 정보 상태
  const [userInfo, setUserInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // HR 정보 로드
  useEffect(() => {
    const loadUserInfo = async () => {
      const user = AuthService.getCurrentUser()
      const targetEmpno = readOnly ? empno : (empno || user?.empno)
      
      if (!targetEmpno) {
        setLoading(false)
        return
      }

      try {
        // 사번 정규화 (95129 → 095129)
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(targetEmpno)
        console.log(`🔍 Results Tab: Querying HR master with normalized empno: ${targetEmpno} → ${normalizedEmpno}`)
        
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
          })
          console.log("✅ HR data loaded for Results Tab:", hrData.EMPNM, hrData.ORG_NM)
        } else {
          console.log("ℹ️ No HR data found, using target empno")
          setUserInfo({
            empno: targetEmpno,
            empnm: targetEmpno,
            org_nm: null,
          })
        }
      } catch (error) {
        console.log("ℹ️ Could not load HR info:", error)
        setUserInfo({
          empno: targetEmpno,
          empnm: targetEmpno,
          org_nm: null,
        })
      } finally {
        setLoading(false)
      }
    }
    
    loadUserInfo()
  }, [empno, readOnly])

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "EP":
        return "bg-[#DE6100]"
      case "HP":
        return "bg-[#E76200]"
      case "ME":
        return "bg-orange-500"
      default:
        return "bg-slate-500"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-medium">결과</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* GPS Score Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              GPS Score
              {userInfo?.org_nm && (
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  - {userInfo.org_nm}
                </span>
              )}
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-2">
              <div className="text-2xl font-bold">-/10</div>
              <div className="flex items-center gap-1">
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-400">-%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>LoS 평균: -</span>
                <span>이전: -</span>
              </div>
              <Progress value={0} className="h-1.5" />
            </div>
            <div className="mt-3 flex justify-end">
              <Badge variant="outline">데이터 없음</Badge>
            </div>
          </CardContent>
        </Card>

        {/* PEI Score Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              PEI Score
              {userInfo?.org_nm && (
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  - {userInfo.org_nm}
                </span>
              )}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-2">
              <div className="text-2xl font-bold">-/10</div>
              <div className="flex items-center gap-1">
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-400">-%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>LoS 평균: -</span>
                <span>이전: -</span>
              </div>
              <Progress value={0} className="h-1.5" />
            </div>
            <div className="mt-3 flex justify-end">
              <Badge variant="outline">데이터 없음</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Staff Coaching Time Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Coaching Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-2">
              <div className="text-2xl font-bold">- 시간</div>
              <div className="flex items-center gap-1">
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-400">-%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>LoS 평균: - 시간</span>
                <span>이전: - 시간</span>
              </div>
              <Progress value={0} className="h-1.5" />
            </div>
            <div className="mt-3 flex justify-end">
              <Badge variant="outline">데이터 없음</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Refresh Off Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refresh Off 사용률(%)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-2">
              <div className="text-2xl font-bold">-%</div>
              <div className="flex items-center gap-1">
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-400">-%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>LoS 평균: -%</span>
                <span>이전: -%</span>
              </div>
              <Progress value={0} className="h-1.5" />
            </div>
            <div className="mt-3 flex justify-end">
              <Badge variant="outline">데이터 없음</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Upward Feedback Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold">Upward Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[120px_1fr]">
              {/* 티어 */}
              <div className="p-6 flex flex-col items-center justify-center border-r border-slate-200 dark:border-slate-600">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">Tier</div>
                <div className={`w-14 h-14 ${getTierColor(perfTier)} rounded-full flex items-center justify-center shadow-lg`}>
                  <span className="text-white font-bold text-xl">
                    {perfTier}
                  </span>
                </div>
              </div>
              {/* 코멘트 */}
              <div className="p-6 flex flex-col">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">Comment</div>
                <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {perfComment}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
