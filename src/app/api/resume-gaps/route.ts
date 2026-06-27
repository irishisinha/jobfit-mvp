import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import Groq from "groq-sdk"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { resume, jobDescription } = await req.json()

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const prompt = `Identify gaps in resume detail and ask USER to provide context.

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

TASK: Find 2-3 places where resume mentions relevant achievements but lacks depth/context.

FORMAT: "You mentioned: [achievement claim] → Can you add: [specific questions about metrics, timeline, impact]?"

EXAMPLES:
✓ "You mentioned: 'led marketplace growth' → Can you add: What % YoY growth? What timeframe? What strategy drove it?"
✓ "You mentioned: 'scaled platform' → Can you add: How many users/retailers? What was the before/after? What bottleneck did you solve?"
✓ "You mentioned: 'improved margins' → Can you add: By how many basis points? Through what mechanism?"

RULES:
- Only ask about achievements already in resume (not new claims)
- Ask specific questions, not vague ones
- Only for job-relevant achievements
- Max 2-3 gaps to avoid overwhelming user
- Questions should help user recall/articulate what they already did

Respond as JSON:
{
  "gaps": [
    {
      "mentioned": "the achievement claim from resume",
      "canYouAdd": "specific questions to ask user"
    }
  ]
}

Only JSON.`

    const message = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 600,
    })

    const content = message.choices[0]?.message?.content || "{}"
    
    try {
      const data = JSON.parse(content)
      return NextResponse.json({ 
        gaps: Array.isArray(data.gaps) ? data.gaps : []
      })
    } catch (e) {
      console.error("Parse error:", content.substring(0, 200))
      return NextResponse.json({ gaps: [] })
    }
  } catch (error: any) {
    console.error("Gaps error:", error.message)
    return NextResponse.json({ gaps: [] }, { status: 500 })
  }
}
