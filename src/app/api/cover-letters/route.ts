import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'
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

    const { resume, jobDescription, jobTitle, company, tone = 'professional' } = await req.json()

    if (!resume || !jobDescription) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const prompt = `You are an expert cover letter writer. Generate a professional, personalized cover letter based on the following:

RESUME:
${resume}

JOB TITLE: ${jobTitle || 'Position'}
COMPANY: ${company || 'Company'}

JOB DESCRIPTION:
${jobDescription}

TONE: ${tone}

Write a compelling cover letter that:
1. Highlights relevant experience from the resume
2. Shows genuine interest in the specific role and company
3. Addresses key requirements from the job description
4. Uses a ${tone} tone
5. Is concise (3-4 paragraphs, ~250-300 words)
6. Includes a strong opening and closing

Return ONLY the cover letter text, no headers or explanations.`

    console.log('[COVER-LETTER] Generating with Groq...')
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

    console.log('[COVER-LETTER] Generated successfully')

    return NextResponse.json({
      content,
      tone,
    })
  } catch (error) {
    console.error('[COVER-LETTER] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to generate cover letter', details: errorMessage },
      { status: 500 }
    )
  }
}
