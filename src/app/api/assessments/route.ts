import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { jobTitle, company, jobDescription, verdict, fitScore, atsMatch, successProbability, tailorWorth, strengths, gaps, missingKeywords, selectedResume } = await req.json()

    // Find or create user
    const user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: {},
      create: { email: session.user.email, name: session.user.name || "" },
    })

    const assessment = await prisma.assessment.create({
      data: {
        userId: user.id,
        jobTitle,
        company,
        jobDescription,
        verdict,
        fitScore,
        atsMatch,
        successProbability,
        tailorWorth,
        strengths: strengths || [],
        gaps: gaps || [],
        missingKeywords: missingKeywords || [],
      },
    })

    return NextResponse.json({ success: true, id: assessment.id })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Failed to save assessment" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) return NextResponse.json([])

    const assessments = await prisma.assessment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json(assessments)
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Failed to fetch assessments" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}