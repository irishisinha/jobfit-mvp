import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 })

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    })
    
    if (!response.ok) return NextResponse.json({ error: "Failed to fetch URL" }, { status: 400 })

    const html = await response.text()
    
    const text = html
      .replace(/<script[^>]*>.*?<\/script>/gi, "")
      .replace(/<style[^>]*>.*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()

    return NextResponse.json({ 
      jobDescription: text.substring(0, 3000),
      source: url 
    })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Failed to fetch URL" }, { status: 500 })
  }
}