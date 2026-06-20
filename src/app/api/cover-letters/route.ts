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

    const {
      resume,
      jobDescription,
      jobTitle,
      company,
      tone = 'professional',
      strengths = [],
      gaps = [],
      missingKeywords = [],
    } = await req.json()

    if (!resume || !jobDescription) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const strengthsList = strengths.length > 0 
      ? strengths.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')
      : 'N/A'

    const gapsList = gaps.length > 0 
      ? gaps.map((g: string, i: number) => `${i + 1}. ${g}`).join('\n')
      : 'N/A'

    const keywordsList = missingKeywords.length > 0 
      ? missingKeywords.join(', ')
      : 'N/A'

    const prompt = `You are an expert career coach writing a strategic cover letter.

CANDIDATE'S RESUME:
${resume}

JOB DETAILS:
Position: ${jobTitle || 'Position'}
Company: ${company || 'Company'}

JOB DESCRIPTION:
${jobDescription}

ASSESSMENT INSIGHTS:
Strengths to highlight:
${strengthsList}

Experience gaps to address thoughtfully:
${gapsList}

Keywords to naturally incorporate:
${keywordsList}

TONE: ${tone}

Write a compelling cover letter that:
1. Opens with genuine interest in THIS specific role and company (not generic)
2. Strategically highlight the candidate's key strengths that directly address the job requirements
3. Address experience gaps intelligently by:
   - Showing how transferable skills apply
   - Demonstrating eagerness to learn
   - Reframing related experience where applicable
   - Being honest but positive about gaps
4. Naturally weave in the missing keywords where relevant
5. Show understanding of what makes this role/company unique
6. Close with confidence and specific value proposition
7. Maintain a ${tone} tone throughout
8. Keep it 3-4 paragraphs, about 250-300 words

Return ONLY the cover letter text, no headers or explanations.`

    console.log('[COVER-LETTER] Generating strategic cover letter...')
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
