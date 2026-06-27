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

    // Step 1: Extract candidate's explicit skills and domains from resume
    const extractionPrompt = `Extract candidate's EXPLICIT skills and domains from this resume.

RESUME:
${resume}

Return ONLY JSON:
{
  "domains": ["domain1", "domain2"],
  "skills": [{"skill": "name", "evidence": "exact quote from resume"}],
  "achievements": [{"achievement": "name", "evidence": "exact quote"}]
}

Be strict - ONLY extract skills explicitly mentioned or clearly implied by evidence.`

    const extractMsg = await groq.chat.completions.create({
      messages: [{ role: "user", content: extractionPrompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 1000,
    })

    let candidateProfile: any = { domains: [], skills: [], achievements: [] }
    try {
      candidateProfile = JSON.parse(extractMsg.choices[0]?.message?.content || "{}")
    } catch (e) {
      console.warn("Failed to parse candidate profile")
    }

    // Step 2: Identify job requirements
    const jobReqPrompt = `Extract required keywords/skills from this job description.

JOB DESCRIPTION:
${jobDescription}

Return ONLY JSON array of top 5-7 keywords:
["keyword1", "keyword2"]

Focus on actionable skills, not generic terms.`

    const jobMsg = await groq.chat.completions.create({
      messages: [{ role: "user", content: jobReqPrompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 300,
    })

    let jobKeywords: string[] = []
    try {
      jobKeywords = JSON.parse(jobMsg.choices[0]?.message?.content || "[]")
    } catch (e) {
      console.warn("Failed to parse job keywords")
    }

    // Step 3: Match and add only HIGH-confidence keywords
    const tailorPrompt = `Match job keywords against candidate's skills. ONLY add HIGH-CONFIDENCE matches.

CANDIDATE DOMAINS: ${JSON.stringify(candidateProfile.domains)}
CANDIDATE SKILLS: ${JSON.stringify(candidateProfile.skills)}
JOB KEYWORDS: ${JSON.stringify(jobKeywords)}

RULES:
1. Only add keyword if candidate's skill is in SAME domain
2. Only if match is EXPLICIT or CLEARLY IMPLIED
3. Skip if unsure - better to miss than claim false expertise
4. Mark additions: [[[HIGHLIGHT_START]]]keyword[[[HIGHLIGHT_END]]]
5. Return ONLY modified resume (keep all formatting)

For each addition, be ready to cite evidence.`

    const tailorMsg = await groq.chat.completions.create({
      messages: [
        { role: "user", content: tailorPrompt },
        { role: "user", content: `Now optimize this resume:\n\n${resume}` }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 2500,
    })

    let tailoredResume = tailorMsg.choices[0]?.message?.content || resume
    
    // Clean artifacts
    tailoredResume = tailoredResume.replace(/KEYWORDS[\s\S]*?(?=\n[A-Z]|\n$)/i, "").trim()
    tailoredResume = tailoredResume.replace(/Instructions[\s\S]*?(?=\n[A-Z]|\n$)/i, "").trim()

    // Step 4: Extract additions and generate transparent summary
    const highlights = tailoredResume.match(/\[\[\[HIGHLIGHT_START\]\]\](.*?)\[\[\[HIGHLIGHT_END\]\]\]/g) || []
    const addedKeywords = highlights.map((h: string) => h.replace(/\[\[\[HIGHLIGHT_START\]\]\]|\[\[\[HIGHLIGHT_END\]\]\]/g, ""))

    // Generate summary with evidence
    let changeSummary = ""
    if (addedKeywords.length > 0) {
      const summaryPrompt = `Create a transparent summary of keywords added to resume.

ADDED KEYWORDS: ${JSON.stringify(addedKeywords)}
CANDIDATE EVIDENCE: ${JSON.stringify(candidateProfile.skills)}

For EACH keyword added, explain:
• Keyword: X
• Evidence: [exact quote from resume]
• Why: [why it's relevant to job]

Format as bullets. Be specific - user must be able to verify truthfulness.`

      const summaryMsg = await groq.chat.completions.create({
        messages: [{ role: "user", content: summaryPrompt }],
        model: "llama-3.1-8b-instant",
        temperature: 0,
        max_tokens: 400,
      })

      changeSummary = summaryMsg.choices[0]?.message?.content || ""
    } else {
      changeSummary = "• No keywords added - your resume already emphasizes relevant strengths for this role"
    }

    return NextResponse.json({
      tailoredResume,
      originalResume: resume,
      changeSummary,
      addedKeywords,
      candidateProfile,
    })
  } catch (error: any) {
    console.error("Tailor resume error:", error.message)
    return NextResponse.json({ error: `Failed to tailor: ${error.message}` }, { status: 500 })
  }
}
