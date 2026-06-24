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

    const prompt = `You are an expert resume writer. Your task is to tailor the following resume to match a specific job posting.

CRITICAL INSTRUCTIONS:
1. KEEP the exact same format and structure as the original resume
2. PRESERVE all sections from the original (summary, experience, education, skills, certifications, etc.)
3. ONLY modify the content to incorporate job keywords and reframe experience
4. REORDER bullet points to highlight most relevant achievements first
5. Add quantifiable metrics where they exist in the original
6. Keep ALL information truthful - NEVER add false skills or experience

ORIGINAL RESUME (keep this exact format):
${resume}

JOB POSTING (for context):
Title: ${jobTitle} at ${company}
${jobDescription.substring(0, 2000)}

KEYWORDS TO NATURALLY INCORPORATE:
${missingKeywords.join(", ")}

EXPERIENCE GAPS TO ADDRESS (reframe existing experience):
${gaps.join(", ")}

OUTPUT: Return the complete resume in the exact same format as the original, with content optimized for this job. Do not create a new format - keep the original structure intact.`

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
