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

    const { jobTitle, company, location = "US", yearsExperience = 10 } = await req.json()

    if (!jobTitle?.trim()) {
      return NextResponse.json({ error: "Job title required" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 1500,
      temperature: 0,
      messages: [{
        role: "user",
        content: `Provide salary intelligence for this role. Return ONLY JSON.

ROLE: ${jobTitle}
COMPANY: ${company || "Not specified"}
LOCATION: ${location}
EXPERIENCE: ${yearsExperience} years

IMPORTANT: These are AI ESTIMATES based on typical market patterns, NOT verified salary data.

RETURN:
{
  "dataSource": "ESTIMATED - AI-generated based on typical market patterns",
  "disclaimer": "⚠️ These estimates are NOT based on real verified data. For accurate salary info, check Levels.fyi, Glassdoor, Blind, or Salary.com",
  "marketSalaryRange": {
    "min": 150000,
    "max": 350000,
    "avg": 250000,
    "currency": "USD"
  },
  "byLocation": {
    "San Francisco": {"min": 200000, "max": 350000},
    "New York": {"min": 190000, "max": 330000},
    "Remote": {"min": 170000, "max": 300000}
  },
  "yourEstimate": {
    "base": 245000,
    "equity": "0.5-1%",
    "bonus": "20-30%",
    "total": 310000,
    "reasoning": "Estimated based on typical experience level"
  },
  "negotiationTips": [
    "Use verified data (Levels.fyi, Blind, Salary.com) in negotiations"
  ]
}

Return only valid JSON.`
      }],
    })

    let content = completion.choices[0]?.message?.content || "{}"
    content = content.replace(/```json\n?|\n?```/g, "").trim()
    const salary = JSON.parse(content)

    // Add clear disclaimer
    salary.dataSource = "ESTIMATED - NOT VERIFIED MARKET DATA"
    salary.disclaimer = "⚠️ Use verified sources: Levels.fyi, Blind, Salary.com, Glassdoor for real data"
    salary.confidenceLevel = "Low - For reference only, not for negotiation decisions"

    return NextResponse.json(salary)
  } catch (error) {
    console.error("Salary intel error:", error)
    return NextResponse.json({ 
      error: "Failed to generate salary intelligence",
      dataSource: "ESTIMATED",
      disclaimer: "Estimates only - use verified sources"
    }, { status: 500 })
  }
}
