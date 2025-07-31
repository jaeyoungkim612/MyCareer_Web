"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"

export function SupabaseTest() {
  const [testResult, setTestResult] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const runTest = async () => {
    setIsLoading(true)
    setTestResult("테스트 시작...\n")

    try {
      // 1. 환경변수 확인
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      setTestResult((prev) => prev + `환경변수 확인:\n`)
      setTestResult((prev) => prev + `- URL: ${supabaseUrl ? "✅ 설정됨" : "❌ 없음"}\n`)
      setTestResult((prev) => prev + `- KEY: ${supabaseKey ? "✅ 설정됨" : "❌ 없음"}\n\n`)

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("환경변수가 설정되지 않았습니다")
      }

      // 2. 기본 연결 테스트
      setTestResult((prev) => prev + "기본 연결 테스트...\n")
      const { data: healthData, error: healthError } = await supabase
        .from("business_goals")
        .select("count", { count: "exact", head: true })

      if (healthError) {
        setTestResult((prev) => prev + `❌ 연결 실패: ${healthError.message}\n`)
        setTestResult((prev) => prev + `에러 코드: ${healthError.code}\n`)
        setTestResult((prev) => prev + `에러 세부사항: ${JSON.stringify(healthError.details)}\n\n`)
        throw healthError
      }

      setTestResult((prev) => prev + `✅ 연결 성공! 현재 레코드 수: ${healthData}\n\n`)

      // 3. 데이터 조회 테스트
      setTestResult((prev) => prev + "데이터 조회 테스트...\n")
      const { data: selectData, error: selectError } = await supabase.from("business_goals").select("*").limit(5)

      if (selectError) {
        setTestResult((prev) => prev + `❌ 조회 실패: ${selectError.message}\n\n`)
        throw selectError
      }

      setTestResult((prev) => prev + `✅ 조회 성공! 데이터 ${selectData?.length || 0}개 발견\n`)
      if (selectData && selectData.length > 0) {
        setTestResult((prev) => prev + `첫 번째 레코드: ${JSON.stringify(selectData[0], null, 2)}\n\n`)
      }

      // 4. 데이터 삽입 테스트
      setTestResult((prev) => prev + "데이터 삽입 테스트...\n")
      const testData = {
        employee_id: `TEST_${Date.now()}`,
        business_goal: "테스트 목표",
        new_audit_count: 1,
        new_audit_amount: 100000000,
        hourly_revenue: 50000,
        ui_revenue_count: 1,
        ui_revenue_amount: 200000000,
        non_audit_hourly_revenue: 60000,
        audit_adjusted_em: 100,
        non_audit_adjusted_em: 50,
      }

      const { data: insertData, error: insertError } = await supabase
        .from("business_goals")
        .insert(testData)
        .select()
        .single()

      if (insertError) {
        setTestResult((prev) => prev + `❌ 삽입 실패: ${insertError.message}\n`)
        setTestResult((prev) => prev + `에러 코드: ${insertError.code}\n`)
        setTestResult((prev) => prev + `에러 세부사항: ${JSON.stringify(insertError.details)}\n\n`)
        throw insertError
      }

      setTestResult((prev) => prev + `✅ 삽입 성공! 새 레코드 ID: ${insertData.id}\n`)
      setTestResult((prev) => prev + `삽입된 데이터: ${JSON.stringify(insertData, null, 2)}\n\n`)

      // 5. 최종 확인
      setTestResult((prev) => prev + "최종 확인...\n")
      const { data: finalData, error: finalError } = await supabase
        .from("business_goals")
        .select("count", { count: "exact", head: true })

      if (finalError) {
        throw finalError
      }

      setTestResult((prev) => prev + `✅ 테스트 완료! 총 레코드 수: ${finalData}\n`)
      setTestResult((prev) => prev + `🎉 모든 테스트 통과! Supabase 연결이 정상 작동합니다.\n`)
    } catch (error) {
      setTestResult((prev) => prev + `\n❌ 테스트 실패: ${error}\n`)
      console.error("Supabase test failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Supabase 연결 테스트</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runTest} disabled={isLoading} className="w-full">
          {isLoading ? "테스트 실행 중..." : "Supabase 연결 테스트 실행"}
        </Button>

        {testResult && (
          <Alert>
            <AlertDescription>
              <pre className="whitespace-pre-wrap text-sm font-mono max-h-96 overflow-y-auto">{testResult}</pre>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
