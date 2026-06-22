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

    const { jobDescription } = await req.json()

    if (!jobDescription?.trim()) {
      return NextResponse.json({ error: "Job description required" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 300,
      temperature: 0,
      messages: [{
        role: "user",
        content: `Extract job title and company name from this job description. Return ONLY JSON.

JOB DESCRIPTION:
${jobDescription.substring(0, 1500)}

Return ONLY this JSON:
{
  "jobTitle": "exact job title mentioned",
  "company": "company name",
  "confidence": "high" | "medium" | "low"
}

Rules:
- Extract main job title (not the preamble)
- Extract company name if mentioned
- If company not mentioned, use empty string
- Return only valid JSON`
      }],
    })

    let content = completion.choices[0]?.message?.content || "{}"
    content = content.replace(/```json\n?|\n?```/g, "").trim()
    const data = JSON.parse(content)

    return NextResponse.json({
      jobTitle: data.jobTitle || "Job Position",
      company: data.company || "Company",
      confidence: data.confidence || "medium"
    })
  } catch (error) {
    console.error("Extract job info error:", error)
    return NextResponse.json({
      jobTitle: "Job Position",
      company: "Company",
      confidence: "low"
    })
  }
}
