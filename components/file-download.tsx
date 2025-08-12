"use client"

import { useState } from "react"
import { Download, Lock, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { decryptFile, type EncryptionMetadata } from "@/lib/encryption"
import { loadEncryptionKey } from "@/lib/settings"
import React from "react"

// Update the readKeyFile function to better handle key extraction
const readKeyFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        // Extract the key from the file content
        const keyMatch = content.match(/ENCRYPTION KEY:\s*([0-9a-f]{64})/i)
        if (keyMatch && keyMatch[1]) {
          resolve(keyMatch[1].trim())
        } else {
          reject(new Error("Could not find a valid encryption key in the file"))
        }
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error("Failed to read the key file"))
    reader.readAsText(file)
  })
}

interface FileDownloadProps {
  fileUrl: string
  fileName: string
  fileSize?: string
  isEncrypted: boolean
  encryptionMetadata?: EncryptionMetadata
  className?: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

export function FileDownload({
  fileUrl,
  fileName,
  fileSize,
  isEncrypted,
  encryptionMetadata,
  className,
  variant = "default",
  size = "default",
}: FileDownloadProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [encryptionKey, setEncryptionKey] = useState<string>(loadEncryptionKey() || "")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDecrypting, setIsDecrypting] = useState(false)

  const keyFileInputRef = React.useRef<HTMLInputElement>(null)
  const [keyFile, setKeyFile] = useState<File | null>(null)

  const handleKeyFileSelect = async () => {
    if (keyFileInputRef.current) {
      keyFileInputRef.current.click()
    }
  }

  const handleKeyFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setKeyFile(file)
      try {
        const extractedKey = await readKeyFile(file)
        setEncryptionKey(extractedKey)
        setError(null)
      } catch (error) {
        setError(`Failed to read key file: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  const handleDirectDownload = () => {
    // For unencrypted files, just download directly
    window.open(fileUrl, "_blank")
  }

  // Update the handleDecryptAndDownload function to validate the key
  const handleDecryptAndDownload = async () => {
    if (!encryptionMetadata) {
      setError("Encryption metadata is missing. Cannot decrypt the file.")
      return
    }

    if (!encryptionKey) {
      setError("Please enter your encryption key.")
      return
    }

    // Validate the encryption key format
    if (!/^[0-9a-f]{64}$/i.test(encryptionKey)) {
      setError("Invalid encryption key format. The key should be a 64-character hexadecimal string.")
      return
    }

    setError(null)
    setIsDecrypting(true)

    try {
      // Fetch the encrypted file
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`)
      }

      const encryptedBlob = await response.blob()

      // Decrypt the file
      const decryptedFile = await decryptFile(encryptedBlob, encryptionMetadata, encryptionKey)

      // Create a download link
      const downloadUrl = URL.createObjectURL(decryptedFile)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = decryptedFile.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)

      // Close the dialog
      setIsOpen(false)
    } catch (error) {
      console.error("Decryption error:", error)
      setError(`Failed to decrypt file: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsDecrypting(false)
    }
  }

  return (
    <>
      {isEncrypted ? (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant={variant} size={size} className={className}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Decrypt and Download File</DialogTitle>
              <DialogDescription>
                This file is encrypted. Enter your encryption key to decrypt and download it.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="file-info">File</Label>
                <div className="flex items-center space-x-2 text-sm">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span>{fileName}</span>
                  {fileSize && <span className="text-muted-foreground">({fileSize})</span>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="encryption-key">Encryption Key</Label>
                <div className="flex">
                  <Input
                    id="encryption-key"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your encryption key"
                    value={encryptionKey}
                    onChange={(e) => setEncryptionKey(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ml-2"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center mt-2">
                  <Button variant="outline" size="sm" onClick={handleKeyFileSelect} className="w-full">
                    Upload Key File
                  </Button>
                  <input
                    ref={keyFileInputRef}
                    type="file"
                    accept=".txt"
                    className="hidden"
                    onChange={handleKeyFileChange}
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {encryptionMetadata && (
                <p className="text-xs text-muted-foreground mt-1">Algorithm: {encryptionMetadata.algorithm}</p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleDecryptAndDownload} disabled={isDecrypting}>
                {isDecrypting ? "Decrypting..." : "Decrypt and Download"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Button variant={variant} size={size} className={className} onClick={handleDirectDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      )}
    </>
  )
}
