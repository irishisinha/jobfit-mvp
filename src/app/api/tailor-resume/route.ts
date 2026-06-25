import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { resume, jobDescription, jobTitle, company, gaps, missingKeywords } = await req.json()

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const prompt = `CRITICAL: You MUST return the resume text EXACTLY as provided. Do NOT change formatting, spacing, line breaks, or structure in ANY way.

Your ONLY job: In the provided resume text, find places where job keywords can be naturally incorporated by replacing single words or short phrases. Make MINIMAL edits only.

RULES:
- Return every single character, space, and line break EXACTLY as in original
- NO reformatting whatsoever
- NO reordering of sections
- ONLY replace individual words/short phrases with synonyms that include job keywords
- If you cannot incorporate a keyword naturally, leave the text unchanged
- Do NOT add, remove, or rearrange anything

ORIGINAL RESUME (return this VERBATIM with only inline keyword replacements):
${resume}

JOB KEYWORDS: ${missingKeywords.slice(0, 5).join(", ")}

Return the resume with ZERO changes except minimal keyword incorporation.`;

    const message = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 2000,
    })

    const tailoredResume = message.choices[0]?.message?.content || ""

    // Generate summary of changes
    const changeSummary = "Keywords incorporated: " + missingKeywords.slice(0, 5).join(", ");

    return NextResponse.json({
      tailoredResume,
      originalResume: resume,
      changeSummary
    })
  } catch (error: any) {
    console.error("Tailor resume error:", error)
    return NextResponse.json({ error: "Failed to tailor resume" }, { status: 500 })
  }
}
