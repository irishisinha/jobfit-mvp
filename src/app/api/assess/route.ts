import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { analyzeJobFit } from '../../../lib/groq'

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
    const { resume, jobDescription } = body
    console.log('[ASSESS] Resume length:', resume?.length, 'JD length:', jobDescription?.length)

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: 'Missing resume or job description' },
        { status: 400 }
      )
    }

    console.log('[ASSESS] Calling Groq API...')
    const result = await analyzeJobFit(resume, jobDescription)
    console.log('[ASSESS] Got result:', result)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('[ASSESS] Error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { 
        error: 'Assessment failed', 
        details: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
