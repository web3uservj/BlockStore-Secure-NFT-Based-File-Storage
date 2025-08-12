"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Gift, Lock } from "lucide-react"
import { MobileNav } from "@/components/mobile-nav"

// Define these types locally instead of importing from Prisma
type Course = {
  id: string
  title: string
}

type Category = {
  id: string
  name: string
}

interface ClientLayoutProps {
  children: React.ReactNode
  courses?: Course[]
  categories?: Category[]
}

export default function ClientLayout({ children, courses = [], categories = [] }: ClientLayoutProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  // Only show the UI once mounted on the client
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-full w-full">{children}</div>
  }

  return (
    <div className="h-full w-full flex flex-col md:flex-row">
      {/* Mobile Navigation */}
      <MobileNav pathname={pathname} />

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col fixed inset-y-0 z-50 w-64 bg-white border-r">
        <Link href="/" className="flex items-center p-6">
          <h1 className="text-2xl font-semibold">BlockStore</h1>
        </Link>
        <div className="flex flex-col w-full">
          <Link
            href="/"
            className={cn(
              "text-sm font-medium hover:text-primary transition-colors px-6 py-2",
              pathname === "/" ? "text-primary bg-secondary" : "text-muted-foreground",
            )}
          >
            Dashboard
          </Link>
          <Link
            href="/files"
            className={cn(
              "text-sm font-medium hover:text-primary transition-colors px-6 py-2",
              pathname === "/files" ? "text-primary bg-secondary" : "text-muted-foreground",
            )}
          >
            Files
          </Link>
          <Link
            href="/nfts"
            className={`text-sm font-medium ${pathname === "/nfts" ? "text-primary bg-secondary" : "text-muted-foreground"} px-6 py-2`}
          >
            <span className="flex items-center">
              <Gift className="h-4 w-4 mr-1" />
              NFTs
            </span>
          </Link>
          <Link
            href="/decrypt"
            className={cn(
              "text-sm font-medium hover:text-primary transition-colors px-6 py-2",
              pathname === "/decrypt" ? "text-primary bg-secondary" : "text-muted-foreground",
            )}
          >
            <span className="flex items-center">
              <Lock className="h-4 w-4 mr-1" />
              Decrypt Files
            </span>
          </Link>
          <Link
            href="/audit"
            className={cn(
              "text-sm font-medium hover:text-primary transition-colors px-6 py-2",
              pathname === "/audit" ? "text-primary bg-secondary" : "text-muted-foreground",
            )}
          >
            Audit
          </Link>
          <Link
            href="/settings"
            className={cn(
              "text-sm font-medium hover:text-primary transition-colors px-6 py-2",
              pathname === "/settings" ? "text-primary bg-secondary" : "text-muted-foreground",
            )}
          >
            Settings
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="md:pl-64 w-full h-full">{children}</main>
    </div>
  )
}
