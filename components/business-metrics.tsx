import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ArrowRight, BarChart3, FileText, MessageSquare, Laptop, TrendingUp, DollarSign } from "lucide-react"

export function BusinessMetrics() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center">
          <BarChart3 className="mr-2 h-5 w-5 text-orange-600" />
          Business
        </h2>
        <Button variant="outline" size="sm">
          View Details <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">감사 서비스 성과 지표</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>신규 감사 BD</span>
                  <span className="font-medium">₩450M/₩600M</span>
                </div>
                <Progress value={75} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>기존감사 유지율</span>
                  <span className="font-medium">92%</span>
                </div>
                <Progress value={92} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>UI Revenue</span>
                  <span className="font-medium">₩1.2B/₩1.5B</span>
                </div>
                <Progress value={80} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>계약금액 인상률</span>
                  <span className="font-medium">8.5%</span>
                </div>
                <Progress value={85} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Non-Audit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">비감사 서비스 성과</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>UI Revenue</span>
                  <span className="font-medium">₩850M/₩1B</span>
                </div>
                <Progress value={85} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>예산달성률</span>
                  <span className="font-medium">85%</span>
                </div>
                <Progress value={85} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>신규 서비스 개발</span>
                  <span className="font-medium">3/4</span>
                </div>
                <Progress value={75} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Client Feedback Score</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">고객 만족도 지표</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>전체 만족도</span>
                  <span className="font-medium">4.3/5.0</span>
                </div>
                <Progress value={86} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>서비스 품질</span>
                  <span className="font-medium">4.5/5.0</span>
                </div>
                <Progress value={90} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>가치 제공</span>
                  <span className="font-medium">4.2/5.0</span>
                </div>
                <Progress value={84} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>재계약 의향</span>
                  <span className="font-medium">88%</span>
                </div>
                <Progress value={88} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managed Service/Digital 신상품개발</CardTitle>
            <Laptop className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">디지털 혁신 및 신규 서비스</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>개발중인 상품</span>
                  <span className="font-medium">3개</span>
                </div>
                <Progress value={60} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>디지털 매출</span>
                  <span className="font-medium">₩180M/₩300M</span>
                </div>
                <Progress value={60} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>자동화 효율성</span>
                  <span className="font-medium">35%</span>
                </div>
                <Progress value={70} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">예산 달성률</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">전체 사업 목표 대비 성과</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>매출 목표</span>
                  <span className="font-medium">₩2.3B/₩2.6B</span>
                </div>
                <Progress value={88} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>수익성</span>
                  <span className="font-medium">18.5%</span>
                </div>
                <Progress value={92} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>신규 고객</span>
                  <span className="font-medium">12/15</span>
                </div>
                <Progress value={80} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
