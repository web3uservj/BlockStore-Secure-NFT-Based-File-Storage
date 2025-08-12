import { ethers } from "ethers"
import { getProviderAndSigner } from "./wallet"
import { logAuditEvent } from "./audit"
import { getFileDetails } from "./blockchain"
import { uploadToPinata } from "./pinata"

// NFT contract ABI - simplified for this example
const NFT_CONTRACT_ABI = [
  "function mintFileNFT(address recipient, uint256 fileId, string memory tokenURI) public returns (uint256)",
  "function getFileId(uint256 tokenId) public view returns (uint256)",
  "function tokenURI(uint256 tokenId) public view returns (string memory)",
  "function ownerOf(uint256 tokenId) public view returns (address)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
]

// NFT contract address - you'll deploy this separately
const NFT_CONTRACT_ADDRESS = "0x9bFfB4ffe52C52B55D2BE94C751F20a26E24ce90"

// Function to get NFT contract instance
async function getNFTContract() {
  try {
    const { signer } = await getProviderAndSigner()
    return new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, signer)
  } catch (error) {
    console.error("Error getting NFT contract:", error)
    throw new Error("Failed to connect to NFT contract. Please check your wallet connection.")
  }
}

// Create metadata for the NFT
export async function createNFTMetadata(fileId: number | string, accessLevel = "full", expirationDays = 0) {
  try {
    // Get file details from your existing storage
    const fileDetails = await getFileDetails(typeof fileId === "string" ? Number.parseInt(fileId) : fileId)

    // Create a thumbnail if possible (for images) or use a generic icon
    const thumbnailUrl = fileDetails.type.startsWith("image/")
      ? `https://gateway.pinata.cloud/ipfs/${fileDetails.ipfsHash}`
      : "/placeholder.svg?height=500&width=500" // Generic placeholder

    // Calculate expiration date if provided
    const expirationDate =
      expirationDays > 0 ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString() : null

    // Create metadata object
    const metadata = {
      name: fileDetails.name,
      description: `NFT representing ownership of ${fileDetails.name}`,
      image: thumbnailUrl,
      properties: {
        fileType: fileDetails.type,
        fileSize: fileDetails.size,
        ipfsHash: fileDetails.ipfsHash,
        uploadDate: new Date(fileDetails.timestamp).toISOString(),
        accessLevel: accessLevel,
        expirationDate: expirationDate,
      },
    }

    // Upload metadata to IPFS
    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: "application/json" })
    const metadataFile = new File([metadataBlob], "metadata.json")

    // Use your existing Pinata upload function
    const { ipfsHash } = await uploadToPinata(metadataFile)

    return {
      tokenURI: `ipfs://${ipfsHash}`,
      metadata,
    }
  } catch (error) {
    console.error("Error creating NFT metadata:", error)
    throw error
  }
}

// Mint an NFT for a file
export async function mintFileNFT(
  fileId: number | string,
  recipientAddress: string,
  accessLevel = "full",
  expirationDays = 0,
) {
  try {
    // Create metadata and upload to IPFS
    const { tokenURI, metadata } = await createNFTMetadata(fileId, accessLevel, expirationDays)

    // Get NFT contract
    const nftContract = await getNFTContract()

    // Convert fileId to number if it's a string
    const numericFileId = typeof fileId === "string" ? Number.parseInt(fileId) : fileId

    // Mint the NFT
    const tx = await nftContract.mintFileNFT(recipientAddress, numericFileId, tokenURI, {
      gasLimit: 500000,
    })

    // Wait for transaction to be mined
    const receipt = await tx.wait()

    // Extract the token ID from the event logs
    const mintEvent = receipt.events?.find(
      (e: any) => e.event === "Transfer" && e.args?.from === ethers.constants.AddressZero,
    )
    const tokenId = mintEvent?.args?.tokenId.toNumber()

    // Log the NFT creation to the audit log
    await logAuditEvent({
      type: "nft",
      file: metadata.name,
      fileId: fileId,
      ipfsHash: metadata.properties.ipfsHash,
      timestamp: new Date().toLocaleString(),
      status: "success",
      message: `NFT created for file (Token ID: ${tokenId})`,
      txHash: receipt.transactionHash,
    })

    // Store the created NFT in local storage
    try {
      const { signer } = await getProviderAndSigner()
      const userAddress = await signer.getAddress()

      // Store created NFTs
      const createdNFTsKey = `created-nfts-${userAddress.toLowerCase()}`
      const storedCreatedNFTs = localStorage.getItem(createdNFTsKey) || "[]"
      const createdNFTs = JSON.parse(storedCreatedNFTs)

      // Add the new NFT with recipient info
      createdNFTs.push({
        tokenId,
        fileId: numericFileId,
        recipient: recipientAddress,
        timestamp: Date.now(),
        txHash: receipt.transactionHash,
        tokenURI,
      })

      localStorage.setItem(createdNFTsKey, JSON.stringify(createdNFTs))
      console.log("Stored created NFT in local storage:", tokenId)
    } catch (err) {
      console.error("Error storing created NFT in local storage:", err)
    }

    return {
      tokenId,
      txHash: receipt.transactionHash,
      tokenURI,
    }
  } catch (error) {
    console.error("Error minting NFT:", error)

    // Log the failed NFT creation
    await logAuditEvent({
      type: "nft",
      file: `File ${fileId}`,
      fileId: fileId,
      timestamp: new Date().toLocaleString(),
      status: "error",
      message: `Failed to create NFT: ${error instanceof Error ? error.message : "Unknown error"}`,
    })

    throw error
  }
}

