import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import Groq from "groq-sdk"

export const maxDuration = 60

// Remove all mojibake and non-ASCII characters
function cleanText(text: string): string {
  if (!text) return ""
  return text
    .replace(/[^\x20-\x7E\n\t]/g, "") // Keep only ASCII printable + newline/tab
    .replace(/\s+/g, " ") // Normalize spaces
    .trim()
}

function calculateAtsMatch(resume: string, jobDescription: string): number {
  const jobKeywords = jobDescription.toLowerCase().split(/\W+/)
  const resumeKeywords = resume.toLowerCase().split(/\W+/)
  const resumeSet = new Set(resumeKeywords)
  
  const matches = jobKeywords.filter((k: string) => k.length > 3 && resumeSet.has(k)).length
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

RESUME:
${resume.substring(0, 1200)}

JOB DESCRIPTION:
${jobDescription.substring(0, 1200)}

Score 0-100. Respond ONLY with JSON (no markdown):
{
  "fitScore": 65,
  "strengths": ["skill1", "skill2"],
  "gaps": ["gap1"],
  "missingKeywords": ["keyword1"]
}`
      }],
    })

    let content = completion.choices[0]?.message?.content || "{}"
    content = content.replace(/```json|\n```|```/g, "").trim()

    let data: any = {
      fitScore: 60,
      strengths: [],
      gaps: [],
      missingKeywords: []
    }

    try {
      data = JSON.parse(content)
    } catch (e) {
      console.error("Parse error:", content.substring(0, 100))
    }

    const fitScore = Math.min(100, Math.max(0, data.fitScore || 60))
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
    else tailorWorth = 0

    const verdict = 
      fitScore >= 75 ? "Strong Fit" :
      fitScore >= 55 ? "Moderate Fit" :
      "Weak Fit"

    // Clean all text before returning
    const strengths = (Array.isArray(data.strengths) ? data.strengths : [])
      .map((s: any) => cleanText(String(s)))
      .filter((s: string) => s.length > 0)
      .slice(0, 4)

    const gaps = (Array.isArray(data.gaps) ? data.gaps : [])
      .map((g: any) => cleanText(String(g)))
      .filter((g: string) => g.length > 0)
      .slice(0, 4)

    const keywords = (Array.isArray(data.missingKeywords) ? data.missingKeywords : [])
      .map((k: any) => cleanText(String(k)))
      .filter((k: string) => k.length > 0)
      .slice(0, 5)

    return NextResponse.json({
      verdict,
      fitScore: Math.round(fitScore),
      atsMatch: Math.round(atsMatch),
      successProbability: Math.round(successProbability),
      tailorWorth: Math.round(Math.max(0, tailorWorth)),
      strengths,
      gaps,
      missingKeywords: keywords,
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
