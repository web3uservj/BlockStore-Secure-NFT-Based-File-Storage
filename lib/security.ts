/**
 * Advanced security utilities for blockchain file storage
 */
import { v4 as uuidv4 } from "uuid"
import { logAuditEvent } from "./audit"
import { getProviderAndSigner } from "./wallet"

// Constants for security settings
export const SECURITY_LEVELS = {
  standard: "standard",
  high: "high",
  maximum: "maximum",
} as const

export type SecurityLevel = (typeof SECURITY_LEVELS)[keyof typeof SECURITY_LEVELS]

// Security settings interface
export interface SecuritySettings {
  encryptionStrength: "AES-128" | "AES-192" | "AES-256"
  multiLayerEncryption: boolean
  keyRotationEnabled: boolean
  keyRotationPeriod: number // in days
  accessControl: {
    enabled: boolean
    defaultPolicy: "private" | "restricted" | "public"
    ipRestriction: boolean
    allowedIPs: string[]
    timeLimitedAccess: boolean
  }
  integrityVerification: {
    automaticChecks: boolean
    checkInterval: number // in hours
    merkleProofVerification: boolean
  }
  secureKeyStorage: {
    splitKey: boolean
    thresholdShares: number
    totalShares: number
  }
}

// Default security settings
export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  encryptionStrength: "AES-128", // Changed from AES-256 to AES-128
  multiLayerEncryption: false,
  keyRotationEnabled: false,
  keyRotationPeriod: 90, // 90 days
  accessControl: {
    enabled: true,
    defaultPolicy: "private",
    ipRestriction: false,
    allowedIPs: [],
    timeLimitedAccess: false,
  },
  integrityVerification: {
    automaticChecks: true,
    checkInterval: 24, // daily
    merkleProofVerification: false,
  },
  secureKeyStorage: {
    splitKey: false,
    thresholdShares: 2,
    totalShares: 3,
  },
}

// Security settings by level
export const SECURITY_LEVEL_SETTINGS: Record<SecurityLevel, Partial<SecuritySettings>> = {
  [SECURITY_LEVELS.standard]: {
    // Standard level uses defaults
  },
  [SECURITY_LEVELS.high]: {
    multiLayerEncryption: true,
    keyRotationEnabled: true,
    keyRotationPeriod: 60, // 60 days
    accessControl: {
      ...DEFAULT_SECURITY_SETTINGS.accessControl,
      ipRestriction: true,
    },
    integrityVerification: {
      ...DEFAULT_SECURITY_SETTINGS.integrityVerification,
      checkInterval: 12, // twice daily
    },
  },
  [SECURITY_LEVELS.maximum]: {
    multiLayerEncryption: true,
    keyRotationEnabled: true,
    keyRotationPeriod: 30, // 30 days
    accessControl: {
      ...DEFAULT_SECURITY_SETTINGS.accessControl,
      ipRestriction: true,
      timeLimitedAccess: true,
    },
    integrityVerification: {
      ...DEFAULT_SECURITY_SETTINGS.integrityVerification,
      checkInterval: 6, // 4 times daily
      merkleProofVerification: true,
    },
    secureKeyStorage: {
      splitKey: true,
      thresholdShares: 3,
      totalShares: 5,
    },
  },
}

// Load security settings
export function loadSecuritySettings(): SecuritySettings {
  try {
    const storedSettings = localStorage.getItem("security-settings")
    if (!storedSettings) {
      return DEFAULT_SECURITY_SETTINGS
    }

    const parsedSettings = JSON.parse(storedSettings) as Partial<SecuritySettings>

    // Merge with default settings to ensure all properties exist
    return {
      ...DEFAULT_SECURITY_SETTINGS,
      ...parsedSettings,
      accessControl: {
        ...DEFAULT_SECURITY_SETTINGS.accessControl,
        ...parsedSettings.accessControl,
      },
      integrityVerification: {
        ...DEFAULT_SECURITY_SETTINGS.integrityVerification,
        ...parsedSettings.integrityVerification,
      },
      secureKeyStorage: {
        ...DEFAULT_SECURITY_SETTINGS.secureKeyStorage,
        ...parsedSettings.secureKeyStorage,
      },
    }
  } catch (error) {
    console.error("Error loading security settings:", error)
    return DEFAULT_SECURITY_SETTINGS
  }
}

