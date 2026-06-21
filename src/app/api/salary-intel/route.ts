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

    const { jobTitle, company, location = "US", yearsExperience = 10, userProfile } = await req.json()

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
USER PROFILE: ${userProfile?.substring(0, 300) || "Not provided"}

RETURN:
{
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
  "byExperience": {
    "5-7 years": {"min": 150000, "max": 200000},
    "8-12 years": {"min": 200000, "max": 300000},
    "13+ years": {"min": 250000, "max": 400000}
  },
  "yourEstimate": {
    "base": 245000,
    "equity": "0.5-1%",
    "bonus": "20-30%",
    "total": 310000,
    "reasoning": "Based on your experience and skills"
  },
  "negotiationTips": [
    "Tip 1: Use market data in negotiation",
    "Tip 2: Focus on equity for Series B startups"
  ],
  "redFlags": [
    "If they offer below market by 20%+"
  ]
}

Return only valid JSON.`
      }],
    })

    let content = completion.choices[0]?.message?.content || "{}"
    content = content.replace(/```json\n?|\n?```/g, "").trim()
    const salary = JSON.parse(content)

    return NextResponse.json(salary)
  } catch (error) {
    console.error("Salary intel error:", error)
    return NextResponse.json({ error: "Failed to generate salary intelligence" }, { status: 500 })
  }
}
