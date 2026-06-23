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

    let user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: {},
      create: {
        email: session.user.email,
        name: session.user.name || ""
      }
    })

    const data: any = {
      resumeId: body.resumeId || null,
      userId: user.id,
      jobTitle: body.jobTitle || "",
      company: body.company || "",
      jobDescription: body.jobDescription || "",
      verdict: body.verdict || "",
      fitScore: parseInt(body.fitScore) || 0,
      atsMatch: parseInt(body.atsMatch) || 0,
      successProbability: parseInt(body.successProbability) || 0,
      tailorWorth: parseInt(body.tailorWorth) || 0,
      strengths: JSON.stringify(body.strengths || []),
      gaps: JSON.stringify(body.gaps || []),
      missingKeywords: JSON.stringify(body.missingKeywords || [])
    }

    const assessment = await prisma.assessment.create({ data })

    await prisma.$disconnect()
    return NextResponse.json({ success: true, id: assessment.id })
  } catch (error: any) {
    await prisma.$disconnect()
    console.error("Error:", error.message)
    return NextResponse.json({ 
      error: error.message || "Failed"
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

    const assessments = await prisma.assessment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    })

    await prisma.$disconnect()
    return NextResponse.json(assessments.map((a: any) => ({
      ...a,
      strengths: tryParse(a.strengths),
      gaps: tryParse(a.gaps),
      missingKeywords: tryParse(a.missingKeywords)
    })))
  } catch (error: any) {
    await prisma.$disconnect()
    console.error("GET Error:", error)
    return NextResponse.json([])
  }
}

function tryParse(json: string) {
  try {
    return JSON.parse(json)
  } catch {
    return []
  }
}
