"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"

interface SettingsContextType {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <SettingsContext.Provider
      value={{
        sidebarCollapsed,
        setSidebarCollapsed,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}
