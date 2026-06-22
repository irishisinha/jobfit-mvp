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
        content: `Tailor this resume for: ${jobTitle} at ${company}

IMPORTANT RULES:
- Only use skills/experience ALREADY in the resume
- Reorder sections to highlight matching skills first
- Use keywords from job description where they apply
- Never add false experience or education
- Make the match OBVIOUS to a hiring manager

RESUME:
${resume.substring(0, 1500)}

JOB POSTING:
${jobDescription.substring(0, 1200)}

OUTPUT FORMAT:
[Tailored resume with reordered sections - put most relevant experience first]

Then on a new line:
CHANGES:
[1-3 bullet points of what you reordered/emphasized]

OUTPUT BOTH SECTIONS:`,
      }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 2500,
    })

    const fullContent = completion.choices[0]?.message?.content || ""
    
    // Parse resume and changes
    const changesIndex = fullContent.lastIndexOf("CHANGES:")
    const tailoredResume = changesIndex > 0 
      ? fullContent.substring(0, changesIndex).trim()
      : fullContent

    const changes = changesIndex > 0
      ? fullContent.substring(changesIndex + 8).trim()
      : "Resume reordered to highlight most relevant experience first"

    return NextResponse.json({
      tailoredResume: tailoredResume || "Unable to tailor",
      changes: changes.split('\n').slice(0, 3).join('\n')
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ 
      tailoredResume: "Error generating tailored resume",
      changes: "Please try again"
    }, { status: 500 })
  }
}