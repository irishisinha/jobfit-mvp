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

    const prompt = `You are a resume optimizer. Your ONLY task is to take the provided resume text and incorporate job keywords by making MINIMAL text edits.

CRITICAL INSTRUCTIONS - DO NOT DEVIATE:
1. Return the EXACT SAME resume text, character-for-character identical
2. ONLY replace or add specific words/phrases to include job keywords
3. DO NOT reformat, reorganize, or rewrite anything
4. DO NOT change structure, sections, or layout
5. Make edits INLINE only - keep everything in exact same order
6. If a keyword can be incorporated naturally, do so. Otherwise leave as-is.
7. Return the resume EXACTLY as provided, just with keyword optimization

ORIGINAL RESUME (return this EXACT format):
${resume}

JOB KEYWORDS TO INCORPORATE: ${missingKeywords.slice(0, 8).join(", ")}

TASK: Return the resume with the MINIMUM changes needed to incorporate these keywords. Keep everything else exactly the same.`;

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

    return NextResponse.json({
      tailoredResume,
      originalResume: resume,
    })
  } catch (error: any) {
    console.error("Tailor resume error:", error)
    return NextResponse.json({ error: "Failed to tailor resume" }, { status: 500 })
  }
}
