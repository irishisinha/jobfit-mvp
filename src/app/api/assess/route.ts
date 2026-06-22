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
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 1500,
      temperature: 0,
      messages: [{
        role: "user",
        content: `You are a strict recruiter. Analyze resume vs job with REALISTIC scoring.

RESUME (first 1000 chars):
${resume.substring(0, 1000)}

JOB: ${jobTitle} at ${company}
DESCRIPTION (first 1000 chars):
${jobDescription.substring(0, 1000)}

SCORING RULES (be conservative):
- 90-100: Perfect fit, has nearly all requirements
- 75-89: Strong fit, has core skills + relevant experience
- 60-74: Moderate fit, missing some skills but trainable
- 40-59: Weak fit, significant gaps
- 0-39: Not viable for role

Respond with ONLY valid JSON (no markdown, no extra text):
{
  "fitScore": 45,
  "verdict": "Moderate Fit",
  "atsMatch": 50,
  "strengths": ["skill1", "skill2", "skill3"],
  "gaps": ["missing skill 1", "missing experience"],
  "missingKeywords": ["keyword1", "keyword2"]
}

Do not add any text before or after JSON.`
      }],
    })

    let content = completion.choices[0]?.message?.content || "{}"
    
    // Clean up response
    content = content.replace(/^```[\s\S]*?```\n?/g, "").trim()
    content = content.replace(/^```json\n?|\n?```$/g, "").trim()
    
    // Try to parse JSON
    let data: any = {
      fitScore: 50,
      verdict: "Moderate Fit",
      atsMatch: 50,
      strengths: [],
      gaps: [],
      missingKeywords: []
    }
    try {
      data = JSON.parse(content)
    } catch (e) {
      console.error("JSON parse error:", content)
      data = {
        fitScore: 50,
        verdict: "Moderate Fit",
        atsMatch: 50,
        strengths: ["Unable to parse response"],
        gaps: ["Please try again"],
        missingKeywords: []
      }
    }

    // Ensure arrays
    const strengths = Array.isArray(data.strengths) ? data.strengths : []
    const gaps = Array.isArray(data.gaps) ? data.gaps : []
    const keywords = Array.isArray(data.missingKeywords) ? data.missingKeywords : []

    const fitScore = Math.min(100, Math.max(0, data.fitScore || 50))
    const atsMatch = Math.min(100, Math.max(0, data.atsMatch || 50))

    // Success probability based on fit (realistic)
    const successProbability = 
      fitScore >= 75 ? 65 + Math.random() * 15 :
      fitScore >= 50 ? 40 + Math.random() * 20 :
      fitScore >= 30 ? 15 + Math.random() * 20 :
      5

    // Tailor worth (realistic)
    let tailorWorth = 0
    if (fitScore >= 90) tailorWorth = 3
    else if (fitScore >= 75) tailorWorth = 8
    else if (fitScore >= 60) tailorWorth = 18
    else if (fitScore >= 40) tailorWorth = 35
    else tailorWorth = 0

    const verdict = 
      fitScore >= 75 ? "Strong Fit" :
      fitScore >= 50 ? "Moderate Fit" :
      "Weak Fit"

    return NextResponse.json({
      verdict,
      fitScore: Math.round(fitScore),
      atsMatch: Math.round(atsMatch),
      successProbability: Math.round(successProbability),
      tailorWorth: Math.round(Math.max(0, tailorWorth)),
      strengths: strengths.slice(0, 5),
      gaps: gaps.slice(0, 5),
      missingKeywords: keywords.slice(0, 5),
    })
  } catch (error) {
    console.error("Assess error:", error)
    return NextResponse.json({
      verdict: "Moderate Fit",
      fitScore: 50,
      atsMatch: 50,
      successProbability: 45,
      tailorWorth: 20,
      strengths: ["Check your resume and job description"],
      gaps: ["Unable to analyze - try again"],
      missingKeywords: [],
    })
  }
}
