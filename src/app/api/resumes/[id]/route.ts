import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "../../../../lib/auth"
import { PrismaClient } from "@prisma/client"

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = new PrismaClient()
  
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { id } = params

    if (!id) {
      return NextResponse.json({ error: "Resume ID required" }, { status: 400 })
    }

    // Verify resume belongs to user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const resume = await prisma.resume.findUnique({
      where: { id }
    })

    if (!resume || resume.userId !== user.id) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 })
    }

    await prisma.resume.delete({
      where: { id }
    })

    await prisma.$disconnect()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Resume DELETE error:", error)
    await prisma.$disconnect()
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 })
  }
}
