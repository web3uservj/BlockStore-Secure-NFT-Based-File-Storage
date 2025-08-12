"use client"

import { AdvancedFileDecryptor } from "@/components/advanced-file-decryptor"

export default function AdvancedDecryptPage() {
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Advanced File Decryption</h1>
      <p className="text-muted-foreground mb-6">Troubleshoot and decrypt files with enhanced options and debugging</p>

      <div className="max-w-3xl mx-auto">
        <div className="bg-muted p-4 rounded-lg mb-6">
          <h3 className="font-medium mb-2">Decryption Troubleshooting Guide</h3>
          <p className="text-sm text-muted-foreground mb-2">
            This advanced decryption tool provides multiple strategies to recover your encrypted files:
          </p>
          <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
            <li>Try all combinations of algorithms (AES-GCM, AES-CBC, AES-CTR)</li>
            <li>Test both 128-bit and 256-bit key lengths</li>
            <li>Attempt decryption with and without authentication tags</li>
            <li>Provide detailed error messages to identify the issue</li>
            <li>Support for raw binary data inspection</li>
          </ol>
        </div>

        <AdvancedFileDecryptor />
      </div>
    </div>
  )
}
