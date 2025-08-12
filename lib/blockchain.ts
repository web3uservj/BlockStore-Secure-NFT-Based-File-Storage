/**
 * This file contains functions for interacting with the blockchain
 * for secure file storage and integrity verification
 */
import { ethers } from "ethers"
import { uploadToPinata } from "./pinata"
import { getProviderAndSigner } from "./wallet"
import { logAuditEvent } from "./audit"

// ABI for the FileStorage smart contract - CORRECTED to match the actual contract
const CONTRACT_ABI = [
  "function addFile(string memory _fileName, string memory _ipfsHash, uint256 _fileSize, string memory _fileType) public returns (uint256)",
  "function getFile(uint256 _fileId) public view returns (string memory, string memory, uint256, string memory, uint256, address)",
  "function verifyFileIntegrity(uint256 _fileId, string memory _ipfsHash) public view returns (bool)",
  "function getFileCount() public view returns (uint256)",
  "function getUserFiles(address _user) public view returns (uint256[] memory)",
]

// Contract address - using the deployed contract address
const CONTRACT_ADDRESS = "0xd0723dfe30e370ba2e82a2f8d9104b3956b22499"

// Function to get contract instance
async function getContract() {
  try {
    const { signer } = await getProviderAndSigner()
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
  } catch (error: unknown) {
    console.error("Error getting contract:", error)
    throw new Error(
      "Failed to connect to blockchain. Please make sure your wallet is connected to Base Sepolia network.",
    )
  }
}

// Update the storeFile function to return the file ID
export async function storeFile(
  file: File,
  encryptionMetadata?: any,
): Promise<{ hash: string; ipfsHash: string; fileId: number }> {
  try {
    // 1. Upload file to IPFS via Pinata
    console.log("Uploading to Pinata...")
    const pinataResponse = await uploadToPinata(file)
    const ipfsHash = pinataResponse.ipfsHash
    console.log("IPFS hash:", ipfsHash)

    // 2. Store file metadata on blockchain
    console.log("Storing on blockchain...")
    const contract = await getContract()

    // Set a reasonable gas limit
    const gasLimit = 500000

    // Ensure file name isn't too long (smart contracts often have string length limits)
    const fileName = file.name.length > 100 ? file.name.substring(0, 100) : file.name

    // Ensure file type isn't too long
    const fileType = file.type.length > 50 ? file.type.substring(0, 50) : file.type

    console.log("Sending transaction with params:", {
      fileName,
      ipfsHash,
      fileSize: file.size,
      fileType,
    })

    // Call the contract function
    const tx = await contract.addFile(fileName, ipfsHash, file.size, fileType, { gasLimit })

    // 3. Wait for transaction to be mined
    console.log("Waiting for transaction to be mined...")
    const receipt = await tx.wait()
    console.log("Transaction mined:", receipt)

    // Check if transaction was successful
    if (receipt.status === 0) {
      throw new Error("Transaction failed on the blockchain")
    }

    // Try to get the file ID from the event logs
    let fileId = 0
    try {
      // Look for the FileAdded event in the logs
      const fileAddedEvent = receipt.events?.find((e: any) => e.event === "FileAdded")
      if (fileAddedEvent && fileAddedEvent.args) {
        fileId = fileAddedEvent.args.fileId.toNumber()
      } else {
        // If we can't find the event, try to get the latest file ID
        const userFiles = await getUserFiles()
        fileId = userFiles.length > 0 ? userFiles[userFiles.length - 1] : 0
      }
    } catch (e: unknown) {
      console.error("Error getting file ID from event:", e)
    }

    // Log the successful upload to the audit log
    await logAuditEvent({
      type: "upload",
      file: fileName,
      fileId: fileId,
      ipfsHash: ipfsHash,
      timestamp: new Date().toLocaleString(),
      status: "success",
      message: "File uploaded and stored on blockchain",
      txHash: receipt.transactionHash,
    })

    // 4. Return transaction hash, IPFS hash, and file ID
    return {
      hash: receipt.transactionHash,
      ipfsHash: ipfsHash,
      fileId: fileId,
    }
  } catch (error: any) {
    console.error("Error storing file:", error)

    // Log the failed upload to the audit log
    try {
      await logAuditEvent({
        type: "upload",
        file: file.name,
        timestamp: new Date().toLocaleString(),
        status: "error",
        message: `Upload failed: ${error.message || "Unknown error"}`,
      })
    } catch (logError: any) {
      console.error("Failed to log audit event:", logError)
    }

    // Check for specific error types
    if (error.message.includes("Pinata")) {
      throw new Error(`IPFS upload failed: ${error.message}`)
    } else if (error.message.includes("wallet")) {
      throw new Error("Wallet connection error. Please make sure your wallet is connected to Base Sepolia network.")
    } else if (error.code === 4001) {
      throw new Error("Transaction rejected by user. Please approve the transaction in your wallet.")
    } else if (error.message.includes("transaction failed") || error.message.includes("execution reverted")) {
      // This is likely a smart contract issue
      throw new Error(
        "Transaction failed: The smart contract rejected the operation. This could be due to contract limitations or invalid data.",
      )
    } else {
      throw new Error(`Blockchain storage failed: ${error.message}`)
    }
  }
}

