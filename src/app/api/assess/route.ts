import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../lib/auth"
import Groq from "groq-sdk"

export const maxDuration = 60

// Normalize text for better keyword matching
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    // Remove hyphens (e-commerce → ecommerce)
    .replace(/-/g, '')
    // Remove apostrophes (it's → its)
    .replace(/'/g, '')
    // Remove extra spaces
    .trim()
}

// Common abbreviation mappings
const ABBREVIATIONS: { [key: string]: string[] } = {
  'bu': ['business', 'unit'],
  'c2c': ['consumer', 'to', 'consumer'],
  'b2b': ['business', 'to', 'business'],
  'b2c': ['business', 'to', 'consumer'],
  'crm': ['customer', 'relationship', 'management'],
  'erp': ['enterprise', 'resource', 'planning'],
  'api': ['application', 'programming', 'interface'],
  'kpi': ['key', 'performance', 'indicator'],
  'roi': ['return', 'on', 'investment'],
  'pl': ['profit', 'loss'],
  'saas': ['software', 'service'],
}

// Expand abbreviations in text
function expandAbbreviations(words: string[]): string[] {
  const expanded: string[] = []
  
  for (const word of words) {
    if (ABBREVIATIONS[word]) {
      expanded.push(...ABBREVIATIONS[word])
    } else {
      expanded.push(word)
    }
  }
  
  return expanded
}

// Basic stemming - handle common suffix variations
function simpleStem(word: string): string {
  // Remove common suffixes
  if (word.endsWith('ing')) return word.slice(0, -3)
  if (word.endsWith('ed')) return word.slice(0, -2)
  if (word.endsWith('er')) return word.slice(0, -2)
  if (word.endsWith('s')) return word.slice(0, -1)
  return word
}

function calculateAtsMatch(resume: string, jobDescription: string): number {
  const normalizedJob = normalizeText(jobDescription)
  const normalizedResume = normalizeText(resume)
  
  // Extract and process job keywords
  let jobKeywords = normalizedJob.split(/\W+/).filter(w => w.length > 3)
  jobKeywords = expandAbbreviations(jobKeywords)
  
  // Count keyword frequency in job description
  const keywordFreq = new Map<string, number>()
  for (const word of jobKeywords) {
    const stemmed = simpleStem(word)
    keywordFreq.set(stemmed, (keywordFreq.get(stemmed) || 0) + 1)
  }
  
  // Get TOP 15 keywords by frequency (most important)
  const topKeywords = Array.from(keywordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word)
  
  // Check how many top keywords appear in resume
  let resumeKeywords = normalizedResume.split(/\W+/).filter(w => w.length > 3)
  resumeKeywords = expandAbbreviations(resumeKeywords)
  
  const resumeStemmed = new Set(resumeKeywords.map(simpleStem))
  const matches = topKeywords.filter(k => resumeStemmed.has(k)).length
  
  // Score based on TOP keywords only (70-85% is good)
  const percentage = Math.round((matches / Math.max(topKeywords.length, 1)) * 100)
  
  return Math.min(100, Math.max(20, percentage))
}

async function assessJob(resume: string, jobDescription: string) {
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  })

  const prompt = `Analyze this resume against the job description. Identify:
1. Key strengths matching the job
2. Experience gaps
3. Missing keywords/skills

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

Respond in this EXACT JSON format:
{
  "strengths": ["strength1", "strength2", "strength3"],
  "gaps": ["gap1", "gap2"],
  "missingKeywords": ["keyword1", "keyword2", "keyword3"]
}

Respond ONLY with JSON, no other text.`

  const message = await groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    model: "llama-3.1-8b-instant",
    temperature: 0,
    max_tokens: 1000,
  })

  const content = message.choices[0]?.message?.content || ""
  
  try {
    const data = JSON.parse(content)
    return {
      strengths: data.strengths || [],
      gaps: data.gaps || [],
      missingKeywords: data.missingKeywords || [],
    }
  } catch (e) {
    console.error("Parse failed, raw:", content.substring(0, 300))
    return {
      strengths: [],
      gaps: [],
      missingKeywords: [],
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { resume, jobDescription } = await req.json()
    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const data = await assessJob(resume, jobDescription)

    const atsMatch = calculateAtsMatch(resume, jobDescription)

    const fitScore = 
      data.gaps.length === 0 ? 95 :
      data.gaps.length === 1 ? 80 :
      data.gaps.length === 2 ? 65 :
      data.gaps.length === 3 ? 50 :
      35

    const successProbability = 
      fitScore >= 80 ? 70 + Math.random() * 15 :
      fitScore >= 65 ? 50 + Math.random() * 20 :
      fitScore >= 50 ? 35 + Math.random() * 20 :
      20 + Math.random() * 15

    const tailorWorth = Math.min(35, Math.max(0, 100 - Math.max(fitScore, atsMatch)))

    const verdict = 
      fitScore >= 75 ? "Strong Fit" :
      fitScore >= 55 ? "Moderate Fit" :
      "Weak Fit"

    return NextResponse.json({
      verdict,
      fitScore,
      atsMatch,
      successProbability: Math.round(successProbability),
      tailorWorth,
      strengths: data.strengths,
      gaps: data.gaps,
      missingKeywords: data.missingKeywords,
    })
  } catch (error: any) {
    console.error("Assess error:", error)
    return NextResponse.json({
      verdict: "Moderate Fit",
      fitScore: 50,
      atsMatch: 50,
      successProbability: 50,
      tailorWorth: 25,
      strengths: [],
      gaps: [],
      missingKeywords: [],
    })
  }
}

