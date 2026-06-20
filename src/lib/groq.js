import Groq from 'groq-sdk'
import { assessmentPrompt } from './prompts'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function analyzeJobFit(resume, jobDescription) {
  const systemPrompt = assessmentPrompt
  const userPrompt = `
RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

Provide a detailed job fit assessment in JSON format with the following structure:
{
  "verdict": "Strong Fit" | "Moderate Fit" | "Weak Fit",
  "fitScore": 0-10,
  "atsMatch": 0-100,
  "successProbability": 0-100,
  "strengths": ["strength1", "strength2", ...],
  "gaps": ["gap1", "gap2", ...],
  "missingKeywords": ["keyword1", "keyword2", ...]
}

Return ONLY valid JSON, no markdown formatting.
`

  const message = await groq.messages.create({
    model: 'mixtral-8x7b-32768',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  const result = JSON.parse(content.text)
  return result
}
