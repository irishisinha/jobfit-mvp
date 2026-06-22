import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { authOptions } from "../../../lib/auth"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { resume, jobDescription, jobTitle, company } = await req.json()

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      messages: [{
        role: "user",
        content: `Reorder and emphasize this resume for: ${jobTitle} at ${company}

RULES:
1. Use ONLY skills/experience already in resume
2. Reorder sections to highlight what matches this job
3. Use job keywords where appropriate
4. Never add false experience
5. Output the TAILORED RESUME only (full resume)

ORIGINAL RESUME:
${resume.substring(0, 1500)}

JOB DESCRIPTION:
${jobDescription.substring(0, 1000)}

OUTPUT ONLY THE TAILORED RESUME (no explanations):`,
      }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 2000,
    })

    const tailoredResume = completion.choices[0]?.message?.content || "Unable to tailor resume"

    return NextResponse.json({
      tailoredResume: tailoredResume.trim()
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ 
      tailoredResume: "Error generating tailored resume - please try again"
    }, { status: 500 })
  }
}