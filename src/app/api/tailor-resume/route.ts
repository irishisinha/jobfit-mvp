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

    const prompt = `You are a resume optimizer. Your job is to CLEARLY mark all changes made to a resume.

CRITICAL RULES:
1. Return the resume with EXACT formatting preserved
2. WHENEVER you add or modify text to include a keyword, wrap the CHANGED PART in [[[HIGHLIGHT_START]]] and [[[HIGHLIGHT_END]]]
3. ONLY mark actual keyword additions - do not mark anything else
4. If you replace a word, mark ONLY the new word
5. Format: [[[HIGHLIGHT_START]]]new keyword here[[[HIGHLIGHT_END]]]
6. NO OTHER CHANGES - preserve everything exactly

ORIGINAL RESUME:
${resume.substring(0, 3500)}

JOB KEYWORDS TO ADD: ${missingKeywords.slice(0, 5).join(", ")}

Return the resume with keywords strategically added and clearly marked with highlight tags.`

    console.log("Calling Groq for tailored resume with markers...")
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
    console.log("Tailored resume generated with markers")

    // Generate detailed summary comparing resumes
    let changeSummary = ""
    try {
      console.log("Generating summary of actual changes...")
      const summaryPrompt = `Compare these two resume versions and list ONLY the ACTUAL changes made:

ORIGINAL:
${resume.substring(0, 1500)}

MODIFIED:
${tailoredResume.substring(0, 1500)}

List 2-4 SPECIFIC changes in format: "Added 'keyword' in [section]" or "Changed 'old phrase' to 'new phrase'"
Only list real differences you can identify. Be specific.`

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

      changeSummary = summaryMessage.choices[0]?.message?.content || ""
      console.log("Summary generated")
    } catch (summaryErr) {
      console.error("Summary generation failed:", summaryErr)
      changeSummary = "Resume optimized with keyword additions."
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
