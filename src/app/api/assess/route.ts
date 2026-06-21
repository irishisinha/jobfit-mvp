import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import Groq from "groq-sdk"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { resume, jobDescription, jobTitle, company } = await req.json()

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Resume and job description required" }, { status: 400 })
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })

    const prompt = `Analyze this resume against the job description. Respond ONLY with valid JSON, no markdown:

RESUME: ${resume.substring(0, 1000)}

JOB: ${jobTitle} at ${company}

DESCRIPTION: ${jobDescription.substring(0, 1000)}

JSON response format:
{
  "verdict": "Strong Fit|Moderate Fit|Weak Fit",
  "fitScore": 0-100,
  "atsMatch": 0-100,
  "successProbability": 0-100,
  "strengths": ["strength1", "strength2", "strength3"],
  "gaps": ["gap1", "gap2", "gap3"],
  "missingKeywords": ["keyword1", "keyword2", "keyword3"]
}`

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: "Empty response from Groq" }, { status: 500 })
    }

    const result = JSON.parse(content)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({
      error: "Assessment failed",
      message: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
