import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const { userAnswer, question, resumes } = body

    let trustScore = 75
    let consistencyIssues = "Answer saved"

    if (userAnswer && resumes && resumes.length > 0) {
      const resumeText = resumes
        .map((r: any) => `Resume: ${r.name}\n${r.content}`)
        .join("\n\n---\n\n")

      const consistencyPrompt = `Check the truthfulness and consistency of this application answer against the user's resumes.

Application Question: "${question}"

User's Answer: "${userAnswer}"

User's Resumes:
${resumeText}

Analyze:
1. Is the answer truthful and based on actual experience from the resumes?
2. Are there any consistency issues or contradictions?
3. Does it properly use specific details from their experience?
4. What is the trust/truthfulness score (0-100)?

Format your response as:
TRUST SCORE: [0-100]

CONSISTENCY CHECK:
[Your analysis of truthfulness and consistency]`

      const response = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: consistencyPrompt
          }
        ]
      })

      const responseText =
        response.content[0].type === "text" ? response.content[0].text : ""

      const scoreMatch = responseText.match(/TRUST SCORE:\s*(\d+)/)
      trustScore = scoreMatch ? parseInt(scoreMatch[1]) : 75

      const consistencyMatch = responseText.match(
        /CONSISTENCY CHECK:\s*([\s\S]*?)$/
      )
      consistencyIssues = consistencyMatch
        ? consistencyMatch[1].trim()
        : "Answer verified against your resume"
    }

    return NextResponse.json({
      id: params.id,
      question,
      userAnswer,
      trustScore,
      consistencyIssues,
      updatedAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error("Error updating question:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update question" },
      { status: 500 }
    )
  }
}
