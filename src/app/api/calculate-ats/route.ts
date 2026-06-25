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

Resume (first 3500 chars):
$([char]36){{resume.substring(0, 3500)}}

Job Description (first 2000 chars):
$([char]36){{jobDescription.substring(0, 2000)}}

Respond with ONLY a number between 0-100 representing the ATS match score. No explanation, just the number.`

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
    const atsMatch = Math.min(100, Math.max(0, parseInt(scoreText)))

    return NextResponse.json({ atsMatch })
  } catch (error: any) {
    console.error("ATS calculation error:", error.message)
    return NextResponse.json({ 
      error: "Failed to calculate ATS match" 
    }, { status: 500 })
  }
}
