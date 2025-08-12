"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Lock, Eye, EyeOff, FileText, Upload, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { decryptFile, type EncryptionMetadata } from "@/lib/encryption"
import { loadEncryptionKey } from "@/lib/settings"

export function FileDecryptor() {
  const [file, setFile] = useState<File | null>(null)
  const [encryptionKey, setEncryptionKey] = useState<string>(loadEncryptionKey() || "")
  const [showPassword, setShowPassword] = useState(false)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [outputFilename, setOutputFilename] = useState<string>("")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const keyFileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      setError(null)
      setSuccess(null)

      // Check if the file looks like an IPFS CID
      if (selectedFile.name.startsWith("baf")) {
        console.log("IPFS file detected:", selectedFile.name)

        // Try to find matching metadata
        try {
          const metadataString = localStorage.getItem("encryption-metadata")
          if (metadataString) {
            const metadata = JSON.parse(metadataString)
            const ipfsHash = selectedFile.name.split(".")[0]

            if (metadata[ipfsHash]) {
              setError(
                `Note: Found matching metadata for this IPFS file. If you know the original filename, enter it below.`,
              )

              // If we have an original filename, use it
              if (metadata[ipfsHash].originalFileName) {
                setOutputFilename(metadata[ipfsHash].originalFileName)
              }
            }
          }
        } catch (e) {
          console.error("Could not check metadata:", e)
        }
      }
    }
  }

  const handleKeyFileSelect = () => {
    if (keyFileInputRef.current) {
      keyFileInputRef.current.click()
    }
  }

  const handleKeyFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      try {
        const content = await file.text()
        // Extract the key from the file content
        const keyMatch = content.match(/ENCRYPTION KEY:\s*([0-9a-f]{32})/i)
        if (keyMatch && keyMatch[1]) {
          setEncryptionKey(keyMatch[1].trim())
          setError(null)
        } else {
          setError("Could not find a valid encryption key in the file")
        }
      } catch (error) {
        setError(`Failed to read key file: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  const handleDecrypt = async () => {
    if (!file) {
      setError("Please select a file to decrypt")
      return
    }

    if (!encryptionKey) {
      setError("Please enter your encryption key")
      return
    }

    setIsDecrypting(true)
    setError(null)
    setSuccess(null)

    try {
      // Try to find metadata for this file
      let metadata: EncryptionMetadata | null = null

      // If it's an IPFS file, look for metadata in localStorage
      if (file.name.startsWith("baf")) {
        const ipfsHash = file.name.split(".")[0]
        const metadataString = localStorage.getItem("encryption-metadata")

        if (metadataString) {
          const allMetadata = JSON.parse(metadataString)
          if (allMetadata[ipfsHash]) {
            metadata = allMetadata[ipfsHash]
          }
        }
      }

      // If no metadata found, create basic metadata
      if (!metadata) {
        metadata = {
          algorithm: "AES-GCM",
          iv: "", // We'll need to derive this from the key
          originalFileName: outputFilename || file.name.replace(/\.enc$/, ""),
        }
      }

      // Read the file content
      const fileContent = await file.arrayBuffer()

      // Decrypt the file
      const decryptedFile = await decryptFile(new Blob([fileContent]), metadata, encryptionKey)

      // Create a download link for the decrypted file
      const url = URL.createObjectURL(decryptedFile)
      const a = document.createElement("a")
      a.href = url
      a.download = decryptedFile.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setSuccess(`File decrypted successfully: ${decryptedFile.name}`)
    } catch (error) {
      console.error("Decryption error:", error)
      setError(`Failed to decrypt file: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsDecrypting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>File Decryptor</CardTitle>
        <CardDescription>Decrypt files that were encrypted with your encryption key</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium">Select encrypted file</h3>
          <p className="mt-1 text-xs text-muted-foreground">Click to select the encrypted file you want to decrypt</p>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        </div>

        {file && (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          </div>
        )}

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
              <Lock className="h-4 w-4 mr-2" />
              Upload Key File
            </Button>
            <input ref={keyFileInputRef} type="file" accept=".txt" className="hidden" onChange={handleKeyFileChange} />
          </div>
          <p className="text-xs text-muted-foreground">
            Enter the encryption key that was used to encrypt this file, or upload the key file that was generated
            during encryption.
          </p>
        </div>

        <div className="space-y-2 mt-4">
          <Label htmlFor="output-filename">Output Filename (Optional)</Label>
          <Input
            id="output-filename"
            placeholder="e.g., document.pdf, image.jpg"
            value={outputFilename}
            onChange={(e) => setOutputFilename(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            If you know the original filename, enter it here. Otherwise, a generic name will be used.
          </p>
        </div>

        {error && (
          <Alert variant={error.startsWith("Note:") ? "default" : "destructive"}>
            <AlertTitle>{error.startsWith("Note:") ? "Info" : "Error"}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleDecrypt} disabled={!file || !encryptionKey || isDecrypting}>
          {isDecrypting ? (
            "Decrypting..."
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Decrypt and Download
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
