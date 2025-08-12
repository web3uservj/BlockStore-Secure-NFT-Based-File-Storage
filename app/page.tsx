"use client"

import { useState, useEffect } from "react"
import { FileUpload } from "@/components/file-upload"
import { DashboardStats } from "@/components/dashboard-stats"
import { RecentFiles } from "@/components/recent-files"
import { AuditLog } from "@/components/audit-log"
import { WalletConnect } from "@/components/wallet-connect"
import { getWalletInfo } from "@/lib/wallet"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [isConnected, setIsConnected] = useState(false)
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Base Sepolia Chain ID
  const BASE_SEPOLIA_CHAIN_ID = 84532

  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        const walletInfo = await getWalletInfo()
        setIsConnected(walletInfo.isConnected)
        setIsCorrectNetwork(walletInfo.chainId === BASE_SEPOLIA_CHAIN_ID)
      } catch (error) {
        console.error("Error checking wallet connection:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkWalletConnection()

    // Listen for account and chain changes
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("accountsChanged", async () => {
        const walletInfo = await getWalletInfo()
        setIsConnected(walletInfo.isConnected)
      })

      window.ethereum.on("chainChanged", async () => {
        const walletInfo = await getWalletInfo()
        setIsCorrectNetwork(walletInfo.chainId === BASE_SEPOLIA_CHAIN_ID)
      })
    }

    return () => {
      if (typeof window !== "undefined" && window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged")
        window.ethereum.removeAllListeners("chainChanged")
      }
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-center">
          <h2 className="text-2xl font-bold">Loading...</h2>
          <p className="text-muted-foreground">Checking wallet connection</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      <p className="text-muted-foreground">
        Secure your data with blockchain technology and verify integrity with cloud auditing.
      </p>

      {!isConnected && (
        <Alert className="mt-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Wallet Not Connected</AlertTitle>
          <AlertDescription>Please connect your wallet to use the application.</AlertDescription>
        </Alert>
      )}

      {isConnected && !isCorrectNetwork && (
        <Alert className="mt-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Wrong Network</AlertTitle>
          <AlertDescription>Please switch to Base Sepolia network to use this application.</AlertDescription>
        </Alert>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          {isConnected && isCorrectNetwork ? (
            <FileUpload />
          ) : (
            <div className="bg-muted rounded-lg p-8 text-center">
              <h3 className="text-lg font-medium">Connect Your Wallet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Connect your wallet and switch to Base Sepolia network to upload files.
              </p>
            </div>
          )}
        </div>
        <div>
          <WalletConnect />
        </div>
      </div>

      {isConnected && isCorrectNetwork && (
        <>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <DashboardStats />
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <RecentFiles />
            <AuditLog />
          </div>

          <div className="mt-8 flex justify-center">
            <Link href="/audit">
              <Button>View Full Audit Dashboard</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

