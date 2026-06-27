import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files supported" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Dynamically import pdf-parse (Node.js only)
    const pdfParse = require("pdf-parse")

    const data = await pdfParse(buffer)
    const text = data.text

    return NextResponse.json({ text })
  } catch (error: any) {
    console.error("PDF extraction error:", error.message)
    return NextResponse.json(
      { error: `Failed to extract PDF: ${error.message}` },
      { status: 500 }
    )
  }
}
