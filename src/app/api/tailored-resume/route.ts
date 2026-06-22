import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { authOptions } from "../../../lib/auth"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { resume, jobDescription, jobTitle, company, tailorWorth } = await req.json()

    if (!resume?.trim() || !jobDescription?.trim() || !tailorWorth) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Don't generate if tailor worth is too low
    if (tailorWorth < 5) {
      return NextResponse.json({ 
        resume: "Resume is already well-matched. Minimal tailoring needed.",
        changes: "No significant changes recommended."
      })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      messages: [{
        role: "user",
        content: `You are a resume expert. Take this resume and tailor it for this job by REORDERING and REEMPHASIZING existing content only. Never add false information.

ORIGINAL RESUME:
${resume.substring(0, 1500)}

TARGET JOB: ${jobTitle} at ${company}
JOB DESCRIPTION:
${jobDescription.substring(0, 1000)}

Instructions:
1. Keep ONLY skills and experience from the original resume
2. Reorder sections to emphasize what matches this role
3. Rephrase bullet points to use keywords from the job posting
4. Remove or downplay irrelevant experience
5. Keep all information TRUTHFUL

Return ONLY this format:
TAILORED RESUME:
[Full tailored resume here - keep same structure]

KEY CHANGES:
- Moved X to top to match role focus
- Reworded Y to use industry language
- Emphasized Z which directly matches requirement`,
      }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 2000,
    })

    const content = completion.choices[0]?.message?.content || ""
    
    // Extract sections
    const resumeMatch = content.match(/TAILORED RESUME:([\s\S]*?)(?:KEY CHANGES:|$)/)
    const changesMatch = content.match(/KEY CHANGES:([\s\S]*)/)

    const tailoredResume = resumeMatch ? resumeMatch[1].trim() : "Unable to tailor - check your inputs"
    const changes = changesMatch ? changesMatch[1].trim() : "Resume reordered to emphasize matching skills"

    return NextResponse.json({
      resume: tailoredResume,
      changes: changes
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ 
      resume: "Error generating tailored resume",
      changes: "Please try again"
    }, { status: 500 })
  }
}