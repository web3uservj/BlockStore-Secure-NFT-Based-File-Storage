"use client"

import { useState, useEffect } from "react"
import { Clock, Shield, AlertTriangle, CheckCircle, FileText, Search, Download, Filter } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAuditEvents, exportAuditLog, type AuditEvent } from "@/lib/audit"

export function AuditLog() {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const fetchAuditEvents = async () => {
      try {
        const events = await getAuditEvents()
        setAuditEvents(events)
      } catch (error) {
        console.error("Error fetching audit events:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAuditEvents()
  }, [])

  const getIcon = (type: string, status: string) => {
    if (type === "verification") {
      return status === "success" ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : status === "warning" ? (
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-red-500" />
      )
    } else if (type === "upload") {
      return <Shield className="h-4 w-4 text-blue-500" />
    } else if (type === "download") {
      return <Download className="h-4 w-4 text-purple-500" />
    } else {
      return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === "success") {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Success
        </Badge>
      )
    } else if (status === "warning") {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          Warning
        </Badge>
      )
    } else {
      return <Badge variant="destructive">Error</Badge>
    }
  }

  const filteredEvents = auditEvents
    .filter((event) => filter === "all" || event.type === filter)
    .filter(
      (event) =>
        searchTerm === "" ||
        event.file.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.ipfsHash && event.ipfsHash.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (event.txHash && event.txHash.toLowerCase().includes(searchTerm.toLowerCase())),
    )

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportAuditLog(filteredEvents)
    } catch (error) {
      console.error("Error exporting audit log:", error)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
          <CardDescription>Loading audit events...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse space-y-4 w-full">
              {[1, 2, 3, 4, 5].map((i) => (
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
        <CardTitle>Audit Log</CardTitle>
        <CardDescription>Comprehensive audit trail of all blockchain and IPFS activities</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by file name, hash, or message..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="upload">Uploads</SelectItem>
                <SelectItem value="verification">Verifications</SelectItem>
                <SelectItem value="download">Downloads</SelectItem>
                <SelectItem value="access">Access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {auditEvents.length === 0
                ? "No audit events found. Actions like file uploads and verifications will be recorded here."
                : "No audit events found matching your criteria."}
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {filteredEvents.map((event) => (
                <div key={event.id} className="flex flex-col space-y-2 rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getIcon(event.type, event.status)}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {event.type === "verification"
                              ? "Integrity verification"
                              : event.type === "upload"
                                ? "Blockchain storage"
                                : event.type === "download"
                                  ? "File download"
                                  : "File access"}
                          </p>
                          {getStatusBadge(event.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">File:</span> {event.file}
                          {event.fileId !== undefined && <span className="ml-1 text-xs">(ID: {event.fileId})</span>}
                        </p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          {event.timestamp}
                        </div>
                        <p className="text-sm mt-1">{event.message}</p>
                      </div>
                    </div>
                  </div>

                  {(event.ipfsHash || event.txHash) && (
                    <div className="mt-2 pt-2 border-t text-xs space-y-1">
                      {event.ipfsHash && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">IPFS Hash:</span>
                          <span className="font-mono">
                            {event.ipfsHash.substring(0, 16)}...{event.ipfsHash.substring(event.ipfsHash.length - 4)}
                          </span>
                        </div>
                      )}
                      {event.txHash && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Transaction:</span>
                          <a
                            href={`https://sepolia.basescan.org/tx/${event.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-primary hover:underline"
                          >
                            {event.txHash.substring(0, 16)}...{event.txHash.substring(event.txHash.length - 4)}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {filteredEvents.length} of {auditEvents.length} events
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || filteredEvents.length === 0}>
          {exporting ? "Exporting..." : "Export Log"}
        </Button>
      </CardFooter>
    </Card>
  )
}