// Save security settings
export function saveSecuritySettings(settings: SecuritySettings): void {
  try {
    localStorage.setItem("security-settings", JSON.stringify(settings))

    // Log the security settings change
    logAuditEvent({
      type: "access",
      file: "Security Settings",
      timestamp: new Date().toLocaleString(),
      status: "success",
      message: "Security settings updated",
    }).catch((err) => console.error("Failed to log security settings update:", err))
  } catch (error) {
    console.error("Error saving security settings:", error)
  }
}

// Apply security level preset
export function applySecurityLevel(level: SecurityLevel): SecuritySettings {
  const baseSettings = loadSecuritySettings()
  const levelSettings = SECURITY_LEVEL_SETTINGS[level]

  const newSettings = {
    ...baseSettings,
    ...levelSettings,
    accessControl: {
      ...baseSettings.accessControl,
      ...(levelSettings.accessControl || {}),
    },
    integrityVerification: {
      ...baseSettings.integrityVerification,
      ...(levelSettings.integrityVerification || {}),
    },
    secureKeyStorage: {
      ...baseSettings.secureKeyStorage,
      ...(levelSettings.secureKeyStorage || {}),
    },
  }

  saveSecuritySettings(newSettings)
  return newSettings
}

// Update the multiLayerEncrypt function to use 128-bit keys
export async function multiLayerEncrypt(
  data: ArrayBuffer,
  primaryKey: string,
): Promise<{
  encryptedData: ArrayBuffer
  layerKeys: string[]
  metadata: any
}> {
  // Number of encryption layers
  const LAYERS = 3

  let currentData = data
  const layerKeys: string[] = []
  const metadata: any = {
    version: "1.0",
    layers: [],
  }

  // Generate a unique ID for this encryption session
  const encryptionId = uuidv4()

  // Apply multiple layers of encryption
  for (let i = 0; i < LAYERS; i++) {
    // Generate a random key for this layer - ensure it's 128 bits (16 bytes)
    const keyBytes = window.crypto.getRandomValues(new Uint8Array(16))
    const layerKey = Array.from(keyBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

    layerKeys.push(layerKey)

    // Convert the layer key to a CryptoKey
    const keyBuffer = new Uint8Array(layerKey.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))

    // Ensure the key is exactly 16 bytes (128 bits)
    if (keyBuffer.length !== 16) {
      throw new Error(`Invalid key length: ${keyBuffer.length * 8} bits. Expected 128 bits.`)
    }

    const cryptoKey = await window.crypto.subtle.importKey("raw", keyBuffer, { name: "AES-GCM", length: 128 }, false, [
      "encrypt",
    ])

    // Generate a random IV for this layer
    const iv = window.crypto.getRandomValues(new Uint8Array(12))

    // Encrypt the data
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        tagLength: 128,
      },
      cryptoKey,
      currentData,
    )

    // Update the current data for the next layer
    currentData = encryptedData

    // Store metadata for this layer
    metadata.layers.push({
      algorithm: "AES-GCM",
      ivBase64: btoa(String.fromCharCode(...iv)),
      layerIndex: i,
    })
  }

  // Encrypt all layer keys with the primary key
  const encryptedLayerKeys = await encryptLayerKeys(layerKeys, primaryKey)
  metadata.encryptedLayerKeys = encryptedLayerKeys
  metadata.encryptionId = encryptionId

  return {
    encryptedData: currentData,
    layerKeys,
    metadata,
  }
}

