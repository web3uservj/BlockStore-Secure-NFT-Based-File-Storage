"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, ExternalLink, Clock, Shield, User, RefreshCw } from "lucide-react"
import { getAllNFTs } from "@/lib/nft"
import { getIPFSGatewayURL } from "@/lib/pinata"
import { getProviderAndSigner } from "@/lib/utils" // Import getProviderAndSigner

export function NFTGallery() {
  const [nfts, setNfts] = useState<{
    owned: any[]
    created: any[]
  }>({
    owned: [],
    created: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("owned")
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchNFTs()

    // Add event listener for NFT creation
    const handleNFTCreated = () => {
      console.log("NFT created event detected, refreshing NFT list")
      fetchNFTs()
    }

    window.addEventListener("nftCreated", handleNFTCreated)

    // Clean up event listener
    return () => {
      window.removeEventListener("nftCreated", handleNFTCreated)
    }
  }, [])

  const fetchNFTs = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("Fetching NFTs...")

      const allNFTs = await getAllNFTs()
      console.log("NFTs fetched:", allNFTs)

      setNfts(allNFTs)
    } catch (error) {
      console.error("Error fetching NFTs:", error)
      setError("Failed to load your NFTs. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  // Function to manually refresh NFTs
  const refreshNFTs = async () => {
    try {
      setRefreshing(true)
      setError(null)

      // Clear stored NFTs to force a fresh scan
      try {
        const { signer } = await getProviderAndSigner()
        if (!signer) {
          console.error("No signer available")
          return
        }
        const userAddress = await signer.getAddress()
        localStorage.removeItem(`user-nfts-${userAddress.toLowerCase()}`)
      } catch (err) {
        console.error("Error clearing stored NFTs:", err)
      }

      const allNFTs = await getAllNFTs()
      setNfts(allNFTs)
    } catch (error) {
      console.error("Error refreshing NFTs:", error)
      setError("Failed to refresh your NFTs. Please try again later.")
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your NFTs</CardTitle>
          <CardDescription>Loading your NFT collection...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse space-y-4 w-full">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 bg-muted rounded-md w-full"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your NFTs</CardTitle>
          <CardDescription>Something went wrong</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
            <Button className="mt-4" variant="outline" onClick={refreshNFTs}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Your NFTs</CardTitle>
          <CardDescription>NFTs representing ownership of your blockchain-stored files</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={refreshNFTs} disabled={refreshing} className="mt-1">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="owned" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="owned">Owned by You</TabsTrigger>
            <TabsTrigger value="created">Created by You</TabsTrigger>
          </TabsList>

          <TabsContent value="owned">
            {nfts.owned.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">You don't own any NFTs yet.</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Note: You can create NFTs for your files from the Files page.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nfts.owned.map((nft) => (
                  <Card key={nft.tokenId} className="overflow-hidden">
                    <div className="aspect-square bg-muted relative">
                      {nft.metadata.image ? (
                        <img
                          src={
                            nft.metadata.image.startsWith("ipfs://")
                              ? getIPFSGatewayURL(nft.metadata.image.replace("ipfs://", ""))
                              : nft.metadata.image
                          }
                          alt={nft.metadata.name || `NFT #${nft.tokenId}`}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <FileText className="h-16 w-16 text-muted-foreground" />
                        </div>
                      )}

                      {nft.metadata.properties?.accessLevel && (
                        <Badge className="absolute top-2 right-2">
                          {nft.metadata.properties.accessLevel === "full"
                            ? "Full Access"
                            : nft.metadata.properties.accessLevel === "view"
                              ? "View Only"
                              : "Limited Access"}
                        </Badge>
                      )}
                    </div>

                    <CardContent className="p-4">
                      <h3 className="font-medium truncate">{nft.metadata.name || `NFT #${nft.tokenId}`}</h3>

                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <Shield className="h-3 w-3 mr-1" />
                          <span>Token ID: {nft.tokenId}</span>
                        </div>

                        {nft.metadata.properties?.fileType && (
                          <div className="flex items-center text-muted-foreground">
                            <FileText className="h-3 w-3 mr-1" />
                            <span>{nft.metadata.properties.fileType}</span>
                          </div>
                        )}

                        {nft.metadata.properties?.expirationDate && (
                          <div className="flex items-center text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>
                              Expires: {new Date(nft.metadata.properties.expirationDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex justify-between">
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={`https://sepolia.basescan.org/token/${NFT_CONTRACT_ADDRESS}?a=${nft.tokenId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </a>
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => {
                            if (nft.metadata.properties?.ipfsHash) {
                              window.open(getIPFSGatewayURL(nft.metadata.properties.ipfsHash), "_blank")
                            }
                          }}
                          disabled={!nft.metadata.properties?.ipfsHash}
                        >
                          Access File
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="created">
            {nfts.created.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">You haven't created any NFTs yet.</p>
                <p className="text-xs text-muted-foreground mt-2">
                  You can create NFTs for your files from the Files page.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nfts.created.map((nft) => (
                  <Card key={nft.tokenId} className="overflow-hidden">
                    <div className="aspect-square bg-muted relative">
                      {nft.metadata.image ? (
                        <img
                          src={
                            nft.metadata.image.startsWith("ipfs://")
                              ? getIPFSGatewayURL(nft.metadata.image.replace("ipfs://", ""))
                              : nft.metadata.image
                          }
                          alt={nft.metadata.name || `NFT #${nft.tokenId}`}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <FileText className="h-16 w-16 text-muted-foreground" />
                        </div>
                      )}

                      <Badge className="absolute top-2 right-2 bg-blue-100 text-blue-800 border-blue-200">
                        Created
                      </Badge>
                    </div>

                    <CardContent className="p-4">
                      <h3 className="font-medium truncate">{nft.metadata.name || `NFT #${nft.tokenId}`}</h3>

                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <Shield className="h-3 w-3 mr-1" />
                          <span>Token ID: {nft.tokenId}</span>
                        </div>

                        <div className="flex items-center text-muted-foreground">
                          <User className="h-3 w-3 mr-1" />
                          <span title={nft.recipient}>
                            Recipient: {nft.recipient.substring(0, 6)}...
                            {nft.recipient.substring(nft.recipient.length - 4)}
                          </span>
                        </div>

                        {nft.timestamp && (
                          <div className="flex items-center text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>Created: {new Date(nft.timestamp).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex justify-between">
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={`https://sepolia.basescan.org/token/${NFT_CONTRACT_ADDRESS}?a=${nft.tokenId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </a>
                        </Button>

                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={`https://sepolia.basescan.org/tx/${nft.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Transaction
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// This should be imported from your environment variables or config
const NFT_CONTRACT_ADDRESS = "0x9bFfB4ffe52C52B55D2BE94C751F20a26E24ce90"

