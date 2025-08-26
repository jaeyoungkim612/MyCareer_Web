"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { LogIn, Key, AlertTriangle, CheckCircle, ArrowRight, Eye, EyeOff, User, Monitor } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import Image from "next/image"
import { useState } from "react"

export default function LoginGuidePage() {
  const [showPassword, setShowPassword] = useState(false)
  const [demoEmpno, setDemoEmpno] = useState("095129")
  const [demoPassword, setDemoPassword] = useState("3131")

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
            1
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">로그인하기</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">사번과 비밀번호로 첫 로그인을 진행해보세요</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          🔑 1단계: 로그인 정보 입력
        </Badge>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* 로그인 정보 안내 */}
        <Card className="border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Key className="h-6 w-6 text-blue-600" />
              로그인 필수 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold">아이디</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    회사에서 부여받은 6자리 사번을 입력하세요
                  </div>
                  <div className="font-mono text-lg bg-gray-100 dark:bg-gray-700 p-2 rounded border">
                    예시: 095129
                  </div>
                </div>
                
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold">최초 비밀번호</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    모든 직원의 최초 비밀번호는 동일합니다
                  </div>
                  <div className="font-mono text-2xl font-bold bg-gray-100 dark:bg-gray-700 p-2 rounded border text-center">
                    3131
                  </div>
                </div>
              </div>
              
              <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-800 dark:text-red-200">⚠️ 중요 안내</span>
                </div>
                <div className="space-y-2 text-sm text-red-700 dark:text-red-300">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>최초 로그인 후 <strong>반드시 비밀번호 변경</strong> 필요</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>비밀번호 변경 전까지 <strong>다른 기능 사용 불가</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>안전한 비밀번호로 설정 권장</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 로그인 실습 */}
        <Card className="border-2 border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Monitor className="h-6 w-6 text-green-600" />
              로그인 실습해보기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              {/* 실습 폼 */}
              <div className="space-y-6">
                <h4 className="font-semibold text-lg">📝 실제 로그인 폼과 동일</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">사번</label>
                    <Input
                      type="text"
                      placeholder="사번을 입력하세요"
                      value={demoEmpno}
                      onChange={(e) => setDemoEmpno(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">비밀번호</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="비밀번호를 입력하세요"
                        value={demoPassword}
                        onChange={(e) => setDemoPassword(e.target.value)}
                        className="w-full pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <Button disabled className="w-full bg-gray-400 cursor-not-allowed">
                    실습용 - 실제 로그인 불가
                  </Button>
                </div>
              </div>
              
              {/* 단계별 안내 */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">📋 로그인 단계</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div className="flex-1">
                      <div className="font-medium">사번 입력</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">6자리 사번을 정확히 입력</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div className="flex-1">
                      <div className="font-medium">비밀번호 입력</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">최초 비밀번호: 3131</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div className="flex-1">
                      <div className="font-medium">로그인 버튼 클릭</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Enter 키 또는 로그인 버튼</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200">
                    <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    <div className="flex-1">
                      <div className="font-medium">자동 이동</div>
                      <div className="text-sm text-orange-600 dark:text-orange-300">→ 비밀번호 변경 페이지로 자동 이동</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 문제 해결 */}
        <Card>
          <CardHeader>
            <CardTitle>❓ 로그인 문제 해결</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">자주 발생하는 문제</h4>
                <div className="space-y-2 text-sm">
                  <div>• <strong>사번을 잘못 입력</strong> → 정확한 6자리 사번 확인</div>
                  <div>• <strong>비밀번호 오류</strong> → 3131 정확히 입력</div>
                  <div>• <strong>계정 잠김</strong> → IT 헬프데스크 문의</div>
                  <div>• <strong>시스템 오류</strong> → 브라우저 새로고침 후 재시도</div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3">도움이 필요하다면</h4>
                <div className="space-y-2 text-sm">
                  <div>• <strong>IT 헬프데스크</strong>: 기술적 문제</div>
                  <div>• <strong>상사 또는 동료</strong>: 사번 확인</div>
                  <div>• <strong>관리자</strong>: 계정 관련 문제</div>
                  <div>• <strong>이 가이드</strong>: 사용법 숙지</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 액션 버튼 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              <LogIn className="mr-2 h-5 w-5" />
              실제 로그인하러 가기
            </Button>
          </Link>
          <Link href="/getting-started/password-guide">
            <Button size="lg" variant="outline">
              다음 단계: 비밀번호 변경
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

      </div>
    </div>
  )
}
