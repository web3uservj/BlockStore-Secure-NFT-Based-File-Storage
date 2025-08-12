/**
 * This file contains utilities for storing file-related metadata locally
 */

// Store a transaction hash for a file
export function storeFileTransactionHash(fileId: number, txHash: string): void {
    try {
      // Get existing hashes
      const storedHashes = localStorage.getItem("file-tx-hashes") || "{}"
      const hashes = JSON.parse(storedHashes)
  
      // Add new hash
      hashes[fileId.toString()] = txHash
  
      // Save back to localStorage
      localStorage.setItem("file-tx-hashes", JSON.stringify(hashes))
    } catch (error) {
      console.error("Error storing file transaction hash:", error)
    }
  }
  
  // Get transaction hash for a file
  export function getFileTransactionHash(fileId: number): string | null {
    try {
      const storedHashes = localStorage.getItem("file-tx-hashes")
      if (!storedHashes) return null
  
      const hashes = JSON.parse(storedHashes)
      return hashes[fileId.toString()] || null
    } catch (error) {
      console.error("Error getting file transaction hash:", error)
      return null
    }
  }
  
  // Store encryption metadata for a file
  export function storeFileEncryptionMetadata(ipfsHash: string, metadata: any): void {
    try {
      const existingData = localStorage.getItem("encryption-metadata") || "{}"
      const parsedData = JSON.parse(existingData)
      parsedData[ipfsHash] = metadata
      localStorage.setItem("encryption-metadata", JSON.stringify(parsedData))
    } catch (error) {
      console.error("Error storing encryption metadata:", error)
    }
  }
  
  // Get encryption metadata for a file
  export function getFileEncryptionMetadata(ipfsHash: string): any | null {
    try {
      const storedData = localStorage.getItem("encryption-metadata")
      if (!storedData) return null
  
      const parsedData = JSON.parse(storedData)
      return parsedData[ipfsHash] || null
    } catch (error) {
      console.error("Error getting encryption metadata:", error)
      return null
    }
  }
  
  