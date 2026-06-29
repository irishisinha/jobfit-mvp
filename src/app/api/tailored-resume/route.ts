import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { authOptions } from "../../../lib/auth"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { resumeContent, jobDescription } = await req.json()

    if (!resumeContent?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      messages: [{
        role: "user",
        content: `Create a tailored 2-page professional resume based on this:

ORIGINAL RESUME:
${resumeContent.substring(0, 2000)}

TARGET JOB:
${jobDescription.substring(0, 1500)}

RULES:
1. Keep chronological order (recent first)
2. Use all original experience/skills
3. Rephrase to match job keywords
4. Include: Summary, Experience, Skills, Education
5. Make it 2 pages minimum
6. Professional formatting with sections

OUTPUT ONLY THE RESUME - NO EXPLANATIONS:`,
      }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 4000,
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
