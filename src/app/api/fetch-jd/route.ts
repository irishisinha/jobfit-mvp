import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 })

    // Validate URL format
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    // LinkedIn requires manual copy-paste due to Terms of Service
    // Automated scraping violates LinkedIn's TOS and risks account/IP blocking
    if (parsedUrl.hostname.includes("linkedin.com")) {
      return NextResponse.json({
        error: "LinkedIn job descriptions must be copied and pasted manually",
        reason: "LinkedIn's Terms of Service prohibit automated content extraction. We recommend: 1) Opening the LinkedIn job link, 2) Copying the job description, 3) Pasting it in the 'Paste JD' tab. This protects both your account and our service.",
        status: 403
      }, { status: 403 })
    }

    let html: string

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

    html = await response.text()

    if (!html || html.length < 100) {
      return NextResponse.json({ error: "Page content too short or empty" }, { status: 400 })
    }

    // Remove script and style tags with their content
    html = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      // Remove navigation/header sections (less aggressive - only obvious nav)
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")

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

    // Check if content is likely just page skeleton (LinkedIn, etc. load content via JavaScript)
    // If content is very small or mostly navigation text, it means JavaScript content wasn't loaded
    const hasJobContent = text.toLowerCase().match(
      /(?:qualifications|requirements|responsibilities|skills|experience|education|about|job description|what we|why you|apply now|salary|location)/
    )

    if (!hasJobContent && text.length < 500) {
      const sourceHost = new URL(url).hostname
      return NextResponse.json({
        error: `${sourceHost} uses JavaScript to load job descriptions. Please copy and paste the job description directly instead of using the URL.`,
        suggestion: "Use 'Paste JD' tab instead"
      }, { status: 400 })
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