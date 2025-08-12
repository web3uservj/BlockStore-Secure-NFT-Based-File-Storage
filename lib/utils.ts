import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { ethers } from "ethers"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function getUserFiles(): Promise<number[]> {
  console.warn("getUserFiles is a stub.")
  return []
}

export async function getFileDetails(fileId: number): Promise<any> {
  console.warn("getFileDetails is a stub.")
  return {
    id: fileId,
    name: `File ${fileId} (unavailable)`,
    ipfsHash: "",
    size: "0",
    type: "unknown",
    metadata: "",
    timestamp: new Date().toISOString(),
    owner: "0x0000000000000000000000000000000000000000",
  }
}

export async function getProviderAndSigner() {
  if (typeof window === "undefined" || !window.ethereum) {
    console.warn("No ethereum provider found")
    return {
      provider: null,
      signer: null,
    }
  }

  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()
    return { provider, signer }
  } catch (error) {
    console.error("Error getting provider and signer:", error)
    return {
      provider: null,
      signer: null,
    }
  }
}

