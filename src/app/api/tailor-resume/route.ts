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

    const prompt = `You are an expert resume writer. Your task is to tailor the following resume for this specific job posting by:
1. Incorporating relevant keywords from the job description
2. Reordering experience to highlight most relevant skills first
3. Reframing achievements to match job requirements
4. Adding metrics and quantifiable results where possible
5. Keeping ALL information truthful - only change wording, never add false skills

ORIGINAL RESUME:
${resume.substring(0, 3500)}

JOB POSTING:
${jobDescription.substring(0, 2000)}

MISSING KEYWORDS TO INCORPORATE:
${missingKeywords.join(", ")}

GAPS TO ADDRESS (by reframing existing experience):
${gaps.join(", ")}

Generate a complete tailored resume in clean markdown format with:
- Name and contact info at top
- Professional summary (2-3 lines, role-focused)
- Technical Skills section (prioritized by job relevance)
- Professional Experience section (2-3 bullet points per role, most relevant first)
- Education section
- Any certifications or additional info

Remember: ONLY modify wording and presentation. NEVER add false information or skills not in original resume.`

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
