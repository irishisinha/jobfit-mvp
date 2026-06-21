import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import { prisma } from "../../../lib/prisma"
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
        content: `Analyze resume vs job. Respond with ONLY valid JSON:
RESUME: ${resume.substring(0, 800)}
JOB: ${jobTitle} at ${company}
DESCRIPTION: ${jobDescription.substring(0, 800)}
{"verdict":"Strong Fit|Moderate Fit|Weak Fit","fitScore":0-100,"atsMatch":0-100,"successProbability":0-100,"strengths":["s1","s2","s3"],"gaps":["g1","g2","g3"],"missingKeywords":["k1","k2","k3"]}`
      }],
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: "No response from Groq" }, { status: 500 })
    }

    const result = JSON.parse(content)

    // Save to database (non-blocking - fire and forget)
    try {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      })
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
        }).catch(() => {}) // Ignore db errors
      }
    } catch {}

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({
      error: "Failed",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
