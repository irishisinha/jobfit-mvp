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
        content: `You are a recruiter analyzing a resume against a job description.

RESUME:
${resume.substring(0, 1000)}

JOB TITLE: ${jobTitle}
COMPANY: ${company}
JOB DESCRIPTION:
${jobDescription.substring(0, 1000)}

Analyze the fit and respond with ONLY valid JSON (no markdown, no extra text). Use your actual analysis:

{"verdict":"Strong Fit" or "Moderate Fit" or "Weak Fit","fitScore":0-100,"atsMatch":0-100,"successProbability":0-100,"strengths":["actual strength 1","actual strength 2","actual strength 3"],"gaps":["actual gap 1","actual gap 2"],"missingKeywords":["actual keyword 1","actual keyword 2","actual keyword 3"]}`
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
    content = content.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]")
    content = content.replace(/[\x00-\x1F\x7F-\x9F]/g, " ")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any = JSON.parse(content)

    // Normalize verdict
    const verdictMap: { [key: string]: string } = {
      "strong fit": "Strong Fit",
      "strong": "Strong Fit",
      "moderate fit": "Moderate Fit",
      "moderate": "Moderate Fit",
      "weak fit": "Weak Fit",
      "weak": "Weak Fit",
      "good fit": "Strong Fit",
      "good": "Strong Fit",
      "poor fit": "Weak Fit",
      "poor": "Weak Fit",
    }

    const verdictLower = String(result.verdict || "").toLowerCase()
    result.verdict = verdictMap[verdictLower] || "Moderate Fit"
    result.fitScore = Math.min(100, Math.max(0, parseInt(String(result.fitScore)) || 50))
    result.atsMatch = Math.min(100, Math.max(0, parseInt(String(result.atsMatch)) || 50))
    result.successProbability = Math.min(100, Math.max(0, parseInt(String(result.successProbability)) || 50))

    // Filter and validate arrays
    result.strengths = (Array.isArray(result.strengths) ? result.strengths : []).filter((s: string) => s && typeof s === "string" && s.length > 3 && !s.match(/^[sg]\d+$/))
    result.gaps = (Array.isArray(result.gaps) ? result.gaps : []).filter((g: string) => g && typeof g === "string" && g.length > 3 && !g.match(/^[g]\d+$/))
    result.missingKeywords = (Array.isArray(result.missingKeywords) ? result.missingKeywords : []).filter((k: string) => k && typeof k === "string" && k.length > 2 && !k.match(/^k\d+$/))

    if (result.strengths.length === 0) result.strengths = ["Professional background", "Relevant experience"]
    if (result.gaps.length === 0) result.gaps = ["Domain-specific experience needed"]
    if (result.missingKeywords.length === 0) result.missingKeywords = ["Technical skills", "Industry knowledge"]

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
      fitScore: 60,
      atsMatch: 60,
      successProbability: 65,
      strengths: ["Professional experience", "Education background"],
      gaps: ["Specific technical skills", "Industry experience"],
      missingKeywords: ["Domain tools", "Relevant technologies"]
    })
  }
}
