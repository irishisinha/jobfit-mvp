import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized: Not authenticated" }, { status: 401 })
    }

    let body
    try {
      body = await req.json()
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { resume, jobDescription, jobTitle, company } = body

    if (!resume || !resume.trim()) {
      return NextResponse.json({ error: "Resume is required and cannot be empty" }, { status: 400 })
    }

    if (!jobDescription || !jobDescription.trim()) {
      return NextResponse.json({ error: "Job description is required and cannot be empty" }, { status: 400 })
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "Server configuration error: GROQ_API_KEY not set" }, { status: 500 })
    }

    const prompt = `You are an expert recruiter. Analyze this resume against the job description and provide:
1. Verdict: "Strong Fit", "Moderate Fit", or "Weak Fit"
2. Fit Score: 0-100
3. ATS Match: 0-100
4. Success Probability: 0-100
5. Top 3 Strengths
6. Top 3 Gaps
7. Missing Keywords

RESUME:
${resume}

JOB TITLE: ${jobTitle || "Position"}
COMPANY: ${company || "Company"}

JOB DESCRIPTION:
${jobDescription}

Respond in VALID JSON format (no markdown, just pure JSON):
{
  "verdict": "Strong Fit|Moderate Fit|Weak Fit",
  "fitScore": number,
  "atsMatch": number,
  "successProbability": number,
  "strengths": ["strength1", "strength2", "strength3"],
  "gaps": ["gap1", "gap2", "gap3"],
  "missingKeywords": ["keyword1", "keyword2", "keyword3"]
}`

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    const content = completion.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: "Groq API returned empty response" }, { status: 500 })
    }

    let result
    try {
      result = JSON.parse(content)
    } catch (parseError) {
      return NextResponse.json({ 
        error: "Failed to parse Groq response as JSON",
        rawResponse: content.substring(0, 500)
      }, { status: 500 })
    }

    if (!result.verdict || result.fitScore === undefined) {
      return NextResponse.json({ 
        error: "Groq response missing required fields",
        received: result
      }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const errorName = error instanceof Error ? error.name : "Unknown"
    
    return NextResponse.json(
      {
        error: "Assessment failed",
        type: errorName,
        message: errorMsg,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
