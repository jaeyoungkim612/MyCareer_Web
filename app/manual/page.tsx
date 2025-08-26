"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, Book, Users, BarChart3, Target, Award, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ManualPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                돌아가기
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <Bell className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Career+ 설명서</h1>
                <p className="text-gray-600 dark:text-gray-300">사용법과 주요 기능을 확인해보세요</p>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="grid gap-6 lg:grid-cols-2">
          
          {/* 비즈니스 영역 설명 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                비즈니스 영역
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">📊 주요 기능</h4>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <li>• 매출 목표 설정 및 실적 추적</li>
                  <li>• 감사/비감사 매출 분석</li>
                  <li>• 파이프라인 관리</li>
                  <li>• 팀 vs 개인 성과 비교</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">📈 사용법</h4>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <li>1. Plan 탭에서 연간 목표 설정</li>
                  <li>2. Status 탭에서 실시간 실적 확인</li>
                  <li>3. Results 탭에서 달성률 분석</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 피플 영역 설명 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                피플 영역
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">👥 주요 기능</h4>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <li>• GPS/PEI 점수 관리</li>
                  <li>• 코칭 시간 추적</li>
                  <li>• 활용률(Util A/B) 모니터링</li>
                  <li>• Refresh Off 사용률 관리</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">⚡ 사용법</h4>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <li>1. Plan 탭에서 GPS/PEI 목표 설정</li>
                  <li>2. Results 탭에서 팀원 현황 확인</li>
                  <li>3. 상세보기로 개별 팀원 분석</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 퀄리티 영역 설명 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                퀄리티 영역
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">🏆 주요 기능</h4>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <li>• DOAE 비율 관리</li>
                  <li>• YRA 목표 설정</li>
                  <li>• 비감사 서비스 성과 추적</li>
                  <li>• EER 평가 관리</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🎯 사용법</h4>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <li>1. Plan 탭에서 품질 목표 설정</li>
                  <li>2. Status 탭에서 진행상황 모니터링</li>
                  <li>3. Results 탭에서 품질 지표 분석</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 콜라보레이션 & 인더스트리 영역 설명 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                콜라보레이션 & 인더스트리
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">🤝 콜라보레이션</h4>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <li>• X-LoS 협업 목표 설정</li>
                  <li>• 타 부서간 협업 실적 추적</li>
                  <li>• 협업 매출 기여도 분석</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🏭 인더스트리</h4>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <li>• Thought Leadership 활동 계획</li>
                  <li>• 산업 전문성 개발 추적</li>
                  <li>• 외부 활동 성과 관리</li>
                </ul>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* 시작하기 섹션 */}
        <Card className="mt-8 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
          <CardContent className="p-8 text-center">
            <Book className="h-12 w-12 mx-auto mb-4 opacity-90" />
            <h3 className="text-2xl font-bold mb-4">My Career+ 시작하기</h3>
            <p className="text-lg opacity-90 mb-6">
              5개 영역의 목표를 설정하고, 실시간으로 성과를 추적해보세요.
            </p>
            <Link href="/">
              <Button size="lg" variant="secondary">
                지금 시작하기
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* 도움말 섹션 */}
        <div className="mt-8 text-center">
          <Card>
            <CardContent className="p-6">
              <h4 className="font-semibold text-lg mb-3">💡 도움이 필요하신가요?</h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                각 영역의 Plan → Status → Results 순서로 진행하시면 됩니다.
              </p>
              <div className="flex justify-center gap-4">
                <div className="text-sm">
                  <span className="font-medium">Plan:</span> 목표 설정
                </div>
                <div className="text-sm">
                  <span className="font-medium">Status:</span> 현황 확인
                </div>
                <div className="text-sm">
                  <span className="font-medium">Results:</span> 성과 분석
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
