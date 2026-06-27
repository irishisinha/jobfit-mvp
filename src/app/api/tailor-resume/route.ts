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

    const { resume, jobDescription, jobTitle, company, gaps, missingKeywords } = await req.json()

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const prompt = `CRITICAL: Only add keywords that match the candidate's actual experience domains.

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

RULES:
1. Identify candidate's actual experience domains (e.g., e-commerce, FMCG, marketplaces, SaaS, finance)
2. Identify job's required keywords
3. Only add keywords if they match candidate's domains
4. If keyword is from unrelated industry/domain, SKIP IT - do not add
5. Keep ALL original format, spacing, line breaks
6. Make MINIMAL changes - only 2-3 keyword additions max
7. Return EXACT original resume structure

Examples:
- Candidate has e-commerce experience + job needs "marketplace scaling" = ADD (same domain)
- Candidate has FMCG background + job needs "retail strategy" = ADD (related domain)
- Candidate has marketplace experience + job needs "short-term rental platforms" = SKIP (unrelated domain)

Return the resume with ONLY domain-relevant keywords added. No forced fits.`

    const message = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 2000,
    })

    const tailoredResume = message.choices[0]?.message?.content || ""

    // Generate truthful summary
    let changeSummary = ""
    try {
      const summaryPrompt = `Based on the keyword additions made, provide a 2-3 bullet summary of ONLY the domain-relevant optimizations. No forced keywords.

Format as bullet points starting with "•".
Example: "• Added 'marketplace scaling' to highlight relevant experience"
NOT: "• Added unrelated keywords to game the ATS"`

      const summaryMessage = await groq.chat.completions.create({
        messages: [{ role: "user", content: summaryPrompt }],
        model: "llama-3.1-8b-instant",
        temperature: 0,
        max_tokens: 300,
      })

      changeSummary = summaryMessage.choices[0]?.message?.content || ""
    } catch (err) {
      console.error("Summary generation failed")
    }

    return NextResponse.json({
      tailoredResume,
      originalResume: resume,
      changeSummary,
    })
  } catch (error: any) {
    console.error("Tailor resume error:", error.message)
    return NextResponse.json({ error: `Failed to tailor resume: ${error.message}` }, { status: 500 })
  }
}
