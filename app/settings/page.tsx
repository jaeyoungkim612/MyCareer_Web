"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState } from "react"
import { toast } from "sonner"

const defaultAvatars = [
  "/images/jerry.jpg",
  "/placeholder.svg?height=100&width=100&query=professional male avatar",
  "/placeholder.svg?height=100&width=100&query=professional female avatar",
  "/placeholder.svg?height=100&width=100&query=business person avatar",
  "/placeholder.svg?height=100&width=100&query=young professional avatar",
  "/placeholder.svg?height=100&width=100&query=senior executive avatar",
  "/placeholder.svg?height=100&width=100&query=creative professional avatar",
  "/placeholder.svg?height=100&width=100&query=tech professional avatar",
  "/placeholder.svg?height=100&width=100&query=consultant avatar",
  "/placeholder.svg?height=100&width=100&query=manager avatar",
]

export default function SettingsPage() {
  // Local settings state
  const [settings, setSettings] = useState({
    avatar: "/images/jerry.jpg",
    fullName: "김재동",
    email: "jae-dong.kim@pwc.com",
    phone: "010-9061-9759",
    timezone: "utc+9",
  })

  const [selectedAvatar, setSelectedAvatar] = useState(settings.avatar)

  const handleSaveAccount = () => {
    const updatedSettings = {
      ...settings,
      avatar: selectedAvatar,
    }
    setSettings(updatedSettings)

    // Save to localStorage
    localStorage.setItem("userSettings", JSON.stringify(updatedSettings))

    toast.success("Account settings saved successfully")
  }

  const handleInputChange = (field: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <div className="container mx-auto pt-2">
      <Tabs defaultValue="account" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="account">계정관리</TabsTrigger>
          <TabsTrigger value="security">비밀번호 변경</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>계정 관리</CardTitle>
              <CardDescription>계정 정보를 관리하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>등록 사진</Label>
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={selectedAvatar || "/placeholder.svg"} alt={settings.fullName} />
                    <AvatarFallback>
                      {settings.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="full-name">Full Name</Label>
                <Input
                  id="full-name"
                  value={settings.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveAccount}>Save Account Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>비밀번호 관리</CardTitle>
              <CardDescription>비밀번호를 변경하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">현재 비밀번호</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">새로운 비밀번호</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">새로운 비밀번호 확인</Label>
                <Input id="confirm-password" type="password" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Security Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
