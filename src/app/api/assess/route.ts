import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import Groq from "groq-sdk"

export const maxDuration = 60

function calculateTailorWorth(fitScore: number): number {
  return Math.max(10, 100 - Math.round(fitScore / 1.0))
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { resume, jobDescription, jobTitle, company } = await req.json()

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 1000,
      temperature: 0,
      messages: [{
        role: "user",
        content: `Analyze resume vs job. Return ONLY JSON with no markdown.

RESUME: ${resume.substring(0, 800)}
JOB: ${jobTitle} at ${company}
DESCRIPTION: ${jobDescription.substring(0, 800)}

{
  "verdict": "Strong Fit" | "Moderate Fit" | "Weak Fit",
  "fitScore": 0-100,
  "atsMatch": 0-100,
  "successProbability": 0-100,
  "strengths": ["skill1", "skill2"],
  "gaps": ["gap1", "gap2"],
  "missingKeywords": ["keyword1"]
}

Rules: Only real skills from resume. Return JSON only.`
      }],
    })

    let content = completion.choices[0]?.message?.content || "{}"
    content = content.replace(/```json\n?|\n?```/g, "").trim()

    const data = JSON.parse(content)

    const fitScore = Math.min(100, Math.max(0, data.fitScore || 50))
    const verdict = ["Strong Fit", "Moderate Fit", "Weak Fit"].includes(data.verdict) 
      ? data.verdict 
      : fitScore >= 75 ? "Strong Fit" : fitScore >= 50 ? "Moderate Fit" : "Weak Fit"

    const tailorWorth = calculateTailorWorth(fitScore)

    return NextResponse.json({
      verdict,
      fitScore,
      atsMatch: Math.min(100, Math.max(0, data.atsMatch || 50)),
      successProbability: Math.min(100, Math.max(0, data.successProbability || 50)),
      tailorWorth,
      strengths: Array.isArray(data.strengths) ? data.strengths : [],
      gaps: Array.isArray(data.gaps) ? data.gaps : [],
      missingKeywords: Array.isArray(data.missingKeywords) ? data.missingKeywords : [],
    })
  } catch (error) {
    console.error("Assess error:", error)
    return NextResponse.json({
      verdict: "Moderate Fit",
      fitScore: 50,
      atsMatch: 50,
      successProbability: 50,
      tailorWorth: 50,
      strengths: [],
      gaps: [],
      missingKeywords: [],
    })
  }
}
