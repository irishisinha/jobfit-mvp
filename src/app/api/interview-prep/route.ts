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

    const { jobDescription, jobTitle, company, userResume } = await req.json()

    if (!jobDescription?.trim()) {
      return NextResponse.json({ error: "Job description required" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 2000,
      temperature: 0,
      messages: [{
        role: "user",
        content: `Generate interview prep for this job. Return ONLY JSON.

JOB DESCRIPTION:
${jobDescription.substring(0, 1000)}

USER RESUME:
${userResume?.substring(0, 800) || "Not provided"}

RETURN:
{
  "likelyQuestions": [
    {
      "question": "exact question likely to be asked",
      "why": "why they ask this",
      "userStrength": "what to emphasize from resume",
      "userWeakness": "what to prepare for",
      "suggestedAnswer": "framework for answer"
    }
  ],
  "behavioralQuestions": [
    {"question": "Tell us about...", "framework": "STAR method structure"}
  ],
  "technicalTopics": ["topic1", "topic2"],
  "redFlags": ["what NOT to say"],
  "companyCultureQuestions": ["question likely about culture fit"]
}

Return only valid JSON.`
      }],
    })

    let content = completion.choices[0]?.message?.content || "{}"
    content = content.replace(/```json\n?|\n?```/g, "").trim()
    const prep = JSON.parse(content)

    return NextResponse.json(prep)
  } catch (error) {
    console.error("Interview prep error:", error)
    return NextResponse.json({ error: "Failed to generate interview prep" }, { status: 500 })
  }
}
