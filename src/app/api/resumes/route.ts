import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "../../../lib/auth"
import { PrismaClient } from "@prisma/client"

export async function POST(req: NextRequest) {
  const prisma = new PrismaClient()
  
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await req.json()
    const { name, content } = body

    if (!name?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Name and content required" }, { status: 400 })
    }

    let user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: {},
      create: {
        email: session.user.email,
        name: session.user.name || ""
      }
    })

    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        name,
        content
      }
    })

    await prisma.$disconnect()
    return NextResponse.json({ success: true, id: resume.id })
  } catch (error: any) {
    console.error("Resume POST error:", error)
    await prisma.$disconnect()
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const prisma = new PrismaClient()
  
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json([])
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      await prisma.$disconnect()
      return NextResponse.json([])
    }

    const resumes = await prisma.resume.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    })

    await prisma.$disconnect()
    return NextResponse.json(resumes.map((r: any) => ({
      id: r.id,
      name: r.name,
      content: r.content,
      createdAt: r.createdAt
    })))
  } catch (error: any) {
    console.error("Resume GET error:", error)
    await prisma.$disconnect()
    return NextResponse.json([])
  }
}
