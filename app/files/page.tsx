"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { NFTCreator } from "@/components/nft-creator"
import { getUserFiles, getFileDetails } from "@/lib/blockchain"
import { getIPFSGatewayURL } from "@/lib/pinata"
import { logAuditEvent } from "@/lib/audit"
import {
  FileText,
  Loader2,
  Copy,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  Filter,
  FileImage,
  FileAudio,
  FileVideo,
  FileIcon as FilePdf,
  FileCode,
  FileArchive,
  File,
  Upload,
  Shield,
  Clock,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react"

type AppFile = {
  id: string
  name: string
  type: string
  size: number
  createdAt: Date
  ipfsHash?: string
}

export default function Page() {
  const [files, setFiles] = useState<AppFile[]>([])
  const [filteredFiles, setFilteredFiles] = useState<AppFile[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFile, setSelectedFile] = useState<AppFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  useEffect(() => {
    fetchFiles()

    // Add event listener for file uploads
    const handleFileUploaded = () => {
      console.log("File uploaded event detected, refreshing files list")
      fetchFiles()
    }

    window.addEventListener("fileUploaded", handleFileUploaded)

    // Clean up event listener
    return () => {
      window.removeEventListener("fileUploaded", handleFileUploaded)
    }
  }, [])

  useEffect(() => {
    if (searchTerm) {
      setFilteredFiles(
        files.filter(
          (file) =>
            file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            file.type.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      )
    } else {
      setFilteredFiles(files)
    }
    setCurrentPage(1)
  }, [searchTerm, files])

  const fetchFiles = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get user's file IDs
      const fileIds = await getUserFiles()
      console.log("File IDs in files page:", fileIds)

      if (fileIds.length === 0) {
        setFiles([])
        setFilteredFiles([])
        setLoading(false)
        return
      }

      // Get details for each file
      const fileDetailsPromises = fileIds.map((id) =>
        getFileDetails(id).catch((err) => {
          console.error(`Error fetching details for file ${id}:`, err)
          return null
        }),
      )

      const fileDetails = (await Promise.all(fileDetailsPromises)).filter(Boolean)
      console.log("File details in files page:", fileDetails)

      if (fileDetails.length > 0) {
        // Convert to the expected format
        const formattedFiles: AppFile[] = fileDetails.map((file) => ({
          id: file.id.toString(),
          name: file.name,
          type: file.type,
          size: Number.parseInt(file.size),
          createdAt: new Date(file.timestamp),
          ipfsHash: file.ipfsHash,
        }))

        setFiles(formattedFiles)
        setFilteredFiles(formattedFiles)
      } else {
        setFiles([])
        setFilteredFiles([])
      }
    } catch (error) {
      console.error("Error fetching files:", error)
      setError("Failed to load files from blockchain. Please check your wallet connection.")
    } finally {
      setLoading(false)
    }
  }

  const handleViewFile = (file: AppFile) => {
    if (file.ipfsHash) {
      // Log the access to the audit log
      logAuditEvent({
        type: "access",
        file: file.name,
        fileId: file.id,
        ipfsHash: file.ipfsHash,
        timestamp: new Date().toLocaleString(),
        status: "success",
        message: "File accessed from files page",
      }).catch((err) => console.error("Failed to log audit event:", err))

      // Open the file in a new tab
      window.open(getIPFSGatewayURL(file.ipfsHash), "_blank")
    } else {
      toast.error("File IPFS hash not available")
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("image")) return <FileImage className="h-10 w-10 text-primary" />
    if (fileType.includes("audio")) return <FileAudio className="h-10 w-10 text-primary" />
    if (fileType.includes("video")) return <FileVideo className="h-10 w-10 text-primary" />
    if (fileType.includes("pdf")) return <FilePdf className="h-10 w-10 text-primary" />
    if (
      fileType.includes("html") ||
      fileType.includes("javascript") ||
      fileType.includes("css") ||
      fileType.includes("json")
    )
      return <FileCode className="h-10 w-10 text-primary" />
    if (fileType.includes("zip") || fileType.includes("rar") || fileType.includes("tar") || fileType.includes("gz"))
      return <FileArchive className="h-10 w-10 text-primary" />
    return <FileText className="h-10 w-10 text-muted-foreground" />
  }

  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage)
  const paginatedFiles = filteredFiles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="container mx-auto py-10">
      <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-xl p-8 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-primary mb-2">Blockchain File Vault</h1>
            <p className="text-muted-foreground max-w-2xl">
              Your files are securely stored on the blockchain with immutable integrity verification. Browse, view, and
              create NFTs from your stored files.
            </p>
          </div>
          <Button className="mt-4 md:mt-0" onClick={() => (window.location.href = "/")}>
            <Upload className="h-4 w-4 mr-2" />
            Upload New File
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files by name or type..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
          </Button>
          <Button variant="outline" onClick={fetchFiles} className="flex items-center gap-2">
            <svg
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* File List */}
      <div className="mb-8">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 bg-muted/30 rounded-xl border border-dashed">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-xl font-semibold tracking-tight">Loading your files...</h3>
            <p className="text-muted-foreground mt-2">Retrieving data from the blockchain</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-8 rounded-xl dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/50 mb-4">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight mb-2">Connection Error</h3>
            <p className="mb-4">{error}</p>
            <Button variant="outline" onClick={fetchFiles}>
              Try Again
            </Button>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-muted/30 border-dashed">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
              <File className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mb-2">No files found</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              {searchTerm
                ? "No files match your search criteria. Try a different search term."
                : "Your blockchain vault is empty. Upload files from the Dashboard to see them here."}
            </p>
            <Button onClick={() => (window.location.href = "/")}>Go to Dashboard</Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedFiles.map((file) => (
                <Card
                  key={file.id}
                  className="overflow-hidden group hover:shadow-md transition-all duration-200 border-muted/60"
                >
                  <CardHeader className="p-4 pb-2 bg-muted/30">
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className="bg-white/80 text-xs">
                        {file.type.split("/")[1]?.toUpperCase() || file.type}
                      </Badge>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewFile(file)}>
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="flex items-start space-x-4">
                      <div className="bg-muted/50 p-3 rounded-lg">{getFileIcon(file.type)}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium leading-none truncate" title={file.name}>
                          {file.name}
                        </h3>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{file.createdAt.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <Shield className="h-3 w-3 mr-1" />
                          <span>{formatFileSize(file.size)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 flex justify-between gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewFile(file)}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      View
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="secondary" size="sm" className="flex-1" onClick={() => setSelectedFile(file)}>
                          Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>File Details</DialogTitle>
                          <DialogDescription>Information about the selected file.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-3 py-3">
                          <div className="grid grid-cols-4 items-center gap-3">
                            <Label htmlFor="name" className="text-right">
                              Name
                            </Label>
                            <Input
                              type="text"
                              id="name"
                              value={selectedFile?.name || ""}
                              className="col-span-3"
                              readOnly
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-3">
                            <Label htmlFor="type" className="text-right">
                              Type
                            </Label>
                            <Input
                              type="text"
                              id="type"
                              value={selectedFile?.type || ""}
                              className="col-span-3"
                              readOnly
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-3">
                            <Label htmlFor="size" className="text-right">
                              Size
                            </Label>
                            <Input
                              type="text"
                              id="size"
                              value={selectedFile ? formatFileSize(selectedFile.size) : ""}
                              className="col-span-3"
                              readOnly
                            />
                          </div>
                          {selectedFile?.ipfsHash && (
                            <div className="grid grid-cols-4 items-center gap-3">
                              <Label htmlFor="ipfs" className="text-right">
                                IPFS Hash
                              </Label>
                              <div className="col-span-3 flex items-center">
                                <Input
                                  type="text"
                                  id="ipfs"
                                  value={selectedFile.ipfsHash}
                                  className="font-mono text-xs"
                                  readOnly
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="ml-1"
                                  onClick={() => {
                                    navigator.clipboard.writeText(selectedFile.ipfsHash || "")
                                    toast.success("IPFS hash copied to clipboard")
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                        {selectedFile && (
                          <div className="mt-3 pt-3 border-t">
                            <h3 className="text-lg font-semibold tracking-tight mb-2">Create NFT</h3>
                            <NFTCreator
                              fileId={selectedFile.id}
                              fileName={selectedFile.name}
                              fileType={selectedFile.type}
                              onSuccess={(tokenId, txHash) => {
                                toast.success(`NFT created successfully! Token ID: ${tokenId}`)
                                setSelectedFile(null) // Close the dialog after successful NFT creation
                              }}
                            />
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {/* Stats Card */}
            <Card className="mt-8 bg-muted/30">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Files</p>
                      <p className="text-2xl font-semibold">{files.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Storage Used</p>
                      <p className="text-2xl font-semibold">
                        {formatFileSize(files.reduce((total, file) => total + file.size, 0))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Upload</p>
                      <p className="text-2xl font-semibold">
                        {files.length > 0
                          ? new Date(Math.max(...files.map((f) => f.createdAt.getTime()))).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Pagination */}
      {filteredFiles.length > itemsPerPage && (
        <div className="flex items-center justify-center mt-8">
          <div className="flex items-center space-x-2 bg-muted/30 p-2 rounded-lg">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              // Logic to show pages around current page
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }

              return (
                <Button
                  key={i}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`h-8 w-8 ${currentPage === pageNum ? "bg-primary text-primary-foreground" : ""}`}
                >
                  {pageNum}
                </Button>
              )
            })}

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
