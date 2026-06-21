import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import Groq from "groq-sdk"

export const maxDuration = 60

function calculateTailorWorth(fitScore: number): number {
  // Inverse relationship: high fit = low tailor worth
  // If fit is 90%, only 10% room to improve
  // If fit is 50%, 50% room to improve
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
        content: `Analyze this resume against the job. Return ONLY valid JSON.

RESUME: ${resume.substring(0, 800)}
JOB: ${jobTitle} at ${company}
DESCRIPTION: ${jobDescription.substring(0, 800)}

Return this exact JSON structure (no markdown, no extra text):
{
  "verdict": "Strong Fit" | "Moderate Fit" | "Weak Fit",
  "fitScore": 0-100,
  "atsMatch": 0-100,
  "successProbability": 0-100,
  "strengths": ["skill1", "skill2"],
  "gaps": ["gap1", "gap2"],
  "missingKeywords": ["keyword1"]
}

RULES:
- fitScore = how well resume matches job (0-100)
- atsMatch = will ATS system pass this resume
- successProbability = chance this person gets hired
- Only include REAL matches from resume
- Return only valid JSON`
      }],
    })

    let content = completion.choices[0]?.message?.content || "{}"
    content = content.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim()

    const data = JSON.parse(content)

    // Ensure required fields exist
    const fitScore = Math.min(100, Math.max(0, data.fitScore || 50))
    const verdict = ["Strong Fit", "Moderate Fit", "Weak Fit"].includes(data.verdict) 
      ? data.verdict 
      : fitScore >= 75 ? "Strong Fit" : fitScore >= 50 ? "Moderate Fit" : "Weak Fit"

    // Calculate tailor worth inversely to fit score
    const tailorWorth = calculateTailorWorth(fitScore)

    return NextResponse.json({
      verdict,
      fitScore,
      atsMatch: Math.min(100, Math.max(0, data.atsMatch || 50)),
      successProbability: Math.min(100, Math.max(0, data.successProbability || 50)),
      tailorWorth,
      strengths: (data.strengths || []).filter((s: any) => typeof s === "string" && s.length > 0).slice(0, 5),
      gaps: (data.gaps || []).filter((g: any) => typeof g === "string" && g.length > 0).slice(0, 5),
      missingKeywords: (data.missingKeywords || []).filter((k: any) => typeof k === "string" && k.length > 0).slice(0, 5),
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
