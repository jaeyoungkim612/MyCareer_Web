"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { GSPService } from "@/lib/gsp-service"
import { useAuth } from "@/contexts/auth-context"
import { Target, Send, Info } from "lucide-react"

export function GSPInputForm() {
  const { user } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    보직: "",
    산업전문화: "",
    tfCouncil: "",
    gsp: "",
    focus30: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.empno) {
      toast.error("사용자 정보를 찾을 수 없습니다.")
      return
    }

    if (!formData.보직.trim() || !formData.산업전문화.trim() || !formData.tfCouncil.trim() || !formData.gsp.trim() || !formData.focus30.trim()) {
      toast.error("모든 기본정보를 입력해주세요.")
      return
    }

    setIsLoading(true)

    try {
      const result = await GSPService.updateGSP(
        user.empno, 
        formData.gsp, 
        formData.focus30,
        formData.보직,
        formData.산업전문화,
        formData.tfCouncil
      )
      
      if (result.success) {
        toast.success(result.message)
        // 성공 후 메인 페이지로 이동
        router.push("/")
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("❌ GSP 입력 오류:", error)
      toast.error("GSP 정보 저장 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: '보직' | '산업전문화' | 'tfCouncil' | 'gsp' | 'focus30', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="container mx-auto pt-8 max-w-4xl">
      <div className="space-y-6">
        {/* 안내 메시지 */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            최초 로그인 시 기본정보를 입력해주세요. 
            입력 후 1차 Reviewer의 승인을 기다려주시면 됩니다.
          </AlertDescription>
        </Alert>

        {/* 기본정보 입력 폼 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5 text-orange-600" />
              기본정보 입력
            </CardTitle>
            <CardDescription>
              {user?.empnm}님의 기본정보를 입력해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 보직(HC) 입력 */}
              <div className="space-y-2">
                <Label htmlFor="position">보직(HC)</Label>
                <Input
                  id="position"
                  value={formData.보직}
                  onChange={(e) => handleChange('보직', e.target.value)}
                  placeholder="보직을 입력해주세요 (예: Senior Associate)"
                  disabled={isLoading}
                />
              </div>

              {/* 산업전문화(TMA/IMA) 입력 */}
              <div className="space-y-2">
                <Label htmlFor="specialty">산업전문화(TMA/IMA)</Label>
                <Input
                  id="specialty"
                  value={formData.산업전문화}
                  onChange={(e) => handleChange('산업전문화', e.target.value)}
                  placeholder="산업전문화 분야를 입력해주세요 (예: Technology, Financial Services)"
                  disabled={isLoading}
                />
              </div>

              {/* TF&Council 입력 */}
              <div className="space-y-2">
                <Label htmlFor="tf-council">TF&Council</Label>
                <Input
                  id="tf-council"
                  value={formData.tfCouncil}
                  onChange={(e) => handleChange('tfCouncil', e.target.value)}
                  placeholder="TF & Council 활동을 입력해주세요"
                  disabled={isLoading}
                />
              </div>

              {/* GSP 입력 */}
              <div className="space-y-2">
                <Label htmlFor="gsp">GSP</Label>
                <Input
                  id="gsp"
                  value={formData.gsp}
                  onChange={(e) => handleChange('gsp', e.target.value)}
                  placeholder="GSP 내용을 입력해주세요"
                  disabled={isLoading}
                />
              </div>

              {/* Focus 30 입력 */}
              <div className="space-y-2">
                <Label htmlFor="focus30">Focus 30</Label>
                <Input
                  id="focus30"
                  value={formData.focus30}
                  onChange={(e) => handleChange('focus30', e.target.value)}
                  placeholder="Focus 30 내용을 입력해주세요"
                  disabled={isLoading}
                />
              </div>

              {/* 제출 버튼 */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isLoading ? "저장 중..." : "제출하기"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
