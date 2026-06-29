import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 })

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch URL (${response.status})` }, { status: 400 })
    }

    let html = await response.text()

    if (!html || html.length < 100) {
      return NextResponse.json({ error: "Page content too short or empty" }, { status: 400 })
    }

    // Remove script and style tags with their content
    html = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")

    // Try to extract job description from common containers
    let contentMatch = html.match(
      /<(?:article|main|section|div[^>]*(?:class|id)="[^"]*(?:description|content|job-details|job-description|description-section)[^"]*"[^>]*)(?:[^>])*>[\s\S]*?<\/(?:article|main|section|div)>/i
    )

    if (contentMatch) {
      html = contentMatch[0]
    }

    // Extract text from HTML, preserving structure
    let text = html
      // Convert common block elements to newlines for better separation
      .replace(/<\/(p|div|section|article|li|blockquote|h\d|ul|ol|tr|td)>/gi, "\n")
      .replace(/<(br|hr)\s*\/?>/gi, "\n")
      // Remove all other HTML tags
      .replace(/<[^>]+>/g, " ")
      // Decode HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      // Normalize whitespace (but preserve line breaks)
      .split('\n')
      .map(line => line.replace(/\s+/g, " ").trim())
      .filter(line => line.length > 0)
      .join("\n")
      .trim()

    // Remove common non-job-description sections at the end
    text = text
      .replace(/(?:Apply now|Submit application|Quick apply)[\s\S]*$/i, "")
      .replace(/(?:Report this job|Flag this job|Share this job)[\s\S]*$/i, "")
      .trim()

    if (!text) {
      return NextResponse.json({ error: "No readable content found" }, { status: 400 })
    }

    // Increase limit to 50000 characters to capture complete JDs
    // Most job postings are under this limit, even with detailed requirements
    const MAX_CHARS = 50000
    const jobDescription = text.length > MAX_CHARS ? text.substring(0, MAX_CHARS) : text

    return NextResponse.json({
      jobDescription,
      source: url,
      contentLength: text.length,
      truncated: text.length > MAX_CHARS
    })
  } catch (err: any) {
    console.error("Fetch JD error:", err)

    if (err.name === "AbortError") {
      return NextResponse.json({ error: "URL fetch timed out (took more than 10s)" }, { status: 408 })
    }

    return NextResponse.json({
      error: err.message || "Failed to fetch URL"
    }, { status: 500 })
  }
}