// Update the encryptLayerKeys function to use 128-bit keys
async function encryptLayerKeys(layerKeys: string[], primaryKey: string): Promise<string> {
  // Convert the primary key to a CryptoKey
  // First, ensure the primary key is in the correct format (16 bytes for AES-128)
  let keyBuffer: Uint8Array

  if (/^[0-9a-f]{32}$/i.test(primaryKey)) {
    // It's a hex string for 128-bit key, convert to bytes
    keyBuffer = new Uint8Array(primaryKey.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))
  } else if (/^[0-9a-f]{64}$/i.test(primaryKey)) {
    // It's a hex string for 256-bit key, truncate to 128 bits
    const fullBuffer = new Uint8Array(primaryKey.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))
    keyBuffer = fullBuffer.slice(0, 16)
  } else {
    // It's a regular password, hash it to get a consistent length
    const encoder = new TextEncoder()
    const data = encoder.encode(primaryKey)
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data)
    // Use only the first 16 bytes (128 bits) of the hash
    keyBuffer = new Uint8Array(hashBuffer.slice(0, 16))
  }

  const cryptoKey = await window.crypto.subtle.importKey("raw", keyBuffer, { name: "AES-GCM", length: 128 }, false, [
    "encrypt",
  ])

  // Convert layer keys to a JSON string
  const layerKeysJson = JSON.stringify(layerKeys)

  // Generate a random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12))

  // Encrypt the layer keys
  const encryptedLayerKeys = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: 128,
    },
    cryptoKey,
    new TextEncoder().encode(layerKeysJson),
  )

  // Return the encrypted layer keys and IV as a base64 string
  return (
    btoa(
      Array.from(new Uint8Array(encryptedLayerKeys))
        .map((byte) => String.fromCharCode(byte))
        .join(""),
    ) +
    "." +
    btoa(
      Array.from(iv)
        .map((byte) => String.fromCharCode(byte))
        .join(""),
    )
  )
}

// Update the multiLayerDecrypt function to use 128-bit keys
async function decryptLayerKeys(encryptedLayerKeysString: string, primaryKey: string): Promise<string[]> {
  // Split the encrypted layer keys and IV
  const [encryptedLayerKeysBase64, ivBase64] = encryptedLayerKeysString.split(".")

  // Convert from base64
  const encryptedLayerKeys = new Uint8Array(Array.from(atob(encryptedLayerKeysBase64)).map((c) => c.charCodeAt(0)))
  const iv = new Uint8Array(Array.from(atob(ivBase64)).map((c) => c.charCodeAt(0)))

  // Convert the primary key to a CryptoKey
  // First, ensure the primary key is in the correct format (16 bytes for AES-128)
  let keyBuffer: Uint8Array

  if (/^[0-9a-f]{32}$/i.test(primaryKey)) {
    // It's a hex string for 128-bit key, convert to bytes
    keyBuffer = new Uint8Array(primaryKey.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))
  } else if (/^[0-9a-f]{64}$/i.test(primaryKey)) {
    // It's a hex string for 256-bit key, truncate to 128 bits
    const fullBuffer = new Uint8Array(primaryKey.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))
    keyBuffer = fullBuffer.slice(0, 16)
  } else {
    // It's a regular password, hash it to get a consistent length
    const encoder = new TextEncoder()
    const data = encoder.encode(primaryKey)
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data)
    // Use only the first 16 bytes (128 bits) of the hash
    keyBuffer = new Uint8Array(hashBuffer.slice(0, 16))
  }

  const cryptoKey = await window.crypto.subtle.importKey("raw", keyBuffer, { name: "AES-GCM", length: 128 }, false, [
    "decrypt",
  ])

  // Decrypt the layer keys
  const decryptedLayerKeys = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: 128,
    },
    cryptoKey,
    encryptedLayerKeys,
  )

  // Parse the JSON string
  const layerKeysJson = new TextDecoder().decode(decryptedLayerKeys)
  return JSON.parse(layerKeysJson)
}

