"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, Book, Users, BarChart3, Target, Award, Key, AlertTriangle, CheckCircle, ArrowRight, LogIn, Monitor, User, Settings, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Image from "next/image"

export default function GettingStartedPage() {
  return (
    <div className="p-8">
      {/* 메인 타이틀 */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Image src="/images/pwc_logo_light.png" alt="PwC Logo" width={120} height={60} className="object-contain" />
        </div>
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">My Career+</h1>
        <p className="text-2xl text-gray-600 dark:text-gray-300 mb-2">성과 관리 플랫폼 시작 가이드</p>
        <Badge variant="outline" className="text-lg px-4 py-2">
          🚀 단계별 안내서
        </Badge>
      </div>

      {/* 가이드 안내 */}
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <Bell className="h-12 w-12 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                👋 My Career+에 오신 것을 환영합니다!
              </h2>
              
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
                처음 사용하시는 분들을 위해 <strong>4단계 완벽 가이드</strong>를 준비했습니다.<br/>
                왼쪽 사이드바의 단계를 따라가시면 됩니다.
              </p>

              <div className="grid md:grid-cols-2 gap-6 mt-8">
                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3 text-blue-700 dark:text-blue-300">
                    🔑 로그인 정보
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>• <strong>아이디:</strong> 사번 (예: 095129)</div>
                    <div>• <strong>최초 비밀번호:</strong> <span className="font-bold text-lg">3131</span></div>
                  </div>
                </div>
                
                <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3 text-red-700 dark:text-red-300">
                    ⚠️ 중요 안내
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>• 최초 로그인 후 <strong>반드시 비밀번호 변경</strong></div>
                    <div>• 변경 전까지 다른 기능 사용 불가</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <Link href="/getting-started/login-guide">
                  <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
                    <ArrowRight className="mr-2 h-5 w-5" />
                    1단계: 로그인 가이드 시작
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline">
                    <LogIn className="mr-2 h-5 w-5" />
                    바로 로그인하기
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 기존 상세 설명 유지 */}
      <div className="max-w-6xl mx-auto mt-16">

        {/* 로그인 정보 강조 */}
        <div className="max-w-4xl mx-auto mb-8">
          <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20 mb-6">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              <div className="space-y-2">
                <div className="font-semibold text-lg">🔑 로그인 필수 정보</div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      <span className="font-medium">아이디:</span> 
                      <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded border font-mono">사번 (예: 095129)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      <span className="font-medium">최초 비밀번호:</span> 
                      <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded border font-mono text-lg font-bold">3131</span>
                    </div>
                  </div>
                  <div className="bg-red-100 dark:bg-red-800/30 p-3 rounded-lg">
                    <div className="font-semibold text-red-800 dark:text-red-200 mb-1">⚠️ 중요 안내</div>
                    <div className="text-sm text-red-700 dark:text-red-300">
                      최초 로그인 후 <strong>반드시 비밀번호를 변경</strong>해주세요!
                    </div>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* 로그인 바로가기 */}
          <Card className="border-2 border-orange-200 bg-orange-50 dark:bg-orange-900/20">
            <CardContent className="p-6 text-center">
              <LogIn className="h-12 w-12 mx-auto mb-4 text-orange-600 dark:text-orange-400" />
              <h3 className="text-xl font-bold mb-2">지금 바로 시작하세요!</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                사번과 기본 비밀번호(3131)로 로그인하여 My Career+를 시작해보세요.
              </p>
              <Link href="/login">
                <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
                  <LogIn className="mr-2 h-5 w-5" />
                  로그인하러 가기
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* 단계별 가이드 */}
        <div className="max-w-6xl mx-auto mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">📚 단계별 시작 가이드</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              처음 사용하시는 분들을 위한 완벽한 안내서입니다.
            </p>
          </div>

          {/* STEP 1: 로그인 */}
          <Card className="mb-8 border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <LogIn className="h-6 w-6 text-blue-600" />
                로그인하기
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-lg mb-3">🔑 로그인 정보</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                      <Key className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">아이디</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">사번 (예: 095129)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                      <Key className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">최초 비밀번호</div>
                        <div className="text-lg font-bold text-blue-600">3131</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div className="font-semibold text-red-800 dark:text-red-200">⚠️ 중요 안내</div>
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300 space-y-1">
                    <div>• 최초 로그인 후 <strong>반드시 비밀번호 변경</strong></div>
                    <div>• 비밀번호 변경 전까지 다른 기능 사용 불가</div>
                    <div>• 안전한 비밀번호로 설정해주세요</div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <Link href="/login">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8">
                    <LogIn className="mr-2 h-5 w-5" />
                    지금 로그인하기
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* STEP 2: 비밀번호 변경 */}
          <Card className="mb-8 border-2 border-green-200 bg-green-50 dark:bg-green-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <Settings className="h-6 w-6 text-green-600" />
                비밀번호 변경하기
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-lg mb-3">🔒 변경 절차</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>로그인 후 자동으로 설정 페이지로 이동</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>현재 비밀번호(3131) 입력</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>새 비밀번호 설정</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>비밀번호 확인 후 저장</span>
                    </div>
                  </div>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-lg">
                  <h5 className="font-semibold mb-2">💡 안전한 비밀번호 팁</h5>
                  <div className="text-sm space-y-1">
                    <div>• 8자리 이상 권장</div>
                    <div>• 영문, 숫자, 특수문자 조합</div>
                    <div>• 개인정보 포함 금지</div>
                    <div>• 주기적인 변경 권장</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* STEP 3: 5개 영역 이해하기 */}
          <Card className="mb-8 border-2 border-purple-200 bg-purple-50 dark:bg-purple-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <Monitor className="h-6 w-6 text-purple-600" />
                5개 영역 이해하기
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg mb-6 text-center">
                My Career+는 <strong>5개 핵심 영역</strong>으로 구성되어 있습니다.
              </p>

              {/* 5개 영역 그리드 */}
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 mb-6">
            
            {/* 비즈니스 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  비즈니스
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  매출 목표 설정 및 실적 추적, 감사/비감사 성과 분석
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>매출 목표 설정</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>실시간 실적 추적</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>파이프라인 관리</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 피플 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  피플
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  팀원 성장과 개발, GPS/PEI 점수 및 코칭 관리
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>GPS/PEI 점수 관리</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>코칭 시간 추적</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>활용률 모니터링</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 퀄리티 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  퀄리티
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  서비스 품질 관리, DOAE 비율 및 EER 평가
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>DOAE 비율 관리</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>품질 지표 추적</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>EER 평가 관리</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 콜라보레이션 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  콜라보레이션
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  부서간 협업 성과, X-LoS 활동 관리
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>X-LoS 협업 목표</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>협업 실적 추적</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>매출 기여도 분석</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 인더스트리 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <Book className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  인더스트리
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  산업 전문성 개발, Thought Leadership 활동
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>TL 활동 계획</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>전문성 개발 추적</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>외부 활동 관리</span>
                  </div>
                </div>
              </CardContent>
            </Card>

              </div>
            </CardContent>
          </Card>

          {/* STEP 4: 사용 방법 */}
          <Card className="mb-8 border-2 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="w-10 h-10 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <TrendingUp className="h-6 w-6 text-amber-600" />
                사용 방법 익히기
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg mb-6 text-center">
                각 영역은 <strong>Plan → Status → Results</strong> 3단계로 진행됩니다.
              </p>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">1</span>
                  </div>
                  <h4 className="font-semibold text-lg">Plan (계획)</h4>
                  <div className="space-y-2 text-sm">
                    <div>• 연간 목표 설정</div>
                    <div>• 각 영역별 세부 계획</div>
                    <div>• 달성 가능한 목표 수립</div>
                  </div>
                </div>
                <div className="text-center space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">2</span>
                  </div>
                  <h4 className="font-semibold text-lg">Status (현황)</h4>
                  <div className="space-y-2 text-sm">
                    <div>• 실시간 진행 상황</div>
                    <div>• 목표 대비 달성률</div>
                    <div>• 팀 vs 개인 비교</div>
                  </div>
                </div>
                <div className="text-center space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">3</span>
                  </div>
                  <h4 className="font-semibold text-lg">Results (결과)</h4>
                  <div className="space-y-2 text-sm">
                    <div>• 성과 분석 및 리포트</div>
                    <div>• 피드백 및 평가</div>
                    <div>• 차년도 계획 수립</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 최종 시작하기 섹션 */}
        <div className="max-w-4xl mx-auto text-center">
          <Card className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 shadow-xl">
            <CardContent className="p-12">
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="p-4 bg-white/20 rounded-full">
                    <Bell className="h-12 w-12 text-white" />
                  </div>
                </div>
                <h3 className="text-4xl font-bold">🚀 준비 완료!</h3>
                <p className="text-xl opacity-90 max-w-2xl mx-auto">
                  이제 My Career+로 체계적인 성과 관리를 시작할 준비가 되었습니다.<br/>
                  사번과 기본 비밀번호(3131)로 로그인해보세요!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link href="/login">
                    <Button size="lg" variant="secondary" className="text-lg px-8 py-4 font-bold">
                      <LogIn className="mr-2 h-6 w-6" />
                      지금 시작하기
                      <ArrowRight className="ml-2 h-6 w-6" />
                    </Button>
                  </Link>
                  <div className="text-sm opacity-75">
                    ⏱️ 첫 설정은 5분이면 완료됩니다
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 도움말 푸터 */}
        <div className="mt-16 text-center">
          <Card>
            <CardContent className="p-8">
              <h4 className="font-semibold text-xl mb-4">💡 추가 도움이 필요하신가요?</h4>
              <div className="grid md:grid-cols-3 gap-6 text-sm">
                <div>
                  <h5 className="font-medium mb-2">📞 기술 지원</h5>
                  <p className="text-gray-600 dark:text-gray-300">
                    로그인 문제나 기술적 이슈 시<br/>
                    IT 헬프데스크에 문의하세요
                  </p>
                </div>
                <div>
                  <h5 className="font-medium mb-2">📚 사용법 문의</h5>
                  <p className="text-gray-600 dark:text-gray-300">
                    My Career+ 사용법이나<br/>
                    목표 설정에 대한 질문
                  </p>
                </div>
                <div>
                  <h5 className="font-medium mb-2">🔄 업데이트</h5>
                  <p className="text-gray-600 dark:text-gray-300">
                    새로운 기능이나 변경사항은<br/>
                    공지사항을 확인하세요
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* 하단 푸터 */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bell className="h-6 w-6 text-orange-400" />
            <span className="text-xl font-bold">My Career+</span>
          </div>
          <p className="text-gray-400 text-sm">
            © 2024 PwC. 모든 권리 보유. | 성과 관리 플랫폼
          </p>
        </div>
      </footer>
    </div>
  )
}
