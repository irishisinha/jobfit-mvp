import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resumes = await prisma.resume.findMany({
      where: { user: { email: session.user.email } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(resumes)
  } catch (error) {
    console.error('Error fetching resumes:', error)
    return NextResponse.json({ error: 'Failed to fetch resumes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content, name, setDefault } = await req.json()
    if (!content) {
      return NextResponse.json({ error: 'Resume content required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (setDefault) {
      await prisma.resume.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      })
    }

    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        content,
        name: name || 'My Resume',
        isDefault: setDefault || false,
      },
    })

    return NextResponse.json(resume)
  } catch (error) {
    console.error('Error saving resume:', error)
    return NextResponse.json({ error: 'Failed to save resume' }, { status: 500 })
  }
}
