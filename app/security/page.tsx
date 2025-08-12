"use client"

import { SecuritySettingsPanel } from "@/components/security-settings"

export default function SecurityPage() {
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Security Center</h1>
      <p className="text-muted-foreground mb-6">Configure advanced security settings for your blockchain storage</p>

      <SecuritySettingsPanel />
    </div>
  )
}

