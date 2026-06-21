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

    const { jobDescription, jobTitle, company } = await req.json()

    if (!jobDescription?.trim()) {
      return NextResponse.json({ error: "Job description required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const resumes = await prisma.resume.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, content: true },
    })

    if (resumes.length === 0) {
      return NextResponse.json({ suggestions: [] })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const suggestions = await Promise.all(
      resumes.map(async (resume) => {
        try {
          const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 150,
            messages: [{
              role: "user",
              content: `Rate resume match for job (0-100).

RESUME: ${resume.content.substring(0, 400)}

JOB: ${jobTitle} at ${company}
${jobDescription.substring(0, 300)}

Return: SCORE: [0-100] - reason`
            }],
          })

          const response = completion.choices[0]?.message?.content || "SCORE: 50"
          const scoreMatch = response.match(/(\d+)/)
          const score = scoreMatch ? parseInt(scoreMatch[1]) : 50

          return {
            id: resume.id,
            name: resume.name,
            score: Math.min(100, Math.max(0, score)),
            reason: response.replace(/SCORE:\s*\d+\s*-?\s*/, "").trim().substring(0, 100),
          }
        } catch (err) {
          return { id: resume.id, name: resume.name, score: 50, reason: "Unable to score" }
        }
      })
    )

    suggestions.sort((a, b) => b.score - a.score)

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("Resume suggestion error:", error)
    return NextResponse.json({ suggestions: [] })
  }
}
