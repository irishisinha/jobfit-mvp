import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import Groq from "groq-sdk"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { resume, jobDescription, jobTitle, company } = await req.json()

    if (!resume || !jobDescription) {
      return NextResponse.json({ error: "Missing resume or job description" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 3000,
      messages: [{
        role: "user",
        content: `Rewrite this resume to match the job: ${jobTitle} at ${company}. Only reorganize existing experience, no new skills added.\n\nRESUME:\n${resume}\n\nJOB:\n${jobDescription}\n\nReturn the complete rewritten resume.`
      }],
    })

    const content = completion.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: "No response from Groq" }, { status: 500 })
    }

    return NextResponse.json({ content })
  } catch (error) {
    return NextResponse.json({
      error: "Failed",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
