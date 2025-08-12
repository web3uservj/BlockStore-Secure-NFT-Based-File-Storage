/**
 * This file contains functions for audit logging and tracking
 * for blockchain file storage operations
 */

// Update your AuditEventType to include "nft"
export type AuditEventType =
  | "upload"
  | "download"
  | "delete"
  | "access"
  | "encryption"
  | "decryption"
  | "nft"
  | "verification"

// Update the AuditEvent interface to include the user property
export interface AuditEvent {
  id: string
  type: AuditEventType
  file?: string
  fileId?: number | string
  ipfsHash?: string
  timestamp: string
  status: "success" | "error" | "warning" | "pending"
  message: string
  txHash?: string // Add this for blockchain transactions
  user?: string // Add this for user information
  metadata?: Record<string, any> // Add this for additional metadata
}

// Local storage key for audit events
const AUDIT_STORAGE_KEY = "blockchain-audit-events"

/**
 * Log a new audit event
 */
export async function logAuditEvent(event: Omit<AuditEvent, "id">): Promise<AuditEvent> {
  try {
    // Generate a unique ID for the event
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    // Create the complete event object
    const completeEvent: AuditEvent = {
      id,
      ...event,
    }

    // Get existing events from localStorage
    const existingEvents = await getAuditEvents()

    // Add the new event to the beginning of the array
    const updatedEvents = [completeEvent, ...existingEvents]

    // Save back to localStorage
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updatedEvents))

    return completeEvent
  } catch (error) {
    console.error("Error logging audit event:", error)
    throw error
  }
}

/**
 * Get all audit events
 */
export async function getAuditEvents(): Promise<AuditEvent[]> {
  try {
    const storedEvents = localStorage.getItem(AUDIT_STORAGE_KEY)
    if (!storedEvents) {
      return []
    }

    return JSON.parse(storedEvents) as AuditEvent[]
  } catch (error) {
    console.error("Error getting audit events:", error)
    return []
  }
}

/**
 * Get audit events for a specific file
 */
export async function getFileAuditEvents(fileId: number | string): Promise<AuditEvent[]> {
  try {
    const allEvents = await getAuditEvents()
    return allEvents.filter((event) => event.fileId === fileId)
  } catch (error) {
    console.error("Error getting file audit events:", error)
    return []
  }
}

/**
 * Get audit events for a specific user
 */
export async function getUserAuditEvents(userAddress: string): Promise<AuditEvent[]> {
  try {
    const allEvents = await getAuditEvents()
    return allEvents.filter((event) => event.user?.toLowerCase() === userAddress.toLowerCase())
  } catch (error) {
    console.error("Error getting user audit events:", error)
    return []
  }
}

/**
 * Get audit events by type
 */
export async function getAuditEventsByType(type: AuditEventType): Promise<AuditEvent[]> {
  try {
    const allEvents = await getAuditEvents()
    return allEvents.filter((event) => event.type === type)
  } catch (error) {
    console.error("Error getting audit events by type:", error)
    return []
  }
}

/**
 * Get audit events by status
 */
export async function getAuditEventsByStatus(
  status: "success" | "error" | "warning" | "pending",
): Promise<AuditEvent[]> {
  try {
    const allEvents = await getAuditEvents()
    return allEvents.filter((event) => event.status === status)
  } catch (error) {
    console.error("Error getting audit events by status:", error)
    return []
  }
}

/**
 * Get audit events by date range
 */
export async function getAuditEventsByDateRange(startDate: Date, endDate: Date): Promise<AuditEvent[]> {
  try {
    const allEvents = await getAuditEvents()
    return allEvents.filter((event) => {
      const eventDate = new Date(event.timestamp)
      return eventDate >= startDate && eventDate <= endDate
    })
  } catch (error) {
    console.error("Error getting audit events by date range:", error)
    return []
  }
}

/**
 * Clear all audit events (for testing purposes)
 */
export async function clearAuditEvents(): Promise<void> {
  try {
    localStorage.removeItem(AUDIT_STORAGE_KEY)
  } catch (error) {
    console.error("Error clearing audit events:", error)
  }
}

/**
 * Export audit log as CSV
 */
