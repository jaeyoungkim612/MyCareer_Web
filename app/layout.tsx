import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Sidebar } from "@/components/sidebar"
import { TopNav } from "@/components/top-nav"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SettingsProvider } from "@/contexts/settings-context"
import { AuthProvider } from "@/contexts/auth-context"
import { AuthGuard } from "@/components/auth/auth-guard"
import type React from "react"
import LayoutShell from "@/components/layout-shell"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "My Career+ Web version",
  description: "A modern, responsive financial dashboard",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <AuthGuard>
              <SettingsProvider>
                <TooltipProvider delayDuration={0}>
                  <LayoutShell>
                    {children}
                  </LayoutShell>
                </TooltipProvider>
              </SettingsProvider>
            </AuthGuard>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