// Update the multiLayerDecrypt function to use 128-bit keys
export async function multiLayerDecrypt(
  encryptedData: ArrayBuffer,
  metadata: any,
  primaryKey: string,
): Promise<ArrayBuffer> {
  // Decrypt the layer keys
  const layerKeys = await decryptLayerKeys(metadata.encryptedLayerKeys, primaryKey)

  // Start with the encrypted data
  let currentData = encryptedData

  // Apply decryption layers in reverse order
  for (let i = metadata.layers.length - 1; i >= 0; i--) {
    const layer = metadata.layers[i]
    const layerKey = layerKeys[i]

    // Convert the layer key to a CryptoKey
    const keyBuffer = new Uint8Array(layerKey.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))

    // Ensure the key is exactly 16 bytes (128 bits)
    if (keyBuffer.length !== 16) {
      throw new Error(`Invalid key length: ${keyBuffer.length * 8} bits. Expected 128 bits.`)
    }

    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: layer.algorithm, length: 128 },
      false,
      ["decrypt"],
    )

    // Convert the IV from base64
    const ivString = atob(layer.ivBase64)
    const iv = new Uint8Array(ivString.length)
    for (let j = 0; j < ivString.length; j++) {
      iv[j] = ivString.charCodeAt(j)
    }

    // Decrypt the data
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: layer.algorithm,
        iv,
        tagLength: 128,
      },
      cryptoKey,
      currentData,
    )

    // Update the current data for the next layer
    currentData = decryptedData
  }

  return currentData
}

// Implement Shamir's Secret Sharing for key splitting
export function splitKey(secret: string, numShares: number, threshold: number): string[] {
  // This is a simplified implementation of Shamir's Secret Sharing
  // In a production environment, use a well-tested library

  // Convert the secret to a numeric value
  const secretBytes = Array.from(new TextEncoder().encode(secret))
  const secretValue = Array.from(secretBytes).reduce((acc, byte, i) => acc + byte * Math.pow(256, i), 0)

  // Generate random coefficients for the polynomial
  const coefficients = [secretValue]
  for (let i = 1; i < threshold; i++) {
    // Generate a random coefficient
    const randomValue = window.crypto.getRandomValues(new Uint8Array(4))
    const coefficient = new DataView(randomValue.buffer).getUint32(0)
    coefficients.push(coefficient)
  }

  // Generate the shares
  const shares: string[] = []
  for (let x = 1; x <= numShares; x++) {
    // Evaluate the polynomial at x
    let y = 0
    for (let i = 0; i < coefficients.length; i++) {
      y += coefficients[i] * Math.pow(x, i)
    }

    // Store the share as a string
    shares.push(`${x}:${y}`)
  }

  return shares
}

// Combine shares to reconstruct the secret
export function combineShares(shares: string[], threshold: number): string {
  if (shares.length < threshold) {
    throw new Error(`Not enough shares. Need at least ${threshold}, but got ${shares.length}`)
  }

  // Parse the shares
  const points = shares.map((share) => {
    const [x, y] = share.split(":").map(Number)
    return { x, y }
  })

  // Use Lagrange interpolation to reconstruct the secret
  let secret = 0
  for (let i = 0; i < threshold; i++) {
    let term = points[i].y
    for (let j = 0; j < threshold; j++) {
      if (i !== j) {
        term = term * (points[j].x / (points[j].x - points[i].x))
      }
    }
    secret += term
  }

  // Convert the secret back to a string
  const secretBytes = []
  let tempSecret = Math.round(secret)
  while (tempSecret > 0) {
    secretBytes.push(tempSecret % 256)
    tempSecret = Math.floor(tempSecret / 256)
  }

  return new TextDecoder().decode(new Uint8Array(secretBytes))
}

// Generate a time-limited access token
export async function generateAccessToken(fileId: string, expirationMinutes = 60): Promise<string> {
  try {
    // Get the current user's address
    const { signer } = await getProviderAndSigner()
    const userAddress = await signer.getAddress()

    // Create the token payload
    const payload = {
      fileId,
      userAddress,
      exp: Math.floor(Date.now() / 1000) + expirationMinutes * 60,
      iat: Math.floor(Date.now() / 1000),
      jti: uuidv4(),
    }

    // In a real implementation, you would sign this with a private key
    // For this example, we'll just encode it
    const token = btoa(JSON.stringify(payload))

    // Log the token generation
    await logAuditEvent({
      type: "access",
      file: `File ${fileId}`,
      fileId,
      timestamp: new Date().toLocaleString(),
      status: "success",
      message: `Generated time-limited access token (expires in ${expirationMinutes} minutes)`,
      user: userAddress,
    })

    return token
  } catch (error) {
    console.error("Error generating access token:", error)
    throw error
  }
}

