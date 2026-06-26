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

    const { resume, jobDescription } = await req.json()
    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const prompt = `Analyze this resume against the job description. Be SMART about gaps:

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

IDENTIFY GAPS (but be selective):
- CRITICAL gaps: Missing required technical skills, tools, or core competencies
- IGNORE soft gaps: Industry experience (transferable skills from other industries count)
- IGNORE preferences: "Nice-to-have", "preferred", "ideal", experience with specific industries
- IGNORE generic: General soft skills (detail-oriented, communication, etc)

Only flag TRUE MISSING SKILLS, not industry preferences.

Examples of TRUE GAPS:
- Job needs "Python" but resume has no Python experience
- Job needs "5+ years management" but resume shows 2 years

Examples of NOT GAPS (ignore these):
- "Experience in FMCG industry preferred" (other industries transfer)
- "Familiarity with Agile nice-to-have" (if they have structured project exp)
- "MBA preferred" (relevant experience substitutes)

Respond in this EXACT JSON format:
{
  "strengths": ["real strength 1", "real strength 2", "real strength 3"],
  "gaps": ["ONLY critical gaps", "not nice-to-haves"],
  "missingKeywords": ["critical keyword 1", "critical keyword 2"]
}

Respond ONLY with JSON, no other text.`

    const message = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 1000,
    })

    const content = message.choices[0]?.message?.content || ""
    
    try {
      const data = JSON.parse(content)
      return NextResponse.json({
        strengths: data.strengths || [],
        gaps: data.gaps || [],
        missingKeywords: data.missingKeywords || [],
      })
    } catch (e) {
      console.error("Parse failed:", content.substring(0, 300))
      return NextResponse.json({
        strengths: [],
        gaps: [],
        missingKeywords: [],
      })
    }
  } catch (error: any) {
    console.error("Assess error:", error)
    return NextResponse.json({
      strengths: [],
      gaps: [],
      missingKeywords: [],
    }, { status: 500 })
  }
}
