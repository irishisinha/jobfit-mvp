import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../lib/auth'
import { analyzeJobFit } from '../../lib/groq'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { resume, jobDescription } = await req.json()

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: 'Missing resume or job description' },
        { status: 400 }
      )
    }

    const result = await analyzeJobFit(resume, jobDescription)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Assessment endpoint error:', error)
    return NextResponse.json(
      { error: 'Assessment failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
