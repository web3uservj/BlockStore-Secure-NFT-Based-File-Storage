"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Menu, Gift, Lock } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface MobileNavProps {
  pathname?: string
}

export function MobileNav({ pathname }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild className="md:hidden fixed top-4 left-4 z-40">
        <Button variant="ghost" size="icon">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 bg-white">
        <div className="flex flex-col w-64">
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
              onClick={() => setOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/files"
              className={cn(
                "text-sm font-medium hover:text-primary transition-colors px-6 py-2",
                pathname === "/files" ? "text-primary bg-secondary" : "text-muted-foreground",
              )}
              onClick={() => setOpen(false)}
            >
              Files
            </Link>
            <Link
              href="/nfts"
              className={`text-sm font-medium ${pathname === "/nfts" ? "text-primary bg-secondary" : "text-muted-foreground"} px-6 py-2`}
              onClick={() => setOpen(false)}
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
              onClick={() => setOpen(false)}
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
              onClick={() => setOpen(false)}
            >
              Audit
            </Link>
            <Link
              href="/settings"
              className={cn(
                "text-sm font-medium hover:text-primary transition-colors px-6 py-2",
                pathname === "/settings" ? "text-primary bg-secondary" : "text-muted-foreground",
              )}
              onClick={() => setOpen(false)}
            >
              Settings
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
