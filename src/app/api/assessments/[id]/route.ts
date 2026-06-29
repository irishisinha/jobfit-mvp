import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "../../../../lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { status } = body

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const assessment = await prisma.assessment.findFirst({
      where: { id: params.id, userId: user.id }
    })

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 })
    }

    const updated = await prisma.assessment.update({
      where: { id: params.id },
      data: { status }
    })

    return NextResponse.json({
      ...updated,
      strengths: tryParse(updated.strengths),
      gaps: tryParse(updated.gaps),
      missingKeywords: tryParse(updated.missingKeywords)
    })
  } catch (error: any) {
    console.error("Error updating assessment:", error)
    return NextResponse.json({ error: "Failed to update assessment" }, { status: 500 })
  }
}

function tryParse(json: string) {
  try {
    return JSON.parse(json)
  } catch {
    return []
  }
}
