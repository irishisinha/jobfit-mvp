import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY
    const hasKey = !!groqKey
    const keyPreview = groqKey ? groqKey.substring(0, 10) + "..." : "NOT SET"

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      groqApiKeySet: hasKey,
      groqKeyPreview: keyPreview,
      nodeEnv: process.env.NODE_ENV,
      message: "Test endpoint working"
    })
  } catch (error) {
    return NextResponse.json({
      error: "Test failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
