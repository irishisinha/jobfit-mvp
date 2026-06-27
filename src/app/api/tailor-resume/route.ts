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

    // Step 1: Identify what keywords should be added
    const identifyKeywordsPrompt = `You are analyzing a resume against a job description to identify optimization opportunities.

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

Task: List 2-3 keywords/skills that:
1. Are explicitly or implicitly mentioned in the resume
2. Appear in the job description
3. Are from the candidate's actual experience domains
4. Would strengthen the application

Return ONLY a JSON array (no other text):
{"keywords": ["keyword1", "keyword2", "keyword3"]}

Be strict - ONLY include keywords the candidate already has experience with.`

    const keywordsMsg = await groq.chat.completions.create({
      messages: [{ role: "user", content: identifyKeywordsPrompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 300,
    })

    let keywordsToAdd: string[] = []
    try {
      const parsed = JSON.parse(keywordsMsg.choices[0]?.message?.content || "{}")
      keywordsToAdd = parsed.keywords || []
    } catch (e) {
      console.error("Keyword parsing failed")
    }

    // Step 2: Add keywords to resume with highlighting - ONLY return the resume
    const addKeywordsPrompt = `You are modifying a resume. ONLY return the complete modified resume text.

ORIGINAL RESUME:
${resume}

KEYWORDS TO ADD: ${keywordsToAdd.join(", ")}

Instructions:
1. Take the resume above word-for-word
2. Find 2-3 places where each keyword fits naturally
3. Add ONLY the keyword(s) - mark additions with [[[HIGHLIGHT_START]]]keyword[[[HIGHLIGHT_END]]]
4. Do NOT modify existing text
5. Keep ALL original formatting, line breaks, spacing
6. Return ONLY the complete modified resume

Important: Do NOT include the job description, instructions, or any other text. ONLY the resume.

Example:
BEFORE: "Led marketplace growth"
AFTER: "Led marketplace growth and [[[HIGHLIGHT_START]]]scaling[[[HIGHLIGHT_END]]]"

Return the COMPLETE modified resume now:`

    const tailorMsg = await groq.chat.completions.create({
      messages: [{ role: "user", content: addKeywordsPrompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 3000,
    })

    let tailoredResume = tailorMsg.choices[0]?.message?.content || ""
    
    // Clean any trailing instructions or extra content
    tailoredResume = tailoredResume.trim()
    // Remove common Groq artifacts
    if (tailoredResume.includes("JOB DESCRIPTION")) {
      tailoredResume = tailoredResume.split("JOB DESCRIPTION")[0].trim()
    }
    if (tailoredResume.toLowerCase().includes("instructions:") || tailoredResume.toLowerCase().includes("note:")) {
      const lines = tailoredResume.split("\n")
      const resumeLines = []
      for (const line of lines) {
        if (line.toLowerCase().includes("instructions:") || line.toLowerCase().includes("note:")) break
        resumeLines.push(line)
      }
      tailoredResume = resumeLines.join("\n").trim()
    }

    // Step 3: Generate summary of changes
    let changeSummary = ""
    if (keywordsToAdd.length > 0) {
      const summaryPrompt = `Create a 2-3 bullet summary of keyword additions to a resume.

Keywords added: ${keywordsToAdd.join(", ")}
Position: ${jobTitle} at ${company}

Format ONLY as bullet points starting with "•":
• Added "keyword" to emphasize relevant experience
• Highlighted "skill" to match job requirements

Be specific and concise.`

      const summaryMsg = await groq.chat.completions.create({
        messages: [{ role: "user", content: summaryPrompt }],
        model: "llama-3.1-8b-instant",
        temperature: 0,
        max_tokens: 400,
      })

      changeSummary = summaryMsg.choices[0]?.message?.content || ""
    } else {
      changeSummary = "• No additional keywords identified as relevant for this position\n• Your resume already emphasizes key strengths for this role"
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
