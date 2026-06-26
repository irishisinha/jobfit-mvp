import { NextRequest, NextResponse } from "next/server"

// SAME logic as in assess endpoint - simple keyword matching
function calculateAtsMatch(resume: string, jobDescription: string): number {
  const jobKeywords = jobDescription.toLowerCase().split(/\W+/).filter(w => w.length > 3)
  const resumeKeywords = resume.toLowerCase().split(/\W+/)
  const resumeSet = new Set(resumeKeywords)
  
  const matches = jobKeywords.filter(k => resumeSet.has(k)).length
  const percentage = Math.round((matches / Math.max(jobKeywords.length, 1)) * 100)
  return Math.min(100, Math.max(20, percentage))
}

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json()

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("Calculating ATS match with keyword matching (same logic as assess)...")
    
    const atsMatch = calculateAtsMatch(resume, jobDescription)
    
    console.log("ATS score:", atsMatch)

    return NextResponse.json({ atsMatch })
  } catch (error: any) {
    console.error("ATS calculation error:", error.message)
    return NextResponse.json({ 
      error: `Failed to calculate ATS match: ${error.message}` 
    }, { status: 500 })
  }
}
