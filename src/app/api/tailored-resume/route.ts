import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body
    try {
      body = await req.json()
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON in request" }, { status: 400 })
    }

    const {
      resume,
      jobDescription,
      jobTitle,
      company,
      strengths = [],
      gaps = [],
      missingKeywords = [],
    } = body

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Resume and job description required" }, { status: 400 })
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "Server error: GROQ_API_KEY not set" }, { status: 500 })
    }

    const keywordsList = missingKeywords.length > 0 
      ? missingKeywords.join(", ")
      : ""

    const prompt = `You are an expert resume writer OPTIMIZING a resume for a specific job.

CRITICAL RULES:
1. ONLY reorganize existing experience - NEVER add false skills
2. ONLY add keywords that legitimately match actual strengths and experience
3. Skip keywords that don't fit - don't force them
4. Use stronger action verbs for REAL achievements
5. Quantify real results (metrics, percentages, impact)
6. Maintain all original facts - NOTHING FABRICATED
7. Keep same format/structure but optimize for THIS job

ORIGINAL RESUME:
${resume}

TARGET JOB:
Position: ${jobTitle || "Position"}
Company: ${company || "Company"}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S ACTUAL STRENGTHS:
${strengths.length > 0 ? strengths.join(" | ") : "Analyze from resume"}

KEYWORDS (only if legitimate):
${keywordsList}

Optimize by:
1. Reorganize bullets to prioritize actual relevant achievements
2. Use stronger action verbs for real accomplishments
3. Quantify real results
4. Highlight genuine transferable skills
5. ONLY add keywords that legitimately fit
6. Skip keywords that don't match actual background
7. Honest optimization, not fabrication

Return the optimized resume in same format as original.`

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    const content = completion.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: "Groq returned empty response" }, { status: 500 })
    }

    return NextResponse.json({
      content,
      originalResume: resume,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const errorName = error instanceof Error ? error.name : "Unknown"
    
    return NextResponse.json(
      {
        error: "Failed to generate tailored resume",
        type: errorName,
        message: errorMsg,
      },
      { status: 500 }
    )
  }
}
