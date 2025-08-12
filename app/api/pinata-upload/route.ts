import { type NextRequest, NextResponse } from "next/server"

// Pinata API keys from environment variables
const PINATA_API_KEY = process.env.PINATA_API_KEY
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY

export async function POST(request: NextRequest) {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    return NextResponse.json({ error: "Pinata API keys not configured" }, { status: 500 })
  }

  try {
    // Get the form data from the request
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Create a new FormData instance for the Pinata API
    const pinataFormData = new FormData()
    pinataFormData.append("file", file)

    // Add metadata
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        size: file.size,
        type: file.type,
        uploadDate: new Date().toISOString(),
      },
    })
    pinataFormData.append("pinataMetadata", metadata)

    // Add options
    const options = JSON.stringify({
      cidVersion: 1,
    })
    pinataFormData.append("pinataOptions", options)

    // Send the request to Pinata
    const pinataResponse = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
      body: pinataFormData,
    })

    if (!pinataResponse.ok) {
      const errorData = await pinataResponse.text()
      console.error("Pinata API error:", errorData)
      return NextResponse.json({ error: `Pinata API error: ${errorData}` }, { status: pinataResponse.status })
    }

    const data = await pinataResponse.json()

    return NextResponse.json({
      success: true,
      ipfsHash: data.IpfsHash,
      pinSize: data.PinSize,
      timestamp: data.Timestamp,
    })
  } catch (error) {
    console.error("Error uploading to Pinata:", error)
    return NextResponse.json({ error: "Failed to upload file to IPFS" }, { status: 500 })
  }
}

