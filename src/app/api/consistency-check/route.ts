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

    const { resumes } = await req.json()

    if (!resumes || resumes.length < 2) {
      return NextResponse.json({ error: "At least 2 resumes required" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const resumeText = resumes
      .map((r: any) => `--- ${r.name} ---\n${r.content}`)
      .join("\n\n")

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 2000,
      temperature: 0,
      messages: [{
        role: "user",
        content: `You are a resume auditor. Analyze these ${resumes.length} resumes for CONTRADICTIONS and INCONSISTENCIES. Flag anything that could raise red flags with recruiters.

${resumeText}

Return ONLY this JSON:
{
  "hasIssues": true/false,
  "summary": "Overall assessment in 1-2 sentences",
  "issues": [
    {
      "type": "Employment Timeline Contradiction",
      "description": "Resume A says X worked at Company from 2020-2022, Resume B says 2021-2023",
      "evidence": "Resume A: '2020-2022 at Company X'; Resume B: '2021-2023 at Company X'",
      "severity": "high",
      "recommendation": "Clarify actual dates. Recruiters cross-check employment with companies."
    }
  ],
  "truthfulnessScore": {
    "consistency": 85,
    "verifiable": 90,
    "hiringRisk": "low"
  },
  "adviceIfClean": "Your resumes are internally consistent. You can confidently share them with recruiters."
}

CRITICAL RULES:
1. ONLY flag genuine contradictions (different dates, titles, company names, metrics)
2. Do NOT flag legitimate differences (e.g., "Senior PM" vs "Product Manager" at different companies)
3. If a role/experience appears only once, it's NOT a contradiction
4. Prioritize verifiable facts (employment dates, company names, titles, metrics)
5. Ignore style/formatting differences
6. Return only valid JSON`
      }],
    })

    let content = completion.choices[0]?.message?.content || "{}"
    content = content.replace(/```json\n?|\n?```/g, "").trim()
    const result = JSON.parse(content)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Consistency check error:", error)
    return NextResponse.json({
      hasIssues: false,
      summary: "Unable to complete check",
      issues: [],
      truthfulnessScore: { consistency: 0, verifiable: 0, hiringRisk: "unknown" }
    })
  }
}
