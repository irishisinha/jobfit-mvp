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

    const { resumes, targetRoles, currentHeadline, currentAbout } = await req.json()

    if (!resumes || resumes.length === 0) {
      return NextResponse.json({ error: "At least one resume required" }, { status: 400 })
    }
    if (!targetRoles?.trim()) {
      return NextResponse.json({ error: "Target roles required" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const combinedResumeContent = resumes
      .map((r: any) => `--- ${r.name} ---\n${r.content.substring(0, 600)}`)
      .join("\n\n")

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 2000,
      temperature: 0,
      messages: [{
        role: "user",
        content: `You are a LinkedIn profile strategist. Based on the candidate's resume(s) and the roles they're targeting, recommend SPECIFIC, TRUTHFUL changes to their LinkedIn profile. ONLY use facts present in the resumes — never invent skills or achievements.

CANDIDATE'S RESUME(S):
${combinedResumeContent.substring(0, 2500)}

TARGET ROLES THEY ARE APPLYING TO / ASPIRING TOWARD:
${targetRoles}

CURRENT LINKEDIN HEADLINE (if provided): ${currentHeadline || "Not provided"}
CURRENT LINKEDIN ABOUT SECTION (if provided): ${currentAbout || "Not provided"}

Return ONLY this JSON structure, no markdown:
{
  "headline": {
    "current": "what they have now or 'Not set'",
    "suggested": "a single optimized headline under 220 characters, keyword-rich for the target roles, using ONLY real facts from resume",
    "why": "why this version helps for these target roles"
  },
  "aboutSection": {
    "suggested": "a 3-4 paragraph About section (truthful, drawn only from resume facts) written in first person, optimized for the target roles",
    "keyChanges": ["change 1 vs typical generic About sections", "change 2"]
  },
  "headlineKeywordsToInclude": ["keyword1 that recruiters search for these roles", "keyword2"],
  "skillsSectionRecommendations": [
    {"skill": "skill name from resume", "action": "add to top 3 pinned skills" }
  ],
  "skillsToRemoveOrDeprioritize": ["outdated or irrelevant skill on profile, if any can be inferred"],
  "featuredSectionIdeas": ["idea for a Featured post/project to pin, based on real resume achievement"],
  "experienceSectionTips": ["specific bullet rewrite tip for their most relevant past role, grounded in resume facts"],
  "openToWorkRecommendation": "whether to enable 'Open to Work' and for which specific role titles, based on target roles",
  "consistencyCheck": ["any mismatch between different saved resumes that should be reconciled before updating LinkedIn"]
}

CRITICAL RULES:
1. Never invent skills, titles, employers, or metrics not present in the resume text
2. If multiple resumes are provided, reconcile them into ONE consistent profile narrative — flag contradictions in consistencyCheck
3. Tailor language to what recruiters search for in the target roles, but stay factual
4. Return only valid JSON`
      }],
    })

    let content = completion.choices[0]?.message?.content || "{}"
    content = content.replace(/```json\n?|\n?```/g, "").trim()
    const result = JSON.parse(content)

    return NextResponse.json(result)
  } catch (error) {
    console.error("LinkedIn optimizer error:", error)
    return NextResponse.json({ error: "Failed to generate LinkedIn recommendations" }, { status: 500 })
  }
}
