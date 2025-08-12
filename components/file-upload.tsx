"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, FileText, Check, AlertCircle, Lock, Key, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { storeFile } from "@/lib/blockchain"
import { getIPFSGatewayURL } from "@/lib/pinata"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { encryptFile, generateEncryptionKey } from "@/lib/encryption"
import { loadSettings, saveEncryptionKey, loadEncryptionKey, clearEncryptionKey } from "@/lib/settings"

// Helper function to download text as a file
const downloadTextAsFile = (text: string, filename: string) => {
  const blob = new Blob([text], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<"idle" | "encrypting" | "uploading" | "success" | "error">("idle")
  const [hash, setHash] = useState("")
  const [ipfsHash, setIpfsHash] = useState("")
  const [ipfsUrl, setIpfsUrl] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [encryptionKey, setEncryptionKey] = useState<string>(loadEncryptionKey() || "")
  const [encryptionMetadata, setEncryptionMetadata] = useState<any | null>(null)
  const [useEncryption, setUseEncryption] = useState<boolean>(() => {
    return loadSettings().encryption.enabled
  })
  const [rememberKey, setRememberKey] = useState<boolean>(() => {
    return loadSettings().encryption.rememberPassword
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setStatus("idle")
      setProgress(0)
      setErrorMessage("")
      setEncryptionMetadata(null)
    }
  }

  const handleGenerateKey = () => {
    const newKey = generateEncryptionKey()
    setEncryptionKey(newKey)
    if (rememberKey) {
      saveEncryptionKey(newKey)
    }
  }

  const handleRememberKeyChange = (checked: boolean) => {
    setRememberKey(checked)
    if (checked && encryptionKey) {
      saveEncryptionKey(encryptionKey)
    } else if (!checked) {
      clearEncryptionKey()
    }
  }

  const handleUpload = async () => {
    if (!file) return

    // Check file size - add a reasonable limit
    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_FILE_SIZE) {
      setStatus("error")
      setErrorMessage(`File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`)
      return
    }

    try {
      setUploading(true)
      setErrorMessage("")
      setProgress(10)

      let fileToUpload = file
      let metadata = null

      // Encrypt the file if encryption is enabled
      if (useEncryption) {
        if (!encryptionKey) {
          throw new Error("Encryption key is required when encryption is enabled")
        }

        // Validate the encryption key format
        if (!/^[0-9a-f]{32}$/i.test(encryptionKey)) {
          // Generate a new valid key
          const newKey = generateEncryptionKey()
          setEncryptionKey(newKey)

          // Show a warning to the user
          setErrorMessage("Your encryption key was invalid. A new secure key has been generated.")
          setTimeout(() => setErrorMessage(""), 3000)
        }

        setStatus("encrypting")

        // Download the key file first
        if (useEncryption && encryptionKey) {
          // Generate a filename based on the original file
          const keyFilename = `${file.name.replace(/\.[^/.]+$/, "")}_encryption_key.txt`

          // Create content with instructions
          const keyFileContent = `IMPORTANT: KEEP THIS FILE SECURE
This file contains the encryption key for: ${file.name}
Encrypted on: ${new Date().toLocaleString()}

ENCRYPTION KEY:
${encryptionKey}

DECRYPTION INSTRUCTIONS:
1. You will need this exact key to decrypt your file
2. Store this file in a secure location
3. Do not share this key with anyone
4. If you lose this key, your file cannot be recovered`

          // Download the key file
          downloadTextAsFile(keyFileContent, keyFilename)
        }

        try {
          const { encryptedFile, metadata: encMeta } = await encryptFile(file, encryptionKey)

          fileToUpload = encryptedFile
          metadata = encMeta

          setEncryptionMetadata(metadata)
          setProgress(30)
        } catch (encryptError) {
          console.error("Encryption error:", encryptError)
          throw new Error(
            `Failed to encrypt file: ${encryptError instanceof Error ? encryptError.message : String(encryptError)}`,
          )
        }
      }

      setStatus("uploading")

      // Simulate progress
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval)
            return 95
          }
          return prev + 5
        })
      }, 300)

      try {
        // Store file on IPFS via Pinata and then on blockchain
        const result = await storeFile(fileToUpload, metadata)
        console.log("File stored successfully:", result)

        clearInterval(interval)
        setProgress(100)
        setHash(result.hash)
        setIpfsHash(result.ipfsHash)
        setIpfsUrl(getIPFSGatewayURL(result.ipfsHash))
        setStatus("success")
        if (useEncryption) {
          // Add a reminder to the message
          setErrorMessage(
            "Remember to keep your encryption key safe! Without it, you won't be able to decrypt this file.",
          )
        }

        // Save the encryption key if remember is enabled
        if (useEncryption && rememberKey && encryptionKey) {
          saveEncryptionKey(encryptionKey)
        }

        // Store the encryption metadata locally
        if (useEncryption && metadata) {
          // Store in localStorage for persistence
          try {
            const existingData = localStorage.getItem("encryption-metadata") || "{}"
            const parsedData = JSON.parse(existingData)
            parsedData[result.ipfsHash] = metadata
            localStorage.setItem("encryption-metadata", JSON.stringify(parsedData))
          } catch (err) {
            console.error("Failed to save encryption metadata to localStorage:", err)
          }
        }

        // Store the transaction hash for this file ID
        if (result.fileId) {
          try {
            const storedHashes = localStorage.getItem("file-tx-hashes") || "{}"
            const hashes = JSON.parse(storedHashes)
            hashes[result.fileId.toString()] = result.hash
            localStorage.setItem("file-tx-hashes", JSON.stringify(hashes))
            console.log(`Stored transaction hash for file ID ${result.fileId}:`, result.hash)
          } catch (err) {
            console.error("Failed to save transaction hash to localStorage:", err)
          }
        }

        // Force refresh the recent files list after successful upload
        window.dispatchEvent(new CustomEvent("fileUploaded"))
      } catch (error: any) {
        clearInterval(interval)
        console.error("Upload failed:", error)
        setStatus("error")
        setErrorMessage(error.message || "Failed to upload file. Please try again.")
      } finally {
        setUploading(false)
      }
    } catch (error: any) {
      setUploading(false)
      setStatus("error")
      setErrorMessage(error.message || "An unexpected error occurred. Please try again.")
      console.error("Error in upload process:", error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload File</CardTitle>
        <CardDescription>
          Store your file securely on the blockchain with integrity verification
          {useEncryption && " and encryption"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center space-y-4">
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>About Encryption</AlertTitle>
            <AlertDescription>
              <p>When you enable encryption:</p>
              <ul className="list-disc pl-5 mt-2 text-sm">
                <li>Your file will be encrypted before uploading to IPFS</li>
                <li>You'll need the same encryption key to decrypt the file later</li>
                <li>Download the key file and keep it safe</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Drag and drop or click to upload</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Support for documents, images, and other file types up to 5MB
            </p>
            <input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </div>

          {!process.env.NEXT_PUBLIC_PINATA_API_KEY && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Pinata API keys are not configured. Please add NEXT_PUBLIC_PINATA_API_KEY and PINATA_SECRET_KEY to your
                environment variables.
              </AlertDescription>
            </Alert>
          )}

          {file && (
            <div className="w-full">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center space-x-3">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                {status === "success" ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : status === "error" ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : null}
              </div>

              {/* Encryption Options */}
              <div className="mt-4 space-y-4 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Lock className="h-4 w-4" />
                    <Label htmlFor="encryption-toggle" className="text-sm font-medium">
                      Encrypt File
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Encrypts your file before uploading to IPFS for additional security</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Switch
                    id="encryption-toggle"
                    checked={useEncryption}
                    onCheckedChange={setUseEncryption}
                    disabled={uploading}
                  />
                </div>

                {useEncryption && (
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="encryption-key" className="text-sm">
                      Encryption Key
                    </Label>
                    <div className="flex space-x-2">
                      <Input
                        id="encryption-key"
                        type="password"
                        placeholder="Enter encryption key"
                        value={encryptionKey}
                        onChange={(e) => setEncryptionKey(e.target.value)}
                        disabled={uploading}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateKey}
                        disabled={uploading}
                        title="Generate a random encryption key"
                      >
                        <Key className="h-4 w-4 mr-1" />
                        Generate
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2 pt-1">
                      <Switch
                        id="remember-key"
                        checked={rememberKey}
                        onCheckedChange={handleRememberKeyChange}
                        disabled={uploading}
                      />
                      <Label htmlFor="remember-key" className="text-xs text-muted-foreground">
                        Remember encryption key
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Important:</strong> Store this key safely. You will need it to decrypt your file later.
                    </p>
                  </div>
                )}
              </div>

              {(status === "encrypting" || status === "uploading") && (
                <div className="mt-4 space-y-2">
                  <Progress value={progress} className="h-2 w-full" />
                  <p className="text-xs text-right text-muted-foreground">
                    {status === "encrypting" ? "Encrypting..." : "Uploading..."} {progress}% complete
                  </p>
                </div>
              )}

              {status === "success" && (
                <div className="mt-4 space-y-2 rounded-md bg-muted p-3">
                  <p className="text-xs font-medium">Blockchain Transaction Hash:</p>
                  <p className="mt-1 text-xs font-mono break-all">{hash}</p>
                  <a
                    href={`https://sepolia.basescan.org/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View on BaseScan
                  </a>

                  <p className="text-xs font-medium mt-2">IPFS Hash (CID):</p>
                  <p className="mt-1 text-xs font-mono break-all">{ipfsHash}</p>

                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs font-medium">IPFS Gateway Link:</p>
                    <a
                      href={ipfsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View File
                    </a>
                  </div>

                  {encryptionMetadata && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs font-medium">Encryption Information:</p>
                      <p className="text-xs mt-1">Algorithm: {encryptionMetadata.algorithm}</p>
                      <p className="text-xs text-amber-600 mt-1">
                        <strong>Remember:</strong> You will need your encryption key to decrypt this file.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {status === "error" && (
                <div className="mt-4 rounded-md bg-red-50 p-3 text-red-500 dark:bg-red-950/30">
                  <p className="text-xs">{errorMessage || "Upload failed. Please try again."}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handleUpload}
          disabled={
            !file ||
            uploading ||
            status === "success" ||
            !process.env.NEXT_PUBLIC_PINATA_API_KEY ||
            (useEncryption && !encryptionKey)
          }
        >
          {uploading
            ? status === "encrypting"
              ? "Encrypting..."
              : "Uploading..."
            : `Upload to Blockchain${useEncryption ? " (Encrypted)" : ""}`}
        </Button>
      </CardFooter>
    </Card>
  )
}
