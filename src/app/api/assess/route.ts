import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import Groq from "groq-sdk"

export const maxDuration = 60

function calculateAtsMatch(resume: string, jobDescription: string): number {
  // Simple keyword matching for ATS
  const jobKeywords = jobDescription.toLowerCase().split(/\W+/)
  const resumeKeywords = resume.toLowerCase().split(/\W+/)
  const resumeSet = new Set(resumeKeywords)
  
  const matches = jobKeywords.filter(k => k.length > 3 && resumeSet.has(k)).length
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
        content: `Analyze resume for: ${jobTitle} at ${company}

RESUME (first 1200 chars):
${resume.substring(0, 1200)}

JOB DESCRIPTION (first 1200 chars):
${jobDescription.substring(0, 1200)}

Score 0-100 based on:
- Required skills/experience present: 40 points
- Nice-to-have skills present: 30 points  
- Relevant industry experience: 20 points
- Education/certifications: 10 points

Respond ONLY with valid JSON (no other text):
{
  "fitScore": 65,
  "strengths": ["skill from resume that matches job", "relevant experience"],
  "gaps": ["skill job needs that resume lacks", "experience gap"],
  "missingKeywords": ["important term from job not in resume"]
}

Be fair - many candidates have relevant but not perfect experience.`
      }],
    })

    let content = completion.choices[0]?.message?.content || "{}"
    content = content.replace(/^```[\s\S]*?```\n?/g, "").trim()
    content = content.replace(/^```json\n?|\n?```$/g, "").trim()

    let data: any = {
      fitScore: 60,
      strengths: [],
      gaps: [],
      missingKeywords: []
    }

    try {
      const parsed = JSON.parse(content)
      data = { ...data, ...parsed }
    } catch (e) {
      console.error("Parse error:", content.substring(0, 100))
    }

    const fitScore = Math.min(100, Math.max(0, data.fitScore || 60))
    const atsMatch = calculateAtsMatch(resume, jobDescription)

    // Success probability - more balanced
    const successProbability = 
      fitScore >= 80 ? 70 + Math.random() * 15 :
      fitScore >= 65 ? 50 + Math.random() * 20 :
      fitScore >= 50 ? 35 + Math.random() * 20 :
      20 + Math.random() * 15

    // Tailor worth - only if it makes sense
    let tailorWorth = 0
    if (fitScore >= 85) tailorWorth = 0
    else if (fitScore >= 70) tailorWorth = 10
    else if (fitScore >= 55) tailorWorth = 25
    else if (fitScore >= 40) tailorWorth = 40
    else tailorWorth = 0

    const verdict = 
      fitScore >= 75 ? "Strong Fit" :
      fitScore >= 55 ? "Moderate Fit" :
      "Weak Fit"

    return NextResponse.json({
      verdict,
      fitScore: Math.round(fitScore),
      atsMatch: Math.round(atsMatch),
      successProbability: Math.round(successProbability),
      tailorWorth: Math.round(Math.max(0, tailorWorth)),
      strengths: (data.strengths || []).slice(0, 4),
      gaps: (data.gaps || []).slice(0, 4),
      missingKeywords: (data.missingKeywords || []).slice(0, 5),
    })
  } catch (error) {
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