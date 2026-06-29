import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import Groq from "groq-sdk"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      console.log("[Cover Letter API] Not authenticated")
      return NextResponse.json({ coverLetter: "Authentication required" }, { status: 401 })
    }

    console.log("[Cover Letter API] Starting cover letter generation")
    let body
    try {
      body = await req.json()
    } catch (parseErr) {
      console.log("[Cover Letter API] JSON parse error:", parseErr)
      return NextResponse.json({ coverLetter: "Invalid request format" }, { status: 400 })
    }

    const { resumeContent, jobDescription, tone = "professional", jobTitle, company, strengths = [], gaps = [], missingKeywords = [] } = body

    console.log("[Cover Letter API] Received request with:", {
      resumeLength: resumeContent?.length || 0,
      jobDescriptionLength: jobDescription?.length || 0,
      jobTitle,
      company,
      tone,
      hasResumeContent: !!resumeContent,
      hasJobDescription: !!jobDescription
    })

    if (!resumeContent || !jobDescription) {
      console.log("[Cover Letter API] Missing fields - resumeContent:", !!resumeContent, "jobDescription:", !!jobDescription)
      return NextResponse.json({ coverLetter: "Resume and job description required" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const prompt = `Write a compelling, truthful cover letter. ONLY mention actual skills and experience from the resume. NEVER claim expertise not listed.

APPLICANT RESUME:
${resumeContent}

TARGET POSITION: ${jobTitle} at ${company}

JOB DESCRIPTION:
${jobDescription}

STRENGTHS TO EMPHASIZE: ${strengths.join(", ") || "From resume"}
GAPS TO ADDRESS: ${gaps.join(", ") || "None mentioned"}

TONE: ${tone}

Write a 3-4 paragraph professional cover letter (300-400 words) that:
1. Opens with genuine enthusiasm for THIS specific role at THIS company
2. Connects resume accomplishments directly to job requirements
3. Highlights 2-3 key strengths that match the job description
4. Addresses any experience gaps truthfully with willingness to learn
5. Demonstrates knowledge of the company and role
6. Closes with strong interest and call to action
7. Uses a ${tone} tone throughout
8. Maintains professional formatting with proper opening/closing

CRITICAL REQUIREMENTS:
- Only reference actual experience from the resume provided
- Be honest about background while framing positively
- Show genuine knowledge of the role and company
- Use specific examples from resume
- Never exaggerate or fabricate skills

Return ONLY the cover letter content - no additional text or explanations.`

    console.log("[Cover Letter API] Calling Groq API with prompt length:", prompt.length)

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 2000,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    })

    console.log("[Cover Letter API] Groq response received, choices length:", completion.choices?.length)

    const coverLetter = completion.choices[0]?.message?.content?.trim()

    console.log("[Cover Letter API] Cover letter generated, length:", coverLetter?.length || 0)

    if (!coverLetter) {
      console.log("[Cover Letter API] Empty response from Groq")
      return NextResponse.json({ coverLetter: "Unable to generate cover letter at this time" }, { status: 500 })
    }

    console.log("[Cover Letter API] Returning cover letter successfully")
    return NextResponse.json({ coverLetter })
  } catch (error) {
    console.error("[Cover Letter API] Error:", error)
    return NextResponse.json({
      coverLetter: "Unable to generate cover letter at this time. Please try again."
    }, { status: 500 })
  }
}




