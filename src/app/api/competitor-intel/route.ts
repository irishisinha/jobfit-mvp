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
        content: `Analyze typical candidate profile for this role. Return ONLY JSON.

JOB TITLE: ${jobTitle}
USER RESUME: ${userResume.substring(0, 600)}

RETURN:
{
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
      "competitivePosition": "Below average"
    },
    {
      "factor": "MBA/Advanced Degree",
      "typical": "70% have it",
      "yourLevel": "No",
      "gap": "missing",
      "competitivePosition": "Disadvantage"
    }
  ],
  "yourPercentile": 35,
  "percentileAnalysis": "You're in bottom 35% for typical candidate pool",
  "recommendations": [
    "Gain 2-3 more years of PM experience",
    "Consider MBA or online finance course",
    "Lead higher-impact projects"
  ],
  "whenToApply": "After 2 more years of experience OR after completing MBA"
}

Return only valid JSON.`
      }],
    })

    let content = completion.choices[0]?.message?.content || "{}"
    content = content.replace(/```json\n?|\n?```/g, "").trim()
    const competitor = JSON.parse(content)

    return NextResponse.json(competitor)
  } catch (error) {
    console.error("Competitor intel error:", error)
    return NextResponse.json({ error: "Failed to generate competitor intelligence" }, { status: 500 })
  }
}