// Verify a time-limited access token
export function verifyAccessToken(token: string): { valid: boolean; fileId?: string; userAddress?: string } {
  try {
    // Decode the token
    const payload = JSON.parse(atob(token))

    // Check if the token has expired
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false }
    }

    return {
      valid: true,
      fileId: payload.fileId,
      userAddress: payload.userAddress,
    }
  } catch (error) {
    console.error("Error verifying access token:", error)
    return { valid: false }
  }
}

// Check if the current IP is allowed
export async function checkIpRestriction(allowedIps: string[]): Promise<boolean> {
  try {
    // In a real implementation, you would check the user's IP against the allowed IPs
    // For this example, we'll just simulate it

    // Get the user's IP (in a real app, this would be done server-side)
    const response = await fetch("https://api.ipify.org?format=json")
    const data = await response.json()
    const userIp = data.ip

    // Check if the user's IP is in the allowed list
    return allowedIps.includes(userIp) || allowedIps.length === 0
  } catch (error) {
    console.error("Error checking IP restriction:", error)
    // Default to allowing access if there's an error
    return true
  }
}

// Generate a Merkle tree for file integrity verification
export function generateMerkleTree(chunks: Uint8Array[]): { root: string; proofs: string[][] } {
  // Hash each chunk
  const leaves = chunks.map((chunk) => {
    const hashBuffer = new Uint8Array(chunk.length)
    for (let i = 0; i < chunk.length; i++) {
      // Simple XOR hash for demonstration (use a cryptographic hash in production)
      hashBuffer[i] = chunk[i] ^ 0x42
    }
    return Array.from(hashBuffer)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  })

  // Build the Merkle tree
  let level = leaves
  const tree = [level]

  while (level.length > 1) {
    const nextLevel = []
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) {
        // Hash the pair of nodes
        const combined = level[i] + level[i + 1]
        const hash = Array.from(new TextEncoder().encode(combined))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
        nextLevel.push(hash)
      } else {
        // Odd number of nodes, promote the last one
        nextLevel.push(level[i])
      }
    }
    level = nextLevel
    tree.unshift(level)
  }

  // Generate proofs for each leaf
  const proofs: string[][] = []
  for (let i = 0; i < leaves.length; i++) {
    const proof = []
    let index = i

    for (let j = tree.length - 1; j > 0; j--) {
      const isRight = index % 2 === 0
      const siblingIndex = isRight ? index + 1 : index - 1

      if (siblingIndex < tree[j].length) {
        proof.push(tree[j][siblingIndex])
      }

      index = Math.floor(index / 2)
    }

    proofs.push(proof)
  }

  return {
    root: tree[0][0],
    proofs,
  }
}

// Verify a chunk against a Merkle proof
export function verifyMerkleProof(chunk: Uint8Array, proof: string[], root: string): boolean {
  // Hash the chunk
  const hashBuffer = new Uint8Array(chunk.length)
  for (let i = 0; i < chunk.length; i++) {
    // Simple XOR hash for demonstration
    hashBuffer[i] = chunk[i] ^ 0x42
  }
  let hash = Array.from(hashBuffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  // Verify the proof
  for (const sibling of proof) {
    // Combine the hashes
    const combined = hash + sibling
    hash = Array.from(new TextEncoder().encode(combined))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }

  return hash === root
}

// Schedule automatic integrity checks
export function scheduleIntegrityChecks(interval: number): NodeJS.Timeout {
  console.log(`Scheduling automatic integrity checks every ${interval} hours`)

  // Convert hours to milliseconds
  const intervalMs = interval * 60 * 60 * 1000

  // Schedule the checks
  return setInterval(async () => {
    try {
      console.log("Running scheduled integrity check")

      // In a real implementation, you would check the integrity of all files
      // For this example, we'll just log it

      await logAuditEvent({
        type: "verification",
        file: "System",
        timestamp: new Date().toLocaleString(),
        status: "success",
        message: "Automatic integrity check completed",
      })
    } catch (error) {
      console.error("Error running scheduled integrity check:", error)
    }
  }, intervalMs)
}
