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

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 2000,
      temperature: 0,
      messages: [{
        role: "user",
        content: `Analyze these ${jobTitle} job postings and extract patterns. Return ONLY JSON.

JOB DESCRIPTIONS:
(Currently generating estimate based on typical market patterns - NOT real job data)

ANALYZE AND RETURN:
{
  "dataSource": "ESTIMATED - not based on real job postings",
  "disclaimer": "These are AI-generated estimates based on typical market patterns, not real market data",
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

    // Add disclaimer
    analysis.dataSource = "ESTIMATED - AI-generated based on typical patterns"
    analysis.disclaimer = "⚠️ These are estimates, NOT real market data. Real integration with Indeed/LinkedIn data coming soon."
    analysis.confidenceLevel = "Low - Replace with real job posting data to improve accuracy"

    return NextResponse.json(analysis)
  } catch (error) {
    console.error("Market insights error:", error)
    return NextResponse.json({ 
      error: "Failed to analyze market",
      dataSource: "ESTIMATED",
      disclaimer: "Estimates only - not real data"
    }, { status: 500 })
  }
}
