"use client"

import { useState, useEffect, useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Download,
  Search,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Clock,
  CalendarIcon,
  Hash,
} from "lucide-react"
import { getAuditEvents, getAuditStats, exportAuditLog, type AuditEvent } from "@/lib/audit"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { toast } from "sonner"

type TimeRange = "24h" | "7d" | "30d" | "90d" | "all" | "custom"

export function EnhancedAuditDashboard() {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [timeRange, setTimeRange] = useState<TimeRange>("7d")
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [userFilter, setUserFilter] = useState<string>("")

  // View options
  const [showRealTimeUpdates, setShowRealTimeUpdates] = useState(false)
  const [chartType, setChartType] = useState<"bar" | "pie" | "line" | "area">("bar")
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month" | "type">("day")

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    fetchAuditData()

    // Set up real-time updates if enabled
    let interval: NodeJS.Timeout | null = null
    if (showRealTimeUpdates) {
      interval = setInterval(() => {
        fetchAuditData(false)
      }, 30000) // Update every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [showRealTimeUpdates, timeRange, dateRange])

  const fetchAuditData = async (showLoadingState = true) => {
    try {
      if (showLoadingState) setLoading(true)
      else setRefreshing(true)

      // Fetch audit events
      const events = await getAuditEvents()

      // Apply date filtering
      const filteredEvents = filterEventsByDate(events)
      setAuditEvents(filteredEvents)

      // Fetch audit stats
      const auditStats = await getAuditStats()
      setStats(auditStats)
    } catch (error) {
      console.error("Error fetching audit data:", error)
      toast.error("Failed to load audit data")
    } finally {
      if (showLoadingState) setLoading(false)
      else setRefreshing(false)
    }
  }

  const filterEventsByDate = (events: AuditEvent[]) => {
    if (timeRange === "custom" && dateRange.from) {
      const fromDate = dateRange.from
      const toDate = dateRange.to || new Date()

      return events.filter((event) => {
        const eventDate = new Date(event.timestamp)
        return eventDate >= fromDate && eventDate <= toDate
      })
    }

    if (timeRange === "all") return events

    const now = new Date()
    const cutoffDate = new Date()

    switch (timeRange) {
      case "24h":
        cutoffDate.setDate(now.getDate() - 1)
        break
      case "7d":
        cutoffDate.setDate(now.getDate() - 7)
        break
      case "30d":
        cutoffDate.setDate(now.getDate() - 30)
        break
      case "90d":
        cutoffDate.setDate(now.getDate() - 90)
        break
    }

    return events.filter((event) => new Date(event.timestamp) >= cutoffDate)
  }

  // Apply all filters to events
  const filteredEvents = useMemo(() => {
    return auditEvents.filter((event) => {
      // Type filter
      if (eventTypeFilter !== "all" && event.type !== eventTypeFilter) return false

      // Status filter
      if (statusFilter !== "all" && event.status !== statusFilter) return false

      // User filter
      if (userFilter && event.user && !event.user.toLowerCase().includes(userFilter.toLowerCase())) return false

      // Search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        return (
          (event.file && event.file.toLowerCase().includes(searchLower)) ||
          event.message.toLowerCase().includes(searchLower) ||
          (event.ipfsHash && event.ipfsHash.toLowerCase().includes(searchLower)) ||
          (event.txHash && event.txHash.toLowerCase().includes(searchLower))
        )
      }

      return true
    })
  }, [auditEvents, eventTypeFilter, statusFilter, userFilter, searchTerm])

  // Prepare data for charts
  const chartData = useMemo(() => {
    if (!filteredEvents.length) return []

    if (groupBy === "type") {
      // Group by event type
      const typeCount: Record<string, number> = {}
      filteredEvents.forEach((event) => {
        typeCount[event.type] = (typeCount[event.type] || 0) + 1
      })

      return Object.entries(typeCount).map(([type, count]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: count,
      }))
    }

    // Group by time period
    const timeGroups: Record<string, number> = {}

    filteredEvents.forEach((event) => {
      const date = new Date(event.timestamp)
      let key: string

      switch (groupBy) {
        case "day":
          key = format(date, "yyyy-MM-dd")
          break
        case "week":
          // Get the week number
          const weekNum = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)
          key = `Week ${weekNum}, ${format(date, "MMM yyyy")}`
          break
        case "month":
          key = format(date, "MMM yyyy")
          break
        default:
          key = format(date, "yyyy-MM-dd")
      }

      timeGroups[key] = (timeGroups[key] || 0) + 1
    })

    return Object.entries(timeGroups)
      .sort((a, b) => {
        // Sort chronologically
        if (groupBy === "day") {
          return new Date(a[0]).getTime() - new Date(b[0]).getTime()
        }
        return 0
      })
      .map(([time, count]) => ({
        name: time,
        value: count,
      }))
  }, [filteredEvents, groupBy])

  // Prepare data for status distribution
  const statusData = useMemo(() => {
    const statusCount: Record<string, number> = {}
    filteredEvents.forEach((event) => {
      statusCount[event.status] = (statusCount[event.status] || 0) + 1
    })

    return Object.entries(statusCount).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
    }))
  }, [filteredEvents])

  // Pagination
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredEvents.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredEvents, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage)

  // Colors for charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]
  const STATUS_COLORS = {
    success: "#10B981",
    error: "#EF4444",
    warning: "#F59E0B",
    pending: "#6366F1",
  }

  const handleExport = async (format: "csv" | "json" | "pdf") => {
    try {
      if (format === "csv") {
        await exportAuditLog(filteredEvents)
        toast.success("Audit log exported as CSV")
      } else if (format === "json") {
        // Create and download JSON file
        const jsonString = JSON.stringify(filteredEvents, null, 2)
        const blob = new Blob([jsonString], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `blockchain-audit-log-${new Date().toISOString().split("T")[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success("Audit log exported as JSON")
      } else if (format === "pdf") {
        toast.info("PDF export is not implemented yet")
      }
    } catch (error) {
      console.error("Error exporting audit log:", error)
      toast.error("Failed to export audit log")
    }
  }

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
    } else if (type === "nft") {
      return <Hash className="h-4 w-4 text-indigo-500" />
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
    } else if (status === "pending") {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Pending
        </Badge>
      )
    } else {
      return <Badge variant="destructive">Error</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Audit Analytics</CardTitle>
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Enhanced Audit Dashboard</CardTitle>
            <CardDescription>Comprehensive analytics of blockchain storage and verification activities</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchAuditData(false)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filters Section */}
          <div className="bg-muted/40 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium mb-3">Filters & Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="time-range" className="text-xs">
                  Time Range
                </Label>
                <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                  <SelectTrigger id="time-range">
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {timeRange === "custom" && (
                <div>
                  <Label className="text-xs">Custom Date Range</Label>
                  <div className="flex items-center space-x-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                              </>
                            ) : (
                              format(dateRange.from, "LLL dd, y")
                            )
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          initialFocus
                          mode="range"
                          defaultMonth={dateRange.from}
                          selected={dateRange}
                          onSelect={(range) => {
                            if (range) {
                              setDateRange({
                                from: range.from,
                                to: range.to || range.from, // If to is undefined, use from as the end date
                              })
                            }
                          }}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="event-type" className="text-xs">
                  Event Type
                </Label>
                <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                  <SelectTrigger id="event-type">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="upload">Uploads</SelectItem>
                    <SelectItem value="download">Downloads</SelectItem>
                    <SelectItem value="verification">Verifications</SelectItem>
                    <SelectItem value="nft">NFT Operations</SelectItem>
                    <SelectItem value="access">Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status-filter" className="text-xs">
                  Status
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="search" className="text-xs">
                  Search
                </Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search files, hashes..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="chart-type" className="text-xs">
                  Chart Type
                </Label>
                <Select value={chartType} onValueChange={(value) => setChartType(value as any)}>
                  <SelectTrigger id="chart-type">
                    <SelectValue placeholder="Select chart type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="area">Area Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="group-by" className="text-xs">
                  Group By
                </Label>
                <Select value={groupBy} onValueChange={(value) => setGroupBy(value as any)}>
                  <SelectTrigger id="group-by">
                    <SelectValue placeholder="Group by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="type">Event Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <Switch id="real-time" checked={showRealTimeUpdates} onCheckedChange={setShowRealTimeUpdates} />
                  <Label htmlFor="real-time" className="text-xs">
                    Real-time Updates
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="charts">Charts</TabsTrigger>
              <TabsTrigger value="events">Event Log</TabsTrigger>
              <TabsTrigger value="integrity">Integrity</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-3xl font-bold">{filteredEvents.length}</div>
                    <p className="text-xs text-muted-foreground">Blockchain and IPFS activities</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-medium">Verification Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-3xl font-bold">{stats?.verificationSuccessRate || "0"}%</div>
                    <p className="text-xs text-muted-foreground">File integrity verifications</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-3xl font-bold">
                      {filteredEvents.length > 0
                        ? new Date(filteredEvents[0].timestamp).toLocaleDateString()
                        : "No activity"}
                    </div>
                    <p className="text-xs text-muted-foreground">Last recorded event</p>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Activity Summary</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="value" fill="#8884d8" name="Events" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Event Types</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Status Distribution</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusData.map((entry) => (
                            <Cell
                              key={`cell-${entry.name}`}
                              fill={STATUS_COLORS[entry.name.toLowerCase() as keyof typeof STATUS_COLORS] || "#9CA3AF"}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Recent Events</h3>
                <div className="space-y-4">
                  {filteredEvents.slice(0, 5).map((event) => (
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
                                      : event.type === "nft"
                                        ? "NFT operation"
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
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Charts Tab */}
            <TabsContent value="charts" className="mt-4">
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Visualization</CardTitle>
                    <CardDescription>Visual representation of blockchain activity over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      {chartType === "bar" && (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip />
                            <Legend />
                            <Bar dataKey="value" name="Events" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                      )}

                      {chartType === "pie" && (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              labelLine={true}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      )}

                      {chartType === "line" && (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip />
                            <Legend />
                            <Line type="monotone" dataKey="value" name="Events" stroke="#8884d8" activeDot={{ r: 8 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}

                      {chartType === "area" && (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip />
                            <Legend />
                            <Area type="monotone" dataKey="value" name="Events" stroke="#8884d8" fill="#8884d8" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Status Distribution</CardTitle>
                      <CardDescription>Distribution of event statuses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {statusData.map((entry) => (
                                <Cell
                                  key={`cell-${entry.name}`}
                                  fill={
                                    STATUS_COLORS[entry.name.toLowerCase() as keyof typeof STATUS_COLORS] || "#9CA3AF"
                                  }
                                />
                              ))}
                            </Pie>
                            <RechartsTooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Event Type Distribution</CardTitle>
                      <CardDescription>Distribution of different event types</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            data={chartData}
                            margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" />
                            <RechartsTooltip />
                            <Legend />
                            <Bar dataKey="value" name="Count" fill="#82ca9d" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Audit Event Log</CardTitle>
                  <CardDescription>Detailed log of all blockchain and IPFS activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {paginatedEvents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No audit events found matching your criteria.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {paginatedEvents.map((event) => (
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
                                            : event.type === "nft"
                                              ? "NFT operation"
                                              : "File access"}
                                    </p>
                                    {getStatusBadge(event.status)}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    <span className="font-medium">File:</span> {event.file}
                                    {event.fileId !== undefined && (
                                      <span className="ml-1 text-xs">(ID: {event.fileId})</span>
                                    )}
                                  </p>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Clock className="mr-1 h-3 w-3" />
                                    {event.timestamp}
                                  </div>
                                  <p className="text-sm mt-1">{event.message}</p>
                                </div>
                              </div>
                            </div>

                            {(event.ipfsHash || event.txHash || event.user) && (
                              <div className="mt-2 pt-2 border-t text-xs space-y-1">
                                {event.ipfsHash && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">IPFS Hash:</span>
                                    <span className="font-mono">
                                      {event.ipfsHash.substring(0, 16)}...
                                      {event.ipfsHash.substring(event.ipfsHash.length - 4)}
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
                                      {event.txHash.substring(0, 16)}...
                                      {event.txHash.substring(event.txHash.length - 4)}
                                    </a>
                                  </div>
                                )}
                                {event.user && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">User:</span>
                                    <span className="font-mono">
                                      {event.user.substring(0, 6)}...{event.user.substring(event.user.length - 4)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pagination */}
                  {filteredEvents.length > 0 && (
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-sm text-muted-foreground">
                        Showing {Math.min(filteredEvents.length, (currentPage - 1) * itemsPerPage + 1)} to{" "}
                        {Math.min(filteredEvents.length, currentPage * itemsPerPage)} of {filteredEvents.length} events
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="text-sm">
                          Page {currentPage} of {totalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="text-sm text-muted-foreground">{filteredEvents.length} events found</div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport("json")}>
                      <Download className="h-4 w-4 mr-2" />
                      Export JSON
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Integrity Tab */}
            <TabsContent value="integrity" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Integrity Verification Dashboard</CardTitle>
                  <CardDescription>Monitor and verify the integrity of your blockchain-stored files</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-sm font-medium">Verification Success Rate</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-3xl font-bold">{stats?.verificationSuccessRate || "0"}%</div>
                        <p className="text-xs text-muted-foreground">File integrity verifications</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-sm font-medium">Total Verifications</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-3xl font-bold">
                          {filteredEvents.filter((e) => e.type === "verification").length}
                        </div>
                        <p className="text-xs text-muted-foreground">Integrity checks performed</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-sm font-medium">Failed Verifications</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-3xl font-bold text-red-500">
                          {filteredEvents.filter((e) => e.type === "verification" && e.status !== "success").length}
                        </div>
                        <p className="text-xs text-muted-foreground">Integrity checks that failed</p>
                      </CardContent>
                    </Card>
                  </div>

                  <h3 className="text-lg font-medium mb-4">Verification History</h3>
                  <div className="space-y-4">
                    {filteredEvents
                      .filter((e) => e.type === "verification")
                      .slice(0, 10)
                      .map((event) => (
                        <div key={event.id} className="flex flex-col space-y-2 rounded-lg border p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              {getIcon(event.type, event.status)}
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">Integrity verification</p>
                                  {getStatusBadge(event.status)}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium">File:</span> {event.file}
                                  {event.fileId !== undefined && (
                                    <span className="ml-1 text-xs">(ID: {event.fileId})</span>
                                  )}
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
                                    {event.ipfsHash.substring(0, 16)}...
                                    {event.ipfsHash.substring(event.ipfsHash.length - 4)}
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

