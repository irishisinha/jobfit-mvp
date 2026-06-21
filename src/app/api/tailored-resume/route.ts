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

    const { resume, jobDescription, jobTitle, company } = await req.json()

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Resume and job description required" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 2500,
      messages: [{
        role: "user",
        content: `Rewrite this resume to optimize for the job. Keep ALL information truthful.

ORIGINAL RESUME:
${resume.substring(0, 1200)}

TARGET JOB: ${jobTitle} at ${company}

REQUIREMENTS:
${jobDescription.substring(0, 800)}

REWRITE INSTRUCTIONS:
1. Keep every fact from the original (NO LIES)
2. Reorganize to highlight matching skills FIRST
3. Use stronger action verbs
4. Reorder bullets by job relevance
5. Keep same structure and format
6. Return COMPLETE rewritten resume

START REWRITTEN RESUME:`
      }],
    })

    let content = completion.choices[0]?.message?.content || ""

    if (!content || content.length < 50) {
      content = resume
    }

    return NextResponse.json({ tailoredResume: content })
  } catch (error) {
    console.error("Tailored resume error:", error)
    return NextResponse.json({ tailoredResume: "" })
  }
}
