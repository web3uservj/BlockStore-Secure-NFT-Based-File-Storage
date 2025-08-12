"use client"

import { useState, useEffect } from "react"
import { Shield, Lock, Save, RotateCcw, AlertCircle, Check, Moon, Sun, Laptop } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { loadSettings, saveSettings, type AppSettings, DEFAULT_SETTINGS, clearEncryptionKey } from "@/lib/settings"

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [resetConfirm, setResetConfirm] = useState(false)

  useEffect(() => {
    // Load settings on component mount
    const loadedSettings = loadSettings()
    setSettings(loadedSettings)
  }, [])

  const handleSettingChange = <K extends keyof AppSettings>(category: K, key: keyof AppSettings[K], value: any) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }))
    setIsDirty(true)
    setSaveStatus("idle")
  }

  const handleSaveSettings = () => {
    try {
      setSaveStatus("saving")
      saveSettings(settings)

      // If we disabled "remember password", clear the stored key
      if (!settings.encryption.rememberPassword) {
        clearEncryptionKey()
      }

      setTimeout(() => {
        setSaveStatus("success")
        setIsDirty(false)

        // Reset success message after a delay
        setTimeout(() => {
          setSaveStatus("idle")
        }, 3000)
      }, 500)
    } catch (error) {
      console.error("Error saving settings:", error)
      setSaveStatus("error")
    }
  }

  const handleResetSettings = () => {
    if (!resetConfirm) {
      setResetConfirm(true)
      setTimeout(() => setResetConfirm(false), 3000)
      return
    }

    setSettings(DEFAULT_SETTINGS)
    saveSettings(DEFAULT_SETTINGS)
    clearEncryptionKey()
    setIsDirty(false)
    setSaveStatus("idle")
    setResetConfirm(false)
  }

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
      <p className="text-muted-foreground mb-6">Configure your blockchain storage and encryption preferences</p>

      <Tabs defaultValue="encryption" className="space-y-6">
        <TabsList>
          <TabsTrigger value="encryption">
            <Lock className="h-4 w-4 mr-2" />
            Encryption
          </TabsTrigger>
          <TabsTrigger value="blockchain">
            <Shield className="h-4 w-4 mr-2" />
            Blockchain
          </TabsTrigger>
          <TabsTrigger value="interface">
            <Sun className="h-4 w-4 mr-2" />
            Interface
          </TabsTrigger>
        </TabsList>

        <TabsContent value="encryption">
          <Card>
            <CardHeader>
              <CardTitle>Encryption Settings</CardTitle>
              <CardDescription>
                Configure how your files are encrypted before being stored on IPFS and the blockchain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="encryption-toggle">Enable Encryption</Label>
                  <Switch
                    id="encryption-toggle"
                    checked={settings.encryption.enabled}
                    onCheckedChange={(checked: boolean) => handleSettingChange("encryption", "enabled", checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  When enabled, files will be encrypted before uploading to IPFS
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="remember-password">Remember Encryption Key</Label>
                  <Switch
                    id="remember-password"
                    checked={settings.encryption.rememberPassword}
                    onCheckedChange={(checked: boolean) =>
                      handleSettingChange("encryption", "rememberPassword", checked)
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Store your encryption key in the browser (less secure but more convenient)
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important Security Notice</AlertTitle>
                <AlertDescription>
                  Always keep your encryption keys safe. If you lose your encryption key, you will not be able to
                  decrypt your files.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blockchain">
          <Card>
            <CardHeader>
              <CardTitle>Blockchain Settings</CardTitle>
              <CardDescription>Configure blockchain verification and storage settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-verify">Automatic Verification</Label>
                  <Switch
                    id="auto-verify"
                    checked={settings.blockchain.autoVerify}
                    onCheckedChange={(checked: boolean) => handleSettingChange("blockchain", "autoVerify", checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Periodically verify the integrity of your stored files</p>
              </div>

              {settings.blockchain.autoVerify && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="verification-interval">Verification Interval (hours)</Label>
                    <span className="text-sm">{settings.blockchain.verificationInterval}</span>
                  </div>
                  <Slider
                    id="verification-interval"
                    min={1}
                    max={168}
                    step={1}
                    value={[settings.blockchain.verificationInterval]}
                    onValueChange={(value: number[]) =>
                      handleSettingChange("blockchain", "verificationInterval", value[0])
                    }
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 hour</span>
                    <span>1 week</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interface">
          <Card>
            <CardHeader>
              <CardTitle>Interface Settings</CardTitle>
              <CardDescription>Customize the application interface and appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="theme-select">Theme</Label>
                <Select
                  value={settings.interface.theme}
                  onValueChange={(value) => handleSettingChange("interface", "theme", value)}
                >
                  <SelectTrigger id="theme-select">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center">
                        <Sun className="h-4 w-4 mr-2" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center">
                        <Moon className="h-4 w-4 mr-2" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center">
                        <Laptop className="h-4 w-4 mr-2" />
                        System
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="compact-mode">Compact Mode</Label>
                  <Switch
                    id="compact-mode"
                    checked={settings.interface.compactMode}
                    onCheckedChange={(checked: boolean) => handleSettingChange("interface", "compactMode", checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Reduces spacing and sizes for a more compact interface</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between mt-6">
        <Button variant="destructive" onClick={handleResetSettings}>
          <RotateCcw className="h-4 w-4 mr-2" />
          {resetConfirm ? "Confirm Reset" : "Reset to Defaults"}
        </Button>

        <div className="flex items-center gap-4">
          {saveStatus === "success" && (
            <span className="text-sm text-green-600 flex items-center">
              <Check className="h-4 w-4 mr-1" />
              Settings saved
            </span>
          )}

          {saveStatus === "error" && (
            <span className="text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              Error saving settings
            </span>
          )}

          <Button onClick={handleSaveSettings} disabled={!isDirty || saveStatus === "saving"}>
            <Save className="h-4 w-4 mr-2" />
            {saveStatus === "saving" ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  )
}
