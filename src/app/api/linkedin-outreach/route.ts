import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../lib/auth"
import Groq from "groq-sdk"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { resume, jobDescription, jobTitle, company, strengths = [] } = await req.json()

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Resume and job description required" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const prompt = `Write a SHORT, personalized LinkedIn connection message (120-160 words max).

COMPLETE RESUME:
${resume}

TARGET JOB: ${jobTitle} at ${company}

JOB DESCRIPTION:
${jobDescription}

KEY STRENGTHS: ${strengths.slice(0, 3).join(", ")}

Write a message that:
1. Opens with specific reason for connecting (reference company mission or role)
2. Mention ONE relevant achievement from the resume
3. Show genuine interest in THIS opportunity
4. Soft call-to-action ("I'd love to learn more..." or "Would appreciate your insights...")
5. Keep it SHORT, conversational, authentic
6. NO corporate jargon or buzzwords
7. NO false claims - only mention REAL skills/experience

Return ONLY the message text, ready to paste into LinkedIn. No formatting or headers.`

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 500,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: "Empty response from Groq" }, { status: 500 })
    }

    return NextResponse.json({ linkedInMessage: content })
  } catch (error: any) {
    console.error("LinkedIn error:", error)
    return NextResponse.json({
      error: "Failed to generate LinkedIn message",
      details: error.message,
    }, { status: 500 })
  }
}
