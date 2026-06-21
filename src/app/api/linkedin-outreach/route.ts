import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import Groq from "groq-sdk"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { resume, jobDescription, jobTitle, company, recipientName, recipientRole } = await req.json()

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Resume and job description required" }, { status: 400 })
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })

    const prompt = `Write a SHORT, personalized LinkedIn connection message (150-200 words max).

RESUME:
${resume.substring(0, 1000)}

TARGET JOB: ${jobTitle} at ${company}

JOB DESCRIPTION:
${jobDescription.substring(0, 800)}

RECIPIENT: ${recipientName || "Hiring Manager"} (${recipientRole || "Not specified"})

Write a message that:
1. Opens with specific reason for connecting (reference company or role)
2. Briefly mentions ONE relevant achievement from resume
3. Shows genuine interest in THIS specific opportunity
4. Ends with soft call-to-action (chat, advice, learn more)
5. Keep it SHORT and conversational
6. NO corporate jargon or buzzwords

Return ONLY the message text, ready to paste into LinkedIn.`

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: "Empty response from Groq" }, { status: 500 })
    }

    return NextResponse.json({ content })
  } catch (error) {
    return NextResponse.json({
      error: "Failed to generate LinkedIn message",
      message: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
