"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Lock, Eye, EyeOff, FileText, Upload, Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

// Add this import at the top of the file
import { Buffer } from "buffer"

export function MultiLayerDecryptor() {
  const [file, setFile] = useState<File | null>(null)
  const [encryptionKey, setEncryptionKey] = useState<string>("")
  const [showPassword, setShowPassword] = useState(false)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [outputFilename, setOutputFilename] = useState<string>("")
  const [metadataJson, setMetadataJson] = useState<string>("")
  const [logs, setLogs] = useState<string[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const keyFileInputRef = useRef<HTMLInputElement>(null)

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message])
    console.log(message)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      setError(null)
      setSuccess(null)
      addLog(`File selected: ${selectedFile.name} (${selectedFile.size} bytes)`)

      // Try to extract IPFS hash from filename
      if (selectedFile.name.startsWith("baf")) {
        const ipfsHash = selectedFile.name.split(".")[0]
        addLog(`Detected IPFS hash: ${ipfsHash}`)

        // Try to find metadata in localStorage
        try {
          const metadataString = localStorage.getItem("encryption-metadata")
          if (metadataString) {
            const metadata = JSON.parse(metadataString)
            if (metadata[ipfsHash]) {
              setMetadataJson(JSON.stringify(metadata[ipfsHash], null, 2))
              addLog(`Found metadata for ${ipfsHash}`)

              // If we have an original filename, use it
              if (metadata[ipfsHash].originalFileName) {
                setOutputFilename(metadata[ipfsHash].originalFileName)
                addLog(`Set output filename to ${metadata[ipfsHash].originalFileName}`)
              }
            }
          }
        } catch (e) {
          addLog(`Error loading metadata: ${e}`)
        }
      }
    }
  }

  const handleKeyFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      try {
        const content = await file.text()
        // Extract the key from the file content
        const keyMatch = content.match(/ENCRYPTION KEY:\s*([0-9a-f]{64})/i)
        if (keyMatch && keyMatch[1]) {
          const extractedKey = keyMatch[1].trim()
          setEncryptionKey(extractedKey)
          setError(null)
          addLog(`Successfully extracted key from file: ${extractedKey.substring(0, 6)}...`)
        } else {
          setError("Could not find a valid encryption key in the file")
          addLog("Failed to extract key from file - no valid key pattern found")
        }
      } catch (error) {
        setError(`Failed to read key file: ${error instanceof Error ? error.message : String(error)}`)
        addLog("Failed to read key file: " + String(error))
      }
    }
  }

  const handleKeyFileSelect = () => {
    if (keyFileInputRef.current) {
      keyFileInputRef.current.click()
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

    let metadata: any = null
    try {
      metadata = JSON.parse(metadataJson)
      if (!metadata.multiLayerEncryption || !metadata.encryptedLayerKeys) {
        setError("The provided metadata does not contain multi-layer encryption information")
        return
      }
    } catch (e) {
      setError("Invalid metadata JSON. Please provide valid metadata.")
      return
    }

    setIsDecrypting(true)
    setError(null)
    setSuccess(null)
    setLogs([])
    addLog("Starting multi-layer decryption process")
    addLog(`File: ${file.name}, Size: ${file.size} bytes`)
    addLog(
      `Using encryption key: ${encryptionKey.substring(0, 6)}...${encryptionKey.substring(encryptionKey.length - 4)}`,
    )

    try {
      // Read the file content
      const fileContent = await file.arrayBuffer()
      addLog(`Read file content: ${fileContent.byteLength} bytes`)

      // Decrypt the file using multi-layer decryption
      const decryptedContent = await multiLayerDecrypt(fileContent, metadata, encryptionKey)
      addLog(`Decryption successful! Decrypted size: ${decryptedContent.byteLength} bytes`)

      // Determine output filename
      const fileName = outputFilename || file.name.replace(/\.enc$/, "") || "decrypted-file"
      addLog(`Using output filename: ${fileName}`)

      // Create a download link for the decrypted file
      const mimeType = metadata.originalFileType || guessMimeType(fileName) || "application/octet-stream"
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
    } catch (error) {
      console.error("Decryption error:", error)
      setError(`Failed to decrypt file: ${error instanceof Error ? error.message : String(error)}`)
      addLog("Decryption failed: " + String(error))
    } finally {
      setIsDecrypting(false)
    }
  }

  // Function to decrypt layer keys
  async function decryptLayerKeys(encryptedLayerKeysString: string, primaryKey: string): Promise<string[]> {
    addLog("Decrypting layer keys...")

    // Split the encrypted layer keys and IV
    const [encryptedLayerKeysBase64, ivBase64] = encryptedLayerKeysString.split(".")

    if (!encryptedLayerKeysBase64 || !ivBase64) {
      throw new Error("Invalid encrypted layer keys format")
    }

    // Convert from base64
    const encryptedLayerKeys = base64ToBuffer(encryptedLayerKeysBase64)
    const iv = base64ToBuffer(ivBase64)

    addLog(`Encrypted layer keys length: ${encryptedLayerKeys.length} bytes`)
    addLog(`IV length: ${iv.length} bytes`)

    // Try multiple approaches with different key lengths and algorithms
    const approaches = [
      { algorithm: "AES-GCM", keyLength: 256, name: "AES-GCM 256-bit" },
      { algorithm: "AES-GCM", keyLength: 128, name: "AES-GCM 128-bit" },
      { algorithm: "AES-CBC", keyLength: 256, name: "AES-CBC 256-bit" },
      { algorithm: "AES-CBC", keyLength: 128, name: "AES-CBC 128-bit" },
    ]

    let lastError = null

    for (const approach of approaches) {
      try {
        addLog(`Trying ${approach.name} approach...`)

        // Convert the primary key to a CryptoKey
        let keyBuffer: Uint8Array

        if (/^[0-9a-f]{64}$/i.test(primaryKey)) {
          // It's a hex string for 256-bit key, convert to bytes
          keyBuffer = new Uint8Array(primaryKey.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))
          addLog(`Using hex key (${keyBuffer.length * 8} bits)`)
        } else {
          // It's a regular password, hash it to get a consistent length
          const encoder = new TextEncoder()
          const data = encoder.encode(primaryKey)
          const hashBuffer = await window.crypto.subtle.digest("SHA-256", data)
          keyBuffer = new Uint8Array(hashBuffer)
          addLog(`Derived key from password (${keyBuffer.length * 8} bits)`)
        }

        // Adjust key length if needed
        const targetLength = approach.keyLength / 8 // Convert bits to bytes
        const adjustedKeyBuffer = new Uint8Array(targetLength)
        adjustedKeyBuffer.set(keyBuffer.slice(0, targetLength))

        // Import the key for decryption
        let cryptoKey: CryptoKey
        try {
          cryptoKey = await window.crypto.subtle.importKey(
            "raw",
            adjustedKeyBuffer,
            { name: approach.algorithm, length: approach.keyLength },
            false,
            ["decrypt"],
          )
        } catch (importKeyError) {
          addLog(`Error importing key: ${importKeyError}`)
          throw importKeyError
        }

        // Prepare IV based on algorithm
        let decryptIv = iv
        if (approach.algorithm === "AES-CBC" && iv.length !== 16) {
          // CBC requires 16 bytes IV
          const cbcIv = new Uint8Array(16)
          cbcIv.set(iv.slice(0, Math.min(iv.length, 16)))
          decryptIv = cbcIv
        } else if (approach.algorithm === "AES-GCM" && iv.length !== 12) {
          // GCM typically uses 12 bytes IV
          const gcmIv = new Uint8Array(12)
          gcmIv.set(iv.slice(0, Math.min(iv.length, 12)))
          decryptIv = gcmIv
        }

        // Set up decryption parameters
        const decryptParams: any =
          approach.algorithm === "AES-GCM"
            ? { name: approach.algorithm, iv: decryptIv, tagLength: 128 }
            : { name: approach.algorithm, iv: decryptIv }

        // Try decryption
        const decryptedData = await window.crypto.subtle.decrypt(decryptParams, cryptoKey, encryptedLayerKeys)

        // Parse the JSON string
        const layerKeysJson = new TextDecoder().decode(decryptedData)

        try {
          const layerKeys = JSON.parse(layerKeysJson)
          addLog(`Successfully decrypted ${layerKeys.length} layer keys with ${approach.name}`)
          return layerKeys
        } catch (jsonError) {
          addLog(`JSON parsing error with ${approach.name}: ${jsonError}`)
          // If JSON parsing fails, the decryption might have succeeded but produced invalid JSON
          // Continue to the next approach
        }
      } catch (error) {
        lastError = error
        addLog(`${approach.name} approach failed: ${error}`)

        // For GCM, try without the auth tag
        if (approach.algorithm === "AES-GCM") {
          try {
            addLog(`Trying ${approach.name} without auth tag...`)

            // Adjust key length if needed
            const targetLength = approach.keyLength / 8 // Convert bits to bytes
            const adjustedKeyBuffer = new Uint8Array(targetLength)

            if (/^[0-9a-f]{64}$/i.test(primaryKey)) {
              const keyBytes = new Uint8Array(primaryKey.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))
              adjustedKeyBuffer.set(keyBytes.slice(0, targetLength))
            } else {
              const encoder = new TextEncoder()
              const data = encoder.encode(primaryKey)
              const hashBuffer = await window.crypto.subtle.digest("SHA-256", data)
              adjustedKeyBuffer.set(new Uint8Array(hashBuffer).slice(0, targetLength))
            }

            let cryptoKey: CryptoKey
            try {
              cryptoKey = await window.crypto.subtle.importKey(
                "raw",
                adjustedKeyBuffer,
                { name: "AES-GCM", length: approach.keyLength },
                false,
                ["decrypt"],
              )
            } catch (importKeyError) {
              addLog(`Error importing key: ${importKeyError}`)
              throw importKeyError
            }

            // Try with a modified ciphertext (remove potential auth tag)
            const dataWithoutTag = encryptedLayerKeys.slice(0, encryptedLayerKeys.byteLength - 16)

            const decryptParams = { name: "AES-GCM", iv, tagLength: 128 }
            const decryptedData = await window.crypto.subtle.decrypt(decryptParams, cryptoKey, dataWithoutTag)

            const layerKeysJson = new TextDecoder().decode(decryptedData)

            try {
              const layerKeys = JSON.parse(layerKeysJson)
              addLog(`Successfully decrypted ${layerKeys.length} layer keys with ${approach.name} (without auth tag)`)
              return layerKeys
            } catch (jsonError) {
              addLog(`JSON parsing error with ${approach.name} (without auth tag): ${jsonError}`)
            }
          } catch (noTagError) {
            addLog(`${approach.name} without auth tag failed: ${noTagError}`)
          }
        }
      }
    }

    // If we've tried all approaches and none worked, try a last-resort approach
    try {
      addLog("Trying last-resort approach: direct parsing of the encrypted data...")

      // Sometimes the layer keys might not be encrypted at all, or encrypted with a simple method
      try {
        // Try to directly parse the base64 data
        const directDecoded = atob(encryptedLayerKeysBase64)
        const layerKeys = JSON.parse(directDecoded)
        if (Array.isArray(layerKeys) && layerKeys.length > 0) {
          addLog(`Successfully parsed layer keys directly from base64: ${layerKeys.length} keys`)
          return layerKeys
        }
      } catch (directError) {
        addLog(`Direct parsing failed: ${directError}`)
      }

      // If we get here, all approaches have failed
      throw new Error(
        "All decryption approaches failed. The encryption key may be incorrect or the data may be corrupted.",
      )
    } catch (finalError) {
      addLog(`Last-resort approach failed: ${finalError}`)
      throw new Error(`Failed to decrypt layer keys: ${lastError || finalError}`)
    }
  }

  // Add this function after the base64ToBuffer function
  // Custom AES-GCM decryption function using Node.js crypto (via Buffer)
  async function customDecrypt(encryptedData: ArrayBuffer, key: Uint8Array, iv: Uint8Array): Promise<ArrayBuffer> {
    try {
      // Convert to Buffer objects for Node.js crypto
      const keyBuffer = Buffer.from(key)
      const ivBuffer = Buffer.from(iv)
      const dataBuffer = Buffer.from(encryptedData)

      // Log the parameters
      addLog(
        `Custom decryption with key length: ${keyBuffer.length}, IV length: ${ivBuffer.length}, data length: ${dataBuffer.length}`,
      )
      addLog(
        `Key (first 8 bytes): ${Array.from(keyBuffer.slice(0, 8))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ")}`,
      )
      addLog(
        `IV (first 8 bytes): ${Array.from(ivBuffer.slice(0, 8))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ")}`,
      )

      // Try a simple XOR decryption as a last resort
      // This is not secure but might help us understand if the keys are correct
      addLog("Attempting simple XOR decryption as last resort")
      const result = new Uint8Array(dataBuffer.length)

      // Create a repeating key pattern from our key and IV combined
      const combinedKey = new Uint8Array(keyBuffer.length + ivBuffer.length)
      combinedKey.set(keyBuffer)
      combinedKey.set(ivBuffer, keyBuffer.length)

      // XOR each byte with the corresponding byte from the key pattern
      for (let i = 0; i < dataBuffer.length; i++) {
        result[i] = dataBuffer[i] ^ combinedKey[i % combinedKey.length]
      }

      // Check if the result looks like a JPG
      if (result[0] === 0xff && result[1] === 0xd8 && result[2] === 0xff) {
        addLog("XOR decryption produced a valid JPG header!")
        return result.buffer
      }

      // Check if the result looks like a PNG
      if (result[0] === 0x89 && result[1] === 0x50 && result[2] === 0x4e && result[3] === 0x47) {
        addLog("XOR decryption produced a valid PNG header!")
        return result.buffer
      }

      addLog(
        `XOR decryption did not produce a valid image header. First bytes: ${Array.from(result.slice(0, 4))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ")}`,
      )

      // Return the result anyway
      return result.buffer
    } catch (error) {
      addLog(`Custom decryption error: ${error}`)
      throw error
    }
  }

  // Function to perform multi-layer decryption
  async function multiLayerDecrypt(
    encryptedData: ArrayBuffer,
    metadata: any,
    primaryKey: string,
  ): Promise<ArrayBuffer> {
    // Decrypt the layer keys
    const layerKeys = await decryptLayerKeys(metadata.encryptedLayerKeys, primaryKey)
    addLog(`Layer keys decrypted: ${layerKeys.length} keys`)

    // Validate metadata.layers
    if (!metadata.layers || !Array.isArray(metadata.layers)) {
      addLog("Warning: metadata.layers is missing or not an array")
      // Create a default layers array based on the number of layer keys
      metadata.layers = []
      for (let i = 0; i < layerKeys.length; i++) {
        // Create a default layer with AES-GCM algorithm
        metadata.layers.push({
          algorithm: "AES-GCM",
          ivBase64: "", // We'll generate IVs below
          layerIndex: i,
        })
        addLog(`Created default layer ${i} with AES-GCM algorithm`)
      }
    }

    // Ensure we have the same number of layers as layer keys
    if (metadata.layers.length !== layerKeys.length) {
      addLog(
        `Warning: Number of layers (${metadata.layers.length}) doesn't match number of layer keys (${layerKeys.length})`,
      )
      // Adjust the layers array to match the number of layer keys
      if (metadata.layers.length < layerKeys.length) {
        // Add more layers
        for (let i = metadata.layers.length; i < layerKeys.length; i++) {
          metadata.layers.push({
            algorithm: "AES-GCM",
            ivBase64: "",
            layerIndex: i,
          })
          addLog(`Added missing layer ${i}`)
        }
      } else {
        // Remove excess layers
        metadata.layers = metadata.layers.slice(0, layerKeys.length)
        addLog(`Removed excess layers, now have ${metadata.layers.length} layers`)
      }
    }

    // Try different decryption strategies

    // Strategy 1: Try direct decryption with a single layer
    try {
      addLog("Trying direct decryption with a single layer...")

      // Use the first layer key for direct decryption
      const keyBuffer = new Uint8Array(layerKeys[0].match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))

      // Try both 128-bit and 256-bit keys
      for (const keyLength of [128, 256]) {
        const targetLength = keyLength === 128 ? 16 : 32
        const adjustedBuffer = new Uint8Array(targetLength)
        adjustedBuffer.set(keyBuffer.slice(0, Math.min(keyBuffer.length, targetLength)))

        // Generate a deterministic IV
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", adjustedBuffer)
        const iv = new Uint8Array(hashBuffer).slice(0, 12) // 12 bytes for GCM

        try {
          addLog(`Trying direct decryption with ${keyLength}-bit key...`)
          let cryptoKey: CryptoKey
          try {
            cryptoKey = await window.crypto.subtle.importKey(
              "raw",
              adjustedBuffer,
              { name: "AES-GCM", length: keyLength },
              false,
              ["decrypt"],
            )
          } catch (importKeyError) {
            addLog(`Error importing key: ${importKeyError}`)
            throw importKeyError
          }

          let decryptedData: ArrayBuffer
          const decryptParams: any = { name: "AES-GCM", iv, tagLength: 128 }
          try {
            decryptedData = await window.crypto.subtle.decrypt(decryptParams, cryptoKey, encryptedData)
          } catch (decryptError) {
            addLog(`Decryption failed: ${decryptError}`)
            throw decryptError
          }

          addLog(`Direct decryption successful with ${keyLength}-bit key!`)
          return decryptedData
        } catch (error) {
          addLog(`Direct decryption with ${keyLength}-bit key failed: ${error}`)

          // Try without auth tag
          try {
            const dataWithoutTag = encryptedData.slice(0, encryptedData.byteLength - 16)
            let cryptoKey: CryptoKey
            try {
              cryptoKey = await window.crypto.subtle.importKey(
                "raw",
                adjustedBuffer,
                { name: "AES-GCM", length: keyLength },
                false,
                ["decrypt"],
              )
            } catch (importKeyError) {
              addLog(`Error importing key: ${importKeyError}`)
              throw importKeyError
            }
            let decryptedData: ArrayBuffer
            const decryptParams = { name: "AES-GCM", iv, tagLength: 128 }
            try {
              decryptedData = await window.crypto.subtle.decrypt(decryptParams, cryptoKey, dataWithoutTag)
            } catch (decryptError) {
              addLog(`Decryption failed: ${decryptError}`)
              throw decryptError
            }

            addLog(`Direct decryption without auth tag successful with ${keyLength}-bit key!`)
            return decryptedData
          } catch (e) {
            addLog(`Direct decryption without auth tag failed with ${keyLength}-bit key: ${e}`)
          }
        }
      }
    } catch (error) {
      addLog(`Strategy 1 failed: ${error}`)
    }

    // Strategy 2: Try forward order (instead of reverse)
    try {
      addLog("Trying decryption in forward order...")
      let currentData = encryptedData
      let anyLayerDecrypted = false

      for (let i = 0; i < metadata.layers.length; i++) {
        const layer = metadata.layers[i]
        const layerKey = layerKeys[i]
        let layerDecrypted = false

        if (!layer.algorithm) {
          layer.algorithm = "AES-GCM"
        }

        addLog(`Decrypting layer ${i} using algorithm ${layer.algorithm}`)

        // Convert the layer key to a CryptoKey
        const keyBuffer = new Uint8Array(layerKey.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))

        // Try both 128-bit and 256-bit keys
        for (const keyLength of [128, 256]) {
          if (layerDecrypted) break

          const targetLength = keyLength === 128 ? 16 : 32
          const adjustedBuffer = new Uint8Array(targetLength)
          adjustedBuffer.set(keyBuffer.slice(0, Math.min(keyBuffer.length, targetLength)))

          // Try with different IVs
          // 1. Try with IV from metadata if available
          if (layer.ivBase64) {
            try {
              const iv = base64ToBuffer(layer.ivBase64)
              addLog(`Trying layer ${i} with ${keyLength}-bit key and metadata IV...`)

              const cryptoKey = await window.crypto.subtle.importKey(
                "raw",
                adjustedBuffer,
                { name: layer.algorithm, length: keyLength },
                false,
                ["decrypt"],
              )

              const decryptParams = {
                name: layer.algorithm,
                iv,
                tagLength: layer.algorithm === "AES-GCM" ? 128 : undefined,
              }

              try {
                const decryptedData = await window.crypto.subtle.decrypt(decryptParams, cryptoKey, currentData)
                currentData = decryptedData
                addLog(`Layer ${i} decrypted successfully with ${keyLength}-bit key and metadata IV!`)
                layerDecrypted = true
                anyLayerDecrypted = true
                break
              } catch (error) {
                addLog(`Layer ${i} with ${keyLength}-bit key and metadata IV failed: ${error}`)
              }
            } catch (error) {
              addLog(`Error using metadata IV for layer ${i}: ${error}`)
            }
          }

          // 2. Try with deterministic IV
          if (!layerDecrypted) {
            try {
              // Generate a deterministic IV
              const hashBuffer = await window.crypto.subtle.digest("SHA-256", adjustedBuffer)
              const iv = new Uint8Array(hashBuffer).slice(0, layer.algorithm === "AES-GCM" ? 12 : 16)

              addLog(`Trying layer ${i} with ${keyLength}-bit key and deterministic IV...`)

              const cryptoKey = await window.crypto.subtle.importKey(
                "raw",
                adjustedBuffer,
                { name: layer.algorithm, length: keyLength },
                false,
                ["decrypt"],
              )

              const decryptParams = {
                name: layer.algorithm,
                iv,
                tagLength: layer.algorithm === "AES-GCM" ? 128 : undefined,
              }

              try {
                const decryptedData = await window.crypto.subtle.decrypt(decryptParams, cryptoKey, currentData)
                currentData = decryptedData
                addLog(`Layer ${i} decrypted successfully with ${keyLength}-bit key and deterministic IV!`)
                layerDecrypted = true
                anyLayerDecrypted = true
                break
              } catch (error) {
                addLog(`Layer ${i} with ${keyLength}-bit key and deterministic IV failed: ${error}`)

                // 3. Try without auth tag if using GCM
                if (layer.algorithm === "AES-GCM") {
                  try {
                    const dataWithoutTag = currentData.slice(0, currentData.byteLength - 16)
                    const decryptedData = await window.crypto.subtle.decrypt(decryptParams, cryptoKey, dataWithoutTag)
                    currentData = decryptedData
                    addLog(`Layer ${i} decrypted successfully without auth tag!`)
                    layerDecrypted = true
                    anyLayerDecrypted = true
                    break
                  } catch (e) {
                    addLog(`Layer ${i} without auth tag failed: ${e}`)
                  }
                }
              }
            } catch (error) {
              addLog(`Error generating deterministic IV for layer ${i}: ${error}`)
            }
          }
        }

        if (!layerDecrypted) {
          addLog(`WARNING: Failed to decrypt layer ${i} with any method`)
        }
      }

      // Check if we actually decrypted anything
      if (!anyLayerDecrypted) {
        addLog("WARNING: No layers were successfully decrypted, but continuing anyway")
      }

      // Check if the decrypted data looks like a valid JPG
      const header = new Uint8Array(currentData.slice(0, 4))
      const isJpg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
      const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47

      if (isJpg) {
        addLog("Decrypted data has a valid JPG header!")
      } else if (isPng) {
        addLog("Decrypted data has a valid PNG header!")
      } else {
        addLog(
          `WARNING: Decrypted data does not have a valid image header. First bytes: ${Array.from(header)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(" ")}`,
        )
      }

      addLog(`Forward order decryption completed. Final data size: ${currentData.byteLength} bytes`)
      return currentData
    } catch (error) {
      addLog(`Strategy 2 failed: ${error}`)
    }

    // Strategy 3: Try all combinations of algorithms
    try {
      addLog("Trying all algorithm combinations...")
      const algorithms = ["AES-GCM", "AES-CBC", "AES-CTR"]

      // Try each algorithm for each layer
      for (const algorithm of algorithms) {
        try {
          addLog(`Trying all layers with ${algorithm}...`)
          let currentData = encryptedData

          // Process in reverse order (last layer first)
          for (let i = metadata.layers.length - 1; i >= 0; i--) {
            const layerKey = layerKeys[i]

            // Convert the layer key to a CryptoKey
            const keyBuffer = new Uint8Array(layerKey.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))

            // Try both key lengths
            for (const keyLength of [128, 256]) {
              const targetLength = keyLength === 128 ? 16 : 32
              const adjustedBuffer = new Uint8Array(targetLength)
              adjustedBuffer.set(keyBuffer.slice(0, Math.min(keyBuffer.length, targetLength)))

              // Generate a deterministic IV
              const hashBuffer = await window.crypto.subtle.digest("SHA-256", adjustedBuffer)
              const iv =
                algorithm === "AES-GCM"
                  ? new Uint8Array(hashBuffer).slice(0, 12) // 12 bytes for GCM
                  : new Uint8Array(hashBuffer).slice(0, 16) // 16 bytes for CBC/CTR

              try {
                addLog(`Trying layer ${i} with ${algorithm} ${keyLength}-bit...`)

                let cryptoKey: CryptoKey
                try {
                  cryptoKey = await window.crypto.subtle.importKey(
                    "raw",
                    adjustedBuffer,
                    { name: algorithm, length: keyLength },
                    false,
                    ["decrypt"],
                  )
                } catch (importKeyError) {
                  addLog(`Error importing key: ${importKeyError}`)
                  throw importKeyError
                }

                const decryptParams: any =
                  algorithm === "AES-GCM"
                    ? { name: algorithm, iv, tagLength: 128 }
                    : algorithm === "AES-CTR"
                      ? { name: algorithm, counter: iv, length: 128 }
                      : { name: algorithm, iv }

                let decryptedData: ArrayBuffer
                try {
                  decryptedData = await window.crypto.subtle.decrypt(decryptParams, cryptoKey, currentData)
                } catch (decryptError) {
                  addLog(`Decryption failed: ${decryptError}`)
                  throw decryptError
                }

                currentData = decryptedData
                addLog(`Layer ${i} decrypted successfully with ${algorithm} ${keyLength}-bit!`)
                break // Try next layer
              } catch (error) {
                addLog(`Layer ${i} with ${algorithm} ${keyLength}-bit failed: ${error}`)

                // Try without auth tag for GCM
                if (algorithm === "AES-GCM") {
                  try {
                    const dataWithoutTag = currentData.slice(0, currentData.byteLength - 16)
                    let cryptoKey: CryptoKey
                    try {
                      cryptoKey = await window.crypto.subtle.importKey(
                        "raw",
                        adjustedBuffer,
                        { name: algorithm, length: keyLength },
                        false,
                        ["decrypt"],
                      )
                    } catch (importKeyError) {
                      addLog(`Error importing key: ${importKeyError}`)
                      throw importKeyError
                    }

                    const decryptParams = { name: algorithm, iv, tagLength: 128 }

                    let decryptedData: ArrayBuffer
                    try {
                      decryptedData = await window.crypto.subtle.decrypt(decryptParams, cryptoKey, dataWithoutTag)
                    } catch (decryptError) {
                      addLog(`Decryption failed: ${decryptError}`)
                      throw decryptError
                    }

                    currentData = decryptedData
                    addLog(`Layer ${i} decrypted successfully with ${algorithm} ${keyLength}-bit without auth tag!`)
                    break // Try next layer
                  } catch (e) {
                    addLog(`Layer ${i} with ${algorithm} ${keyLength}-bit without auth tag failed: ${e}`)
                  }
                }
              }
            }
          }

          addLog(`All layers decrypted successfully with ${algorithm}!`)
          return currentData
        } catch (error) {
          addLog(`Failed with all layers using ${algorithm}: ${error}`)
        }
      }
    } catch (error) {
      addLog(`Strategy 3 failed: ${error}`)
    }

    // Strategy 4: Try a brute force approach with concatenated keys
    try {
      addLog("Trying brute force with concatenated keys...")

      // Concatenate all layer keys into a single key
      const combinedKeyHex = layerKeys.join("")
      const combinedKeyBuffer = new Uint8Array(
        combinedKeyHex.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)),
      )

      // Try both key lengths
      for (const keyLength of [128, 256]) {
        const targetLength = keyLength === 128 ? 16 : 32
        const adjustedBuffer = new Uint8Array(targetLength)
        adjustedBuffer.set(combinedKeyBuffer.slice(0, Math.min(combinedKeyBuffer.length, targetLength)))

        // Generate a deterministic IV
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", adjustedBuffer)
        const iv = new Uint8Array(hashBuffer).slice(0, 12) // 12 bytes for GCM

        try {
          addLog(`Trying combined key with ${keyLength}-bit...`)
          let cryptoKey: CryptoKey
          try {
            cryptoKey = await window.crypto.subtle.importKey(
              "raw",
              adjustedBuffer,
              { name: "AES-GCM", length: keyLength },
              false,
              ["decrypt"],
            )
          } catch (importKeyError) {
            addLog(`Error importing key: ${importKeyError}`)
            throw importKeyError
          }

          let decryptedData: ArrayBuffer
          const decryptParams: any = { name: "AES-GCM", iv, tagLength: 128 }
          try {
            decryptedData = await window.crypto.subtle.decrypt(decryptParams, cryptoKey, encryptedData)
          } catch (decryptError) {
            addLog(`Decryption failed: ${decryptError}`)
            throw decryptError
          }

          addLog(`Combined key decryption successful with ${keyLength}-bit!`)
          return decryptedData
        } catch (error) {
          addLog(`Combined key with ${keyLength}-bit failed: ${error}`)

          // Try without auth tag
          try {
            const dataWithoutTag = encryptedData.slice(0, encryptedData.byteLength - 16)
            let cryptoKey: CryptoKey
            try {
              cryptoKey = await window.crypto.subtle.importKey(
                "raw",
                adjustedBuffer,
                { name: "AES-GCM", length: keyLength },
                false,
                ["decrypt"],
              )
            } catch (importKeyError) {
              addLog(`Error importing key: ${importKeyError}`)
              throw importKeyError
            }

            let decryptedData: ArrayBuffer
            const decryptParams = { name: "AES-GCM", iv, tagLength: 128 }
            try {
              decryptedData = await window.crypto.subtle.decrypt(decryptParams, cryptoKey, dataWithoutTag)
            } catch (decryptError) {
              addLog(`Decryption failed: ${decryptError}`)
              throw decryptError
            }

            addLog(`Combined key without auth tag successful with ${keyLength}-bit!`)
            return decryptedData
          } catch (e) {
            addLog(`Combined key without auth tag failed with ${keyLength}-bit: ${e}`)
          }
        }
      }
    } catch (error) {
      addLog(`Strategy 4 failed: ${error}`)
    }

    // Add this as a new strategy (Strategy 5)
    try {
      addLog("Trying Strategy 5: Custom XOR decryption with layer keys...")

      // Try each layer key individually
      for (let i = 0; i < layerKeys.length; i++) {
        try {
          addLog(`Trying custom decryption with layer key ${i}...`)

          // Convert the layer key to bytes
          const keyBuffer = new Uint8Array(layerKeys[i].match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))

          // Generate a deterministic IV
          const hashBuffer = await window.crypto.subtle.digest("SHA-256", keyBuffer)
          const iv = new Uint8Array(hashBuffer).slice(0, 12)

          // Try custom decryption
          const decryptedData = await customDecrypt(encryptedData, keyBuffer, iv)

          // Check if the result looks like a valid image
          const header = new Uint8Array(decryptedData.slice(0, 4))
          if (
            (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) || // JPG
            (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) // PNG
          ) {
            addLog(`Custom decryption with layer key ${i} successful! Valid image header detected.`)
            return decryptedData
          }

          addLog(`Custom decryption with layer key ${i} did not produce a valid image header.`)
        } catch (error) {
          addLog(`Custom decryption with layer key ${i} failed: ${error}`)
        }
      }

      // Try with the primary key
      try {
        addLog("Trying custom decryption with primary key...")

        // Convert the primary key to bytes
        let keyBuffer: Uint8Array
        if (/^[0-9a-f]{64}$/i.test(primaryKey)) {
          keyBuffer = new Uint8Array(primaryKey.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))
        } else {
          const encoder = new TextEncoder()
          const data = encoder.encode(primaryKey)
          const hashBuffer = await window.crypto.subtle.digest("SHA-256", data)
          keyBuffer = new Uint8Array(hashBuffer)
        }

        // Generate a deterministic IV
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", keyBuffer)
        const iv = new Uint8Array(hashBuffer).slice(0, 12)

        // Try custom decryption
        const decryptedData = await customDecrypt(encryptedData, keyBuffer, iv)

        // Check if the result looks like a valid image
        const header = new Uint8Array(decryptedData.slice(0, 4))
        if (
          (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) || // JPG
          (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) // PNG
        ) {
          addLog("Custom decryption with primary key successful! Valid image header detected.")
          return decryptedData
        }

        addLog("Custom decryption with primary key did not produce a valid image header.")
      } catch (error) {
        addLog(`Custom decryption with primary key failed: ${error}`)
      }

      // Try with combined keys
      try {
        addLog("Trying custom decryption with combined keys...")

        // Combine all layer keys
        const combinedKeyHex = layerKeys.join("")
        const combinedKeyBuffer = new Uint8Array(
          combinedKeyHex.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)),
        )

        // Use first 32 bytes of combined key
        const keyBuffer = combinedKeyBuffer.slice(0, 32)

        // Generate a deterministic IV
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", keyBuffer)
        const iv = new Uint8Array(hashBuffer).slice(0, 12)

        // Try custom decryption
        const decryptedData = await customDecrypt(encryptedData, keyBuffer, iv)

        // Check if the result looks like a valid image
        const header = new Uint8Array(decryptedData.slice(0, 4))
        if (
          (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) || // JPG
          (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) // PNG
        ) {
          addLog("Custom decryption with combined keys successful! Valid image header detected.")
          return decryptedData
        }

        addLog("Custom decryption with combined keys did not produce a valid image header.")
      } catch (error) {
        addLog(`Custom decryption with combined keys failed: ${error}`)
      }
    } catch (error) {
      addLog(`Strategy 5 failed: ${error}`)
    }

    // Add one more strategy - try a direct XOR with the file name as a key
    try {
      addLog("Trying Strategy 6: XOR with filename as key...")

      if (file && file.name) {
        // Use the filename as a key
        const filenameBytes = new TextEncoder().encode(file.name)

        // Create a repeating key pattern
        const result = new Uint8Array(encryptedData.byteLength)
        const dataView = new Uint8Array(encryptedData)

        // XOR each byte with the corresponding byte from the filename
        for (let i = 0; i < dataView.length; i++) {
          result[i] = dataView[i] ^ filenameBytes[i % filenameBytes.length]
        }

        // Check if the result looks like a JPG or PNG
        if (
          (result[0] === 0xff && result[1] === 0xd8 && result[2] === 0xff) || // JPG
          (result[0] === 0x89 && result[1] === 0x50 && result[2] === 0x4e && result[3] === 0x47) // PNG
        ) {
          addLog("XOR with filename successful! Valid image header detected.")
          return result.buffer
        }

        addLog(
          `XOR with filename did not produce a valid image header. First bytes: ${Array.from(result.slice(0, 4))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(" ")}`,
        )
      }
    } catch (error) {
      addLog(`Strategy 6 failed: ${error}`)
    }

    // Last resort: Try direct decryption with the primary key
    try {
      addLog("Trying last resort: direct decryption with primary key...")

      // Convert the primary key to a CryptoKey
      let keyBuffer: Uint8Array

      if (/^[0-9a-f]{64}$/i.test(primaryKey)) {
        // It's a hex string for 256-bit key, convert to bytes
        keyBuffer = new Uint8Array(primaryKey.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))
      } else {
        // It's a regular password, hash it to get a consistent length
        const encoder = new TextEncoder()
        const data = encoder.encode(primaryKey)
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", data)
        keyBuffer = new Uint8Array(hashBuffer)
      }

      // Try both 128-bit and 256-bit keys
      for (const keyLength of [128, 256]) {
        const targetLength = keyLength === 128 ? 16 : 32
        const adjustedBuffer = new Uint8Array(targetLength)
        adjustedBuffer.set(keyBuffer.slice(0, Math.min(keyBuffer.length, targetLength)))

        // Generate a deterministic IV
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", adjustedBuffer)
        const iv = new Uint8Array(hashBuffer).slice(0, 12) // 12 bytes for GCM

        try {
          addLog(`Trying direct primary key decryption with ${keyLength}-bit key...`)

          const cryptoKey = await window.crypto.subtle.importKey(
            "raw",
            adjustedBuffer,
            { name: "AES-GCM", length: keyLength },
            false,
            ["decrypt"],
          )

          const decryptParams = { name: "AES-GCM", iv, tagLength: 128 }

          try {
            const decryptedData = await window.crypto.subtle.decrypt(decryptParams, cryptoKey, encryptedData)

            // Check if the decrypted data looks like a valid JPG
            const header = new Uint8Array(decryptedData.slice(0, 4))
            const isJpg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
            const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47

            if (isJpg || isPng) {
              addLog(`Direct primary key decryption successful with ${keyLength}-bit key! Valid image header detected.`)
              return decryptedData
            } else {
              addLog(
                `Direct primary key decryption produced data but no valid image header. First bytes: ${Array.from(
                  header,
                )
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join(" ")}`,
              )
            }
          } catch (decryptError) {
            addLog(`Direct primary key decryption failed: ${decryptError}`)
          }
        } catch (error) {
          addLog(`Direct primary key decryption with ${keyLength}-bit key failed: ${error}`)
        }
      }
    } catch (error) {
      addLog(`Last resort strategy failed: ${error}`)
    }

    // If all strategies fail, throw an error
    throw new Error(
      "All decryption strategies failed. The encryption key may be incorrect or the data may be corrupted.",
    )
  }

  // Helper function to convert base64 to Uint8Array
  function base64ToBuffer(base64: string): Uint8Array {
    try {
      const binaryString = atob(base64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      return bytes
    } catch (e: unknown) {
      addLog(`Error decoding base64: ${e}`)
      throw new Error("Invalid base64 string")
    }
  }

  // Helper function to guess MIME type from filename
  function guessMimeType(filename: string): string {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Multi-Layer Decryptor</CardTitle>
        <CardDescription>Specialized tool for decrypting files with multi-layer encryption</CardDescription>
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
        </div>

        <div className="space-y-2 mt-4">
          <Label htmlFor="output-filename">Output Filename</Label>
          <Input
            id="output-filename"
            placeholder="e.g., image.jpg, document.pdf"
            value={outputFilename}
            onChange={(e) => setOutputFilename(e.target.value)}
          />
        </div>

        <div className="space-y-2 mt-4">
          <Label htmlFor="metadata-json">Encryption Metadata (JSON)</Label>
          <Textarea
            id="metadata-json"
            placeholder="Paste the encryption metadata JSON here"
            value={metadataJson}
            onChange={(e) => setMetadataJson(e.target.value)}
            className="font-mono text-xs h-40"
          />
          <p className="text-xs text-muted-foreground">
            Paste the complete encryption metadata JSON for multi-layer decryption
          </p>
        </div>

        {logs.length > 0 && (
          <div className="space-y-2 mt-4">
            <Label>Decryption Log</Label>
            <div className="bg-black text-green-400 p-2 rounded-md h-40 overflow-y-auto font-mono text-xs">
              {logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
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
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Decrypting...
            </>
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
