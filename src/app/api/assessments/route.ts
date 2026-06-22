import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { jobTitle, company, jobDescription, verdict, fitScore, atsMatch, successProbability, tailorWorth, strengths, gaps, missingKeywords, selectedResume } = await req.json()

    const assessment = {
      id: Date.now().toString(),
      userEmail: session.user.email,
      jobTitle,
      company,
      jobDescription,
      verdict,
      fitScore,
      atsMatch,
      successProbability,
      tailorWorth,
      strengths,
      gaps,
      missingKeywords,
      selectedResume,
      createdAt: new Date().toISOString(),
    }

    if (!global.assessments) global.assessments = []
    global.assessments.push(assessment)

    return NextResponse.json({ success: true, id: assessment.id })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!global.assessments) global.assessments = []
    const userAssessments = global.assessments.filter((a: any) => a.userEmail === session.user.email)

    return NextResponse.json(userAssessments.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}
