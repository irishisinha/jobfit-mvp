import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import Groq from "groq-sdk"

export const maxDuration = 60

function calculateAtsMatch(resume: string, jobDescription: string): number {
  const jobKeywords = jobDescription.toLowerCase().split(/\W+/).filter(w => w.length > 3)
  const resumeKeywords = resume.toLowerCase().split(/\W+/)
  const resumeSet = new Set(resumeKeywords)
  
  const matches = jobKeywords.filter((k: string) => resumeSet.has(k)).length
  const percentage = Math.round((matches / Math.max(jobKeywords.length, 1)) * 100)
  return Math.min(100, Math.max(20, percentage))
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
      max_tokens: 1200,
      temperature: 0,
      messages: [{
        role: "user",
        content: `Analyze this resume against the job requirement. Be specific and concise.

RESUME:
${resume.substring(0, 1500)}

JOB: ${jobTitle} at ${company}
REQUIREMENTS:
${jobDescription.substring(0, 1200)}

Score 0-100. List specific strengths (skills/experience the candidate HAS that match the role). List specific gaps (what the candidate is MISSING that the role needs).

Return ONLY valid JSON:
{
  "fitScore": 70,
  "strengths": ["has 10+ years ecommerce", "proven P&L management"],
  "gaps": ["no retail industry experience", "missing team leadership background"],
  "missingKeywords": ["keyword1", "keyword2"]
}`
      }],
    })

    let content = completion.choices[0]?.message?.content || "{}"
    content = content.replace(/```[\s\S]*?```/g, "").trim()

    let data: any = {
      fitScore: 60,
      strengths: [],
      gaps: [],
      missingKeywords: []
    }

    try {
      data = JSON.parse(content)
    } catch (e) {
      console.error("Parse error:", e)
    }

    const fitScore = Math.min(100, Math.max(0, parseInt(String(data.fitScore)) || 60))
    const atsMatch = calculateAtsMatch(resume, jobDescription)

    const successProbability = 
      fitScore >= 80 ? 70 + Math.random() * 15 :
      fitScore >= 65 ? 50 + Math.random() * 20 :
      fitScore >= 50 ? 35 + Math.random() * 20 :
      20 + Math.random() * 15

    let tailorWorth = 0
    if (fitScore >= 85) tailorWorth = 0
    else if (fitScore >= 70) tailorWorth = 10
    else if (fitScore >= 55) tailorWorth = 25
    else if (fitScore >= 40) tailorWorth = 40

    const verdict = 
      fitScore >= 75 ? "Strong Fit" :
      fitScore >= 55 ? "Moderate Fit" :
      "Weak Fit"

    // Format arrays - allow longer text for gaps/strengths
    const strengths = (Array.isArray(data.strengths) ? data.strengths : [])
      .slice(0, 4)
      .map((s: any) => String(s).trim())
      .filter((s: string) => s.length > 0)

    const gaps = (Array.isArray(data.gaps) ? data.gaps : [])
      .slice(0, 4)
      .map((g: any) => String(g).trim())
      .filter((g: string) => g.length > 0)

    const keywords = (Array.isArray(data.missingKeywords) ? data.missingKeywords : [])
      .slice(0, 5)
      .map((k: any) => String(k).trim())
      .filter((k: string) => k.length > 0)

    return NextResponse.json({
      verdict,
      fitScore,
      atsMatch,
      successProbability: Math.round(successProbability),
      tailorWorth,
      strengths,
      gaps,
      missingKeywords: keywords,
    })
  } catch (error: any) {
    console.error("Assess error:", error)
    return NextResponse.json({
      verdict: "Moderate Fit",
      fitScore: 60,
      atsMatch: 50,
      successProbability: 50,
      tailorWorth: 25,
      strengths: [],
      gaps: [],
      missingKeywords: [],
    })
  }
}
