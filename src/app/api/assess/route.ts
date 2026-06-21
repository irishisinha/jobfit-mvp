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
        content: `Analyze resume vs job. Return ONLY a valid JSON object (no markdown, no extra text):
{"verdict":"Strong Fit","fitScore":85,"atsMatch":88,"successProbability":90,"strengths":["s1","s2"],"gaps":["g1"],"missingKeywords":["k1"]}
RESUME: ${resume.substring(0, 800)}
JOB: ${jobTitle} at ${company}
DESCRIPTION: ${jobDescription.substring(0, 800)}`
      }],
    })

    let content = completion.choices[0]?.message?.content || ""
    if (!content) {
      throw new Error("No response from Groq")
    }

    // Strip markdown code fences
    content = content.replace(/^```json\n?/, "").replace(/^```\n?/, "").replace(/\n?```$/, "").trim()

    // Extract JSON object if wrapped in text
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      content = jsonMatch[0]
    }

    // Clean common JSON issues
    content = content.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]") // Remove trailing commas
    content = content.replace(/[\x00-\x1F\x7F-\x9F]/g, " ") // Remove control characters

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any = JSON.parse(content)

    // Ensure proper types and values
    result.verdict = String(result.verdict || "Moderate Fit")
    result.fitScore = Math.min(100, Math.max(0, parseInt(String(result.fitScore)) || 50))
    result.atsMatch = Math.min(100, Math.max(0, parseInt(String(result.atsMatch)) || 50))
    result.successProbability = Math.min(100, Math.max(0, parseInt(String(result.successProbability)) || 50))
    result.strengths = (Array.isArray(result.strengths) ? result.strengths : []).filter((s: string) => s && typeof s === "string" && s !== "N/A")
    result.gaps = (Array.isArray(result.gaps) ? result.gaps : []).filter((g: string) => g && typeof g === "string" && g !== "N/A")
    result.missingKeywords = (Array.isArray(result.missingKeywords) ? result.missingKeywords : []).filter((k: string) => k && typeof k === "string" && k !== "N/A")

    if (result.strengths.length === 0) result.strengths = ["Experience aligns with role"]
    if (result.gaps.length === 0) result.gaps = ["Areas for development"]
    if (result.missingKeywords.length === 0) result.missingKeywords = ["Industry-specific tools"]

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
    console.error("Assessment error:", error)
    return NextResponse.json({
      verdict: "Moderate Fit",
      fitScore: 50,
      atsMatch: 50,
      successProbability: 50,
      strengths: ["Professional experience"],
      gaps: ["Specific skill requirements"],
      missingKeywords: ["Technical skills"]
    })
  }
}
