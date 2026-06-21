import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import { prisma } from "../../../lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const assessments = await prisma.assessment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        jobTitle: true,
        company: true,
        verdict: true,
        fitScore: true,
        atsMatch: true,
        successProbability: true,
        createdAt: true,
        strengths: true,
        gaps: true,
        missingKeywords: true,
      },
    })

    const parsed = assessments.map((a) => ({
      ...a,
      strengths: a.strengths?.split("|") || [],
      gaps: a.gaps?.split("|") || [],
      missingKeywords: a.missingKeywords?.split("|") || [],
    }))

    return NextResponse.json(parsed)
  } catch (error) {
    return NextResponse.json({
      error: "Failed to fetch assessments",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 })
  }
}
