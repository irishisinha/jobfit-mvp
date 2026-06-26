import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../lib/auth"
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

    const prompt = `Analyze this resume against the job description. Be SMART about gaps:

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

IMPORTANT: Recognize industry experience by COMPANY, not just keywords:
- If resume mentions "Pidilite" or "HUL" = has FMCG experience
- If resume mentions "TCS", "Infosys", "Accenture" = has enterprise software experience
- If resume mentions "Goldman Sachs", "Morgan Stanley" = has financial services experience
- If resume mentions "Google", "Meta", "Amazon" = has big tech experience

IDENTIFY GAPS (be selective):
- CRITICAL gaps: Missing required technical skills, tools, core competencies
- DO NOT flag: Industry experience if resume shows equivalent (by company or explicit mention)
- DO NOT flag: Preferences, nice-to-have, ideal qualifications
- DO NOT flag: Generic soft skills

Only flag TRUE MISSING SKILLS, not industry preferences or company-name variants.

Examples of TRUE GAPS:
- Job needs "Python" but resume has no Python/coding
- Job needs "CRM systems" but no mention of Salesforce/HubSpot/Dynamics

Examples of NOT GAPS (ignore):
- "FMCG experience required" but resume has "Pidilite" or "HUL"
- "Retail experience preferred" but resume shows "Amazon operations" or "Flipkart"
- "Tech company background ideal" but resume has "Google" or "Microsoft"

Respond in this EXACT JSON format:
{
  "strengths": ["real strength 1", "real strength 2", "real strength 3"],
  "gaps": ["ONLY critical missing skills", "not preferences"],
  "missingKeywords": ["critical keyword 1", "critical keyword 2"]
}

Respond ONLY with JSON, no other text.`

    const message = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 1000,
    })

    const content = message.choices[0]?.message?.content || ""
    
    try {
      const data = JSON.parse(content)
      return NextResponse.json({
        strengths: data.strengths || [],
        gaps: data.gaps || [],
        missingKeywords: data.missingKeywords || [],
      })
    } catch (e) {
      console.error("Parse failed:", content.substring(0, 300))
      return NextResponse.json({
        strengths: [],
        gaps: [],
        missingKeywords: [],
      })
    }
  } catch (error: any) {
    console.error("Assess error:", error)
    return NextResponse.json({
      strengths: [],
      gaps: [],
      missingKeywords: [],
    }, { status: 500 })
  }
}
