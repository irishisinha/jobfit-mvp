import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

export async function POST(req: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY
    
    if (!groqKey) {
      return NextResponse.json({
        error: "GROQ_API_KEY not set",
        status: "fail"
      }, { status: 500 })
    }

    const groq = new Groq({
      apiKey: groqKey,
    })

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: "Say hello in 3 words",
        },
      ],
    })

    const content = completion.choices[0]?.message?.content

    return NextResponse.json({
      status: "success",
      groqResponse: content,
      modelUsed: "llama-3.1-8b-instant",
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      status: "error",
      errorType: error instanceof Error ? error.constructor.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : String(error),
      errorDetails: error instanceof Error ? error.stack : null
    }, { status: 500 })
  }
}