// Update the verifyFileIntegrity function to log audit events
export async function verifyFileIntegrity(fileId: number, ipfsHash: string): Promise<{ verified: boolean }> {
  try {
    const contract = await getContract()
    const verified = await contract.verifyFileIntegrity(fileId, ipfsHash)

    // Get file details for the audit log
    let fileName = `File ${fileId}`
    try {
      const fileDetails = await getFileDetails(fileId)
      fileName = fileDetails.name
    } catch (e: unknown) {
      console.error("Could not get file name for audit log:", e)
    }

    // Log the verification to the audit log
    await logAuditEvent({
      type: "verification",
      file: fileName,
      fileId: fileId,
      ipfsHash: ipfsHash,
      timestamp: new Date().toLocaleString(),
      status: verified ? "success" : "error",
      message: verified ? "File integrity verified successfully" : "File integrity verification failed - hash mismatch",
    })

    return { verified }
  } catch (error: unknown) {
    console.error("Error verifying file integrity:", error)

    // Log the failed verification to the audit log
    try {
      await logAuditEvent({
        type: "verification",
        file: `File ${fileId}`,
        fileId: fileId,
        ipfsHash: ipfsHash,
        timestamp: new Date().toLocaleString(),
        status: "error",
        message: `Verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } catch (logError: any) {
      console.error("Failed to log audit event:", logError)
    }

    return { verified: false }
  }
}

// Function to get file details from blockchain
export async function getFileDetails(fileId: number): Promise<any> {
  try {
    console.log(`Getting details for file ID: ${fileId}`)
    const contract = await getContract()

    // Try to get file details, but handle potential errors
    try {
      // The contract might return different number of values than expected
      // Adjust based on your actual contract implementation
      const [fileName, ipfsHash, fileSize, fileType, timestamp, owner] = await contract.getFile(fileId)
      console.log(`File details retrieved for ID ${fileId}:`, {
        fileName,
        ipfsHash,
        fileSize: fileSize.toString(),
        fileType,
      })

      return {
        id: fileId,
        name: fileName,
        ipfsHash,
        size: fileSize.toString(),
        type: fileType,
        metadata: "", // We'll handle metadata separately if needed
        timestamp: new Date(timestamp.toNumber() * 1000).toISOString(),
        owner,
      }
    } catch (contractError: any) {
      console.error(`Contract error for file ID ${fileId}:`, contractError)

      // Return a placeholder for failed file retrieval
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
  } catch (error: unknown) {
    console.error("Error getting file details:", error)
    throw error
  }
}

// Update the getUserFiles function to better handle errors and provide more debugging
export async function getUserFiles(): Promise<number[]> {
  try {
    // Check if wallet is connected
    const { signer } = await getProviderAndSigner()
    if (!signer) {
      console.error("No signer available - wallet may not be connected")
      return []
    }

    const address = await signer.getAddress()
    console.log("Getting files for address:", address)

    // Get contract instance
    const contract = await getContract()
    console.log("Contract instance obtained")

    // Call the contract function
    const fileIds = await contract.getUserFiles(address)
    console.log("Raw file IDs from contract:", fileIds)

    // Convert BigNumber to regular numbers
    const convertedIds = fileIds.map((id: ethers.BigNumber) => id.toNumber())
    console.log("Converted file IDs:", convertedIds)

    return convertedIds
  } catch (error: unknown) {
    console.error("Error getting user files:", error)

    // Check for specific errors
    if (error && typeof error === "object" && "message" in error) {
      const errorWithMessage = error as { message: string }
      if (errorWithMessage.message.includes("wallet")) {
        console.error("Wallet connection issue:", errorWithMessage.message)
      } else if (errorWithMessage.message.includes("contract")) {
        console.error("Contract interaction issue:", errorWithMessage.message)
      }
    }

    // Return empty array instead of throwing
    return []
  }
}

// Function to get total file count
export async function getFileCount(): Promise<number> {
  try {
    const contract = await getContract()
    const count = await contract.getFileCount()
    return count.toNumber()
  } catch (error: unknown) {
    console.error("Error getting file count:", error)
    throw error
  }
}

