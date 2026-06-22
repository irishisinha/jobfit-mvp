import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { authOptions } from "../../../lib/auth"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { resume, jobDescription, jobTitle, company } = await req.json()

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      messages: [{
        role: "user",
        content: `You are a resume expert. Take this resume and tailor it for this job.

RULES:
1. Keep all real skills and experience from original
2. Reorder sections to put most relevant experience FIRST
3. Rephrase bullet points to use job keywords
4. Remove or downplay irrelevant sections
5. Keep 100% truthful - no false information

JOB: ${jobTitle} at ${company}
${jobDescription.substring(0, 1000)}

ORIGINAL RESUME:
${resume.substring(0, 1500)}

OUTPUT: Return ONLY the complete tailored resume (no explanations, no markdown, just the resume text):`,
      }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 3000,
    })

    const tailoredResume = completion.choices[0]?.message?.content || resume

    return NextResponse.json({
      tailoredResume: tailoredResume.trim()
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ 
      tailoredResume: resume
    }, { status: 500 })
  }
}
