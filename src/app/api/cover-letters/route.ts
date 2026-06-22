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

    const { resume, jobDescription, jobTitle, company, tone = "professional", strengths = [], gaps = [], missingKeywords = [] } = await req.json()

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Resume and job description required" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const prompt = `Write a truthful, strategic cover letter. ONLY mention skills explicitly in the resume. NEVER claim false expertise.

RESUME:
${resume.substring(0, 1500)}

JOB: ${jobTitle} at ${company}
DESCRIPTION:
${jobDescription.substring(0, 1000)}

STRENGTHS TO HIGHLIGHT: ${strengths.join(", ")}
GAPS TO ADDRESS: ${gaps.join(", ")}

TONE: ${tone}

Write a 3-4 paragraph cover letter (250-300 words) that:
1. Opens with genuine interest in THIS specific role and company
2. Highlights ACTUAL strengths that apply to the job
3. Addresses gaps truthfully (show willingness to learn)
4. Shows understanding of the company/role
5. Ends with confidence
6. Uses a ${tone} tone

CRITICAL: Only mention REAL skills from resume. Dishonesty will backfire.

Return ONLY the cover letter text, no headers.`

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: "Empty response from Groq" }, { status: 500 })
    }

    return NextResponse.json({ coverLetter: completion.choices[0]?.message?.content || "" })
  } catch (error) {
    console.error("Cover letter error:", error)
    return NextResponse.json({
      error: "Failed to generate cover letter",
      message: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}



