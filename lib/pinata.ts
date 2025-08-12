/**
 * This file contains functions for interacting with Pinata Cloud IPFS service
 */

// Function to upload a file to IPFS via Pinata using our API route
export async function uploadToPinata(file: File): Promise<{ ipfsHash: string; pinSize: number; timestamp: string }> {
  try {
    // Create form data
    const formData = new FormData()
    formData.append("file", file)

    // Use our server-side API route instead of calling Pinata directly
    const response = await fetch("/api/pinata-upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Error response from API route:", errorData)
      throw new Error(`Error uploading to Pinata: ${errorData}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || "Unknown error uploading to Pinata")
    }

    return {
      ipfsHash: data.ipfsHash,
      pinSize: data.pinSize,
      timestamp: data.timestamp,
    }
  } catch (error) {
    console.error("Error in uploadToPinata:", error)
    throw error
  }
}

// Function to get IPFS gateway URL for a file
export function getIPFSGatewayURL(ipfsHash: string): string {
  // You can use Pinata's gateway or any public IPFS gateway
  return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
}
