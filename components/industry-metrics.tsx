import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ArrowRight, Lightbulb, BookOpen, Briefcase, PenTool, Calendar, FileText } from "lucide-react"

export function IndustryMetrics() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center">
          <Lightbulb className="mr-2 h-5 w-5 text-orange-600" />
          산업전문화 & Thought Leadership
        </h2>
        <Button variant="outline" size="sm">
          View Details <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">산업전문화 활동 참여도</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">산업별 전문성 강화 활동</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Industry Forums</span>
                  <span className="font-medium">8/10</span>
                </div>
                <Progress value={80} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>전문화 프로그램</span>
                  <span className="font-medium">4/5</span>
                </div>
                <Progress value={80} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>산업 연구 활동</span>
                  <span className="font-medium">6/8</span>
                </div>
                <Progress value={75} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">산업별 감사 효율화/집중화 기여</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">산업 특화 감사 방법론 개발</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>산업별 방법론</span>
                  <span className="font-medium">3/4</span>
                </div>
                <Progress value={75} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>효율성 개선</span>
                  <span className="font-medium">18%</span>
                </div>
                <Progress value={72} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>표준화 기여도</span>
                  <span className="font-medium">82%</span>
                </div>
                <Progress value={82} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">산업별 신규 Product 발��</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">산업 특화 서비스 개발</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>신규 상품 개발</span>
                  <span className="font-medium">2/3</span>
                </div>
                <Progress value={67} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>예상 매출</span>
                  <span className="font-medium">₩250M</span>
                </div>
                <Progress value={63} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>시장 검증</span>
                  <span className="font-medium">완료</span>
                </div>
                <Progress value={100} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TL활동</CardTitle>
            <PenTool className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">간행물, 기고, 세미나 활동</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>간행물 발간</span>
                  <span className="font-medium">3/4</span>
                </div>
                <Progress value={75} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>세미나 개최</span>
                  <span className="font-medium">5/6</span>
                </div>
                <Progress value={83} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>기고문 게재</span>
                  <span className="font-medium">2/3</span>
                </div>
                <Progress value={67} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>미디어 인터뷰</span>
                  <span className="font-medium">4/5</span>
                </div>
                <Progress value={80} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">산업 이벤트 참여</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">컨퍼런스 및 네트워킹</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>컨퍼런스 참석</span>
                  <span className="font-medium">12/15</span>
                </div>
                <Progress value={80} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>발표 세션</span>
                  <span className="font-medium">3/4</span>
                </div>
                <Progress value={75} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>네트워킹 성과</span>
                  <span className="font-medium">85%</span>
                </div>
                <Progress value={85} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">산업 인사이트 공유</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">내부 지식 공유 활동</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>인사이트 리포트</span>
                  <span className="font-medium">8/10</span>
                </div>
                <Progress value={80} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>내부 세미나</span>
                  <span className="font-medium">6/8</span>
                </div>
                <Progress value={75} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>지식 DB 기여</span>
                  <span className="font-medium">15건</span>
                </div>
                <Progress value={88} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
