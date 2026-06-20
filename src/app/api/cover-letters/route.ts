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

    const prompt = `You are an expert career coach writing a TRUTHFUL, STRATEGIC cover letter.

CRITICAL RULES - MUST FOLLOW:
1. ONLY mention skills/experience that are EXPLICITLY in the resume
2. NEVER claim false expertise or experience
3. When addressing gaps: show willingness to learn, NOT fake expertise
4. Reframe experience TRUTHFULLY (show how existing skills genuinely transfer)
5. Be authentic and honest - dishonesty backfires in interviews
6. If a gap cannot be addressed truthfully, acknowledge it positively

CANDIDATE'S RESUME:
${resume}

JOB DETAILS:
Position: ${jobTitle || 'Position'}
Company: ${company || 'Company'}

JOB DESCRIPTION:
${jobDescription}

ASSESSMENT INSIGHTS:
Strengths to highlight (from resume):
${strengthsList}

Experience gaps to address TRUTHFULLY:
${gapsList}

Keywords to naturally incorporate (only if they fit):
${keywordsList}

TONE: ${tone}

Write a compelling, TRUTHFUL cover letter that:
1. Opens with genuine interest in THIS specific role and company
2. Highlight the candidate's ACTUAL key strengths that apply to the job
3. Address gaps TRUTHFULLY by:
   - Showing how existing skills transfer (with concrete examples from resume)
   - Demonstrating genuine eagerness to learn and grow
   - Being honest if a skill is new but showing related experience
   - Reframing experience positively WITHOUT lying
4. Incorporate missing keywords ONLY if they fit the candidate's actual experience
5. Show understanding of what makes this role/company unique
6. Close with confidence in genuine value proposition
7. Maintain a ${tone} tone
8. Keep it 3-4 paragraphs, about 250-300 words

MOST IMPORTANT: This letter will be read by real people. Dishonesty will be caught in interviews. Make it compelling through AUTHENTICITY, not exaggeration.

Return ONLY the cover letter text, no headers or explanations.`

    console.log('[COVER-LETTER] Generating truthful, strategic cover letter...')
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
