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

    const {
      resume,
      jobDescription,
      jobTitle,
      company,
      strengths = [],
      gaps = [],
      missingKeywords = [],
    } = await req.json()

    if (!resume || !jobDescription) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 })
    }

    const keywordsList = missingKeywords.length > 0 
      ? missingKeywords.join(", ")
      : ""

    const prompt = `You are an expert resume writer OPTIMIZING (not rewriting) a resume for a specific job.

CRITICAL TRUTHFULNESS RULES - MUST FOLLOW:
1. ONLY reorganize and reframe EXISTING experience - NEVER add false skills or jobs
2. ONLY add keywords that legitimately match the candidate's actual strengths and experience
3. Do NOT add keywords just because they appear in the job description
4. If a keyword doesn't fit the candidate's real background, SKIP it
5. Reorganize bullet points to emphasize ACTUAL relevant accomplishments
6. Use stronger action verbs for REAL achievements
7. Be authentic and stay truthful - optimization, not fabrication

ORIGINAL RESUME:
${resume}

TARGET JOB:
Position: ${jobTitle || "Position"}
Company: ${company || "Company"}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S ACTUAL STRENGTHS (from resume analysis):
${strengths.length > 0 ? strengths.join(" | ") : "Evaluate from resume"}

KEYWORDS AVAILABLE (only add if legitimately applicable):
${keywordsList}

GAPS TO ACKNOWLEDGE (if possible through truthful reframing):
${gaps.length > 0 ? gaps.join(" | ") : "None"}

Optimize the resume by:
1. Reorganizing bullet points to prioritize ACTUAL relevant achievements for this job
2. Using stronger action verbs for REAL accomplishments
3. Quantifying results (metrics, percentages, impact) that are REAL
4. Highlighting transferable skills that GENUINELY apply to the role
5. ONLY adding keywords that LEGITIMATELY fit the candidate's actual experience
6. If a keyword doesn't match their real background, SKIP it - don't force it
7. Maintain all original facts - NOTHING IS MADE UP
8. Keep same format/structure but optimize for THIS job

MOST IMPORTANT: Optimize through honest presentation, not by inventing skills or experience. Better to skip a keyword than to dishonestly add it.

Return the complete, optimized resume in the same format as the original.`

    console.log("[TAILORED-RESUME] Generating truthful, tailored resume...")
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
      throw new Error("No response from Groq")
    }

    console.log("[TAILORED-RESUME] Generated successfully")

    return NextResponse.json({
      content,
      originalResume: resume,
    })
  } catch (error) {
    console.error("[TAILORED-RESUME] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to generate tailored resume", details: errorMessage },
      { status: 500 }
    )
  }
}
