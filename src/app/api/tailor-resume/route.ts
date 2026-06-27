import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

function cleanResume(text: string): string {
  // Remove "KEYWORDS TO ADD:" section and everything before first real resume content
  text = text.replace(/KEYWORDS\s+TO\s+ADD:.*?(?=\n[A-Z]|\n\n[A-Z])/is, "")
  
  // Remove instructions, examples, notes
  text = text.replace(/Instructions:[\s\S]*?(?=\n[A-Z]|\nReturn|$)/i, "")
  text = text.replace(/Example:[\s\S]*?(?=\n[A-Z]|\n\n|$)/i, "")
  text = text.replace(/IMPORTANT:[\s\S]*?(?=\n[A-Z]|\n\n|$)/i, "")
  
  // Remove any leading/trailing metadata
  text = text.replace(/^[\s\S]*?(?=\n?[A-Z][A-Z\s]+\n|^\S+)/m, "")
  
  return text.trim()
}

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

    // Single call: identify and add keywords
    const prompt = `You are optimizing a resume for a job application.

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

Task:
1. Identify 2-3 keywords/phrases the candidate HAS EXPERIENCE WITH and that appear in the job description
2. Add those keywords to the resume with [[[HIGHLIGHT_START]]]keyword[[[HIGHLIGHT_END]]]
3. Keep ALL original formatting and line breaks
4. Return ONLY the modified resume - no explanations

Return ONLY the complete modified resume text with highlights. Nothing else.`

    const message = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 3000,
    })

    let tailoredResume = message.choices[0]?.message?.content || resume
    tailoredResume = cleanResume(tailoredResume)

    // Extract what was added for summary
    const highlights = tailoredResume.match(/\[\[\[HIGHLIGHT_START\]\]\](.*?)\[\[\[HIGHLIGHT_END\]\]\]/g) || []
    const keywordsToAdd = highlights.map(h => h.replace(/\[\[\[HIGHLIGHT_START\]\]\]|\[\[\[HIGHLIGHT_END\]\]\]/g, ""))

    // Generate summary
    let changeSummary = ""
    if (keywordsToAdd.length > 0) {
      const summaryPrompt = `Create 2-3 bullet summary of these keyword additions to a resume.

Keywords added: ${keywordsToAdd.join(", ")}
Position: ${jobTitle} at ${company}

Format ONLY as bullets starting with "•":
• Added "keyword" to emphasize experience
• Highlighted "skill" to match requirements

Return ONLY the bullets, no other text.`

      const summaryMsg = await groq.chat.completions.create({
        messages: [{ role: "user", content: summaryPrompt }],
        model: "llama-3.1-8b-instant",
        temperature: 0,
        max_tokens: 300,
      })

      changeSummary = summaryMsg.choices[0]?.message?.content || ""
    } else {
      changeSummary = "• Your resume already emphasizes key strengths for this role"
    }

    return NextResponse.json({
      tailoredResume,
      originalResume: resume,
      changeSummary,
      addedKeywords: keywordsToAdd,
    })
  } catch (error: any) {
    console.error("Tailor resume error:", error.message)
    return NextResponse.json({ error: `Failed to tailor resume: ${error.message}` }, { status: 500 })
  }
}
