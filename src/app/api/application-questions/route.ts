import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
  try {
    console.log("[App Question API] Received request")

    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your-groq-api-key") {
      console.error("[App Question API] GROQ_API_KEY is not set or is a placeholder")
      return NextResponse.json(
        { error: "API configuration error: GROQ_API_KEY is not configured. Please set your Groq API key in environment variables." },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { question, resumes } = body

    console.log("[App Question API] Question:", question)
    console.log("[App Question API] Resumes count:", resumes?.length || 0)

    if (!question || !resumes || resumes.length === 0) {
      console.log("[App Question API] Missing question or resumes")
      return NextResponse.json(
        { error: "Question and resumes are required" },
        { status: 400 }
      )
    }

    const resumeText = resumes
      .map((r: any) => `Resume: ${r.name}\n${r.content}`)
      .join("\n\n---\n\n")

    const prompt = `You are helping someone craft an authentic, compelling answer to an application question using their actual professional experience.

Application Question: "${question}"

User's Resumes:
${resumeText}

CRAFT AN ANSWER THAT:

1. STARTS WITH CONTEXT, NOT LABELS
   - Begin with the problem or situation they faced
   - Why it mattered, what was broken or inefficient
   - Don't use "Situation:" headers - just tell the story

2. SHOWS THEIR THINKING
   - Explain HOW they approached the problem, not just WHAT they did
   - What was their insight or philosophy?
   - What did they see that others missed?
   - Use active voice: "I built" not "I was able to build"

3. WEAVE METRICS INTO NARRATIVE
   - Numbers should emerge naturally in the story
   - "We went from X to Y because I..." not "40pp improvement, 20% AOV..."
   - Metrics prove the impact, they don't carry it

4. END WITH INSIGHT, NOT JUST RESULTS
   - What did they learn?
   - How does this mindset apply to future challenges?
   - What's the underlying principle?

5. STAY AUTHENTIC
   - Only use facts from their resumes
   - No exaggeration or invented experiences
   - Show their unique perspective, not generic corporate speak
   - Sound like a real person, not a template

6. KEEP IT CONCISE
   - 2-3 paragraphs, conversational tone
   - Specific details that show they were actually there

Format your response as:
SUGGESTED ANSWER:
[Natural, story-based answer - no labels or headers]

TRUTHFULNESS SCORE: [0-100]

CONSISTENCY NOTES:
[Brief note on how this draws from their resume]`

    console.log("[App Question API] Calling Groq API")
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 1000,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })

    console.log("[App Question API] Groq response received")
    const responseText = response.choices[0]?.message?.content || ""

    console.log("[App Question API] Response text length:", responseText.length)

    const suggestedAnswerMatch = responseText.match(
      /SUGGESTED ANSWER:\s*([\s\S]*?)(?=TRUTHFULNESS|$)/
    )
    const trustScoreMatch = responseText.match(/TRUTHFULNESS SCORE:\s*(\d+)/)
    const consistencyMatch = responseText.match(
      /CONSISTENCY NOTES:\s*([\s\S]*?)$/
    )

    const suggestedAnswer = suggestedAnswerMatch
      ? suggestedAnswerMatch[1].trim()
      : responseText
    const trustScore = trustScoreMatch ? parseInt(trustScoreMatch[1]) : 75
    const consistencyNotes = consistencyMatch
      ? consistencyMatch[1].trim()
      : "Answer generated based on your resume"

    console.log("[App Question API] Returning response with score:", trustScore)

    return NextResponse.json({
      id: `q_${Date.now()}`,
      question,
      suggestedAnswer,
      trustScore,
      consistencyIssues: consistencyNotes,
      createdAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error("Error generating suggested answer:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate answer" },
      { status: 500 }
    )
  }
}
