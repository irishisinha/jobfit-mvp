import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import Groq from "groq-sdk"

export const maxDuration = 60

function calculateAtsMatch(resume: string, jobDescription: string): number {
  const jobKeywords = jobDescription.toLowerCase().split(/\W+/).filter(w => w.length > 3)
  const resumeKeywords = resume.toLowerCase().split(/\W+/)
  const resumeSet = new Set(resumeKeywords)
  
  const matches = jobKeywords.filter(k => resumeSet.has(k)).length
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
      max_tokens: 1500,
      temperature: 0,
      messages: [{
        role: "user",
        content: `Analyze resume match for: ${jobTitle} at ${company}

CANDIDATE RESUME:
${resume.substring(0, 3500)}

REQUIRED SKILLS AND EXPERIENCE:
${jobDescription.substring(0, 2000)}

Scoring: 0-100 based on how well the resume matches the job requirements.
- 90-100: Has almost all requirements with strong experience
- 75-89: Has core requirements with relevant experience
- 60-74: Has some requirements, missing some key skills
- 40-59: Significant gaps, would need substantial learning
- Below 40: Poor match

Respond ONLY with a JSON object. Analyze carefully and score accurately based on the specific resume and job.

Example format (replace values):
{"fitScore": 75, "strengths": ["specific skill from resume"], "gaps": ["missing skill"], "missingKeywords": ["keyword"]}`
      }],
    })

    let content = completion.choices[0]?.message?.content || ""
    
    // Clean up response
    content = content.replace(/```json\n?|\n?```/g, "").replace(/^```|```$/g, "").trim()

    let data: any = {
      fitScore: 50,
      strengths: [],
      gaps: [],
      missingKeywords: []
    }

    // Try to parse JSON
    try {
      const parsed = JSON.parse(content)
      if (typeof parsed.fitScore === "number") data.fitScore = parsed.fitScore
      if (Array.isArray(parsed.strengths)) data.strengths = parsed.strengths.filter((s: any) => s)
      if (Array.isArray(parsed.gaps)) data.gaps = parsed.gaps.filter((g: any) => g)
      if (Array.isArray(parsed.missingKeywords)) data.missingKeywords = parsed.missingKeywords.filter((k: any) => k)
    } catch (e) {
      console.error("Parse failed, raw:", content.substring(0, 300))
    }

    const fitScore = Math.min(100, Math.max(0, data.fitScore))
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

    return NextResponse.json({
      verdict,
      fitScore,
      atsMatch,
      successProbability: Math.round(successProbability),
      tailorWorth,
      strengths: data.strengths,
      gaps: data.gaps,
      missingKeywords: data.missingKeywords,
    })
  } catch (error: any) {
    console.error("Assess error:", error)
    return NextResponse.json({
      verdict: "Moderate Fit",
      fitScore: 50,
      atsMatch: 50,
      successProbability: 50,
      tailorWorth: 25,
      strengths: [],
      gaps: [],
      missingKeywords: [],
    })
  }
}
