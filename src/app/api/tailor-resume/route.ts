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

    const { resume, jobDescription, jobTitle, company } = await req.json()

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Single call: identify domain-relevant keywords and add them
    const prompt = `CRITICAL: Only add keywords the candidate ACTUALLY has experience with.

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

RULES:
1. Identify candidate's actual experience domains (industries, skills, roles)
2. Identify job's required keywords
3. ONLY add keywords if candidate's resume explicitly mentions related experience
4. Skip keywords from unrelated domains
5. Keep ALL original format and line breaks
6. Mark additions with [[[HIGHLIGHT_START]]]keyword[[[HIGHLIGHT_END]]]

Return ONLY the complete modified resume. No explanations.`

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

    // Extract keywords for summary
    const highlights = tailoredResume.match(/\[\[\[HIGHLIGHT_START\]\]\](.*?)\[\[\[HIGHLIGHT_END\]\]\]/g) || []
    const keywords = highlights.map((h: string) => h.replace(/\[\[\[HIGHLIGHT_START\]\]\]|\[\[\[HIGHLIGHT_END\]\]\]/g, ""))

    // Generate summary
    let changeSummary = ""
    if (keywords.length > 0) {
      const summaryPrompt = `Summarize these keyword additions (2-3 bullets). ONLY mention actual skills from resume.

Keywords added: ${keywords.join(", ")}
Position: ${jobTitle} at ${company}

Format as bullets. Example:
• Added "marketplace scaling" to emphasize relevant e-commerce experience
• Highlighted "P&L ownership" to match job requirements

NEVER mention skills candidate doesn't have.`

      const summaryMsg = await groq.chat.completions.create({
        messages: [{ role: "user", content: summaryPrompt }],
        model: "llama-3.1-8b-instant",
        temperature: 0,
        max_tokens: 300,
      })

      changeSummary = summaryMsg.choices[0]?.message?.content || ""
    } else {
      changeSummary = "• Your resume already emphasizes key strengths\n• No additional keywords identified as relevant"
    }

    return NextResponse.json({
      tailoredResume,
      originalResume: resume,
      changeSummary,
      addedKeywords: keywords,
    })
  } catch (error: any) {
    console.error("Tailor resume error:", error.message)
    return NextResponse.json({ error: `Failed to tailor resume: ${error.message}` }, { status: 500 })
  }
}
