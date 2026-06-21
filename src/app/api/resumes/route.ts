import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import { prisma } from "../../../lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json([])
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json([])
    }

    const resumes = await prisma.resume.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        content: true,
        createdAt: true,
      },
    })

    return NextResponse.json(resumes)
  } catch (error) {
    console.error("GET resumes error:", error)
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await req.json()
    const { name, content } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "Resume name required" }, { status: 400 })
    }
    if (!content?.trim()) {
      return NextResponse.json({ error: "Resume content required" }, { status: 400 })
    }

    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name || "User",
        },
      })
    }

    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        name: name.trim(),
        content: content.trim(),
      },
    })

    return NextResponse.json(resume, { status: 201 })
  } catch (error) {
    console.error("POST resume error:", error)
    return NextResponse.json(
      { error: "Failed to save resume", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
