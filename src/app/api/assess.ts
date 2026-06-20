import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { handler } from './auth/[...nextauth]/route'
import { analyzeJobFit } from '@/lib/groq'

export async function POST(req: NextRequest) {
  const session = await getServerSession(handler)

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

  try {
    const result = await analyzeJobFit(resume, jobDescription)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Assessment error:', error)
    return NextResponse.json(
      { error: 'Assessment failed' },
      { status: 500 }
    )
  }
}
