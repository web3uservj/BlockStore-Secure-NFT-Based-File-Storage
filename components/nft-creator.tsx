"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FileText, AlertCircle, Gift } from "lucide-react"
import { mintFileNFT } from "@/lib/nft"
import { toast } from "sonner"

interface NFTCreatorProps {
  fileId: number | string
  fileName: string
  fileType: string
  onSuccess?: (tokenId: number, txHash: string) => void
}

export function NFTCreator({ fileId, fileName, fileType, onSuccess }: NFTCreatorProps) {
  const [recipientAddress, setRecipientAddress] = useState("")
  const [accessLevel, setAccessLevel] = useState("full")
  const [expirationDays, setExpirationDays] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateNFT = async () => {
    if (!recipientAddress) {
      setError("Recipient address is required")
      return
    }

    try {
      setIsCreating(true)
      setError(null)

      // Call the mintFileNFT function
      const result = await mintFileNFT(fileId, recipientAddress, accessLevel, expirationDays)

      toast.success(`NFT created successfully! Token ID: ${result.tokenId}`)

      // Dispatch an event to notify other components that an NFT was created
      window.dispatchEvent(new CustomEvent("nftCreated"))

      if (onSuccess) {
        onSuccess(result.tokenId, result.txHash)
      }
    } catch (error) {
      console.error("Error creating NFT:", error)
      setError(error instanceof Error ? error.message : "Failed to create NFT")
      toast.error("Failed to create NFT")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card>
      <CardHeader className="p-3">
        <CardTitle className="text-lg">Create NFT for File</CardTitle>
        <CardDescription>Create a non-fungible token representing ownership or access rights</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-3 pt-0">
        <div className="flex items-center space-x-3 p-3 bg-muted rounded-md">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{fileName}</p>
            <p className="text-xs text-muted-foreground">{fileType}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="recipient-address">Recipient Address</Label>
          <Input
            id="recipient-address"
            placeholder="0x..."
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">The Ethereum address that will receive this NFT</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="access-level">Access Level</Label>
          <Select value={accessLevel} onValueChange={setAccessLevel}>
            <SelectTrigger id="access-level">
              <SelectValue placeholder="Select access level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Full Access (View & Download)</SelectItem>
              <SelectItem value="view">View Only</SelectItem>
              <SelectItem value="limited">Limited Time Access</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {accessLevel === "limited" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="expiration">Expiration (days)</Label>
              <span className="text-sm">{expirationDays === 0 ? "Never expires" : `${expirationDays} days`}</span>
            </div>
            <Slider
              id="expiration"
              min={0}
              max={365}
              step={1}
              value={[expirationDays]}
              onValueChange={(value) => setExpirationDays(value[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Never</span>
              <span>1 year</span>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <Button className="w-full" onClick={handleCreateNFT} disabled={isCreating || !recipientAddress}>
          <Gift className="h-4 w-4 mr-2" />
          {isCreating ? "Creating NFT..." : "Create NFT"}
        </Button>
      </CardFooter>
    </Card>
  )
}

