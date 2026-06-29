import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "../../../lib/auth"
import { PrismaClient } from "@prisma/client"

export async function POST(req: NextRequest) {
  const prisma = new PrismaClient()
  
  try {
    console.log("[Assessment POST] Starting")
    const session = await getServerSession(authOptions)
    console.log("[Assessment POST] Session:", session?.user?.email)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await req.json()
    console.log("[Assessment POST] Body received:", { jobTitle: body.jobTitle, company: body.company, resumeId: body.resumeId })

    let user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: {},
      create: {
        email: session.user.email,
        name: session.user.name || ""
      }
    })
    console.log("[Assessment POST] User:", user.id)

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
    console.log("[Assessment POST] Creating assessment with data:", { ...data, jobDescription: "..." })

    const assessment = await prisma.assessment.create({ data })
    console.log("[Assessment POST] Assessment created:", assessment.id)

    await prisma.$disconnect()
    return NextResponse.json({ success: true, id: assessment.id })
  } catch (error: any) {
    console.error("[Assessment POST] ERROR:", error)
    console.error("[Assessment POST] Error message:", error.message)
    console.error("[Assessment POST] Error stack:", error.stack)
    await prisma.$disconnect()
    return NextResponse.json({ 
      error: error.message || "Failed to save assessment",
      details: error.code || "Unknown error"
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const prisma = new PrismaClient()

  try {
    const session = await getServerSession(authOptions)
    console.log("[Assessment GET] Session email:", session?.user?.email)

    if (!session?.user?.email) {
      console.warn("[Assessment GET] No session email found")
      return NextResponse.json([], { status: 200 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    console.log("[Assessment GET] User found:", user?.id)

    if (!user) {
      console.warn("[Assessment GET] No user record found for email:", session.user.email)
      await prisma.$disconnect()
      return NextResponse.json([], { status: 200 })
    }

    const assessments = await prisma.assessment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    })

    console.log("[Assessment GET] Found assessments:", assessments.length)

    await prisma.$disconnect()
    return NextResponse.json(assessments.map((a: any) => ({
      ...a,
      strengths: tryParse(a.strengths),
      gaps: tryParse(a.gaps),
      missingKeywords: tryParse(a.missingKeywords)
    })))
  } catch (error: any) {
    console.error("[Assessment GET] Error:", error.message)
    console.error("[Assessment GET] Error details:", error)
    await prisma.$disconnect()
    return NextResponse.json({
      error: "Failed to load assessments",
      details: error.message
    }, { status: 500 })
  }
}

function tryParse(json: string) {
  try {
    return JSON.parse(json)
  } catch {
    return []
  }
}
