import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { question, resumes } = body

    if (!question || !resumes || resumes.length === 0) {
      return NextResponse.json(
        { error: "Question and resumes are required" },
        { status: 400 }
      )
    }

    const resumeText = resumes
      .map((r: any) => `Resume: ${r.name}\n${r.content}`)
      .join("\n\n---\n\n")

    const prompt = `You are helping someone answer an application question honestly using their professional experience.

Application Question: "${question}"

User's Resumes:
${resumeText}

Using the STAR framework (Situation, Task, Action, Result), suggest a detailed, truthful answer to this question based on the user's actual experience from their resumes.

IMPORTANT GUIDELINES:
1. Only use information and experiences from the resumes provided
2. Do not invent or exaggerate experiences
3. Use the STAR format:
   - Situation: Set the context
   - Task: Describe what was needed
   - Action: Explain what you did specifically
   - Result: Share the outcome with metrics/proof
4. Be specific with details, skills, and achievements mentioned in the resume
5. Keep the answer professional and concise (2-3 paragraphs)

Format your response as:
SUGGESTED ANSWER:
[Your STAR-formatted answer here]

TRUTHFULNESS SCORE: [0-100]

CONSISTENCY NOTES:
[Any notes about how this aligns with the provided resumes]`

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : ""

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