// Get NFTs owned by the current user
export async function getUserNFTs() {
  try {
    const nftContract = await getNFTContract()
    const { signer } = await getProviderAndSigner()
    const userAddress = await signer.getAddress()

    console.log("Fetching NFTs for address:", userAddress)

    // In a real implementation, we would query events or use an indexer
    // For now, we'll implement a basic approach to find NFTs owned by the user

    // First, get the total number of NFTs minted (if your contract has this function)
    // If your contract doesn't have this, you might need to track the latest token ID
    let tokenIds: number[] = []

    try {
      // Try to get the user's NFTs from local storage first (for demo purposes)
      const storedNFTs = localStorage.getItem(`user-nfts-${userAddress.toLowerCase()}`)
      if (storedNFTs) {
        tokenIds = JSON.parse(storedNFTs)
        console.log("Found stored NFTs:", tokenIds)
      }
    } catch (err) {
      console.error("Error reading stored NFTs:", err)
    }

    // If we don't have any stored NFTs, we can try to scan recent token IDs
    // This is not efficient but works for demo purposes
    if (tokenIds.length === 0) {
      // Try to scan the most recent 20 token IDs (adjust as needed)
      const scanRange = 20
      const potentialTokenIds = Array.from({ length: scanRange }, (_, i) => i + 1)

      console.log("Scanning token IDs:", potentialTokenIds)

      // Check each token ID to see if the user owns it
      const ownershipChecks = await Promise.allSettled(
        potentialTokenIds.map(async (tokenId) => {
          try {
            const owner = await nftContract.ownerOf(tokenId)
            return owner.toLowerCase() === userAddress.toLowerCase() ? tokenId : null
          } catch (err) {
            // Token doesn't exist or other error
            return null
          }
        }),
      )

      // Filter out successful checks and null results
      tokenIds = ownershipChecks
        .filter((result) => result.status === "fulfilled" && result.value !== null)
        .map((result) => (result as PromiseFulfilledResult<number>).value)

      console.log("Found NFTs by scanning:", tokenIds)

      // Store the found NFTs for future use
      if (tokenIds.length > 0) {
        try {
          localStorage.setItem(`user-nfts-${userAddress.toLowerCase()}`, JSON.stringify(tokenIds))
        } catch (err) {
          console.error("Error storing NFTs:", err)
        }
      }
    }

    // Get details for each NFT
    const nftPromises = tokenIds.map(async (tokenId) => {
      try {
        const tokenURI = await nftContract.tokenURI(tokenId)
        const fileId = await nftContract.getFileId(tokenId)

        console.log(`NFT ${tokenId} details:`, { tokenURI, fileId })

        // Fetch metadata from IPFS if it's an IPFS URI
        let metadata = {}
        if (tokenURI.startsWith("ipfs://")) {
          const ipfsHash = tokenURI.replace("ipfs://", "")
          try {
            const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`)
            if (response.ok) {
              metadata = await response.json()
              console.log(`Metadata for NFT ${tokenId}:`, metadata)
            } else {
              console.error(`Failed to fetch metadata for NFT ${tokenId}:`, response.statusText)
            }
          } catch (err) {
            console.error(`Error fetching metadata for NFT ${tokenId}:`, err)
          }
        }

        return {
          tokenId,
          tokenURI,
          fileId: fileId.toString(),
          metadata,
          type: "owned",
        }
      } catch (err) {
        console.error(`Error getting details for NFT ${tokenId}:`, err)
        return null
      }
    })

    const nfts = (await Promise.all(nftPromises)).filter(Boolean)
    console.log("Final owned NFT list:", nfts)
    return nfts
  } catch (error) {
    console.error("Error getting user NFTs:", error)
    return []
  }
}

// Get NFTs created by the current user
export async function getCreatedNFTs() {
  try {
    const { signer } = await getProviderAndSigner()
    const userAddress = await signer.getAddress()

    // Get created NFTs from local storage
    const createdNFTsKey = `created-nfts-${userAddress.toLowerCase()}`
    const storedCreatedNFTs = localStorage.getItem(createdNFTsKey) || "[]"
    const createdNFTs = JSON.parse(storedCreatedNFTs)

    if (createdNFTs.length === 0) {
      console.log("No created NFTs found in local storage")
      return []
    }

    console.log("Found created NFTs in local storage:", createdNFTs)

    // Get NFT contract
    const nftContract = await getNFTContract()

    // Get details for each created NFT
    const nftPromises = createdNFTs.map(async (nft: any) => {
      try {
        // Verify the NFT still exists
        let owner
        try {
          owner = await nftContract.ownerOf(nft.tokenId)
        } catch (err) {
          console.error(`NFT ${nft.tokenId} no longer exists or other error:`, err)
          return null
        }

        // Get file details
        let fileDetails
        try {
          fileDetails = await getFileDetails(nft.fileId)
        } catch (err) {
          console.error(`Error getting file details for NFT ${nft.tokenId}:`, err)
          fileDetails = {
            name: `File ${nft.fileId}`,
            type: "unknown",
            size: "0",
          }
        }

        // Fetch metadata from IPFS if it's an IPFS URI
        let metadata = {}
        if (nft.tokenURI && nft.tokenURI.startsWith("ipfs://")) {
          const ipfsHash = nft.tokenURI.replace("ipfs://", "")
          try {
            const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`)
            if (response.ok) {
              metadata = await response.json()
            }
          } catch (err) {
            console.error(`Error fetching metadata for NFT ${nft.tokenId}:`, err)
          }
        }

        // If metadata is empty, create a basic version
        if (Object.keys(metadata).length === 0) {
          metadata = {
            name: fileDetails.name || `File ${nft.fileId}`,
            description: `NFT for file ${nft.fileId}`,
            properties: {
              fileId: nft.fileId,
              recipient: nft.recipient,
            },
          }
        }

        return {
          tokenId: nft.tokenId,
          tokenURI: nft.tokenURI,
          fileId: nft.fileId.toString(),
          metadata,
          recipient: nft.recipient,
          currentOwner: owner,
          txHash: nft.txHash,
          timestamp: nft.timestamp,
          type: "created",
        }
      } catch (err) {
        console.error(`Error processing created NFT ${nft.tokenId}:`, err)
        return null
      }
    })

    const validCreatedNFTs = (await Promise.all(nftPromises)).filter(Boolean)
    console.log("Final created NFT list:", validCreatedNFTs)
    return validCreatedNFTs
  } catch (error) {
    console.error("Error getting created NFTs:", error)
    return []
  }
}

