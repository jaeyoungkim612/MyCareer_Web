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

  // 개별 항목 승인/반려 처리
  const handleItemApproval = async (empno: string, field: string, status: '승인완료' | '반려', empnm: string) => {
    if (!user?.empno) return
    
    setIsProcessing(empno)
    try {
      const result = await GSPService.processItemApproval(empno, field, status, user.empno)
      
      if (result.success) {
        const fieldName = {
          '보직': '보직(HC)',
          '산업전문화': '산업전문화',
          'TF_Council': 'TF & Council',
          'GSP_Focus30': 'GSP/Focus 30'
        }[field] || field
        
        toast.success(`${empnm}님의 ${fieldName} ${status === '승인완료' ? '승인' : '반려'} 처리가 완료되었습니다.`)
        // 승인 목록 새로고침
        await loadPendingApprovals()
        // intro 페이지에 GSP 데이터 새로고침 신호 보내기
        window.dispatchEvent(new CustomEvent('gspDataChanged'))
      } else {
        toast.error(`처리 중 오류가 발생했습니다: ${result.message}`)
      }
    } catch (error) {
      console.error("❌ Approval Panel: Error processing item approval:", error)
      toast.error("처리 중 오류가 발생했습니다.")
    } finally {
      setIsProcessing(null)
    }
  }

  // 전체 승인/반려 처리
  const handleApproval = async (empno: string, action: '승인완료' | '반려', empnm: string) => {
    if (!user?.empno) return
    
    setIsProcessing(empno)
    try {
      const result = await GSPService.processApproval(empno, action, user.empno)
      
      if (result.success) {
        toast.success(`${empnm}님의 전체 항목 ${action === '승인완료' ? '승인' : '반려'} 처리가 완료되었습니다.`)
        // 승인 요청 목록 새로고침
        await loadPendingApprovals()
        // intro 페이지에 GSP 데이터 새로고침 신호 보내기
        window.dispatchEvent(new CustomEvent('gspDataChanged'))
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
                  <div className="flex-1">
                    <CardTitle className="text-sm">승인 요청이 있습니다</CardTitle>
                  </div>
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

                        {/* 승인 대기 항목들 */}
                        <div className="space-y-3">
                          {/* 보직(HC) */}
                          {approval["보직_STATUS"] === '승인대기' && (
                            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/30">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                  <span className="text-sm font-bold text-blue-700">보직(HC)</span>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                    onClick={() => handleItemApproval(approval.사번, '보직', '승인완료', approval.empnm)}
                                    disabled={isProcessing === approval.사번 || isProcessing === 'bulk'}
                                  >
                                    ✓ 승인
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                    onClick={() => handleItemApproval(approval.사번, '보직', '반려', approval.empnm)}
                                    disabled={isProcessing === approval.사번 || isProcessing === 'bulk'}
                                  >
                                    ✗ 반려
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="text-xs">
                                  <span className="text-gray-600 font-medium">기존:</span>
                                  <div className="bg-white p-2 rounded text-gray-700 mt-1 border">
                                    {approval.current_job_info_nm || "정보 없음"}
                                  </div>
                                </div>
                                <div className="text-xs">
                                  <span className="text-blue-700 font-medium">신규:</span>
                                  <div className="bg-blue-100 p-2 rounded text-blue-800 mt-1 border border-blue-300">
                                    {approval["보직(HC)"] || "내용 없음"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* 산업전문화 */}
                          {approval["산업전문화_STATUS"] === '승인대기' && (
                            <div className="border border-green-200 rounded-lg p-4 bg-green-50/30">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                  <span className="text-sm font-bold text-green-700">산업전문화</span>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                    onClick={() => handleItemApproval(approval.사번, '산업전문화', '승인완료', approval.empnm)}
                                    disabled={isProcessing === approval.사번 || isProcessing === 'bulk'}
                                  >
                                    ✓ 승인
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                    onClick={() => handleItemApproval(approval.사번, '산업전문화', '반려', approval.empnm)}
                                    disabled={isProcessing === approval.사번 || isProcessing === 'bulk'}
                                  >
                                    ✗ 반려
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="text-xs">
                                  <span className="text-gray-600 font-medium">기존:</span>
                                  <div className="bg-white p-2 rounded text-gray-700 mt-1 border">
                                    {approval.current_industry_specialization || "정보 없음"}
                                  </div>
                                </div>
                                <div className="text-xs">
                                  <span className="text-green-700 font-medium">신규:</span>
                                  <div className="bg-green-100 p-2 rounded text-green-800 mt-1 border border-green-300">
                                    {approval["산업전문화"] || "내용 없음"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* TF & Council */}
                          {approval["Council_TF_STATUS"] === '승인대기' && (
                            <div className="border border-purple-200 rounded-lg p-4 bg-purple-50/30">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                  <span className="text-sm font-bold text-purple-700">TF & Council</span>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                    onClick={() => handleItemApproval(approval.사번, 'TF_Council', '승인완료', approval.empnm)}
                                    disabled={isProcessing === approval.사번 || isProcessing === 'bulk'}
                                  >
                                    ✓ 승인
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                    onClick={() => handleItemApproval(approval.사번, 'TF_Council', '반려', approval.empnm)}
                                    disabled={isProcessing === approval.사번 || isProcessing === 'bulk'}
                                  >
                                    ✗ 반려
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="text-xs">
                                  <span className="text-gray-600 font-medium">기존:</span>
                                  <div className="bg-white p-2 rounded text-gray-700 mt-1 border">
                                    {approval.current_council_tf || "정보 없음"}
                                  </div>
                                </div>
                                <div className="text-xs">
                                  <span className="text-purple-700 font-medium">신규:</span>
                                  <div className="bg-purple-100 p-2 rounded text-purple-800 mt-1 border border-purple-300">
                                    {approval["Council/TF 등"] || "내용 없음"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* GSP/Focus 30 통합 */}
                          {approval["GSP_Focus_30_STATUS"] === '승인대기' && (
                            <div className="border border-orange-200 rounded-lg p-4 bg-orange-50/30">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full"></div>
                                  <span className="text-sm font-bold text-orange-700">GSP/Focus 30</span>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                    onClick={() => handleItemApproval(approval.사번, 'GSP_Focus30', '승인완료', approval.empnm)}
                                    disabled={isProcessing === approval.사번 || isProcessing === 'bulk'}
                                  >
                                    ✓ 승인
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                    onClick={() => handleItemApproval(approval.사번, 'GSP_Focus30', '반려', approval.empnm)}
                                    disabled={isProcessing === approval.사번 || isProcessing === 'bulk'}
                                  >
                                    ✗ 반려
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="text-xs">
                                  <span className="text-gray-600 font-medium">기존:</span>
                                  <div className="bg-white p-2 rounded text-gray-700 mt-1 border max-h-24 overflow-y-auto">
                                    {approval.current_gsp_focus_30 || "정보 없음"}
                                  </div>
                                </div>
                                <div className="text-xs">
                                  <span className="text-orange-700 font-medium">신규:</span>
                                  <div className="bg-orange-100 p-2 rounded text-orange-800 mt-1 border border-orange-300 max-h-24 overflow-y-auto">
                                    {approval["GSP/Focus 30"] || "내용 없음"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 전체 승인/반려 버튼 */}
                        <div className="border-t pt-4 mt-4">
                          <div className="text-xs text-gray-500 mb-2 text-center">전체 항목 일괄 처리</div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium"
                              onClick={() => handleApproval(approval.사번, '승인완료', approval.empnm)}
                              disabled={isProcessing === approval.사번 || isProcessing === 'bulk'}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              전체 승인
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1 font-medium"
                              onClick={() => handleApproval(approval.사번, '반려', approval.empnm)}
                              disabled={isProcessing === approval.사번 || isProcessing === 'bulk'}
                            >
                              <X className="h-4 w-4 mr-2" />
                              전체 반려
                            </Button>
                          </div>
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