export async function exportAuditLog(events: AuditEvent[]): Promise<void> {
  // Create CSV content
  const headers = [
    "ID",
    "Type",
    "File",
    "File ID",
    "IPFS Hash",
    "Timestamp",
    "Status",
    "Message",
    "Transaction Hash",
    "User",
  ]
  const csvContent = [
    headers.join(","),
    ...events.map((event) =>
      [
        event.id,
        event.type,
        `"${event.file || ""}"`, // Quote file names to handle commas
        event.fileId || "",
        event.ipfsHash || "",
        event.timestamp,
        event.status,
        `"${event.message}"`, // Quote messages to handle commas
        event.txHash || "",
        event.user || "",
      ].join(","),
    ),
  ].join("\n")

  // Create a blob and download it
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `blockchain-audit-log-${new Date().toISOString().split("T")[0]}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Get audit statistics
 */
export async function getAuditStats(): Promise<{
  totalEvents: number
  eventsByType: Record<string, number>
  eventsByStatus: Record<string, number>
  verificationSuccessRate: string
  eventsByDay: Record<string, number>
  eventsByUser: Record<string, number>
}> {
  try {
    const events = await getAuditEvents()

    // Count events by type
    const eventsByType = events.reduce(
      (acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Count events by status
    const eventsByStatus = events.reduce(
      (acc, event) => {
        acc[event.status] = (acc[event.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Count events by day
    const eventsByDay = events.reduce(
      (acc, event) => {
        const date = new Date(event.timestamp).toISOString().split("T")[0]
        acc[date] = (acc[date] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Count events by user
    const eventsByUser = events.reduce(
      (acc, event) => {
        if (event.user) {
          acc[event.user] = (acc[event.user] || 0) + 1
        }
        return acc
      },
      {} as Record<string, number>,
    )

    // Calculate verification success rate
    const verificationEvents = events.filter((e) => e.type === "verification")
    const successfulVerifications = verificationEvents.filter((e) => e.status === "success")
    const verificationSuccessRate =
      verificationEvents.length > 0
        ? ((successfulVerifications.length / verificationEvents.length) * 100).toFixed(1)
        : "100"

    return {
      totalEvents: events.length,
      eventsByType,
      eventsByStatus,
      verificationSuccessRate,
      eventsByDay,
      eventsByUser,
    }
  } catch (error) {
    console.error("Error getting audit stats:", error)
    return {
      totalEvents: 0,
      eventsByType: {},
      eventsByStatus: {},
      verificationSuccessRate: "0",
      eventsByDay: {},
      eventsByUser: {},
    }
  }
}

/**
 * Generate a report of audit events
 */
export async function generateAuditReport(options: {
  startDate?: Date
  endDate?: Date
  type?: AuditEventType
  status?: "success" | "error" | "warning" | "pending"
  user?: string
}): Promise<{
  totalEvents: number
  successRate: string
  eventsByType: Record<string, number>
  eventsByStatus: Record<string, number>
  events: AuditEvent[]
}> {
  try {
    let events = await getAuditEvents()

    // Apply filters
    if (options.startDate && options.endDate) {
      events = events.filter((event) => {
        const eventDate = new Date(event.timestamp)
        return eventDate >= options.startDate! && eventDate <= options.endDate!
      })
    }

    if (options.type) {
      events = events.filter((event) => event.type === options.type)
    }

    if (options.status) {
      events = events.filter((event) => event.status === options.status)
    }

    if (options.user) {
      events = events.filter((event) => event.user?.toLowerCase() === options.user?.toLowerCase())
    }

    // Count events by type
    const eventsByType = events.reduce(
      (acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Count events by status
    const eventsByStatus = events.reduce(
      (acc, event) => {
        acc[event.status] = (acc[event.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Calculate success rate
    const successEvents = events.filter((e) => e.status === "success")
    const successRate = events.length > 0 ? ((successEvents.length / events.length) * 100).toFixed(1) : "100"

    return {
      totalEvents: events.length,
      successRate,
      eventsByType,
      eventsByStatus,
      events,
    }
  } catch (error) {
    console.error("Error generating audit report:", error)
    throw error
  }
}

