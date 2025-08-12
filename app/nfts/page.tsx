"use client"

import { NFTGallery } from "@/components/nft-gallery"
import { getProviderAndSigner } from "@/lib/wallet"
import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NFTsPage() {
  const [isConnected, setIsConnected] = useState(false)
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Base Sepolia Chain ID
  const BASE_SEPOLIA_CHAIN_ID = 84532

  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        const { signer, provider } = await getProviderAndSigner()
        const address = await signer.getAddress()
        setIsConnected(!!address)

        const network = await provider.getNetwork()
        setIsCorrectNetwork(network.chainId === BASE_SEPOLIA_CHAIN_ID)
      } catch (error) {
        console.error("Error checking wallet connection:", error)
        setIsConnected(false)
        setIsCorrectNetwork(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkWalletConnection()
  }, [])

  const handleSwitchNetwork = async () => {
    try {
      // Request network switch
      if (typeof window !== "undefined" && window.ethereum) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${BASE_SEPOLIA_CHAIN_ID.toString(16)}` }],
        })
      } else {
        console.error("MetaMask is not installed")
        throw new Error("MetaMask is not installed")
      }

      // Refresh connection status
      const { provider } = await getProviderAndSigner()
      const network = await provider.getNetwork()
      setIsCorrectNetwork(network.chainId === BASE_SEPOLIA_CHAIN_ID)
    } catch (error) {
      console.error("Error switching network:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="container py-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">NFT Gallery</h1>
        <p className="text-muted-foreground mb-6">Loading...</p>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold tracking-tight mb-2">NFT Gallery</h1>
      <p className="text-muted-foreground mb-6">View and manage your file ownership NFTs</p>

      {!isConnected && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Wallet Not Connected</AlertTitle>
          <AlertDescription>Please connect your wallet to view your NFTs.</AlertDescription>
        </Alert>
      )}

      {isConnected && !isCorrectNetwork && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Wrong Network</AlertTitle>
          <AlertDescription>
            Please switch to Base Sepolia network to view your NFTs.
            <Button variant="outline" size="sm" className="ml-2" onClick={handleSwitchNetwork}>
              Switch Network
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isConnected && isCorrectNetwork ? (
        <NFTGallery />
      ) : (
        <div className="bg-muted rounded-lg p-8 text-center">
          <h3 className="text-lg font-medium">Connect Your Wallet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect your wallet and switch to Base Sepolia network to view your NFTs.
          </p>
        </div>
      )}
    </div>
  )
}

