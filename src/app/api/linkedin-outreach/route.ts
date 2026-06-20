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
      recipientName,
      recipientRole,
      strengths = [],
    } = await req.json()

    if (!resume || !jobDescription) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const prompt = `You are an expert LinkedIn outreach specialist writing a personalized connection message.

GOAL: Get a response and potentially an interview opportunity.

RULES:
1. Personal and specific - reference the company/role/person explicitly
2. Keep it SHORT - LinkedIn messages should be 150-200 words max
3. Show genuine interest - NOT generic
4. Mention a specific reason you're interested (from JD or company)
5. Highlight ONE relevant achievement from the candidate's resume
6. Include a soft call-to-action (ask for advice, time to chat, etc.)
7. Professional but conversational tone

CANDIDATE PROFILE:
Resume: ${resume}

TARGET COMPANY & ROLE:
Company: ${company || 'Company'}
Position: ${jobTitle || 'Position'}

JOB DESCRIPTION:
${jobDescription}

RECIPIENT (who you're messaging):
Name: ${recipientName || 'Hiring Manager/Recruiter'}
Role: ${recipientRole || 'Not specified'}

KEY STRENGTHS TO POTENTIALLY REFERENCE:
${strengths.length > 0 ? strengths.slice(0, 2).join(', ') : 'General experience'}

Write a personalized LinkedIn connection/outreach message that:
1. Opens with a genuine compliment or specific reason for connecting
2. References the company or specific role/initiative
3. Briefly highlights ONE relevant achievement from the candidate
4. Shows genuine interest in the role/company
5. Ends with a soft ask (informational chat, advice, opportunity to learn more)
6. Keep it SHORT and conversational
7. NO buzzwords or corporate jargon

Return ONLY the message text, ready to paste into LinkedIn.`

    console.log('[LINKEDIN-OUTREACH] Generating LinkedIn message...')
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 512,
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

    console.log('[LINKEDIN-OUTREACH] Generated successfully')

    return NextResponse.json({
      content,
      recipient: recipientName || 'Hiring Manager',
    })
  } catch (error) {
    console.error('[LINKEDIN-OUTREACH] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to generate LinkedIn message', details: errorMessage },
      { status: 500 }
    )
  }
}
