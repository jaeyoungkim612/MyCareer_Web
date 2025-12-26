"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar, Plus, FileText, Building, Target, Lightbulb, Briefcase, Users, MoreHorizontal } from "lucide-react"
import { format } from "date-fns"
import { IndustryTLActivitiesService, IndustryTLActivity } from "@/lib/industry-tl-activities-service"
import { AuthService } from "@/lib/auth-service"

// 새 활동 폼 초기 상태
const initialFormState = {
  date: format(new Date(), "yyyy-MM-dd"),
  title: "",
  category: "",
  target: "",
  description: "",
  status: "Start",
}

interface IndustryMonitoringTabProps {
  empno?: string
  readOnly?: boolean
}

export default function IndustryMonitoringTab({ empno, readOnly = false }: IndustryMonitoringTabProps = {}) {
  const [activities, setActivities] = useState<IndustryTLActivity[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState<any>(initialFormState)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editRow, setEditRow] = useState<IndustryTLActivity | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>("")

  // 컴포넌트 마운트 시 사용자 정보 로드
  useEffect(() => {
    const loadUser = async () => {
      const authUser = AuthService.getCurrentUser()
      if (authUser) {
        // readOnly 모드(리뷰어/마스터 리뷰어)에서는 반드시 전달받은 empno 사용
        // 일반 모드에서는 empno가 있으면 그것을, 없으면 로그인 사용자 사용
        const targetEmpno = readOnly 
          ? empno // readOnly일 때는 반드시 전달받은 empno 사용 (리뷰 대상자)
          : (empno || authUser.empno) // 일반 모드일 때는 empno가 있으면 그것을, 없으면 로그인 사용자
        
        console.log(`🔍 IndustryMonitoringTab: loadUser - readOnly=${readOnly}, empno=${empno}, targetEmpno=${targetEmpno}`)
        
        if (targetEmpno) {
          setCurrentUser({ ...authUser, empno: targetEmpno })
          setCurrentEmployeeId(targetEmpno)
        } else if (readOnly) {
          console.warn('⚠️ IndustryMonitoringTab: readOnly 모드인데 empno가 전달되지 않았습니다.')
        }
      }
    }
    loadUser()
  }, [empno])

  // empno가 설정되면 활동 목록 불러오기
  useEffect(() => {
    if (!currentEmployeeId) return
    fetchActivities()
  }, [currentEmployeeId])

  const fetchActivities = async () => {
    setLoading(true)
    setError(null)
    try {
      // 현재 사용자의 활동만 가져오기
      const data = await IndustryTLActivitiesService.getByEmployeeId(currentEmployeeId)
      setActivities(data)
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  // 폼 입력 처리
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev: any) => ({ ...prev, [name]: value }))
  }

  // 셀렉트 입력 처리
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [name]: value }))
  }

  // 활동 추가
  const handleAddActivity = async () => {
    if (!currentEmployeeId) {
      setError("로그인된 사용자 정보가 없습니다.")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const newActivity = {
        employee_id: currentEmployeeId, // 현재 사용자 사번 자동 추가
        date: formData.date,
        category: formData.category,
        title: formData.title,
        description: formData.description,
        target: formData.target,
        status: formData.status,
      }
      await IndustryTLActivitiesService.insert(newActivity)
      await fetchActivities()
      setFormData(initialFormState)
      setIsDialogOpen(false)
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  // 편집 시작
  const handleEdit = (activity: IndustryTLActivity) => {
    setEditingId(activity.id ?? null)
    setEditRow({ ...activity })
  }

  // 편집 중 입력 처리
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditRow((prev: any) => prev ? { ...prev, [name]: value } : prev)
  }
  const handleEditSelectChange = (name: string, value: string) => {
    setEditRow((prev: any) => prev ? { ...prev, [name]: value } : prev)
  }

  // 편집 저장
  const handleEditSave = async () => {
    if (!editRow || !editRow.id) return
    setLoading(true)
    setError(null)
    try {
      await IndustryTLActivitiesService.update(editRow.id, editRow)
      await fetchActivities()
      setEditingId(null)
      setEditRow(null)
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  // 편집 취소
  const handleEditCancel = () => {
    setEditingId(null)
    setEditRow(null)
  }

  // 상태에 따른 배지 색상
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Completed</Badge>
      case "In Progress":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">In Progress</Badge>
      case "Start":
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">Start</Badge>
      default:
        return null
    }
  }

  // 카테고리에 따른 아이콘
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "산업전문화":
        return <Building className="h-4 w-4 text-blue-600" />
      case "감사효율화":
        return <Target className="h-4 w-4 text-green-600" />
      case "신규 Product":
        return <Lightbulb className="h-4 w-4 text-purple-600" />
      case "TL 활동":
        return <FileText className="h-4 w-4 text-orange-600" />
      case "BD활동":
        return <Briefcase className="h-4 w-4 text-red-600" />
      case "Client Centric":
        return <Users className="h-4 w-4 text-cyan-600" />
      default:
        return <MoreHorizontal className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
                          <h2 className="text-lg font-bold">Industry & TL Activity Monitoring</h2>
          <p className="text-sm text-muted-foreground">산업전문화 및 Thought Leadership 활동 진행 현황</p>
        </div>

        {/* 활동 추가 버튼 */}
        {!readOnly && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-1">
                <Plus className="h-4 w-4" /> 활동 추가
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>새 활동 추가</DialogTitle>
              <DialogDescription>산업전문화 및 TL 활동 정보를 입력하세요.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">활동 일자</Label>
                  <Input id="date" name="date" type="date" value={formData.date} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">상태</Label>
                  <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="상태 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Start">Start</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">제목</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="활동 제목을 입력하세요"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">구분</Label>
                  <Select value={formData.category} onValueChange={(value) => handleSelectChange("category", value)}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="구분 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="산업전문화">산업전문화</SelectItem>
                      <SelectItem value="감사효율화">감사효율화</SelectItem>
                      <SelectItem value="신규 Product">신규 Product</SelectItem>
                      <SelectItem value="TL 활동">TL 활동</SelectItem>
                      <SelectItem value="BD활동">BD활동</SelectItem>
                      <SelectItem value="Client Centric">Client Centric</SelectItem>
                      <SelectItem value="기타">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target">대상</Label>
                  <Input
                    id="target"
                    name="target"
                    value={formData.target}
                    onChange={handleInputChange}
                    placeholder="기업, 협회 등"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">활동 내역</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="활동 내용을 상세히 입력하세요"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleAddActivity}>추가</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-orange-600" />
            Industry & TL Activities
          </CardTitle>
          <CardDescription>산업전문화 및 TL 활동 목록</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}
          {loading ? (
            <div className="p-8 text-center text-gray-500">데이터를 불러오는 중...</div>
          ) : activities.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>등록된 활동이 없습니다.</p>
              <p className="text-sm">우상단 "활동 추가" 버튼을 눌러 새 활동을 등록하세요.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto w-full">
              <Table className="min-w-full">
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="w-[130px]">일자</TableHead>
                  <TableHead className="w-[130px]">구분</TableHead>
                  <TableHead className="w-[300px]">제목</TableHead>
                  <TableHead className="w-[120px]">대상</TableHead>
                  <TableHead className="w-[90px]">상태</TableHead>
                  <TableHead className="w-[80px] text-right">편집</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    {editingId === activity.id ? (
                      <>
                        <TableCell>
                          <Input type="date" name="date" value={editRow?.date || ""} onChange={handleEditInputChange} />
                        </TableCell>
                        <TableCell>
                          <Select value={editRow?.category || ""} onValueChange={(value) => handleEditSelectChange("category", value)}>
                            <SelectTrigger><SelectValue placeholder="구분 선택" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="산업전문화">산업전문화</SelectItem>
                              <SelectItem value="감사효율화">감사효율화</SelectItem>
                              <SelectItem value="신규 Product">신규 Product</SelectItem>
                              <SelectItem value="TL 활동">TL 활동</SelectItem>
                              <SelectItem value="BD활동">BD활동</SelectItem>
                              <SelectItem value="Client Centric">Client Centric</SelectItem>
                              <SelectItem value="기타">기타</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="flex flex-col justify-center h-full">
                          <Input name="title" value={editRow?.title || ""} onChange={handleEditInputChange} className="mb-1 self-center" />
                          <Textarea name="description" value={editRow?.description || ""} onChange={handleEditInputChange} rows={2} className="self-center" style={{ minWidth: 0, maxWidth: 300, overflowWrap: 'break-word', wordBreak: 'break-all' }} />
                        </TableCell>
                        <TableCell>
                          <Input name="target" value={editRow?.target || ""} onChange={handleEditInputChange} />
                        </TableCell>
                        <TableCell>
                          <Select value={editRow?.status || ""} onValueChange={(value) => handleEditSelectChange("status", value)}>
                            <SelectTrigger><SelectValue placeholder="상태 선택" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Start">Start</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="flex justify-center items-center gap-2">
                          <Button size="sm" variant="outline" onClick={handleEditCancel}>취소</Button>
                          <Button size="sm" onClick={handleEditSave}>저장</Button>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">{activity.date}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(activity.category)}
                            <span>{activity.category}</span>
                          </div>
                        </TableCell>
                        <TableCell style={{ height: '100%' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                            <span className="font-medium" style={{ whiteSpace: 'pre-line', overflowWrap: 'break-word', wordBreak: 'break-all' }}>{activity.title}</span>
                            <span className="text-sm text-muted-foreground" style={{ whiteSpace: 'pre-line', maxWidth: 300, overflowWrap: 'break-word', wordBreak: 'break-all' }}>{activity.description}</span>
                          </div>
                        </TableCell>
                        <TableCell>{activity.target}</TableCell>
                        <TableCell>{getStatusBadge(activity.status)}</TableCell>
                        <TableCell className="text-right">
                          {!readOnly && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEdit(activity)}
                            >
                              <span className="sr-only">Edit</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                            >
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              <path d="m15 5 4 4" />
                            </svg>
                          </Button>
                          )}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
