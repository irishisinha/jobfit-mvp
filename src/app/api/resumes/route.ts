import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "../../../lib/auth"
import { PrismaClient } from "@prisma/client"

export async function POST(req: NextRequest) {
  console.log("[Resumes POST] Starting...")
  const prisma = new PrismaClient()
  
  try {
    const session = await getServerSession(authOptions)
    console.log("[Resumes POST] Session:", session?.user?.email)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await req.json()
    console.log("[Resumes POST] Body received:", { name: body.name?.substring(0, 20), hasContent: !!body.content })
    
    const { name, content } = body

    if (!name?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Name and content required" }, { status: 400 })
    }

    console.log("[Resumes POST] Creating user...")
    let user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: {},
      create: {
        email: session.user.email,
        name: session.user.name || ""
      }
    })
    console.log("[Resumes POST] User ID:", user.id)

    console.log("[Resumes POST] Creating resume...")
    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        name,
        content
      }
    })
    console.log("[Resumes POST] Resume created:", resume.id)

    await prisma.$disconnect()
    return NextResponse.json({ success: true, id: resume.id })
  } catch (error: any) {
    console.error("[Resumes POST] ERROR:", error.message)
    console.error("[Resumes POST] Stack:", error.stack)
    await prisma.$disconnect()
    return NextResponse.json({ 
      error: error.message || "Failed to save resume",
      code: error.code 
    }, { status: 500 })
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
    console.error("[Resumes GET] ERROR:", error)
    await prisma.$disconnect()
    return NextResponse.json([])
  }
}
// Force rebuild Wed Jun 24 11:46:18 GMTDT 2026
