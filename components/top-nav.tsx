"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, LogOut, User, Settings } from "lucide-react"
import Link from "next/link"
import { AuthService } from "@/lib/auth-service"
import { UserInfoMapper } from "@/data/user-info"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

export function TopNav() {
  const [user, setUser] = useState<any>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const { logout } = useAuth()

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser()
    setUser(currentUser)
    
    // Supabase에서 사용자 정보 가져오기
    const loadUserInfo = async () => {
      try {
        const info = await UserInfoMapper.getUserInfo()
        setUserInfo(info)
      } catch (error) {
        console.error("사용자 정보 로드 실패:", error)
      }
    }
    
    if (currentUser) {
      loadUserInfo()
    }
  }, [])

  // 로그아웃 핸들러
  const handleLogout = async () => {
    console.log("🚪 로그아웃 버튼 클릭됨!")

    const confirmed = window.confirm(
      "🚪 로그아웃\n\n현재 세션을 종료하고 로그인 페이지로 이동합니다.\n\n계속하시겠습니까?",
    )

    if (!confirmed) {
      console.log("🚪 사용자가 로그아웃을 취소했습니다.")
      return
    }

    setIsDeleting(true)
    console.log("🚪 로그아웃 프로세스 시작...")

    try {
      // AuthContext의 logout 함수 호출 (세션만 삭제, DB는 유지)
      logout()

      toast({
        title: "🚪 로그아웃 완료",
        description: "성공적으로 로그아웃되었습니다.",
        variant: "default",
      })

      console.log("🚪 즉시 로그인 페이지로 이동...")
      router.push("/login")
    } catch (error) {
      console.error("🚪 로그아웃 중 예외 발생:", error)
      toast({
        title: "❌ 오류 발생",
        description: "로그아웃 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      console.log("🚪 로그아웃 프로세스 종료")
    }
  }



  // Azure Function URL 제거 - 더 이상 필요 없음

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6">
      {/* 왼쪽 영역 - 로고나 제목 */}
      <div className="flex items-center">
        {/* 필요시 로고나 제목 추가 */}
      </div>

      {/* 사용자 정보 및 아바타 */}
      <div className="flex items-center space-x-4">
        <Link href="/guide.html" title="설명서" target="_blank">
          <Bell className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-orange-500 transition-colors" />
        </Link>
        
        {/* 로그아웃 버튼 */}
        <Button
          onClick={handleLogout}
          variant="outline"
          size="sm"
          className="bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-300"
          disabled={isDeleting}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isDeleting ? "로그아웃 중..." : "로그아웃"}
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={userInfo?.photo_url || "/images/jerry.jpg"}
                  alt={user?.empnm || "사용자"}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "/images/jerry.jpg"
                  }}
                />
                <AvatarFallback>{user?.empnm?.[0] || "U"}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.empnm}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.empno}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>프로필</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>설정</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>로그아웃</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export default TopNav
