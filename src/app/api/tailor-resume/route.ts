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
    const identifyKeywordsPrompt = `Analyze resume and job description to identify which keywords/skills from the job description the candidate actually has but hasn't emphasized.

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

Task: List 2-3 keywords/skills that:
1. Appear explicitly or implicitly in the resume
2. Appear in the job description
3. Are from candidate's actual experience domains
4. Would help with job fit

Return ONLY a JSON array of keywords to add:
{"keywords": ["keyword1", "keyword2", "keyword3"]}

CRITICAL: Only include keywords the candidate ACTUALLY has.`

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

    // Step 2: Add keywords to resume with highlighting
    const addKeywordsPrompt = `You will add domain-relevant keywords to a resume and mark them for highlighting.

RESUME:
${resume}

KEYWORDS TO ADD: ${keywordsToAdd.join(", ")}

Rules:
1. Find relevant sections in resume where each keyword fits naturally
2. Add the keyword if it emphasizes something the candidate actually did
3. Wrap ADDED content ONLY (not existing text) with [[[HIGHLIGHT_START]]]...[[[HIGHLIGHT_END]]]
4. Keep all original format, line breaks, structure
5. Return EXACTLY the resume with marked additions
6. Do NOT modify existing text - only ADD new content marked with highlights

Example:
Original: "Led marketplace growth initiatives"
Updated: "Led marketplace growth initiatives and [[[HIGHLIGHT_START]]]scaling[[[HIGHLIGHT_END]]] across platforms"

Return the COMPLETE resume with minimal (2-3) keyword additions marked.`

    const tailorMsg = await groq.chat.completions.create({
      messages: [{ role: "user", content: addKeywordsPrompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 2500,
    })

    const tailoredResume = tailorMsg.choices[0]?.message?.content || ""

    // Step 3: Generate summary of changes
    let changeSummary = ""
    if (keywordsToAdd.length > 0) {
      const summaryPrompt = `Summarize these keyword additions to a resume in 2-3 bullets.

Keywords added: ${keywordsToAdd.join(", ")}
Job: ${jobTitle} at ${company}

Format as bullet points starting with "•".
Example output:
• Added "marketplace scaling" to emphasize relevant e-commerce experience
• Highlighted "P&L ownership" to match job requirements

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
