import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json()

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const prompt = `You are an ATS (Applicant Tracking System) expert. 
    
Analyze how well this resume matches the job description from an ATS perspective (keyword matching, format compatibility, skill alignment).

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

Be realistic and conservative in your scoring. Most resumes match 20-70% of ATS criteria.

Respond with ONLY a number between 0-100 representing the ATS match score. No explanation, just the number.`

    console.log("ATS calculation starting...")
    
    const message = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 10,
    })

    const scoreText = message.choices[0]?.message?.content?.trim() || "50"
    let atsMatch = Math.min(100, Math.max(0, parseInt(scoreText)))
    
    // Cap unrealistic scores to be conservative
    // Max improvement from keyword additions is typically 15-20 points
    if (isNaN(atsMatch)) {
      atsMatch = 50
    }
    
    console.log("ATS score calculated:", atsMatch)

    return NextResponse.json({ atsMatch })
  } catch (error: any) {
    console.error("ATS calculation error:", error.message)
    return NextResponse.json({ 
      error: `Failed to calculate ATS match: ${error.message}` 
    }, { status: 500 })
  }
}
