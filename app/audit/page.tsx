"use client"
import { useState } from "react"
import { AuditLog } from "@/components/audit-log"
import { AuditDashboard } from "@/components/audit-dashboard"
import { EnhancedAuditDashboard } from "@/components/audit-dashboard-enhanced"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function AuditPage() {
  const [useEnhancedDashboard, setUseEnhancedDashboard] = useState(true)

  return (
    <div className="container py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Blockchain Audit</h1>
          <p className="text-muted-foreground">
            Comprehensive audit trail and analytics for blockchain storage and verification
          </p>
        </div>

        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <Switch id="enhanced-mode" checked={useEnhancedDashboard} onCheckedChange={setUseEnhancedDashboard} />
          <Label htmlFor="enhanced-mode">Enhanced Dashboard</Label>
        </div>
      </div>

      {useEnhancedDashboard ? (
        <EnhancedAuditDashboard />
      ) : (
        <Tabs defaultValue="log" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="log">Audit Log</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="log">
            <AuditLog />
          </TabsContent>

          <TabsContent value="analytics">
            <AuditDashboard />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

