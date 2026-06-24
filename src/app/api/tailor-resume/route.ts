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

    const prompt = `You are a resume optimization expert. Your ONLY job is to modify the provided resume to better match a job posting.

CRITICAL RULES:
1. Return the resume in EXACTLY the same format as the original
2. Keep all sections in the same order
3. Keep all existing text and structure
4. ONLY modify content inline - don't rewrite sections
5. Incorporate job keywords naturally by rewording existing content
6. NEVER add new experience or false information
7. Make the modified resume look like the original was written for this job

ORIGINAL RESUME (preserve this exact format):
${resume}

JOB POSTING:
Position: ${jobTitle} at ${company}
${jobDescription.substring(0, 2000)}

KEY WORDS TO INCORPORATE: ${missingKeywords.slice(0, 10).join(", ")}

TASK: Return the resume with minimal edits to incorporate these keywords naturally while keeping the exact original format and structure.`;

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
