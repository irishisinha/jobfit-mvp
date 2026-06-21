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

    const { jobTitle, location = "US", userResume } = await req.json()

    if (!jobTitle?.trim()) {
      return NextResponse.json({ error: "Job title required" }, { status: 400 })
    }

    // TODO: Call Indeed API to search jobs
    // For now, using mock data structure
    const mockJobs = [
      {
        title: jobTitle,
        description: `Experience with ${jobTitle}. Skills: Product Strategy, P&L Management, SQL, Data Analytics. 8-12 years required.`,
        salary: "$200K - $300K",
        company: "Tech Company"
      },
    ]

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    // Analyze all jobs with Groq
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 2000,
      temperature: 0,
      messages: [{
        role: "user",
        content: `Analyze these ${jobTitle} job postings and extract patterns. Return ONLY JSON.

JOB DESCRIPTIONS:
${mockJobs.map(j => j.description).join("\n---\n")}

ANALYZE AND RETURN:
{
  "topSkills": [
    {"skill": "skill name", "frequency": "70%", "importance": "critical"}
  ],
  "experienceRange": {"min": 8, "max": 12, "avg": 10},
  "salaryRange": {"min": 200000, "max": 300000, "avg": 250000},
  "educationRequired": ["MBA", "STEM degree"],
  "commonRequirements": ["requirement1"],
  "interviews": [
    {"question": "likely question", "why": "reason it's asked"}
  ],
  "marketTrends": ["trend1"]
}

STRICT: Return only valid JSON.`
      }],
    })

    let content = completion.choices[0]?.message?.content || "{}"
    content = content.replace(/```json\n?|\n?```/g, "").trim()
    const analysis = JSON.parse(content)

    // Compare against user resume
    const gapAnalysis = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 1000,
      temperature: 0,
      messages: [{
        role: "user",
        content: `Compare resume against market requirements. Return ONLY JSON.

RESUME:
${userResume?.substring(0, 800) || "Not provided"}

MARKET REQUIREMENTS:
${JSON.stringify(analysis.topSkills, null, 2)}

RETURN:
{
  "gapAnalysis": [
    {"skill": "skill name", "marketDemand": "70%", "userHas": true/false, "priority": "high"}
  ],
  "actionPlan": [
    {"action": "action", "timeframe": "weeks", "impact": "+15%"}
  ]
}

Return only valid JSON.`
      }],
    })

    const gapContent = gapAnalysis.choices[0]?.message?.content || "{}"
    const gaps = JSON.parse(gapContent.replace(/```json\n?|\n?```/g, "").trim())

    return NextResponse.json({
      roleAnalysis: analysis,
      gapAnalysis: gaps,
      summary: {
        marketSize: 50,
        competitionLevel: "High",
        recommendedAction: "Complete skill gaps before applying"
      }
    })
  } catch (error) {
    console.error("Market insights error:", error)
    return NextResponse.json({ error: "Failed to analyze market" }, { status: 500 })
  }
}
