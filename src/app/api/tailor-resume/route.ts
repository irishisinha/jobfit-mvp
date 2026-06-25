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
${resume.substring(0, 3500)}

JOB KEYWORDS TO INCORPORATE: ${missingKeywords.slice(0, 5).join(", ")}

Return the resume with ZERO changes except minimal keyword incorporation.`

    console.log("Calling Groq for tailored resume...")
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
    console.log("Tailored resume generated, length:", tailoredResume.length)

    // Generate summary by comparing original to tailored - ONLY real changes
    let changeSummary = ""
    try {
      console.log("Generating summary by comparing resumes...")
      const summaryPrompt = `You are comparing two resume versions to identify ONLY the actual changes made.

ORIGINAL RESUME:
${resume.substring(0, 1500)}

TAILORED RESUME:
${tailoredResume.substring(0, 1500)}

Analyze what ACTUALLY CHANGED between these two versions. Only list real changes - do NOT make up or speculate about changes.

If you find actual keyword additions or replacements, describe them specifically. If minimal or no changes were made, say "Resume structure and content preserved - minimal keyword optimization made."

Provide 2-3 bullet points of ONLY the actual changes you can identify.`

      const summaryMessage = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: summaryPrompt,
          },
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0,
        max_tokens: 300,
      })

      changeSummary = summaryMessage.choices[0]?.message?.content || "Resume optimized with minimal keyword additions."
      console.log("Summary generated, length:", changeSummary.length)
    } catch (summaryErr) {
      console.error("Summary generation failed, continuing without it:", summaryErr)
      changeSummary = "Resume optimized for job fit."
    }

    return NextResponse.json({
      tailoredResume,
      originalResume: resume,
      changeSummary,
    })
  } catch (error: any) {
    console.error("Tailor resume error:", error.message || error)
    return NextResponse.json({ 
      error: `Failed to tailor resume: ${error.message || "Unknown error"}` 
    }, { status: 500 })
  }
}
