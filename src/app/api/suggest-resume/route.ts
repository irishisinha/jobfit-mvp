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

    const { jobDescription, jobTitle, company, resumes } = await req.json()

    if (!jobDescription?.trim() || !resumes || resumes.length === 0) {
      return NextResponse.json({ suggestions: [] })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const suggestions = await Promise.all(
      resumes.map(async (resume: any) => {
        try {
          const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 200,
            temperature: 0,
            messages: [{
              role: "user",
              content: `Score this resume for: ${jobTitle} at ${company}

RESUME: ${resume.content.substring(0, 2500)}

JOB: ${jobDescription.substring(0, 1500)}

Return ONLY JSON (no markdown):
{"score": 65}`
            }],
          })

          const content = (completion.choices[0]?.message?.content || "{}").replace(/```[\s\S]*?```/g, "").trim()
          let data = { score: 60 }
          
          try {
            data = JSON.parse(content)
          } catch (e) {
            console.error("Parse error")
          }

          const score = Math.min(100, Math.max(0, parseInt(String(data.score)) || 60))
          const tailorWorth = Math.max(0, 100 - score)

          return { 
            id: resume.id, 
            name: resume.name, 
            score,
            tailorWorth,
            reason: `${score}% fit`
          }
        } catch (err) {
          return { 
            id: resume.id, 
            name: resume.name, 
            score: 0,
            tailorWorth: 100,
            reason: "Error analyzing"
          }
        }
      })
    )

    // SIMPLE: Sort by score DESCENDING - highest first
    const sorted = [...suggestions].sort((a, b) => b.score - a.score)

    // Add recommendation
    if (sorted.length > 0) {
      const topResume = sorted[0]
      topResume.recommendation = `"${topResume.name}" is the best match at ${topResume.score}% fit.`
    }

    return NextResponse.json({ suggestions: sorted })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ suggestions: [] })
  }
}
