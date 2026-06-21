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

    const { resume, jobDescription, jobTitle, company, strengths = [] } = await req.json()

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Resume and job description required" }, { status: 400 })
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })

    const prompt = `Optimize resume for: ${jobTitle} at ${company}

Resume: ${resume}

Job Description: ${jobDescription}

Rules: Reorganize to highlight achievements. Use stronger verbs. Only add keywords that legitimately fit. Keep same format. Return complete optimized resume.`

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: "Empty response from Groq" }, { status: 500 })
    }

    return NextResponse.json({ content })
  } catch (error) {
    return NextResponse.json({
      error: "Failed to generate tailored resume",
      message: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
