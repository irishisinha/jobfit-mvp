import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "../../../lib/auth"

let prisma: any

async function getPrisma() {
  if (!prisma) {
    const { PrismaClient } = await import("@prisma/client")
    prisma = new PrismaClient()
  }
  return prisma
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const db = await getPrisma()
    const body = await req.json()

    // Get or create user
    let user = await db.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      user = await db.user.create({
        data: {
          email: session.user.email,
          name: session.user.name || ""
        }
      })
    }

    // Create assessment
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        jobTitle: String(body.jobTitle || ""),
        company: String(body.company || ""),
        jobDescription: String(body.jobDescription || ""),
        verdict: String(body.verdict || ""),
        fitScore: parseInt(body.fitScore) || 50,
        atsMatch: parseInt(body.atsMatch) || 50,
        successProbability: parseInt(body.successProbability) || 50,
        tailorWorth: parseInt(body.tailorWorth) || 0,
        strengths: Array.isArray(body.strengths) ? JSON.stringify(body.strengths) : "[]",
        gaps: Array.isArray(body.gaps) ? JSON.stringify(body.gaps) : "[]",
        missingKeywords: Array.isArray(body.missingKeywords) ? JSON.stringify(body.missingKeywords) : "[]"
      }
    })

    return NextResponse.json({ success: true, id: assessment.id })
  } catch (error: any) {
    console.error("POST Error:", error)
    return NextResponse.json({ error: error.message || "Failed to save" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const db = await getPrisma()

    const user = await db.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json([])
    }

    const assessments = await db.assessment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    })

    // Parse JSON fields
    return NextResponse.json(assessments.map((a: any) => ({
      ...a,
      strengths: tryParse(a.strengths),
      gaps: tryParse(a.gaps),
      missingKeywords: tryParse(a.missingKeywords)
    })))
  } catch (error: any) {
    console.error("GET Error:", error)
    return NextResponse.json({ error: error.message || "Failed to load" }, { status: 500 })
  }
}

function tryParse(val: any) {
  if (!val) return []
  if (typeof val === "string") {
    try {
      return JSON.parse(val)
    } catch {
      return []
    }
  }
  return Array.isArray(val) ? val : []
}
