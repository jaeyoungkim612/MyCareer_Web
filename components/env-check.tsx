"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function EnvCheck() {
  const [showEnv, setShowEnv] = useState(false)

  const checkEnv = () => {
    setShowEnv(true)
  }

  // 실제 하드코딩된 값들
  const actualUrl = "https://ekmymbjlqazsclzxxizs.supabase.co"
  const actualKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrbXltYmpscWF6c2Nsenh4aXpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyMjIzMDAsImV4cCI6MjA2NTc5ODMwMH0.fRhzwYIv33fTlwfn3sn20PI9X2fsrAFKe3QFZuyLV7s"

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>실제 사용 중인 Supabase 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={checkEnv} className="w-full">
          실제 연결 정보 표시
        </Button>

        {showEnv && (
          <Alert>
            <AlertDescription>
              <div className="space-y-4 font-mono text-sm">
                <div className="p-4 bg-green-50 rounded">
                  <strong>✅ 실제 사용 중인 설정 (하드코딩):</strong>
                  <br />
                  <strong>URL:</strong> <code>{actualUrl}</code>
                  <br />
                  <strong>KEY:</strong> <code>{actualKey.substring(0, 50)}...</code>
                </div>

                <div className="p-4 bg-red-50 rounded">
                  <strong>❌ 환경변수 (무시됨):</strong>
                  <br />
                  <strong>URL:</strong> <code>{process.env.NEXT_PUBLIC_SUPABASE_URL || "설정되지 않음"}</code>
                  <br />
                  <strong>KEY:</strong>{" "}
                  <code>{process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 50) || "설정되지 않음"}...</code>
                </div>

                <div className="p-4 bg-blue-50 rounded">
                  <strong>🎯 이제 당신의 실제 Supabase DB에 연결됩니다!</strong>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
