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
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const {
      resume,
      jobDescription,
      jobTitle,
      company,
      tone = "professional",
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

    const strengthsList = strengths.length > 0 
      ? strengths.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")
      : "N/A"

    const gapsList = gaps.length > 0 
      ? gaps.map((g: string, i: number) => `${i + 1}. ${g}`).join("\n")
      : "N/A"

    const keywordsList = missingKeywords.length > 0 
      ? missingKeywords.join(", ")
      : "N/A"

    const prompt = `You are an expert career coach writing a TRUTHFUL, STRATEGIC cover letter.

CRITICAL RULES - MUST FOLLOW:
1. ONLY mention skills/experience EXPLICITLY in the resume
2. NEVER claim false expertise or experience
3. When addressing gaps: show willingness to learn, NOT fake expertise
4. Reframe experience TRUTHFULLY (show how skills genuinely transfer)
5. Be authentic and honest - dishonesty backfires in interviews
6. If a gap cannot be addressed truthfully, acknowledge it positively

CANDIDATE'S RESUME:
${resume}

JOB DETAILS:
Position: ${jobTitle || "Position"}
Company: ${company || "Company"}

JOB DESCRIPTION:
${jobDescription}

ASSESSMENT INSIGHTS:
Strengths to highlight (from resume):
${strengthsList}

Experience gaps to address TRUTHFULLY:
${gapsList}

Keywords to naturally incorporate (only if they fit):
${keywordsList}

TONE: ${tone}

Write a compelling, TRUTHFUL cover letter that:
1. Opens with genuine interest in THIS specific role and company
2. Highlight the candidate's ACTUAL key strengths that apply to the job
3. Address gaps TRUTHFULLY by:
   - Showing how existing skills transfer (with concrete examples from resume)
   - Demonstrating genuine eagerness to learn and grow
   - Being honest if a skill is new but showing related experience
   - Reframing experience positively WITHOUT lying
4. Incorporate missing keywords ONLY if they fit the candidate's actual experience
5. Show understanding of what makes this role/company unique
6. Close with confidence in genuine value proposition
7. Maintain a ${tone} tone
8. Keep it 3-4 paragraphs, about 250-300 words

MOST IMPORTANT: Dishonesty will be caught in interviews. Make it compelling through AUTHENTICITY, not exaggeration.

Return ONLY the cover letter text, no headers or explanations.`

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 1024,
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
      tone,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const errorName = error instanceof Error ? error.name : "Unknown"
    
    return NextResponse.json(
      {
        error: "Failed to generate cover letter",
        type: errorName,
        message: errorMsg,
      },
      { status: 500 }
    )
  }
}
