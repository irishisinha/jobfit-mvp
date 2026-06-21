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

    const { jobTitle, userResume } = await req.json()

    if (!jobTitle?.trim() || !userResume?.trim()) {
      return NextResponse.json({ error: "Job title and resume required" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 2000,
      temperature: 0,
      messages: [{
        role: "user",
        content: `Analyze typical candidate profile. Return ONLY JSON.

JOB TITLE: ${jobTitle}
USER RESUME: ${userResume.substring(0, 600)}

NOTE: This is an AI ESTIMATE of typical candidates, NOT based on real market research.

RETURN:
{
  "dataSource": "ESTIMATED - AI-generated based on typical patterns",
  "disclaimer": "⚠️ This is an estimate. Real competitive analysis requires market research data.",
  "typicalCandidateProfile": {
    "yearsExperience": {"min": 8, "max": 12, "typical": 10},
    "education": "MBA, Computer Science, or related",
    "previousRoles": ["Senior PM", "Director of Product"],
    "commonBackgrounds": ["Tech company", "Startup"]
  },
  "competitiveAnalysis": [
    {
      "factor": "Years of Experience",
      "typical": 10,
      "yourLevel": 6,
      "gap": -4,
      "competitivePosition": "Below average (ESTIMATE)"
    }
  ],
  "yourPercentile": 35,
  "percentileAnalysis": "Estimated position (UNVERIFIED)",
  "confidenceLevel": "Low - For reference only"
}

Return only valid JSON.`
      }],
    })

    let content = completion.choices[0]?.message?.content || "{}"
    content = content.replace(/```json\n?|\n?```/g, "").trim()
    const competitor = JSON.parse(content)

    competitor.dataSource = "ESTIMATED - AI-GENERATED, NOT REAL MARKET DATA"
    competitor.disclaimer = "⚠️ This is a rough estimate. For real competitive analysis, research actual postings."
    competitor.confidenceLevel = "Low - For guidance only"

    return NextResponse.json(competitor)
  } catch (error) {
    console.error("Competitor intel error:", error)
    return NextResponse.json({ 
      error: "Failed to generate competitor intelligence",
      dataSource: "ESTIMATED",
      disclaimer: "Estimates only"
    }, { status: 500 })
  }
}
