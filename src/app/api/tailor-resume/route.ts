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

    const keywords = missingKeywords.slice(0, 5)
    
    // Use FULL resume - no truncation
    const prompt = `TASK: Add job keywords to complete resume and mark additions.

COMPLETE RESUME TO MODIFY:
${resume}

KEYWORDS TO ADD (pick 2-3 most relevant): ${keywords.join(", ")}

INSTRUCTIONS:
1. Keep resume format EXACTLY the same
2. Process the ENTIRE resume, not just parts
3. Find relevant places to naturally add keywords from the list
4. Wrap ONLY the added/modified text in markers: [[[HIGHLIGHT_START]]]text[[[HIGHLIGHT_END]]]
5. Add 2-3 keyword additions maximum
6. Return the FULL modified resume with markers

Example: If adding "leadership", you might change "managed team" to "managed team with [[[HIGHLIGHT_START]]]leadership[[[HIGHLIGHT_END]]]"

NOW modify the entire resume and return it with markers.`

    console.log("Calling Groq for tailored resume...")
    console.log("Resume length:", resume.length)
    console.log("Keywords to add:", keywords.join(", "))
    
    const message = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 4000,
    })

    const tailoredResume = message.choices[0]?.message?.content || ""
    console.log("Response length:", tailoredResume.length)
    console.log("Has highlights:", tailoredResume.includes("[[[HIGHLIGHT_START]]]"))
    console.log("First 500 chars:", tailoredResume.substring(0, 500))

    // Generate summary
    let changeSummary = ""
    try {
      const summaryPrompt = `Compare original and modified resume. List the 2-3 keyword additions made:

ORIGINAL (first 2000 chars):
${resume.substring(0, 2000)}

MODIFIED (first 2000 chars):
${tailoredResume.substring(0, 2000)}

Format: "• Added '[keyword]' to highlight [section]" 
Only list actual changes visible in both versions.`

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
    } catch (summaryErr) {
      console.error("Summary generation failed:", summaryErr)
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
