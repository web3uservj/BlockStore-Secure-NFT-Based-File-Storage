/**
 * Simplified encryption utilities for blockchain file storage
 */

// Supported encryption algorithm - we'll use just one reliable method
export const ENCRYPTION_ALGORITHM = "AES-GCM"

// Type for encryption metadata
export type EncryptionMetadata = {
  iv: string // Initialization vector (base64)
  algorithm: string
  originalFileName?: string
  originalFileSize?: string
  originalFileType?: string
  encryptionTimestamp?: string
}

/**
 * Generate a secure encryption key
 */
export function generateEncryptionKey(): string {
  // Generate 16 random bytes (128 bits) for AES-128
  const keyBytes = window.crypto.getRandomValues(new Uint8Array(16))
  // Convert to hex string for storage
  return Array.from(keyBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Encrypt a file using AES-GCM
 */
export async function encryptFile(
  file: File,
  encryptionKey: string,
): Promise<{ encryptedFile: File; metadata: EncryptionMetadata }> {
  try {
    // Check file size before encryption
    const MAX_ENCRYPTION_SIZE = 15 * 1024 * 1024 // 15MB
    if (file.size > MAX_ENCRYPTION_SIZE) {
      throw new Error(`File is too large for encryption. Maximum size is ${MAX_ENCRYPTION_SIZE / (1024 * 1024)}MB.`)
    }

    // Read the file as an ArrayBuffer
    const fileBuffer = await file.arrayBuffer()

    // Convert the hex key to bytes
    const keyBytes = new Uint8Array(encryptionKey.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))

    // Generate a random IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12)) // 12 bytes for GCM

    // Import the key
    const key = await window.crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: ENCRYPTION_ALGORITHM, length: 128 },
      false,
      ["encrypt"],
    )

    // Encrypt the file
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: ENCRYPTION_ALGORITHM,
        iv,
        tagLength: 128,
      },
      key,
      fileBuffer,
    )

    // Create a new file with the encrypted data
    const encryptedFile = new File([encryptedBuffer], `${file.name}.enc`, {
      type: "application/octet-stream",
      lastModified: file.lastModified,
    })

    // Create metadata
    const metadata: EncryptionMetadata = {
      algorithm: ENCRYPTION_ALGORITHM,
      iv: bufferToBase64(iv),
      originalFileName: file.name,
      originalFileSize: String(file.size),
      originalFileType: file.type,
      encryptionTimestamp: new Date().toISOString(),
    }

    return { encryptedFile, metadata }
  } catch (error) {
    console.error("Encryption error:", error)
    throw new Error(`Failed to encrypt file: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Decrypt a file using AES-GCM
 */
export async function decryptFile(
  encryptedFile: File | Blob,
  metadata: EncryptionMetadata,
  encryptionKey: string,
): Promise<File> {
  try {
    // Validate required metadata
    if (!metadata.iv) {
      throw new Error("Missing IV in encryption metadata. Cannot decrypt without initialization vector.")
    }

    // Convert the hex key to bytes
    const keyBytes = new Uint8Array(encryptionKey.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))

    // Convert base64 IV back to Uint8Array
    const iv = base64ToBuffer(metadata.iv)

    // Import the key
    const key = await window.crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: ENCRYPTION_ALGORITHM, length: 128 },
      false,
      ["decrypt"],
    )

    // Read the encrypted file
    const encryptedBuffer = await encryptedFile.arrayBuffer()

    // Decrypt the file
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: ENCRYPTION_ALGORITHM,
        iv,
        tagLength: 128,
      },
      key,
      encryptedBuffer,
    )

    // Determine the output filename and type
    const fileName =
      metadata.originalFileName ||
      (encryptedFile instanceof File ? encryptedFile.name.replace(/\.enc$/, "") : "decrypted-file")
    const mimeType = metadata.originalFileType || guessMimeType(fileName) || "application/octet-stream"

    // Create a new file with the decrypted data
    return new File([decryptedBuffer], fileName, {
      type: mimeType,
      lastModified: Date.now(),
    })
  } catch (error) {
    console.error("Decryption error:", error)
    throw new Error(`Failed to decrypt file: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Convert a Uint8Array to a base64 string
 */
export function bufferToBase64(buffer: Uint8Array): string {
  return btoa(
    Array.from(buffer)
      .map((byte) => String.fromCharCode(byte))
      .join(""),
  )
}

/**
 * Convert a base64 string to a Uint8Array
 */
export function base64ToBuffer(base64: string): Uint8Array {
  try {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
  } catch (error) {
    console.error("Error converting base64 to buffer:", error)
    throw new Error("Invalid base64 string")
  }
}

/**
 * Try to guess the MIME type from a filename
 */
export function guessMimeType(filename: string): string {
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
