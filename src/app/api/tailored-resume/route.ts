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
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `Rewrite resume optimized for job. Keep ALL information truthful.

ORIGINAL RESUME:
${resume.substring(0, 1200)}

JOB: ${jobTitle} at ${company}

REQUIREMENTS:
${jobDescription.substring(0, 800)}

INSTRUCTIONS:
- Reorganize to highlight matching skills
- Keep all existing information (NO LIES)
- Use stronger action verbs
- Reorder by job relevance
- Return COMPLETE resume

START REWRITTEN RESUME:`
      }],
    })

    const content = completion.choices[0]?.message?.content

    if (!content || content.length < 50) {
      return NextResponse.json({ tailoredResume: resume })
    }

    return NextResponse.json({ tailoredResume: content })
  } catch (error) {
    console.error("Tailored resume error:", error)
    return NextResponse.json({ tailoredResume: "" })
  }
}
