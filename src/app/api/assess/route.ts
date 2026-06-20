import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { analyzeJobFit } from '../../../lib/groq'
import { prisma } from '../../../lib/prisma'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    console.log('[ASSESS] Request received')
    
    const session = await getServerSession(authOptions)
    console.log('[ASSESS] Session check:', session ? 'authenticated' : 'not authenticated')

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { resume, jobDescription, jobTitle, company } = body
    console.log('[ASSESS] Received assessment request')

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: 'Missing resume or job description' },
        { status: 400 }
      )
    }

    console.log('[ASSESS] Calling Groq API...')
    const result = await analyzeJobFit(resume, jobDescription)
    console.log('[ASSESS] Got result:', result)
    
    // Save to database
    console.log('[ASSESS] Saving to database...')
    const assessment = await prisma.assessment.create({
      data: {
        userId: session.user?.email || '',
        resume,
        jobDescription,
        jobTitle: jobTitle || 'Untitled Position',
        company: company || 'Unknown Company',
        verdict: result.verdict,
        fitScore: result.fitScore,
        atsMatch: result.atsMatch,
        successProbability: result.successProbability,
        strengths: result.strengths.join('|'),
        gaps: result.gaps.join('|'),
        missingKeywords: result.missingKeywords.join('|'),
      },
    })
    console.log('[ASSESS] Saved assessment:', assessment.id)
    
    return NextResponse.json({
      ...result,
      assessmentId: assessment.id,
    })
  } catch (error) {
    console.error('[ASSESS] Error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { 
        error: 'Assessment failed', 
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
