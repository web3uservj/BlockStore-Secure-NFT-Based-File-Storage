"use client"

import { FileDecryptor } from "@/components/file-decryptor"

export default function DecryptPage() {
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold tracking-tight mb-2">File Decryption</h1>
      <p className="text-muted-foreground mb-6">Decrypt files that were encrypted with your encryption key</p>

      <div className="max-w-md mx-auto">
        <div className="bg-muted p-4 rounded-lg mb-6">
          <h3 className="font-medium mb-2">Decrypting Files from IPFS</h3>
          <p className="text-sm text-muted-foreground mb-2">
            When you download files from IPFS/Pinata, they will have names like
            "bafkreidbmktf7covwccj3uns354yk5226bf6yjadtvhy7ir5uj36bje244" instead of the original filename with .enc
            extension. This is normal.
          </p>
          <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
            <li>Upload the file you downloaded from IPFS</li>
            <li>Enter your encryption key or upload your key file</li>
            <li>If you know the original filename, enter it in the "Output Filename" field</li>
            <li>Click "Advanced Options" and try different algorithms (AES-GCM, AES-CBC, AES-CTR)</li>
            <li>If you have the IV (Initialization Vector), enter it in the advanced options</li>
            <li>Try both 128-bit and 256-bit key lengths</li>
            <li>Click "Decrypt and Download"</li>
          </ol>
          <p className="text-sm text-muted-foreground mt-2 font-medium">
            If decryption fails, try different combinations of algorithm and key length in the advanced options.
          </p>
        </div>

        <FileDecryptor />
      </div>
    </div>
  )
}
