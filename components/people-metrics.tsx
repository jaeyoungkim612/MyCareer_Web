import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ArrowRight, Users, Clock, UserCheck, UserPlus, Building2, Target } from "lucide-react"

export function PeopleMetrics() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center">
          <Users className="mr-2 h-5 w-5 text-orange-600" />
          People
        </h2>
        <Button variant="outline" size="sm">
          View Details <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GPS(PEI) / Purse Survey</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">팀 만족도 및 참여도 지표</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>GPS Score</span>
                  <span className="font-medium">4.2/5.0</span>
                </div>
                <Progress value={84} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Purse Survey</span>
                  <span className="font-medium">87%</span>
                </div>
                <Progress value={87} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>목표 달성률</span>
                  <span className="font-medium">82%</span>
                </div>
                <Progress value={82} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upward Feedback</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">팀원들의 상향 평가 결과</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>리더십 점수</span>
                  <span className="font-medium">4.5/5.0</span>
                </div>
                <Progress value={90} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>소통 능력</span>
                  <span className="font-medium">4.3/5.0</span>
                </div>
                <Progress value={86} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>팀 지원</span>
                  <span className="font-medium">4.4/5.0</span>
                </div>
                <Progress value={88} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Coaching</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">팀원 코칭 및 멘토링 활동</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>코칭 시간</span>
                  <span className="font-medium">42/50 hrs</span>
                </div>
                <Progress value={84} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>코칭 받은 팀원</span>
                  <span className="font-medium">8/10</span>
                </div>
                <Progress value={80} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>성과 개선율</span>
                  <span className="font-medium">78%</span>
                </div>
                <Progress value={78} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Leader 역할 수행</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">팀 리더십 성과 지표</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>팀 미팅 주도</span>
                  <span className="font-medium">24/30</span>
                </div>
                <Progress value={80} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>의사결정 효과성</span>
                  <span className="font-medium">4.1/5.0</span>
                </div>
                <Progress value={82} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>팀 성과 달성</span>
                  <span className="font-medium">85%</span>
                </div>
                <Progress value={85} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Super-Org Refresh</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">조직 혁신 및 개선 활동</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>혁신 과제 완료</span>
                  <span className="font-medium">3/5</span>
                </div>
                <Progress value={60} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>프로세스 개선</span>
                  <span className="font-medium">진행중</span>
                </div>
                <Progress value={45} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>팀 재구성 효과</span>
                  <span className="font-medium">72%</span>
                </div>
                <Progress value={72} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">후배파트너 성장 지원</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">주니어 파트너 육성 활동</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>멘토링 세션</span>
                  <span className="font-medium">12/15</span>
                </div>
                <Progress value={80} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>성장 프로그램</span>
                  <span className="font-medium">4/5</span>
                </div>
                <Progress value={80} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>승진 준비도</span>
                  <span className="font-medium">75%</span>
                </div>
                <Progress value={75} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
