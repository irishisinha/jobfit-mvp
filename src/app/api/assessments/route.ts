import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import { prisma } from "../../../lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json([])
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        assessments: {
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!user) {
      return NextResponse.json([])
    }

    const parsed = user.assessments.map((a: any) => ({
      ...a,
      strengths: typeof a.strengths === "string" ? JSON.parse(a.strengths || "[]") : (Array.isArray(a.strengths) ? a.strengths : []),
      gaps: typeof a.gaps === "string" ? JSON.parse(a.gaps || "[]") : (Array.isArray(a.gaps) ? a.gaps : []),
      missingKeywords: typeof a.missingKeywords === "string" ? JSON.parse(a.missingKeywords || "[]") : (Array.isArray(a.missingKeywords) ? a.missingKeywords : []),
    }))

    return NextResponse.json(parsed)
  } catch (error) {
    console.error("GET assessments error:", error)
    return NextResponse.json([])
  }
}