// Get all NFTs (both owned and created)
export async function getAllNFTs() {
  const [ownedNFTs, createdNFTs] = await Promise.all([getUserNFTs(), getCreatedNFTs()])

  return {
    owned: ownedNFTs,
    created: createdNFTs,
  }
}

// Verify if a user has NFT access to a file
export async function verifyNFTAccess(fileId: number | string, userAddress: string) {
  try {
    const nftContract = await getNFTContract()

    // This is a simplified approach - in a real implementation, you'd need a more efficient way
    // to check if a user has an NFT for a specific file

    // For now, we'll assume you have a way to get all token IDs for a file
    // This could be from your backend or by scanning events
    const tokenIds: number[] = [] // You'd populate this from your data source

    // Check if the user owns any of these tokens
    for (const tokenId of tokenIds) {
      try {
        const owner = await nftContract.ownerOf(tokenId)
        if (owner.toLowerCase() === userAddress.toLowerCase()) {
          // Get the token URI to check access level and expiration
          const tokenURI = await nftContract.tokenURI(tokenId)

          // Fetch metadata from IPFS if it's an IPFS URI
          if (tokenURI.startsWith("ipfs://")) {
            const ipfsHash = tokenURI.replace("ipfs://", "")
            const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`)
            const metadata = await response.json()

            // Check if the NFT has expired
            if (metadata.properties.expirationDate) {
              const expirationDate = new Date(metadata.properties.expirationDate)
              if (expirationDate < new Date()) {
                continue // NFT has expired, check the next one
              }
            }

            // Return access details
            return {
              hasAccess: true,
              accessLevel: metadata.properties.accessLevel,
              tokenId,
            }
          }
        }
      } catch (error) {
        console.error(`Error checking token ${tokenId}:`, error)
        // Continue to the next token
      }
    }

    // No valid NFT found
    return {
      hasAccess: false,
    }
  } catch (error) {
    console.error("Error verifying NFT access:", error)
    throw error
  }
}

