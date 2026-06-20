import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { resume, jobDescription, jobTitle, company } = await req.json()

    if (!resume || !jobDescription) {
      return NextResponse.json({ error: 'Missing resume or job description' }, { status: 400 })
    }

    const prompt = `You are an expert recruiter. Analyze this resume against the job description and provide:
1. Verdict: "Strong Fit", "Moderate Fit", or "Weak Fit"
2. Fit Score: 0-100
3. ATS Match: 0-100
4. Success Probability: 0-100
5. Top 3 Strengths
6. Top 3 Gaps
7. Missing Keywords

RESUME:
${resume}

JOB TITLE: ${jobTitle || 'Position'}
COMPANY: ${company || 'Company'}

JOB DESCRIPTION:
${jobDescription}

Respond in JSON format:
{
  "verdict": "...",
  "fitScore": ...,
  "atsMatch": ...,
  "successProbability": ...,
  "strengths": ["...", "...", "..."],
  "gaps": ["...", "...", "..."],
  "missingKeywords": ["...", "...", "..."]
}`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from Groq')
    }

    const result = JSON.parse(content)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[ASSESS] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to assess fit', details: errorMessage },
      { status: 500 }
    )
  }
}
