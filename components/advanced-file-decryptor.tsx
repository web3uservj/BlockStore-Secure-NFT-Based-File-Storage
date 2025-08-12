"use client"

import { TooltipContent } from "@/components/ui/tooltip"

import { TooltipTrigger } from "@/components/ui/tooltip"

import { Tooltip } from "@/components/ui/tooltip"

import { TooltipProvider } from "@/components/ui/tooltip"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Lock, Eye, EyeOff, FileText, Upload, Download, Info, Check, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { loadEncryptionKey } from "@/lib/settings"
import { base64ToBuffer } from "@/lib/encryption"

// Define the supported algorithms
const ALGORITHMS = ["AES-GCM", "AES-CBC", "AES-CTR"] as const
type Algorithm = (typeof ALGORITHMS)[number]

// Define the supported key lengths
const KEY_LENGTHS = [128, 256] as const
type KeyLength = (typeof KEY_LENGTHS)[number]

export function AdvancedFileDecryptor() {
  const [file, setFile] = useState<File | null>(null)
  const [encryptionKey, setEncryptionKey] = useState<string>(loadEncryptionKey() || "")
  const [showPassword, setShowPassword] = useState(false)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [outputFilename, setOutputFilename] = useState<string>("")
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(true)
  const [manualIV, setManualIV] = useState<string>("")
  const [algorithm, setAlgorithm] = useState<Algorithm>("AES-GCM")
  const [keyLength, setKeyLength] = useState<KeyLength>(128)
  const [storedMetadata, setStoredMetadata] = useState<Record<string, any>>({})
  const [selectedMetadataKey, setSelectedMetadataKey] = useState<string>("")
  const [debugMode, setDebugMode] = useState(false)
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [fileHexPreview, setFileHexPreview] = useState<string>("")
  const [bruteForceMode, setBruteForceMode] = useState(false)
  const [decryptionProgress, setDecryptionProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("basic")
  const [fileInfo, setFileInfo] = useState<{
    name: string
    size: number
    type: string
    lastModified: number
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const keyFileInputRef = useRef<HTMLInputElement>(null)
  const debugLogRef = useRef<HTMLDivElement>(null)

  // Load stored metadata on component mount
  useEffect(() => {
    try {
      const metadataString = localStorage.getItem("encryption-metadata")
      if (metadataString) {
        const metadata = JSON.parse(metadataString)
        setStoredMetadata(metadata)

        // If we have metadata entries, select the first one by default
        if (Object.keys(metadata).length > 0) {
          setSelectedMetadataKey(Object.keys(metadata)[0])
        }
      }
    } catch (e) {
      console.error("Failed to load stored metadata:", e)
      addDebugMessage("Failed to load stored metadata: " + String(e))
    }
  }, [])

  // Auto-scroll debug log to bottom
  useEffect(() => {
    if (debugLogRef.current) {
      debugLogRef.current.scrollTop = debugLogRef.current.scrollHeight
    }
  }, [debugLog])

  const addDebugMessage = (message: string) => {
    if (debugMode) {
      const timestamp = new Date().toLocaleTimeString()
      setDebugLog((prev) => [...prev, `[${timestamp}] ${message}`])
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      setError(null)
      setSuccess(null)
      setFileHexPreview("")

      // Set file info
      setFileInfo({
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type || "unknown",
        lastModified: selectedFile.lastModified,
      })

      addDebugMessage(`File selected: ${selectedFile.name} (${selectedFile.size} bytes)`)

      // Generate hex preview for small files
      if (selectedFile.size <= 1024 * 10) {
        // 10KB max
        try {
          const buffer = await selectedFile.arrayBuffer()
          const bytes = new Uint8Array(buffer)
          let hexString = ""

          // Only show first 100 bytes
          const previewLength = Math.min(bytes.length, 100)
          for (let i = 0; i < previewLength; i++) {
            hexString += bytes[i].toString(16).padStart(2, "0") + " "
            if ((i + 1) % 16 === 0) hexString += "\n"
          }

          if (bytes.length > 100) {
            hexString += "... (file truncated)"
          }

          setFileHexPreview(hexString)
          addDebugMessage("Generated hex preview of file")
        } catch (err) {
          addDebugMessage("Failed to generate hex preview: " + String(err))
        }
      } else {
        setFileHexPreview("File too large for hex preview (max 10KB)")
        addDebugMessage("File too large for hex preview")
      }

      // Check if the file looks like an IPFS CID
      if (selectedFile.name.startsWith("baf")) {
        addDebugMessage("IPFS file detected: " + selectedFile.name)

        // Try to find matching metadata
        const matchingKey = findMetadataForIPFSFile(selectedFile.name)
        if (matchingKey) {
          addDebugMessage("Found matching metadata: " + matchingKey)
          setSelectedMetadataKey(matchingKey)
          setError(
            `Note: Found matching metadata for this IPFS file (${matchingKey.substring(0, 10)}...). Please verify it's correct before decrypting.`,
          )
        } else {
          addDebugMessage("No matching metadata found for IPFS file")
          setError(
            "Note: This is an IPFS file, but no matching metadata was found. Please manually select the correct metadata or provide decryption details.",
          )
        }
      }
    }
  }

  const findMetadataForIPFSFile = (filename: string): string | null => {
    // Extract the CID from the filename (remove any file extension if present)
    const cid = filename.split(".")[0].trim()
    addDebugMessage(`Looking for metadata matching CID: ${cid}`)

    // First try: Look for an exact match of the CID in the metadata keys
    for (const key of Object.keys(storedMetadata)) {
      if (key === cid) {
        addDebugMessage("Found exact metadata match")
        return key
      }
    }

    // Second try: Look for keys that contain this CID
    for (const key of Object.keys(storedMetadata)) {
      if (key.includes(cid)) {
        addDebugMessage("Found metadata key containing the CID")
        return key
      }
    }

    // Third try: Look for CIDs that contain the key (partial match)
    for (const key of Object.keys(storedMetadata)) {
      if (cid.includes(key)) {
        addDebugMessage("Found CID containing the metadata key")
        return key
      }
    }

    addDebugMessage("No metadata match found")
    return null
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
        const keyMatch = content.match(/ENCRYPTION KEY:\s*([0-9a-f]{32,64})/i)
        if (keyMatch && keyMatch[1]) {
          const extractedKey = keyMatch[1].trim()
          setEncryptionKey(extractedKey)
          setError(null)
          addDebugMessage(`Successfully extracted key from file: ${extractedKey.substring(0, 6)}...`)
        } else {
          setError("Could not find a valid encryption key in the file")
          addDebugMessage("Failed to extract key from file - no valid key pattern found")
        }
      } catch (error) {
        setError(`Failed to read key file: ${error instanceof Error ? error.message : String(error)}`)
        addDebugMessage("Failed to read key file: " + String(error))
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
    setDebugLog([])
    addDebugMessage("Starting decryption process")
    addDebugMessage(`File: ${file.name}, Size: ${file.size} bytes`)
    addDebugMessage(`Algorithm: ${algorithm}, Key Length: ${keyLength} bits`)
    addDebugMessage(`Key: ${encryptionKey.substring(0, 6)}...${encryptionKey.substring(encryptionKey.length - 4)}`)

    if (manualIV) {
      addDebugMessage(`Manual IV provided: ${manualIV.substring(0, 10)}...`)
    } else if (selectedMetadataKey && storedMetadata[selectedMetadataKey]?.iv) {
      addDebugMessage(`Using IV from metadata: ${storedMetadata[selectedMetadataKey].iv.substring(0, 10)}...`)
    } else {
      addDebugMessage("No IV provided - will generate from key")
    }

    try {
      if (bruteForceMode) {
        await bruteForceDecrypt()
      } else {
        // Read the file content
        const fileContent = await file.arrayBuffer()
        addDebugMessage(`Read file content: ${fileContent.byteLength} bytes`)

        // Try to decrypt with the current settings
        const decryptedContent = await simplifiedDecrypt(
          fileContent,
          encryptionKey,
          manualIV || (selectedMetadataKey && storedMetadata[selectedMetadataKey]?.iv),
          algorithm,
          keyLength,
        )

        // Determine output filename
        const fileName = outputFilename || file.name.replace(/\.enc$/, "") || "decrypted-file"
        addDebugMessage(`Using output filename: ${fileName}`)

        // Create a download link for the decrypted file
        const mimeType = guessMimeType(fileName) || "application/octet-stream"
        const decryptedFile = new File([decryptedContent], fileName, {
          type: mimeType,
          lastModified: Date.now(),
        })

        const url = URL.createObjectURL(decryptedFile)
        const a = document.createElement("a")
        a.href = url
        a.download = decryptedFile.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        setSuccess(`File decrypted successfully: ${decryptedFile.name}`)
        addDebugMessage("Decryption successful!")
      }
    } catch (error) {
      console.error("Decryption error:", error)
      setError(`Failed to decrypt file: ${error instanceof Error ? error.message : String(error)}`)
      addDebugMessage("Decryption failed: " + String(error))
    } finally {
      setIsDecrypting(false)
      setDecryptionProgress(0)
    }
  }

  const bruteForceDecrypt = async () => {
    if (!file) return

    addDebugMessage("Starting brute force decryption with all combinations")
    const fileContent = await file.arrayBuffer()

    // Try all combinations of algorithms and key lengths
    const totalCombinations = ALGORITHMS.length * KEY_LENGTHS.length
    let currentCombination = 0

    for (const alg of ALGORITHMS) {
      for (const kl of KEY_LENGTHS) {
        currentCombination++
        setDecryptionProgress(Math.floor((currentCombination / totalCombinations) * 100))

        addDebugMessage(`Trying: ${alg} with ${kl}-bit key (${currentCombination}/${totalCombinations})`)

        try {
          // Try with metadata IV if available
          const iv = manualIV || (selectedMetadataKey && storedMetadata[selectedMetadataKey]?.iv)

          // First attempt with provided/metadata IV
          if (iv) {
            try {
              addDebugMessage(`Attempting with provided IV`)
              const decryptedContent = await simplifiedDecrypt(
                fileContent,
                encryptionKey,
                iv,
                alg as Algorithm,
                kl as KeyLength,
              )

              // If we get here, decryption succeeded
              handleSuccessfulDecryption(decryptedContent, alg, kl, true)
              return
            } catch (e) {
              addDebugMessage(`Failed with provided IV: ${String(e)}`)
            }
          }

          // Second attempt with derived IV
          try {
            addDebugMessage(`Attempting with derived IV`)
            const decryptedContent = await simplifiedDecrypt(
              fileContent,
              encryptionKey,
              undefined,
              alg as Algorithm,
              kl as KeyLength,
            )

            // If we get here, decryption succeeded
            handleSuccessfulDecryption(decryptedContent, alg, kl, false)
            return
          } catch (e) {
            addDebugMessage(`Failed with derived IV: ${String(e)}`)
          }
        } catch (error) {
          addDebugMessage(`Combination failed: ${alg} with ${kl}-bit key`)
        }
      }
    }

    // If we get here, all combinations failed
    setError("All decryption combinations failed. Please check your encryption key and file.")
    addDebugMessage("Brute force decryption failed - all combinations exhausted")
  }

  const handleSuccessfulDecryption = (
    decryptedContent: ArrayBuffer,
    successfulAlgorithm: string,
    successfulKeyLength: number,
    usedProvidedIV: boolean,
  ) => {
    // Determine output filename
    const fileName = outputFilename || file?.name.replace(/\.enc$/, "") || "decrypted-file"

    // Create a download link for the decrypted file
    const mimeType = guessMimeType(fileName) || "application/octet-stream"
    const decryptedFile = new File([decryptedContent], fileName, {
      type: mimeType,
      lastModified: Date.now(),
    })

    const url = URL.createObjectURL(decryptedFile)
    const a = document.createElement("a")
    a.href = url
    a.download = decryptedFile.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setSuccess(
      `File decrypted successfully with ${successfulAlgorithm} (${successfulKeyLength}-bit key) ${
        usedProvidedIV ? "using provided IV" : "using derived IV"
      }`,
    )
    addDebugMessage(
      `SUCCESS! Decryption worked with ${successfulAlgorithm} (${successfulKeyLength}-bit key) ${
        usedProvidedIV ? "using provided IV" : "using derived IV"
      }`,
    )
  }

  const simplifiedDecrypt = async (
    encryptedData: ArrayBuffer,
    password: string,
    ivBase64?: string,
    algorithm: Algorithm = "AES-GCM",
    keyLength: KeyLength = 128,
  ): Promise<ArrayBuffer> => {
    try {
      addDebugMessage(`Starting simplified decryption with ${algorithm}, ${keyLength} bits`)
      addDebugMessage(`Encrypted data size: ${encryptedData.byteLength} bytes`)

      // If no IV is provided, try to generate one from the password
      let iv: Uint8Array
      if (ivBase64) {
        // Use provided IV
        try {
          iv = base64ToBuffer(ivBase64)
          addDebugMessage(`Using provided IV: ${ivBase64.substring(0, 10)}... (${iv.length} bytes)`)
        } catch (e) {
          addDebugMessage(`Error decoding IV: ${String(e)}`)
          throw new Error("Invalid IV format. Please provide a valid base64-encoded IV.")
        }
      } else {
        // Generate a deterministic IV from the password
        const encoder = new TextEncoder()
        const data = encoder.encode(password)
        const hash = await window.crypto.subtle.digest("SHA-256", data)
        iv =
          algorithm === "AES-GCM"
            ? new Uint8Array(hash).slice(0, 12) // 12 bytes for GCM
            : new Uint8Array(hash).slice(0, 16) // 16 bytes for CBC/CTR
        addDebugMessage(`Generated deterministic IV from password: ${iv.length} bytes`)
      }

      // Convert password to key
      let keyData: Uint8Array
      if (/^[0-9a-f]{32}$/i.test(password) || /^[0-9a-f]{64}$/i.test(password)) {
        // It's a hex string key
        keyData = new Uint8Array(password.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))
        addDebugMessage(`Using hex key: ${keyData.length * 8} bits`)
      } else {
        // It's a regular password
        const encoder = new TextEncoder()
        const data = encoder.encode(password)
        const hash = await window.crypto.subtle.digest("SHA-256", data)
        keyData = new Uint8Array(hash)
        addDebugMessage(`Derived key from password: ${keyData.length * 8} bits`)
      }

      // Ensure key is the right length
      const targetLength = keyLength === 128 ? 16 : 32
      if (keyData.length !== targetLength) {
        addDebugMessage(`Adjusting key length from ${keyData.length} to ${targetLength} bytes`)
        keyData = keyData.slice(0, targetLength)
      }

      // Import the key
      const key = await window.crypto.subtle.importKey("raw", keyData, { name: algorithm, length: keyLength }, false, [
        "decrypt",
      ])
      addDebugMessage(`Key imported successfully`)

      // Set up decryption parameters
      let decryptParams: any
      if (algorithm === "AES-GCM") {
        decryptParams = {
          name: algorithm,
          iv: iv,
          tagLength: 128,
        }
      } else if (algorithm === "AES-CTR") {
        decryptParams = {
          name: algorithm,
          counter: iv,
          length: 128,
        }
      } else {
        decryptParams = {
          name: algorithm,
          iv: iv,
        }
      }

      addDebugMessage(
        `Decryption parameters set up: ${JSON.stringify({
          algorithm: decryptParams.name,
          ivLength: iv.length,
          keyLength: keyLength,
          dataLength: encryptedData.byteLength,
        })}`,
      )

      // Try decryption
      try {
        addDebugMessage(`Attempting primary decryption`)
        const decryptedData = await window.crypto.subtle.decrypt(decryptParams, key, encryptedData)
        addDebugMessage(`Primary decryption successful: ${decryptedData.byteLength} bytes`)
        return decryptedData
      } catch (e) {
        addDebugMessage(`Primary decryption failed: ${String(e)}`)

        // If GCM failed, try without auth tag
        if (algorithm === "AES-GCM") {
          addDebugMessage(`Trying alternative GCM approach (without auth tag)`)

          // Try different approaches for GCM
          try {
            // For GCM, the auth tag might be appended to the data
            // Try to decrypt with just the data part
            const dataWithoutTag = encryptedData.slice(0, encryptedData.byteLength - 16)
            addDebugMessage(`Trying with data minus 16 bytes: ${dataWithoutTag.byteLength} bytes`)
            const decryptedData = await window.crypto.subtle.decrypt(decryptParams, key, dataWithoutTag)
            addDebugMessage(`Alternative GCM approach successful`)
            return decryptedData
          } catch (e2) {
            addDebugMessage(`Alternative GCM approach failed: ${String(e2)}`)

            // Try one more approach - maybe the tag is at the beginning
            try {
              const dataWithoutTagAtStart = encryptedData.slice(16)
              addDebugMessage(`Trying with data minus first 16 bytes: ${dataWithoutTagAtStart.byteLength} bytes`)
              const decryptedData = await window.crypto.subtle.decrypt(decryptParams, key, dataWithoutTagAtStart)
              addDebugMessage(`Second alternative GCM approach successful`)
              return decryptedData
            } catch (e3) {
              addDebugMessage(`Second alternative GCM approach failed: ${String(e3)}`)
            }
          }
        }

        throw new Error("Decryption failed. Please check your encryption key and try different algorithm settings.")
      }
    } catch (error) {
      addDebugMessage(`Simplified decryption error: ${String(error)}`)
      throw error
    }
  }

  const guessMimeType = (filename: string): string => {
    const extension = filename.split(".").pop()?.toLowerCase()

    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      svg: "image/svg+xml",
      mp3: "audio/mpeg",
      mp4: "video/mp4",
      zip: "application/zip",
      txt: "text/plain",
      html: "text/html",
      css: "text/css",
      js: "text/javascript",
      json: "application/json",
    }

    return extension && extension in mimeTypes ? mimeTypes[extension] : ""
  }

  const clearDebugLog = () => {
    setDebugLog([])
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced File Decryptor</CardTitle>
        <CardDescription>Decrypt files with enhanced options and troubleshooting capabilities</CardDescription>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mx-6">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="debug">Debug</TabsTrigger>
        </TabsList>

        <CardContent className="space-y-4">
          <TabsContent value="basic">
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">Select encrypted file</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Click to select the encrypted file you want to decrypt
              </p>
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
                <input
                  ref={keyFileInputRef}
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={handleKeyFileChange}
                />
              </div>
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

            <div className="flex items-center space-x-2 mt-4">
              <Switch id="brute-force" checked={bruteForceMode} onCheckedChange={setBruteForceMode} />
              <Label htmlFor="brute-force">Try all decryption combinations</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help ml-1" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This will try all algorithms and key lengths to find the correct combination</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {error && (
              <Alert variant={error.startsWith("Note:") || error.startsWith("Warning:") ? "default" : "destructive"}>
                <AlertTitle>
                  {error.startsWith("Note:") || error.startsWith("Warning:") ? <Info className="h-4 w-4" /> : "Error"}
                </AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="advanced">
            <div className="space-y-4">
              {/* Stored Metadata Selector */}
              {Object.keys(storedMetadata).length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="metadata-selector">Use Stored Metadata</Label>
                  <select
                    id="metadata-selector"
                    className="w-full p-2 border rounded-md"
                    value={selectedMetadataKey}
                    onChange={(e) => setSelectedMetadataKey(e.target.value)}
                  >
                    <option value="">-- Select stored metadata --</option>
                    {Object.keys(storedMetadata).map((key) => (
                      <option key={key} value={key}>
                        {key.startsWith("baf")
                          ? // For IPFS hashes, show a reasonable portion
                            `${key.substring(0, 20)}...${key.substring(key.length - 8)}`
                          : // For other keys, show the beginning
                            `${key.substring(0, 20)}...`}
                        {storedMetadata[key].algorithm && ` (${storedMetadata[key].algorithm})`}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    For IPFS files, select the metadata key that matches your file's name.
                  </p>
                  {selectedMetadataKey && (
                    <div className="mt-2 text-xs bg-muted p-2 rounded">
                      <p>
                        <strong>Selected Metadata:</strong>
                      </p>
                      <p className="font-mono overflow-hidden text-ellipsis">{selectedMetadataKey}</p>
                      <p>Algorithm: {storedMetadata[selectedMetadataKey]?.algorithm || "Unknown"}</p>
                      <p>
                        IV:{" "}
                        {storedMetadata[selectedMetadataKey]?.iv
                          ? storedMetadata[selectedMetadataKey].iv.substring(0, 10) + "..."
                          : "Missing"}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Manual IV Input */}
              <div className="space-y-2">
                <Label htmlFor="manual-iv">Initialization Vector (IV)</Label>
                <Input
                  id="manual-iv"
                  placeholder="Base64-encoded IV"
                  value={manualIV}
                  onChange={(e) => setManualIV(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  If you know the IV used for encryption, enter it here. This is often required for decryption.
                </p>
              </div>

              {/* Algorithm Selector */}
              <div className="space-y-2">
                <Label htmlFor="algorithm">Encryption Algorithm</Label>
                <select
                  id="algorithm"
                  className="w-full p-2 border rounded-md"
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
                >
                  <option value="AES-GCM">AES-GCM (Recommended)</option>
                  <option value="AES-CBC">AES-CBC</option>
                  <option value="AES-CTR">AES-CTR</option>
                </select>
              </div>

              {/* Key Length Selector */}
              <div className="space-y-2">
                <Label htmlFor="key-length">Key Length (bits)</Label>
                <select
                  id="key-length"
                  className="w-full p-2 border rounded-md"
                  value={keyLength}
                  onChange={(e) => setKeyLength(Number(e.target.value) as KeyLength)}
                >
                  <option value="128">128 bits</option>
                  <option value="256">256 bits</option>
                </select>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Decryption Help</AlertTitle>
                <AlertDescription>
                  <p className="text-sm">
                    For files downloaded from IPFS, you'll need to provide the correct IV that was used during
                    encryption. This information is typically stored in your browser when you encrypt a file.
                  </p>
                  <p className="text-sm mt-2">
                    If you're on the same browser where you encrypted the file, try selecting from the stored metadata.
                    Otherwise, you'll need to manually provide the IV.
                  </p>
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          <TabsContent value="debug">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="debug-mode" checked={debugMode} onCheckedChange={setDebugMode} />
                <Label htmlFor="debug-mode">Enable Debug Mode</Label>
              </div>

              {fileInfo && (
                <div className="space-y-2 border p-3 rounded-md">
                  <h3 className="text-sm font-medium">File Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Name:</div>
                    <div className="font-mono">{fileInfo.name}</div>
                    <div>Size:</div>
                    <div className="font-mono">{fileInfo.size} bytes</div>
                    <div>Type:</div>
                    <div className="font-mono">{fileInfo.type}</div>
                    <div>Last Modified:</div>
                    <div className="font-mono">{new Date(fileInfo.lastModified).toLocaleString()}</div>
                  </div>
                </div>
              )}

              {fileHexPreview && (
                <div className="space-y-2">
                  <Label>File Hex Preview</Label>
                  <div className="bg-muted p-2 rounded-md">
                    <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">{fileHexPreview}</pre>
                  </div>
                </div>
              )}

              {debugMode && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Debug Log</Label>
                    <Button variant="outline" size="sm" onClick={clearDebugLog}>
                      Clear Log
                    </Button>
                  </div>
                  <div
                    ref={debugLogRef}
                    className="bg-black text-green-400 p-2 rounded-md h-40 overflow-y-auto font-mono text-xs"
                  >
                    {debugLog.length === 0 ? (
                      <p className="text-gray-500">Debug log will appear here when debug mode is enabled</p>
                    ) : (
                      debugLog.map((log, index) => <div key={index}>{log}</div>)
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>

      <CardFooter>
        <Button className="w-full" onClick={handleDecrypt} disabled={!file || !encryptionKey || isDecrypting}>
          {isDecrypting ? (
            <>
              {bruteForceMode ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Trying combinations... ({decryptionProgress}%)
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Decrypting...
                </>
              )}
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              {bruteForceMode ? "Try All Combinations" : "Decrypt and Download"}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
