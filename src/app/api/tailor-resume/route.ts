import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

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

    // Fast single-pass optimization
    const prompt = `Optimize resume for job. Return ONLY modified resume.

RESUME:
${resume}

JOB: ${jobDescription}

Add 2-3 job-relevant keywords from resume to matching sections. Mark with [[[HIGHLIGHT_START]]]word[[[HIGHLIGHT_END]]].
Keep ALL formatting. Return ONLY resume text.`

    const message = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 2500,
    })

    let tailoredResume = message.choices[0]?.message?.content || resume
    
    // Clean artifacts
    tailoredResume = tailoredResume.replace(/KEYWORDS\s+TO\s+ADD:[\s\S]*?(?=\n[A-Z])/i, "")
    tailoredResume = tailoredResume.replace(/Instructions:[\s\S]*?(?=\n[A-Z])/i, "")
    tailoredResume = tailoredResume.trim()

    // Extract keywords
    const highlights = tailoredResume.match(/\[\[\[HIGHLIGHT_START\]\]\](.*?)\[\[\[HIGHLIGHT_END\]\]\]/g) || []
    const keywords = highlights.map(h => h.replace(/\[\[\[HIGHLIGHT_START\]\]\]|\[\[\[HIGHLIGHT_END\]\]\]/g, ""))

    const changeSummary = keywords.length > 0
      ? keywords.map(k => `• Added "${k}" to emphasize relevant experience`).join("\n")
      : "• Resume already emphasizes key strengths"

    return NextResponse.json({
      tailoredResume,
      originalResume: resume,
      changeSummary,
      addedKeywords: keywords,
    })
  } catch (error: any) {
    console.error("Tailor error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
