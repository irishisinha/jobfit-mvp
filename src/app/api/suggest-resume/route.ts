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

    if (!jobDescription?.trim()) {
      return NextResponse.json({ error: "Job description required" }, { status: 400 })
    }

    if (!resumes || resumes.length === 0) {
      return NextResponse.json({ suggestions: [] })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    // Score all resumes with detailed analysis
    const suggestions = await Promise.all(
      resumes.map(async (resume: any) => {
        try {
          const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 300,
            temperature: 0,
            messages: [{
              role: "user",
              content: `Score this resume for the job. Return ONLY JSON.

RESUME: ${resume.content.substring(0, 600)}

TARGET JOB: ${jobTitle} at ${company}
REQUIREMENTS: ${jobDescription.substring(0, 600)}

Score on these SPECIFIC criteria:
1. Skills match (0-25): Does resume have exact skills mentioned?
2. Experience level (0-25): Is experience level appropriate?
3. Industry/domain (0-20): Is their background relevant?
4. Project relevance (0-20): Do projects align with job needs?
5. Keywords present (0-10): Do key terms from JD appear?

Return ONLY this JSON:
{
  "skillsMatch": 0-25,
  "experienceLevel": 0-25,
  "industryMatch": 0-20,
  "projectRelevance": 0-20,
  "keywordMatch": 0-10,
  "score": 0-100,
  "reason": "one sentence"
}

STRICT: Score EACH criterion independently. Different resumes should get VERY different scores.`
            }],
          })

          const content = (completion.choices[0]?.message?.content || "{}").replace(/```json\n?|\n?```/g, "").trim()
          const data = JSON.parse(content)
          
          // Calculate score from components
          const score = Math.min(100, Math.max(0, 
            (data.skillsMatch || 0) +
            (data.experienceLevel || 0) +
            (data.industryMatch || 0) +
            (data.projectRelevance || 0) +
            (data.keywordMatch || 0)
          ))

          return {
            id: resume.id,
            name: resume.name,
            score,
            reason: data.reason || "Analyzed",
            breakdown: {
              skills: data.skillsMatch || 0,
              experience: data.experienceLevel || 0,
              industry: data.industryMatch || 0,
              projects: data.projectRelevance || 0,
              keywords: data.keywordMatch || 0
            }
          }
        } catch (err) {
          return { 
            id: resume.id, 
            name: resume.name, 
            score: 0, 
            reason: "Error analyzing",
            breakdown: { skills: 0, experience: 0, industry: 0, projects: 0, keywords: 0 }
          }
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
