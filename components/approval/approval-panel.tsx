"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { GSPService, type GSPData } from "@/lib/gsp-service"
import { useAuth } from "@/contexts/auth-context"
import { 
  Bell, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  X, 
  User,
  Building2,
  RefreshCw
} from "lucide-react"

interface ApprovalRequest extends GSPData {
  empnm: string
  org_nm: string
  profile_image?: string
}

interface ApprovalPanelProps {
  hasRejection?: boolean
}

export function ApprovalPanel({ hasRejection = false }: ApprovalPanelProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(true)
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  // 승인 요청 목록 로드
  const loadPendingApprovals = async () => {
    if (!user?.empno) return
    
    setIsLoading(true)
    try {
      const result = await GSPService.getPendingApprovalsFixed(user.empno)
      
      if (result.success) {
        setPendingApprovals(result.data)
        console.log("✅ Approval Panel: Loaded pending approvals:", result.data.length)
      } else {
        console.error("❌ Approval Panel: Failed to load pending approvals")
        setPendingApprovals([])
      }
    } catch (error) {
      console.error("❌ Approval Panel: Error loading pending approvals:", error)
      setPendingApprovals([])
    } finally {
      setIsLoading(false)
    }
  }

  // 컴포넌트 마운트 시 및 주기적으로 승인 요청 확인
  useEffect(() => {
    loadPendingApprovals()
    
    // 30초마다 승인 요청 확인
    const interval = setInterval(loadPendingApprovals, 30000)
    
    return () => clearInterval(interval)
  }, [user?.empno])

  // 승인/반려 처리
  const handleApproval = async (empno: string, action: '승인완료' | '반려', empnm: string) => {
    if (!user?.empno) return
    
    setIsProcessing(empno)
    try {
      const result = await GSPService.processApproval(empno, action, user.empno)
      
      if (result.success) {
        toast.success(result.message)
        // 승인 요청 목록 새로고침
        await loadPendingApprovals()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("❌ Approval Panel: Error processing approval:", error)
      toast.error("승인 처리 중 오류가 발생했습니다.")
    } finally {
      setIsProcessing(null)
    }
  }

  // 일괄 승인 처리
  const handleBulkApproval = async () => {
    if (!user?.empno || pendingApprovals.length === 0) return
    
    setIsProcessing('bulk')
    try {
      const results = await Promise.all(
        pendingApprovals.map(approval => 
          GSPService.processApproval(approval.사번, '승인완료', user.empno)
        )
      )
      
      const successCount = results.filter(result => result.success).length
      const failCount = results.length - successCount
      
      if (successCount > 0) {
        toast.success(`${successCount}건이 일괄 승인되었습니다.`)
      }
      if (failCount > 0) {
        toast.error(`${failCount}건의 승인 처리에 실패했습니다.`)
      }
      
      // 승인 요청 목록 새로고침
      await loadPendingApprovals()
    } catch (error) {
      console.error("❌ Approval Panel: Error processing bulk approval:", error)
      toast.error("일괄 승인 처리 중 오류가 발생했습니다.")
    } finally {
      setIsProcessing(null)
    }
  }

  // 승인 요청이 없으면 패널을 표시하지 않음
  if (pendingApprovals.length === 0) {
    return null
  }

  return (
    <div 
      className={`fixed bottom-4 z-50 w-96 ${hasRejection ? 'right-[25rem]' : 'right-4'}`}
      onWheel={(e) => {
        e.stopPropagation()
        // 스크롤 가능한 영역 내에서만 스크롤 허용
        const target = e.currentTarget.querySelector('[data-scroll-container]')
        if (target && target.contains(e.target as Node)) {
          // 스크롤 컨테이너 내부에서는 스크롤 허용
          return
        }
        e.preventDefault()
      }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="shadow-lg border-orange-200">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Bell className="h-5 w-5 text-orange-600" />
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">
                        {pendingApprovals.length}
                      </span>
                    </div>
                  </div>
                  <CardTitle className="text-sm">승인 요청이 있습니다</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      loadPendingApprovals()
                    }}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* 복수 요청 시 일괄 승인 버튼 */}
              {pendingApprovals.length > 1 && (
                <div className="mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkApproval}
                    disabled={isProcessing === 'bulk'}
                    className="w-full bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    전체 일괄 승인 ({pendingApprovals.length}건)
                  </Button>
                </div>
              )}
              <div 
                data-scroll-container
                className="max-h-[60vh] overflow-y-auto overflow-x-hidden pr-2" 
                style={{ scrollbarWidth: 'thin' }}
              >
                <div className="space-y-4">
                    {pendingApprovals.map((approval, index) => (
                    <div key={approval.사번}>
                      {index > 0 && <Separator className="my-4" />}
                      
                      <div className="space-y-3">
                        {/* 사용자 정보 */}
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={approval.profile_image} />
                            <AvatarFallback>
                              <User className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{approval.empnm}</span>
                              <Badge variant="outline" className="text-xs">
                                {approval.사번}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              <span>{approval.org_nm}</span>
                            </div>
                          </div>
                        </div>

                        {/* GSP 내용 */}
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-orange-600 mb-2">GSP</p>
                            <div className="text-xs text-gray-700 bg-gray-50 p-3 rounded-md text-left max-h-32 overflow-y-auto">
                              {approval.GSP || "내용 없음"}
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-pink-600 mb-2">Focus 30</p>
                            <div className="text-xs text-gray-700 bg-gray-50 p-3 rounded-md text-left max-h-32 overflow-y-auto">
                              {approval["Focus 30"] || "내용 없음"}
                            </div>
                          </div>
                        </div>

                        {/* 승인/반려 버튼 */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleApproval(approval.사번, '승인완료', approval.empnm)}
                            disabled={isProcessing === approval.사번 || isProcessing === 'bulk'}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            승인
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={() => handleApproval(approval.사번, '반려', approval.empnm)}
                            disabled={isProcessing === approval.사번 || isProcessing === 'bulk'}
                          >
                            <X className="h-3 w-3 mr-1" />
                            반려
                          </Button>
                        </div>
                      </div>
                    </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}
