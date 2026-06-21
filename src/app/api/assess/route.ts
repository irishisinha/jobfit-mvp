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

    const { resume, jobDescription, jobTitle, company } = await req.json()

    if (!resume || !jobDescription) {
      return NextResponse.json({ error: "Missing resume or job description" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `Analyze resume vs job. Return ONLY valid JSON (no markdown):
RESUME: ${resume.substring(0, 800)}
JOB: ${jobTitle} at ${company}
DESCRIPTION: ${jobDescription.substring(0, 800)}
{"verdict":"Strong Fit|Moderate Fit|Weak Fit","fitScore":0-100,"atsMatch":0-100,"successProbability":0-100,"strengths":["s1","s2","s3"],"gaps":["g1","g2","g3"],"missingKeywords":["k1","k2","k3"]}`
      }],
    })

    let content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: "No response from Groq" }, { status: 500 })
    }

    content = content.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any = JSON.parse(content)

    // Ensure arrays exist and convert numbers
    result.verdict = String(result.verdict || "Moderate Fit")
    result.fitScore = Math.min(100, Math.max(0, parseInt(String(result.fitScore)) || 0))
    result.atsMatch = Math.min(100, Math.max(0, parseInt(String(result.atsMatch)) || 0))
    result.successProbability = Math.min(100, Math.max(0, parseInt(String(result.successProbability)) || 0))
    result.strengths = Array.isArray(result.strengths) ? result.strengths.filter((s: string) => s && s !== "N/A") : []
    result.gaps = Array.isArray(result.gaps) ? result.gaps.filter((g: string) => g && g !== "N/A") : []
    result.missingKeywords = Array.isArray(result.missingKeywords) ? result.missingKeywords.filter((k: string) => k && k !== "N/A") : []

    if (result.strengths.length === 0) result.strengths = ["Experience aligns with role"]
    if (result.gaps.length === 0) result.gaps = ["Some skill gaps identified"]
    if (result.missingKeywords.length === 0) result.missingKeywords = ["Consider learning industry-specific tools"]

    // Save to database (non-blocking)
    try {
      const { prisma } = await import("../../../lib/prisma")
      const user = await prisma.user.findUnique({ where: { email: session.user.email } })
      if (user) {
        prisma.assessment.create({
          data: {
            userId: user.id,
            resume,
            jobDescription,
            jobTitle: jobTitle || "Untitled",
            company: company || "Unknown",
            verdict: result.verdict,
            fitScore: result.fitScore,
            atsMatch: result.atsMatch,
            successProbability: result.successProbability,
            strengths: result.strengths.join("|"),
            gaps: result.gaps.join("|"),
            missingKeywords: result.missingKeywords.join("|"),
          },
        }).catch(() => {})
      }
    } catch {}

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({
      error: "Failed to parse response",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
