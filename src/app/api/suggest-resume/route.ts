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

    // Get user's resumes from localStorage (passed from frontend)
    const { resumes } = await req.json()

    if (!resumes || resumes.length === 0) {
      return NextResponse.json({ suggestions: [] })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    // Score all resumes in parallel
    const suggestions = await Promise.all(
      resumes.map(async (resume: any) => {
        try {
          const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 200,
            temperature: 0,
            messages: [{
              role: "user",
              content: `Rate resume match to job. Return ONLY: {"score": 0-100, "reason": "brief reason"}

RESUME: ${resume.content.substring(0, 400)}
JOB: ${jobTitle} at ${company}
REQUIREMENTS: ${jobDescription.substring(0, 400)}

Return valid JSON only.`
            }],
          })

          const content = (completion.choices[0]?.message?.content || "{}").replace(/```json\n?|\n?```/g, "").trim()
          const data = JSON.parse(content)
          const score = Math.min(100, Math.max(0, data.score || 50))

          return {
            id: resume.id,
            name: resume.name,
            score,
            reason: data.reason || "Analyzed"
          }
        } catch (err) {
          return { id: resume.id, name: resume.name, score: 50, reason: "Error" }
        }
      })
    )

    // Sort by score descending
    const sorted = suggestions.sort((a, b) => b.score - a.score)

    return NextResponse.json({ suggestions: sorted })
  } catch (error) {
    console.error("Suggest resume error:", error)
    return NextResponse.json({ suggestions: [] })
  }
}
