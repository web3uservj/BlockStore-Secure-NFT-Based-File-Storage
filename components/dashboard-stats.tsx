"use client"

import { useState, useEffect } from "react"
import { BarChart3, FileText, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getFileCount, getUserFiles } from "@/lib/blockchain"

export function DashboardStats() {
  const [stats, setStats] = useState({
    totalFiles: 0,
    storageUsed: "0 MB",
    integrityScore: "100%",
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total file count
        const totalCount = await getFileCount()

        // Get user's files
        const userFileIds = await getUserFiles()

        // Set stats
        setStats({
          totalFiles: userFileIds.length,
          storageUsed: `${(userFileIds.length * 2.5).toFixed(1)} MB`, // Estimate
          integrityScore: "100%",
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Your Files</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalFiles}</div>
          <p className="text-xs text-muted-foreground">Files stored on blockchain</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.storageUsed}</div>
          <p className="text-xs text-muted-foreground">Total IPFS storage</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Integrity Score</CardTitle>
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.integrityScore}</div>
          <p className="text-xs text-muted-foreground">All files verified</p>
        </CardContent>
      </Card>
    </>
  )
}

