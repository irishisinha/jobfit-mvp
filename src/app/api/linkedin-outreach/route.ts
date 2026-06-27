import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
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

    const prompt = `Write a SHORT, authentic LinkedIn message (120-160 words).

RESUME:
${resume}

TARGET JOB: ${jobTitle} at ${company}

CRITICAL: Only reference achievements and experience actually in the resume.
- Pick ONE genuine achievement from resume
- Do NOT claim skills/experience candidate doesn't have
- Be authentic, not keyword-stuffed
- Reference real, relevant accomplishment only

Write message that:
1. Opens with specific reason for connecting (reference real achievement or company)
2. Mention ONE real achievement from resume
3. Show genuine interest in THIS opportunity
4. Soft call-to-action
5. Keep it SHORT and conversational
6. NO false claims

Return ONLY the message text, ready to paste into LinkedIn.`

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
    return NextResponse.json({ error: "Failed to generate LinkedIn message", details: error.message }, { status: 500 })
  }
}
