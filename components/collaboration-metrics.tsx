import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ArrowRight, Handshake, Users, Building2 } from "lucide-react"

export function CollaborationMetrics() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center">
          <Handshake className="mr-2 h-5 w-5 text-orange-600" />
          Collaboration
        </h2>
        <Button variant="outline" size="sm">
          View Details <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">X-Los Collaboration</CardTitle>
            <Handshake className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">Cross-line of service collaboration</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Joint Projects</span>
                  <span className="font-medium">5/8</span>
                </div>
                <Progress value={62.5} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Revenue Generated</span>
                  <span className="font-medium">₩320M/₩500M</span>
                </div>
                <Progress value={64} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Los내 Collaboration</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">
              지정감사 및 비감사 수임 후 산업/Product AX Node Collaboration
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Internal Referrals</span>
                  <span className="font-medium">12/15</span>
                </div>
                <Progress value={80} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Specialist Involvement</span>
                  <span className="font-medium">8/10</span>
                </div>
                <Progress value={80} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peer Group Sounding</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">Peer feedback and consultation</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Peer Consultations</span>
                  <span className="font-medium">18/20</span>
                </div>
                <Progress value={90} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Group Sessions</span>
                  <span className="font-medium">6/8</span>
                </div>
                <Progress value={75} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
