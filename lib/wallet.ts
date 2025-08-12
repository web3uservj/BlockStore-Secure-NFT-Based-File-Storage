/**
 * This file contains functions for wallet connection and management
 */
import { ethers } from "ethers"

// Base Sepolia network configuration
const BASE_SEPOLIA = {
  chainId: "0x14a34", // 84532 in decimal
  chainName: "Base Sepolia",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia.basescan.org"],
}

// Function to check if MetaMask is installed
export function isMetaMaskInstalled(): boolean {
  return typeof window !== "undefined" && window.ethereum !== undefined
}

// Function to connect wallet
export async function connectWallet() {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed. Please install MetaMask to use this application.")
  }

  try {
    // Request account access - using non-null assertion since we checked above
    const accounts = await window.ethereum!.request({ method: "eth_requestAccounts" })

    // Get the connected chain ID
    const chainId = await window.ethereum!.request({ method: "eth_chainId" })

    return {
      address: accounts[0],
      chainId: Number.parseInt(chainId as string, 16),
    }
  } catch (error) {
    console.error("Error connecting to MetaMask:", error)
    throw error
  }
}

// Function to disconnect wallet (for UI purposes only, MetaMask doesn't support programmatic disconnection)
export async function disconnectWallet() {
  // This is just for UI state management
  // MetaMask doesn't support programmatic disconnection
  return true
}

// Function to get wallet information
export async function getWalletInfo() {
  if (!isMetaMaskInstalled()) {
    return {
      isConnected: false,
      address: "",
      chainId: null,
    }
  }

  try {
    // Check if already connected - using non-null assertion since we checked above
    const accounts = await window.ethereum!.request({ method: "eth_accounts" })
    const isConnected = accounts.length > 0

    if (!isConnected) {
      return {
        isConnected: false,
        address: "",
        chainId: null,
      }
    }

    // Get current chain ID
    const chainId = await window.ethereum!.request({ method: "eth_chainId" })

    return {
      isConnected: true,
      address: accounts[0],
      chainId: Number.parseInt(chainId as string, 16),
    }
  } catch (error) {
    console.error("Error getting wallet info:", error)
    return {
      isConnected: false,
      address: "",
      chainId: null,
    }
  }
}

// Function to switch to Base Sepolia network
export async function switchToBaseSepolia() {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed")
  }

  try {
    // Try to switch to Base Sepolia - using non-null assertion since we checked above
    await window.ethereum!.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_SEPOLIA.chainId }],
    })
  } catch (error: any) {
    // If the error code is 4902, the chain hasn't been added to MetaMask
    if (error.code === 4902) {
      try {
        // Add Base Sepolia network to MetaMask
        await window.ethereum!.request({
          method: "wallet_addEthereumChain",
          params: [BASE_SEPOLIA],
        })
      } catch (addError) {
        console.error("Error adding Base Sepolia network:", addError)
        throw addError
      }
    } else {
      console.error("Error switching to Base Sepolia network:", error)
      throw error
    }
  }
}

// Function to get ethers provider and signer
export async function getProviderAndSigner() {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed")
  }

  // Create a provider with proper type assertion
  const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
  const signer = provider.getSigner()
  return { provider, signer }
}

