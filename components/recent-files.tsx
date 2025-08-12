"use client"

import { useState, useEffect } from "react"
import { FileText, MoreHorizontal, Download, Shield, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { verifyFileIntegrity, getUserFiles, getFileDetails } from "@/lib/blockchain"
import { getIPFSGatewayURL } from "@/lib/pinata"
import { useToast } from "@/components/toast"
import { logAuditEvent } from "@/lib/audit"

type FileData = {
  id: number
  name: string
  size: string
  type: string
  date: string
  hash: string
  ipfsHash: string
  verified: boolean
  owner: string
}

export function RecentFiles() {
  const [files, setFiles] = useState<FileData[]>([])
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { addToast, ToastContainer } = useToast()

  useEffect(() => {
    // Add an event listener to refresh the files list when a new file is uploaded
    const fetchUserFiles = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get user's file IDs
        const fileIds = await getUserFiles()
        console.log("Fetched file IDs:", fileIds)

        if (fileIds.length === 0) {
          setFiles([])
          setLoading(false)
          return
        }

        // Get details for each file
        const fileDetailsPromises = fileIds.map((id) =>
          getFileDetails(id).catch((err) => {
            console.error(`Error fetching details for file ${id}:`, err)
            // Return a placeholder for failed files
            return {
              id,
              name: `File ${id} (unavailable)`,
              size: "0",
              type: "unknown",
              date: new Date().toLocaleDateString(),
              hash: "0x...",
              ipfsHash: "",
              verified: false,
              owner: "0x0000000000000000000000000000000000000000",
            }
          }),
        )

        const fileDetails = await Promise.all(fileDetailsPromises)
        console.log("Fetched file details:", fileDetails)

        // Try to get transaction hashes from localStorage
        let txHashes: Record<string, string> = {}
        try {
          const storedHashes = localStorage.getItem("file-tx-hashes")
          if (storedHashes) {
            txHashes = JSON.parse(storedHashes)
          }
        } catch (e) {
          console.error("Failed to load transaction hashes:", e)
        }

        // Format file data
        const formattedFiles = fileDetails.map((file) => ({
          id: file.id,
          name: file.name,
          size: formatFileSize(Number.parseInt(file.size) || 0),
          type: file.type,
          date: new Date(file.timestamp).toLocaleDateString(),
          // Use stored hash if available, otherwise use placeholder
          hash: txHashes[file.id.toString()] || "0x...",
          ipfsHash: file.ipfsHash,
          verified: true, // Assume verified initially
          owner: file.owner,
        }))

        setFiles(formattedFiles)
      } catch (error) {
        console.error("Error fetching user files:", error)
        setError("Failed to load your files. Please try again later.")

        // Set some sample data for demonstration
        if (process.env.NODE_ENV === "development") {
          console.warn("Using mock data for development")
          setFiles([
            {
              id: 1,
              name: "financial-report-2023.pdf",
              size: "4.2 MB",
              type: "application/pdf",
              date: "2023-12-15",
              hash: "0x8f23e3a7c3a8e4d6b9c1d2e5f7a9b8c7d6e5f4a3b2c1d9e8f7a6b5c4d3e2f1a9",
              ipfsHash: "QmZ9t1XYZMmJQUHpC8zVUkxYjPLHHQzQFqpAHvC5xRdMfz",
              verified: true,
              owner: "0x0000000000000000000000000000000000000000",
            },
            {
              id: 2,
              name: "contract-agreement.docx",
              size: "1.8 MB",
              type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              date: "2023-12-10",
              hash: "0x7a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e",
              ipfsHash: "QmX7t1XYZMmJQUHpC8zVUkxYjPLHHQzQFqpAHvC5xRdMfz",
              verified: true,
              owner: "0x0000000000000000000000000000000000000000",
            },
          ])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUserFiles()

    // Add event listener for file uploads
    const handleFileUploaded = () => {
      console.log("File uploaded event detected, refreshing files list")
      fetchUserFiles()
    }

    window.addEventListener("fileUploaded", handleFileUploaded)

    // Clean up event listener
    return () => {
      window.removeEventListener("fileUploaded", handleFileUploaded)
    }
  }, [])

  const handleVerify = async (id: number, ipfsHash: string) => {
    setVerifying(id)
    try {
      // Call the blockchain verification function
      const result = await verifyFileIntegrity(id, ipfsHash)

      // Update file status in the UI
      setFiles(files.map((f) => (f.id === id ? { ...f, verified: result.verified } : f)))

      // Show a toast notification
      if (result.verified) {
        addToast("File integrity verified successfully!", "success")
      } else {
        addToast("File integrity verification failed!", "error")
      }
    } catch (error) {
      console.error("Verification failed:", error)
      addToast("Verification failed. Please try again.", "error")
    } finally {
      setVerifying(null)
    }
  }

  const handleDownload = async (file: FileData) => {
    try {
      // Log the download to the audit log
      await logAuditEvent({
        type: "download",
        file: file.name,
        fileId: file.id,
        ipfsHash: file.ipfsHash,
        timestamp: new Date().toLocaleString(),
        status: "success",
        message: "File downloaded from IPFS",
      })

      // Open the file in a new tab
      window.open(getIPFSGatewayURL(file.ipfsHash), "_blank")
    } catch (error) {
      console.error("Download error:", error)
      addToast("Failed to download file", "error")
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Files</CardTitle>
          <CardDescription>Loading your files...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse space-y-4 w-full">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-md w-full"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Files</CardTitle>
        <CardDescription>Your recently uploaded files with blockchain verification</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No files found. Upload a file to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center space-x-3">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">{file.size}</p>
                      <p className="text-xs text-muted-foreground">•</p>
                      <p className="text-xs text-muted-foreground">{file.date}</p>
                      <Badge variant={file.verified ? "outline" : "destructive"} className="ml-2 text-xs">
                        {file.verified ? "Verified" : "Unverified"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleVerify(file.id, file.ipfsHash)}
                    disabled={verifying === file.id}
                  >
                    <Shield className={`h-4 w-4 ${verifying === file.id ? "animate-pulse" : ""}`} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDownload(file)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleVerify(file.id, file.ipfsHash)}>
                        <Shield className="mr-2 h-4 w-4" />
                        Verify Integrity
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        <a
                          href={`https://sepolia.basescan.org/tx/${file.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1"
                        >
                          View on BaseScan
                        </a>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <ToastContainer />
    </Card>
  )
}

