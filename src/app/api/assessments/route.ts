import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { authOptions } from "../../../lib/auth"

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { jobTitle, company, jobDescription, verdict, fitScore, atsMatch, successProbability, tailorWorth, strengths, gaps, missingKeywords } = body

    const user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: {},
      create: { email: session.user.email, name: session.user.name || "" },
    })

    const assessment = await prisma.assessment.create({
      data: {
        userId: user.id,
        jobTitle: String(jobTitle),
        company: String(company),
        jobDescription: String(jobDescription),
        verdict: String(verdict),
        fitScore: Number(fitScore),
        atsMatch: Number(atsMatch),
        successProbability: Number(successProbability),
        tailorWorth: Number(tailorWorth),
        strengths: JSON.stringify(Array.isArray(strengths) ? strengths : []),
        gaps: JSON.stringify(Array.isArray(gaps) ? gaps : []),
        missingKeywords: JSON.stringify(Array.isArray(missingKeywords) ? missingKeywords : []),
      },
    })

    return NextResponse.json({ success: true, id: assessment.id })
  } catch (err: any) {
    console.error("Save error:", err.message)
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
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

    const formatted = assessments.map((a: any) => ({
      ...a,
      strengths: JSON.parse(a.strengths || "[]"),
      gaps: JSON.parse(a.gaps || "[]"),
      missingKeywords: JSON.parse(a.missingKeywords || "[]"),
    }))

    return NextResponse.json(formatted)
  } catch (err: any) {
    console.error("Load error:", err.message)
    return NextResponse.json({ error: err.message || "Failed to load" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
