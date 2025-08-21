"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Home,
  Users,
  Handshake,
  BarChart3,
  Award,
  Lightbulb,
  Settings,
  HelpCircle,
  Menu,
  Phone,
  Mail,
  User,
  Building2,
  Copy,
  Check,
  ExternalLink,
  Link2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { LucideIcon } from "lucide-react"

type NavItemType = {
  name: string;
  href: string;
  icon: LucideIcon;
};

const navigation: NavItemType[] = [
  { name: "Intro", href: "/", icon: Home },
  { name: "Business", href: "/business", icon: BarChart3 },
  { name: "People", href: "/people", icon: Users },
  { name: "Collaboration", href: "/collaboration", icon: Handshake },
  { name: "Quality", href: "/quality", icon: Award },
  { name: "Industry & TL", href: "/industry", icon: Lightbulb },
]

const bottomNavigation: NavItemType[] = [
  { name: "Settings", href: "/settings", icon: Settings }
]

export function Sidebar() {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isLinksOpen, setIsLinksOpen] = useState(false)
  const [copiedItem, setCopiedItem] = useState<string | null>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const isDarkTheme = resolvedTheme === "dark"

  // 사이드바 너비를 고정값으로 설정 (접기 기능 제거)
  const SIDEBAR_WIDTH = "260px"

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedItem(label)
      setTimeout(() => setCopiedItem(null), 2000)
    })
  }

  const NavItem: React.FC<{ item: NavItemType; isBottom?: boolean }> = ({ item, isBottom = false }) => {
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center rounded-md px-3 py-3 text-sm font-medium transition-colors whitespace-nowrap",
          pathname === item.href
            ? "bg-orange-100 dark:bg-orange-500 text-orange-600 dark:text-orange-50"
            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0 mr-3" />
        <span className="truncate">{item.name}</span>
      </Link>
    );
  };

  return (
    <TooltipProvider>
      <>
        <button
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-black rounded-md shadow-md border border-slate-200 dark:border-gray-800"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div
          ref={sidebarRef}
          style={{
            width: SIDEBAR_WIDTH,
            minWidth: SIDEBAR_WIDTH,
            maxWidth: SIDEBAR_WIDTH,
          }}
          className={cn(
            "fixed top-0 bottom-0 left-0 z-20 flex flex-col bg-white dark:bg-black border-r border-slate-200 dark:border-gray-800 transition-all duration-300 ease-in-out lg:sticky lg:h-screen",
            isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          <div className="border-b border-slate-200 dark:border-gray-800 w-full">
            <div className="flex h-16 items-center gap-2 px-4">
              <Link href="/" className="flex items-center font-semibold truncate">
                <Image
                  src={isDarkTheme ? "/images/pwc_logo_dark.png" : "/images/pwc_logo_light.png"}
                  alt="PwC Logo"
                  width={60}
                  height={60}
                  className="mr-3"
                />
                <div className="flex flex-col">
                  <span className="text-xl font-bold truncate bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 bg-clip-text text-transparent">
                    My Career+
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Web Version</span>
                </div>
              </Link>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto w-full">
            <nav className="flex-1 space-y-1 px-2 py-4 w-full">
              {navigation.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </nav>
          </div>
          
          <div className="border-t border-slate-200 dark:border-gray-800 p-2 w-full">
            <nav className="space-y-1 w-full">
              {/* Links 버튼 */}
              <button
                onClick={() => setIsLinksOpen(true)}
                className="flex w-full items-center rounded-md px-3 py-3 text-sm font-medium transition-colors whitespace-nowrap text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <Link2 className="h-5 w-5 flex-shrink-0 mr-3" />
                <span className="truncate">Links</span>
              </button>
              
              {bottomNavigation.map((item) => (
                <NavItem key={item.name} item={item} isBottom />
              ))}
              <button
                onClick={() => setIsHelpOpen(true)}
                className="flex w-full items-center rounded-md px-3 py-3 text-sm font-medium transition-colors whitespace-nowrap text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <HelpCircle className="h-5 w-5 flex-shrink-0 mr-3" />
                <span className="truncate">Help</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Links Dialog */}
        <Dialog open={isLinksOpen} onOpenChange={setIsLinksOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Quick Links</DialogTitle>
              <DialogDescription className="text-base">PowerBI 대시보드 및 외부 시스템 바로가기</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              {/* My Career+ (PowerBI) */}
              <a
                href="https://app.powerbi.com/reportEmbed?reportId=fba2870b-f923-4b09-95a5-4634de6d2fc5&autoAuth=true&ctid=513294a0-3e20-41b2-a970-6d30bf1546fa"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-start rounded-lg px-4 py-3 text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <ExternalLink className="h-5 w-5 flex-shrink-0 mr-3 mt-0.5 text-gray-600 dark:text-gray-400" />
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">My Career+ (PowerBI)</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    파트너분들의 개인 관리지표를 데이터베이스화하여 자동화된 리포트를 통해 쉽고 편리하게 활용 가능
                  </span>
                </div>
              </a>
              
              {/* My People+ (PowerBI) */}
              <a
                href="https://app.powerbi.com/reportEmbed?reportId=9a63b16c-3e6d-40d7-8339-df119261fede&autoAuth=true&ctid=513294a0-3e20-41b2-a970-6d30bf1546fa"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-start rounded-lg px-4 py-3 text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <ExternalLink className="h-5 w-5 flex-shrink-0 mr-3 mt-0.5 text-gray-600 dark:text-gray-400" />
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">My People+ (PowerBI)</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    HC 데이터를 데이터베이스화하여 자동화된 리포트를 통한 활용
                  </span>
                </div>
              </a>
              
              {/* My EPC+ (PowerBI) */}
              <a
                href="https://app.powerbi.com/reportEmbed?reportId=b2a2d963-7ff6-4ac2-b72a-74294d412c7d&autoAuth=true&ctid=513294a0-3e20-41b2-a970-6d30bf1546fa"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-start rounded-lg px-4 py-3 text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <ExternalLink className="h-5 w-5 flex-shrink-0 mr-3 mt-0.5 text-gray-600 dark:text-gray-400" />
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">My EPC+ (PowerBI)</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    EPC 데이터 분석 및 프로젝트 성과 관리 대시보드
                  </span>
                </div>
              </a>
              
              {/* X-Los Collaboration Dashboard */}
              <a
                href="https://app.powerbi.com/reportEmbed?reportId=295f8c79-8fde-4ba1-b405-60604fa83625&autoAuth=true&ctid=513294a0-3e20-41b2-a970-6d30bf1546fa"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-start rounded-lg px-4 py-3 text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <ExternalLink className="h-5 w-5 flex-shrink-0 mr-3 mt-0.5 text-gray-600 dark:text-gray-400" />
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">X-Los Collaboration Dashboard</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    부서간 협업 현황 및 성과 분석 대시보드
                  </span>
                </div>
              </a>
            </div>

            <DialogFooter className="sm:justify-center">
              <Button variant="outline" onClick={() => setIsLinksOpen(false)} className="text-base">
                닫기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Help Dialog 유지 */}
        <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">문의하기</DialogTitle>
              <DialogDescription className="text-base">My Career+ 시스템 관리자에게 연락하세요</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-4">
                <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-full">
                  <User className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-medium">이름</p>
                  <p className="text-base text-muted-foreground">김재동</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-full">
                  <Building2 className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-medium">부서</p>
                  <p className="text-base text-muted-foreground">AX Node / Assurance DA</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-full">
                  <Phone className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-medium">전화번호</p>
                  <p className="text-base text-muted-foreground">02-3781-3467</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard("+82-2-3781-3467", "전화번호")}>
                  {copiedItem === "전화번호" ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </Button>
              </div>

              <div className="flex items-center space-x-4">
                <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-full">
                  <Phone className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-medium">휴대폰</p>
                  <p className="text-base text-muted-foreground">010-9061-9759</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard("+82-10-9061-9759", "휴대폰 번호")}>
                  {copiedItem === "휴대폰 번호" ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </Button>
              </div>

              <div className="flex items-center space-x-4">
                <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-full">
                  <Mail className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-medium">이메일</p>
                  <p className="text-base text-muted-foreground">jae-dong.kim@pwc.com</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard("jae-dong.kim@pwc.com", "이메일")}>
                  {copiedItem === "이메일" ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>

            <DialogFooter className="sm:justify-center">
              <Button variant="outline" onClick={() => setIsHelpOpen(false)} className="text-base">
                닫기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </TooltipProvider>
  )
}
