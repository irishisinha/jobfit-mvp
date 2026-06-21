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

    const prompt = `Optimize this resume for a specific job. ONLY reorganize existing experience - NEVER add false skills.

RESUME:
${resume.substring(0, 2000)}

TARGET JOB: ${jobTitle} at ${company}

JOB DESCRIPTION:
${jobDescription.substring(0, 1000)}

ACTUAL CANDIDATE STRENGTHS:
${strengths.slice(0, 2).join(", ")}

INSTRUCTIONS:
1. Reorganize bullets to highlight relevant achievements
2. Use stronger action verbs for REAL accomplishments
3. ONLY add keywords that legitimately match actual experience
4. Skip keywords that don't fit - don't force them
5. Maintain all original facts - NOTHING FABRICATED
6. Keep same format

Return the optimized resume only, no explanations.`

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 2048,
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
