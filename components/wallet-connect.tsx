"use client"

import { useState, useEffect } from "react"
import { Wallet, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { connectWallet, disconnectWallet, getWalletInfo, switchToBaseSepolia } from "@/lib/wallet"

export function WalletConnect() {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState("")
  const [chainId, setChainId] = useState<number | null>(null)
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Base Sepolia Chain ID
  const BASE_SEPOLIA_CHAIN_ID = 84532

  useEffect(() => {
    // Check if wallet is already connected
    const checkConnection = async () => {
      try {
        const walletInfo = await getWalletInfo()
        setIsConnected(walletInfo.isConnected)
        setAddress(walletInfo.address)
        setChainId(walletInfo.chainId)
        setIsCorrectNetwork(walletInfo.chainId === BASE_SEPOLIA_CHAIN_ID)
      } catch (error) {
        console.error("Error checking wallet connection:", error)
      }
    }

    checkConnection()

    // Listen for account changes
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0])
          setIsConnected(true)
        } else {
          setAddress("")
          setIsConnected(false)
        }
      })

      // Listen for chain changes
      window.ethereum.on("chainChanged", (chainIdHex: string) => {
        const newChainId = Number.parseInt(chainIdHex, 16)
        setChainId(newChainId)
        setIsCorrectNetwork(newChainId === BASE_SEPOLIA_CHAIN_ID)
      })
    }

    return () => {
      // Clean up listeners
      if (typeof window !== "undefined" && window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged")
        window.ethereum.removeAllListeners("chainChanged")
      }
    }
  }, [])

  const handleConnect = async () => {
    setIsLoading(true)
    try {
      const { address, chainId } = await connectWallet()
      setIsConnected(true)
      setAddress(address)
      setChainId(chainId)
      setIsCorrectNetwork(chainId === BASE_SEPOLIA_CHAIN_ID)
    } catch (error) {
      console.error("Error connecting wallet:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setIsLoading(true)
    try {
      await disconnectWallet()
      setIsConnected(false)
      setAddress("")
    } catch (error) {
      console.error("Error disconnecting wallet:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSwitchNetwork = async () => {
    setIsLoading(true)
    try {
      await switchToBaseSepolia()
      const walletInfo = await getWalletInfo()
      setChainId(walletInfo.chainId)
      setIsCorrectNetwork(walletInfo.chainId === BASE_SEPOLIA_CHAIN_ID)
    } catch (error) {
      console.error("Error switching network:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet Connection</CardTitle>
        <CardDescription>Connect your wallet to interact with the blockchain</CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <span className="font-medium">{formatAddress(address)}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(address)}>
                Copy
              </Button>
            </div>

            {!isCorrectNetwork && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Wrong Network</AlertTitle>
                <AlertDescription>Please switch to Base Sepolia network to use this application.</AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <Wallet className="h-12 w-12 text-muted-foreground" />
            <p className="text-center text-muted-foreground">
              Connect your wallet to upload files and interact with the blockchain
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        {isConnected ? (
          <>
            {!isCorrectNetwork && (
              <Button className="w-full" onClick={handleSwitchNetwork} disabled={isLoading}>
                {isLoading ? "Switching..." : "Switch to Base Sepolia"}
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={handleDisconnect} disabled={isLoading}>
              {isLoading ? "Disconnecting..." : "Disconnect Wallet"}
            </Button>
          </>
        ) : (
          <Button className="w-full" onClick={handleConnect} disabled={isLoading}>
            {isLoading ? "Connecting..." : "Connect Wallet"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

