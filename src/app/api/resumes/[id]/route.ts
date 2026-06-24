import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const prisma = new PrismaClient()
    try {
      const resume = await prisma.resume.findUnique({ where: { id: params.id } })

      if (!resume) {
        return NextResponse.json({ error: "Resume not found" }, { status: 404 })
      }

      const user = await prisma.user.findUnique({ where: { email: session.user.email } })
      if (!user || resume.userId !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      await prisma.resume.delete({ where: { id: params.id } })
      return NextResponse.json({ success: true })
    } finally {
      await prisma.$disconnect()
    }
  } catch (error) {
    console.error("DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name } = await req.json()
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const prisma = new PrismaClient()
    try {
      const resume = await prisma.resume.findUnique({ where: { id: params.id } })

      if (!resume) {
        return NextResponse.json({ error: "Resume not found" }, { status: 404 })
      }

      const user = await prisma.user.findUnique({ where: { email: session.user.email } })
      if (!user || resume.userId !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const updated = await prisma.resume.update({
        where: { id: params.id },
        data: { name: name.trim() }
      })

      return NextResponse.json(updated)
    } finally {
      await prisma.$disconnect()
    }
  } catch (error) {
    console.error("PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
