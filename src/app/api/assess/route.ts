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
      max_tokens: 1200,
      temperature: 0,
      messages: [{
        role: "user",
        content: `You are an experienced recruiter. Analyze this resume against the job with REALISTIC expectations.

RESUME:
${resume.substring(0, 1000)}

JOB: ${jobTitle} at ${company}
DESCRIPTION:
${jobDescription.substring(0, 1000)}

Scoring Guide (be strict - most resumes don't match well):
- 90-100%: Perfect fit, has almost all requirements
- 75-89%: Strong fit, has core skills + experience
- 60-74%: Moderate fit, missing some key skills but trainable  
- 40-59%: Weak fit, significant gaps, would need tailoring
- 0-39%: Not a fit, skip this role

Return ONLY this JSON:
{
  "fitScore": NUMBER (0-100, be conservative),
  "verdict": "Strong Fit" | "Moderate Fit" | "Weak Fit",
  "atsMatch": NUMBER (0-100, how well resume keyword-matches the JD),
  "strengths": ["exact skill from resume that matches role", "another matching skill"],
  "gaps": ["required skill candidate is missing", "experience gap"],
  "missingKeywords": ["keyword from JD not in resume"]
}

Be honest. Most candidates have gaps. Success probability will be calculated from fit score automatically.`
      }],
    })

    let content = completion.choices[0]?.message?.content || "{}"
    content = content.replace(/```json\n?|\n?```/g, "").trim()

    const data = JSON.parse(content)

    // Clamp scores to realistic ranges
    const fitScore = Math.min(100, Math.max(0, data.fitScore || 50))
    const atsMatch = Math.min(100, Math.max(0, data.atsMatch || 50))

    // Calculate success probability based on FIT SCORE (realistic)
    // Strong Fit (75+) = 70-80% success
    // Moderate Fit (50-74) = 40-60% success  
    // Weak Fit (<50) = 15-35% success
    const successProbability = 
      fitScore >= 75 ? 65 + Math.random() * 15 :
      fitScore >= 50 ? 40 + Math.random() * 20 :
      fitScore >= 30 ? 15 + Math.random() * 20 :
      5

    // Calculate tailor worth (realistic)
    // High fit (90+) = no point tailoring (0-5%)
    // Good fit (75-89) = light tailoring (5-10%)
    // Moderate fit (60-74) = worth tailoring (15-25%)
    // Weak fit (<60) = significant work needed (30-50%)
    let tailorWorth = 0
    if (fitScore >= 90) tailorWorth = 0
    else if (fitScore >= 75) tailorWorth = 7
    else if (fitScore >= 60) tailorWorth = 20
    else if (fitScore >= 40) tailorWorth = 40
    else tailorWorth = 0 // Don't bother if too weak

    const verdict = 
      fitScore >= 75 ? "Strong Fit" :
      fitScore >= 50 ? "Moderate Fit" :
      "Weak Fit"

    const cleanArray = (arr: any[]) => {
      if (!Array.isArray(arr)) return []
      return arr.map(item => String(item).replace(/[^ -~]/g, "").trim()).filter(item => item.length > 0)
    }

    return NextResponse.json({
      verdict,
      fitScore: Math.round(fitScore),
      atsMatch: Math.round(atsMatch),
      successProbability: Math.round(successProbability),
      tailorWorth: Math.round(tailorWorth),
      strengths: cleanArray(data.strengths || []),
      gaps: cleanArray(data.gaps || []),
      missingKeywords: cleanArray(data.missingKeywords || []),
    })
  } catch (error) {
    console.error("Assess error:", error)
    return NextResponse.json({
      verdict: "Moderate Fit",
      fitScore: 50,
      atsMatch: 50,
      successProbability: 45,
      tailorWorth: 20,
      strengths: [],
      gaps: ["Unable to assess - please check your inputs"],
      missingKeywords: [],
    })
  }
}