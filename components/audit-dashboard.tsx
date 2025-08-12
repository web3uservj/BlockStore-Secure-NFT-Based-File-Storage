"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAuditStats } from "@/lib/audit"

type EventData = {
  name: string
  value: number
}

type AuditStats = {
  totalEvents: number
  eventsByType: Record<string, number>
  eventsByStatus: Record<string, number>
  verificationSuccessRate: string
}

export function AuditDashboard() {
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const auditStats = await getAuditStats()
        setStats(auditStats)
      } catch (error) {
        console.error("Error fetching audit stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Analytics</CardTitle>
          <CardDescription>Loading audit statistics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse space-y-4 w-full">
              <div className="h-40 bg-muted rounded-md w-full"></div>
              <div className="h-8 bg-muted rounded-md w-1/2 mx-auto"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Analytics</CardTitle>
          <CardDescription>Failed to load audit statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Could not load audit statistics. Please try again later.
          </div>
        </CardContent>
      </Card>
    )
  }

  // Prepare data for charts
  const eventTypeData: EventData[] = Object.entries(stats.eventsByType).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }))

  const eventStatusData: EventData[] = Object.entries(stats.eventsByStatus).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }))

  // Colors for pie charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

  const renderCustomizedLabel = ({ name, percent }: { name: string; percent: number }) => {
    return `${name}: ${(percent * 100).toFixed(0)}%`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Analytics</CardTitle>
        <CardDescription>Visual analytics of blockchain storage and verification activities</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="events">Event Types</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-3xl font-bold">{stats.totalEvents}</div>
                  <p className="text-xs text-muted-foreground">All blockchain and IPFS activities</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-sm font-medium">Verification Success Rate</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-3xl font-bold">{stats.verificationSuccessRate}%</div>
                  <p className="text-xs text-muted-foreground">File integrity verifications</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-sm font-medium">Uploads</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-3xl font-bold">{stats.eventsByType.upload || 0}</div>
                  <p className="text-xs text-muted-foreground">Files stored on blockchain</p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Event Distribution</h3>
              {eventTypeData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eventTypeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No event data available yet. Use the application to generate events.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="events" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Event Types</h3>
                {eventTypeData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={eventTypeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomizedLabel}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {eventTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No event data available yet. Use the application to generate events.
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Event Details</h3>
                {eventTypeData.length > 0 ? (
                  <div className="space-y-4">
                    {eventTypeData.map((type, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span>{type.name}</span>
                        </div>
                        <span className="font-medium">{type.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No event data available yet.</div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="status" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Status Distribution</h3>
                {eventStatusData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={eventStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {eventStatusData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.name === "Success" ? "#10B981" : entry.name === "Warning" ? "#F59E0B" : "#EF4444"
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No status data available yet.</div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Status Details</h3>
                {eventStatusData.length > 0 ? (
                  <div className="space-y-4">
                    {eventStatusData.map((status, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{
                              backgroundColor:
                                status.name === "Success"
                                  ? "#10B981"
                                  : status.name === "Warning"
                                    ? "#F59E0B"
                                    : "#EF4444",
                            }}
                          ></div>
                          <span>{status.name}</span>
                        </div>
                        <span className="font-medium">{status.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No status data available yet.</div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

