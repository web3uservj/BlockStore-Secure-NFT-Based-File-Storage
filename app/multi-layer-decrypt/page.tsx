"use client"

import { MultiLayerDecryptor } from "@/components/multi-layer-decryptor"

export default function MultiLayerDecryptPage() {
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Multi-Layer Decryption</h1>
      <p className="text-muted-foreground mb-6">
        Specialized tool for decrypting files that use multi-layer encryption
      </p>

      <div className="max-w-2xl mx-auto">
        <div className="bg-muted p-4 rounded-lg mb-6">
          <h3 className="font-medium mb-2">How to Use This Tool</h3>
          <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
            <li>Upload the encrypted file (typically downloaded from IPFS)</li>
            <li>Enter your encryption key or upload your key file</li>
            <li>Enter the original filename if you know it (e.g., "spirited away.jpg")</li>
            <li>
              Paste the complete encryption metadata JSON in the text area (you can copy this from your browser's
              localStorage or developer tools)
            </li>
            <li>Click "Decrypt and Download"</li>
          </ol>
          <p className="text-sm text-muted-foreground mt-2">
            This specialized tool is designed specifically for files encrypted with multi-layer encryption.
          </p>
        </div>

        <MultiLayerDecryptor />
      </div>
    </div>
  )
}
