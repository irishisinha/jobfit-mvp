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

    const { resume, jobDescription, jobTitle, company, tone = "professional" } = await req.json()

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Resume and job description required" }, { status: 400 })
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })

    const prompt = `Write a truthful, strategic cover letter. ONLY mention skills explicitly in the resume. NEVER claim false expertise.

RESUME:
${resume.substring(0, 1500)}

JOB: ${jobTitle} at ${company}

JOB DESCRIPTION:
${jobDescription.substring(0, 1000)}

TONE: ${tone}

Write a 3-4 paragraph cover letter (250-300 words) that:
1. Opens with genuine interest in THIS specific role and company
2. Highlights ACTUAL strengths from the resume that apply to the job
3. Addresses gaps truthfully (show willingness to learn, NOT fake expertise)
4. Shows understanding of the company/role
5. Ends with confidence in genuine value
6. Maintains a ${tone} tone

CRITICAL: Only mention REAL skills from resume. Dishonesty will backfire in interviews.

Return ONLY the cover letter text, no headers or explanations.`

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: "Empty response from Groq" }, { status: 500 })
    }

    return NextResponse.json({ content })
  } catch (error) {
    return NextResponse.json({
      error: "Failed to generate cover letter",
      message: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
