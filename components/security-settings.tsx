"use client"

import { Badge } from "@/components/ui/badge"

import { useState, useEffect } from "react"
import { Shield, Lock, Key, RefreshCw, Clock, Globe, Server, FileCheck, Save, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  loadSecuritySettings,
  saveSecuritySettings,
  applySecurityLevel,
  SECURITY_LEVELS,
  type SecuritySettings,
} from "@/lib/security"
import { toast } from "sonner"

export function SecuritySettingsPanel() {
  const [settings, setSettings] = useState<SecuritySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ipAddress, setIpAddress] = useState("")
  const [newIpAddress, setNewIpAddress] = useState("")

  useEffect(() => {
    // Load security settings
    const securitySettings = loadSecuritySettings()
    setSettings(securitySettings)
    setLoading(false)

    // Fetch the user's IP address
    fetch("https://api.ipify.org?format=json")
      .then((response) => response.json())
      .then((data) => {
        setIpAddress(data.ip)
        setNewIpAddress(data.ip)
      })
      .catch((error) => {
        console.error("Error fetching IP address:", error)
      })
  }, [])

  const handleSaveSettings = () => {
    if (!settings) return

    setSaving(true)
    try {
      saveSecuritySettings(settings)
      toast.success("Security settings saved successfully")
    } catch (error) {
      console.error("Error saving security settings:", error)
      toast.error("Failed to save security settings")
    } finally {
      setSaving(false)
    }
  }

  const handleSecurityLevelChange = (level: string) => {
    if (level in SECURITY_LEVELS) {
      // Convert the level to lowercase to match the SecurityLevel type
      const securityLevel = level.toLowerCase() as keyof typeof SECURITY_LEVELS
      const newSettings = applySecurityLevel(securityLevel)
      setSettings(newSettings)
      toast.success(`Applied ${level} security level`)
    }
  }

  const handleAddIpAddress = () => {
    if (!settings || !newIpAddress) return

    // Check if the IP is already in the list
    if (settings.accessControl.allowedIPs.includes(newIpAddress)) {
      toast.error("This IP address is already in the allowed list")
      return
    }

    // Add the IP to the list
    setSettings({
      ...settings,
      accessControl: {
        ...settings.accessControl,
        allowedIPs: [...settings.accessControl.allowedIPs, newIpAddress],
      },
    })

    // Clear the input
    setNewIpAddress("")
    toast.success("IP address added to allowed list")
  }

  const handleRemoveIpAddress = (ip: string) => {
    if (!settings) return

    // Remove the IP from the list
    setSettings({
      ...settings,
      accessControl: {
        ...settings.accessControl,
        allowedIPs: settings.accessControl.allowedIPs.filter((allowedIp) => allowedIp !== ip),
      },
    })

    toast.success("IP address removed from allowed list")
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Loading security settings...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse space-y-4 w-full">
              <div className="h-8 bg-muted rounded-md w-1/2"></div>
              <div className="h-32 bg-muted rounded-md w-full"></div>
              <div className="h-8 bg-muted rounded-md w-3/4"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Error loading security settings</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load security settings. Please refresh the page and try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Security Settings</CardTitle>
        <CardDescription>Configure security options for your blockchain storage</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Label htmlFor="security-level">Security Level Presets</Label>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-24 relative"
              onClick={() => handleSecurityLevelChange(SECURITY_LEVELS.standard)}
            >
              <Shield className="h-8 w-8 mb-2 text-blue-500" />
              <span>Standard</span>
              <span className="text-xs text-muted-foreground mt-1">Basic protection</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-24 relative"
              onClick={() => handleSecurityLevelChange(SECURITY_LEVELS.high)}
            >
              <Shield className="h-8 w-8 mb-2 text-yellow-500" />
              <span>High</span>
              <span className="text-xs text-muted-foreground mt-1">Enhanced security</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-24 relative"
              onClick={() => handleSecurityLevelChange(SECURITY_LEVELS.maximum)}
            >
              <Shield className="h-8 w-8 mb-2 text-red-500" />
              <span>Maximum</span>
              <span className="text-xs text-muted-foreground mt-1">Highest protection</span>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="encryption" className="mt-6">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="encryption">
              <Lock className="h-4 w-4 mr-2" />
              Encryption
            </TabsTrigger>
            <TabsTrigger value="access">
              <Key className="h-4 w-4 mr-2" />
              Access Control
            </TabsTrigger>
            <TabsTrigger value="integrity">
              <FileCheck className="h-4 w-4 mr-2" />
              Integrity
            </TabsTrigger>
            <TabsTrigger value="key-storage">
              <Server className="h-4 w-4 mr-2" />
              Key Storage
            </TabsTrigger>
          </TabsList>

          {/* Encryption Tab */}
          <TabsContent value="encryption">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="encryption-strength">Encryption Strength</Label>
                <Select
                  value={settings.encryptionStrength}
                  onValueChange={(value) => setSettings({ ...settings, encryptionStrength: value as any })}
                >
                  <SelectTrigger id="encryption-strength">
                    <SelectValue placeholder="Select encryption strength" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AES-128">AES-128 (Faster)</SelectItem>
                    <SelectItem value="AES-192">AES-192 (Balanced)</SelectItem>
                    <SelectItem value="AES-256">AES-256 (Strongest)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Higher encryption strength provides better security but may impact performance
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="multi-layer-encryption">Multi-Layer Encryption</Label>
                  <Switch
                    id="multi-layer-encryption"
                    checked={settings.multiLayerEncryption}
                    onCheckedChange={(checked) => setSettings({ ...settings, multiLayerEncryption: checked })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Apply multiple layers of encryption for enhanced security (may impact performance)
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="key-rotation">Key Rotation</Label>
                  <Switch
                    id="key-rotation"
                    checked={settings.keyRotationEnabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, keyRotationEnabled: checked })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically rotate encryption keys to limit the impact of key compromise
                </p>
              </div>

              {settings.keyRotationEnabled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="key-rotation-period">Key Rotation Period (days)</Label>
                    <span className="text-sm">{settings.keyRotationPeriod} days</span>
                  </div>
                  <Slider
                    id="key-rotation-period"
                    min={7}
                    max={365}
                    step={1}
                    value={[settings.keyRotationPeriod]}
                    onValueChange={(value) => setSettings({ ...settings, keyRotationPeriod: value[0] })}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>7 days</span>
                    <span>1 year</span>
                  </div>
                </div>
              )}

              <Alert>
                <RefreshCw className="h-4 w-4" />
                <AlertTitle>About Multi-Layer Encryption</AlertTitle>
                <AlertDescription>
                  Multi-layer encryption applies several encryption algorithms in sequence, making it significantly
                  harder for attackers to decrypt your data even if they obtain one of the encryption keys.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          {/* Access Control Tab */}
          <TabsContent value="access">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="access-control-enabled">Enable Access Control</Label>
                  <Switch
                    id="access-control-enabled"
                    checked={settings.accessControl.enabled}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        accessControl: { ...settings.accessControl, enabled: checked },
                      })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">Restrict access to your files based on defined policies</p>
              </div>

              {settings.accessControl.enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="default-policy">Default Access Policy</Label>
                    <Select
                      value={settings.accessControl.defaultPolicy}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          accessControl: {
                            ...settings.accessControl,
                            defaultPolicy: value as "private" | "restricted" | "public",
                          },
                        })
                      }
                    >
                      <SelectTrigger id="default-policy">
                        <SelectValue placeholder="Select default policy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private (Owner only)</SelectItem>
                        <SelectItem value="restricted">Restricted (Specific users)</SelectItem>
                        <SelectItem value="public">Public (Anyone with link)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ip-restriction">IP Address Restriction</Label>
                      <Switch
                        id="ip-restriction"
                        checked={settings.accessControl.ipRestriction}
                        onCheckedChange={(checked) =>
                          setSettings({
                            ...settings,
                            accessControl: { ...settings.accessControl, ipRestriction: checked },
                          })
                        }
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Restrict access to specific IP addresses for additional security
                    </p>
                  </div>

                  {settings.accessControl.ipRestriction && (
                    <div className="space-y-2 border rounded-md p-4">
                      <Label>Allowed IP Addresses</Label>
                      <div className="flex space-x-2 mt-2">
                        <Input
                          placeholder="Enter IP address"
                          value={newIpAddress}
                          onChange={(e) => setNewIpAddress(e.target.value)}
                        />
                        <Button onClick={handleAddIpAddress}>Add</Button>
                      </div>
                      <div className="mt-4">
                        {settings.accessControl.allowedIPs.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No IP addresses added yet</p>
                        ) : (
                          <div className="space-y-2">
                            {settings.accessControl.allowedIPs.map((ip) => (
                              <div key={ip} className="flex items-center justify-between bg-muted p-2 rounded-md">
                                <div className="flex items-center">
                                  <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                                  <span className="text-sm">{ip}</span>
                                  {ip === ipAddress && (
                                    <Badge variant="outline" className="ml-2">
                                      Current
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveIpAddress(ip)}
                                  className="h-8 w-8 p-0"
                                >
                                  &times;
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="time-limited-access">Time-Limited Access</Label>
                      <Switch
                        id="time-limited-access"
                        checked={settings.accessControl.timeLimitedAccess}
                        onCheckedChange={(checked) =>
                          setSettings({
                            ...settings,
                            accessControl: { ...settings.accessControl, timeLimitedAccess: checked },
                          })
                        }
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Generate time-limited access tokens that expire automatically
                    </p>
                  </div>
                </>
              )}

              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>About Time-Limited Access</AlertTitle>
                <AlertDescription>
                  Time-limited access generates temporary tokens that automatically expire after a set period, providing
                  an additional layer of security for shared files.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          {/* Integrity Tab */}
          <TabsContent value="integrity">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="automatic-checks">Automatic Integrity Checks</Label>
                  <Switch
                    id="automatic-checks"
                    checked={settings.integrityVerification.automaticChecks}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        integrityVerification: { ...settings.integrityVerification, automaticChecks: checked },
                      })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically verify the integrity of your files on a regular schedule
                </p>
              </div>

              {settings.integrityVerification.automaticChecks && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="check-interval">Check Interval (hours)</Label>
                    <span className="text-sm">{settings.integrityVerification.checkInterval} hours</span>
                  </div>
                  <Slider
                    id="check-interval"
                    min={1}
                    max={168}
                    step={1}
                    value={[settings.integrityVerification.checkInterval]}
                    onValueChange={(value) =>
                      setSettings({
                        ...settings,
                        integrityVerification: { ...settings.integrityVerification, checkInterval: value[0] },
                      })
                    }
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 hour</span>
                    <span>1 week</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="merkle-verification">Merkle Tree Verification</Label>
                  <Switch
                    id="merkle-verification"
                    checked={settings.integrityVerification.merkleProofVerification}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        integrityVerification: { ...settings.integrityVerification, merkleProofVerification: checked },
                      })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use Merkle trees for advanced cryptographic verification of file integrity
                </p>
              </div>

              <Alert>
                <FileCheck className="h-4 w-4" />
                <AlertTitle>About Merkle Tree Verification</AlertTitle>
                <AlertDescription>
                  Merkle trees allow for efficient and secure verification of file integrity by using a tree structure
                  of cryptographic hashes. This provides stronger guarantees that your files haven't been tampered with.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          {/* Key Storage Tab */}
          <TabsContent value="key-storage">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="split-key">Split Key Storage (Shamir's Secret Sharing)</Label>
                  <Switch
                    id="split-key"
                    checked={settings.secureKeyStorage.splitKey}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        secureKeyStorage: { ...settings.secureKeyStorage, splitKey: checked },
                      })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Split encryption keys into multiple shares for enhanced security
                </p>
              </div>

              {settings.secureKeyStorage.splitKey && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="threshold-shares">Threshold Shares</Label>
                      <span className="text-sm">{settings.secureKeyStorage.thresholdShares} shares</span>
                    </div>
                    <Slider
                      id="threshold-shares"
                      min={2}
                      max={settings.secureKeyStorage.totalShares}
                      step={1}
                      value={[settings.secureKeyStorage.thresholdShares]}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          secureKeyStorage: { ...settings.secureKeyStorage, thresholdShares: value[0] },
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of shares required to reconstruct the key (must be less than or equal to total shares)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="total-shares">Total Shares</Label>
                      <span className="text-sm">{settings.secureKeyStorage.totalShares} shares</span>
                    </div>
                    <Slider
                      id="total-shares"
                      min={settings.secureKeyStorage.thresholdShares}
                      max={10}
                      step={1}
                      value={[settings.secureKeyStorage.totalShares]}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          secureKeyStorage: { ...settings.secureKeyStorage, totalShares: value[0] },
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Total number of key shares to generate (must be greater than or equal to threshold)
                    </p>
                  </div>
                </>
              )}

              <Alert>
                <Key className="h-4 w-4" />
                <AlertTitle>About Shamir's Secret Sharing</AlertTitle>
                <AlertDescription>
                  Shamir's Secret Sharing is a cryptographic algorithm that divides a secret (like an encryption key)
                  into multiple parts. A specified number of these parts are required to reconstruct the original
                  secret, providing both security and redundancy.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </CardFooter>
    </Card>
  )
}

