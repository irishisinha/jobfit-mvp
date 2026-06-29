import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { authOptions } from "../../../lib/auth"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      console.log("[Tailored Resume API] Not authenticated")
      return NextResponse.json({ tailoredResume: "Authentication required" }, { status: 401 })
    }

    console.log("[Tailored Resume API] Starting tailored resume generation")
    let body
    try {
      body = await req.json()
    } catch (parseErr) {
      console.log("[Tailored Resume API] JSON parse error:", parseErr)
      return NextResponse.json({ tailoredResume: "Invalid request format" }, { status: 400 })
    }

    const { resumeContent, jobDescription } = body

    console.log("[Tailored Resume API] Received request with:", {
      resumeLength: resumeContent?.length || 0,
      jobDescriptionLength: jobDescription?.length || 0,
      hasResumeContent: !!resumeContent,
      hasJobDescription: !!jobDescription
    })

    if (!resumeContent || !jobDescription) {
      console.log("[Tailored Resume API] Missing fields")
      return NextResponse.json({ tailoredResume: "Missing fields" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      messages: [{
        role: "user",
        content: `Create a comprehensive tailored resume for this job. IMPORTANT: Create a FULL 2-PAGE minimum resume covering all experience, skills, and accomplishments from the original.

ORIGINAL COMPLETE RESUME:
${resumeContent}

TARGET JOB POSTING:
${jobDescription}

INSTRUCTIONS:
1. Preserve ALL relevant experience, projects, and accomplishments from original resume
2. Tailor language and emphasis to match job requirements and keywords
3. Use strong action verbs and quantifiable results
4. Structure: Professional Summary, Core Competencies, Work Experience (with detailed bullets), Education, Certifications/Skills
5. CRITICAL: Create minimum 2 full pages with substantial content - include details, metrics, achievements
6. Match resume length to content volume - do not artificially shorten or compress
7. Maintain chronological order (most recent first)
8. Format professionally with clear section headers

OUTPUT COMPLETE RESUME ONLY - NO EXPLANATIONS OR COMMENTARY:`,
      }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 6000,
    })

    const tailoredResume = completion.choices[0]?.message?.content || resumeContent

    return NextResponse.json({
      tailoredResume: tailoredResume.trim()
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ 
      tailoredResume: 'Unable to generate tailored resume'
    }, { status: 500 })
  }
}
