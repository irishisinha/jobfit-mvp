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
      strengths = [],
      gaps = [],
      missingKeywords = [],
    } = await req.json()

    if (!resume || !jobDescription) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const keywordsList = missingKeywords.length > 0 
      ? missingKeywords.join(', ')
      : ''

    const prompt = `You are an expert resume writer optimizing a resume for a SPECIFIC job.

CRITICAL RULES:
1. ONLY reorganize and reframe existing experience - NEVER add false skills or jobs
2. Highlight achievements that match THIS job's requirements
3. Incorporate missing keywords NATURALLY where they fit the candidate's actual experience
4. Use strong action verbs
5. Quantify results where possible (from original resume)
6. Stay truthful - optimize presentation, don't fabricate

ORIGINAL RESUME:
${resume}

TARGET JOB:
Position: ${jobTitle || 'Position'}
Company: ${company || 'Company'}

JOB DESCRIPTION:
${jobDescription}

KEY REQUIREMENTS TO EMPHASIZE:
${strengths.length > 0 ? strengths.join(' | ') : 'All relevant experience'}

KEYWORDS TO INCORPORATE (only if legitimate):
${keywordsList}

GAPS TO ACKNOWLEDGE IMPLICITLY (if possible through reframing):
${gaps.length > 0 ? gaps.join(' | ') : 'None'}

Rewrite the resume to:
1. Prioritize achievements matching the job requirements
2. Reorganize bullet points to lead with most relevant accomplishments
3. Incorporate missing keywords naturally into descriptions
4. Use stronger action verbs where appropriate
5. Quantify results (metrics, percentages, impact)
6. Highlight transferable skills that address gaps
7. Maintain all original facts - NOTHING IS MADE UP
8. Keep same format/structure but optimize for THIS job

Return the complete, rewritten resume in the same format as the original.`

    console.log('[TAILORED-RESUME] Generating tailored resume...')
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 2048,
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

    console.log('[TAILORED-RESUME] Generated successfully')

    return NextResponse.json({
      content,
      originalResume: resume,
    })
  } catch (error) {
    console.error('[TAILORED-RESUME] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to generate tailored resume', details: errorMessage },
      { status: 500 }
    )
  }
}
