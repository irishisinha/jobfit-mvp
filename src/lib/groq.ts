import Groq from 'groq-sdk'
import { assessmentPrompt } from './prompts'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function analyzeJobFit(resume: string, jobDescription: string) {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set')
    }

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

    console.log('[GROQ] Sending request to Groq API')
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: assessmentPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    console.log('[GROQ] Got response from Groq')
    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content in Groq response')
    }

    console.log('[GROQ] Parsing JSON response')
    const result = JSON.parse(content)
    console.log('[GROQ] Successfully parsed result')
    return result
  } catch (error) {
    console.error('[GROQ] Error:', error)
    throw error
  }
}
