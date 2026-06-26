import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../lib/auth"
import Groq from "groq-sdk"

export const maxDuration = 60

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/-/g, '').replace(/'/g, '').trim()
}

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

function simpleStem(word: string): string {
  if (word.endsWith('ing')) return word.slice(0, -3)
  if (word.endsWith('ed')) return word.slice(0, -2)
  if (word.endsWith('er')) return word.slice(0, -2)
  if (word.endsWith('s')) return word.slice(0, -1)
  return word
}

function calculateAtsMatch(resume: string, jobDescription: string): number {
  const normalizedJob = normalizeText(jobDescription)
  const normalizedResume = normalizeText(resume)
  
  let jobKeywords = normalizedJob.split(/\W+/).filter(w => w.length > 3)
  jobKeywords = expandAbbreviations(jobKeywords)
  
  const keywordFreq = new Map<string, number>()
  for (const word of jobKeywords) {
    const stemmed = simpleStem(word)
    keywordFreq.set(stemmed, (keywordFreq.get(stemmed) || 0) + 1)
  }
  
  const topKeywords = Array.from(keywordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word)
  
  let resumeKeywords = normalizedResume.split(/\W+/).filter(w => w.length > 3)
  resumeKeywords = expandAbbreviations(resumeKeywords)
  
  const resumeStemmed = new Set(resumeKeywords.map(simpleStem))
  const matches = topKeywords.filter(k => resumeStemmed.has(k)).length
  
  const percentage = Math.round((matches / Math.max(topKeywords.length, 1)) * 100)
  
  return Math.min(100, Math.max(20, percentage))
}

async function assessJob(resume: string, jobDescription: string) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const prompt = `You are an expert recruiter analyzing resume-to-job fit. Your job is to identify REAL gaps, not preferences.

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

STEP 1: Extract technical skills from RESUME
List ALL:
- Software/tools: databases, BI tools, programming languages, frameworks, platforms, etc.
- Technical domains: cloud computing, data engineering, machine learning, etc.
- Years of specific experience: "5+ years Python", "8 years management", etc.
- Certifications/degrees

STEP 2: Extract requirements from JOB DESCRIPTION
List ALL:
- Required software/tools: databases, BI tools, programming languages, frameworks, platforms, etc.
- Required technical domains
- Required experience level: years, seniority, domain depth
- Required certifications/degrees
- Nice-to-have vs must-have (differentiate!)

STEP 3: Compare intelligently
For EACH job requirement, ask:
- Does resume mention this tool/skill explicitly? ✓
- OR does resume show equivalent experience that transfers? ✓
- OR is this a nice-to-have/preference (not a gap)? ✗
- Only flag TRUE GAPS: missing required skills that don't have equivalents

CRITICAL RULES:
- Tool names must match (Snowflake in resume = covers Snowflake requirement)
- Experience domains transfer (FMCG/retail/tech industry experience = covers industry background)
- Ignore: "preferred", "ideal", "nice-to-have", soft skills
- Flag: Required tools/certifications NOT in resume, experience level gaps, domain expertise gaps

EXAMPLE GAPS TO FLAG:
- Job requires "Snowflake" but resume has no data warehouse experience ✓ GAP
- Job requires "5+ years management" but resume shows 2 years ✓ GAP
- Job requires "AWS certification" but resume has no AWS ✓ GAP

EXAMPLE GAPS TO IGNORE:
- "FMCG industry preferred" when resume has Pidilite (FMCG company) ✗ NO GAP
- "MBA ideal" when resume shows 10 years relevant experience ✗ NO GAP
- "Nice-to-have: Tableau" when not listed as required ✗ NO GAP

Respond in this EXACT JSON format:
{
  "strengths": ["real strength 1", "real strength 2", "real strength 3"],
  "gaps": ["ONLY critical missing requirements from job"],
  "missingKeywords": ["critical tool/skill 1", "critical tool/skill 2"]
}

GAPS should be: "Missing [tool/skill]" or "[Years] years of [skill] required"
KEYWORDS should be: specific tool/skill names that are genuinely missing

Respond ONLY with JSON, no explanation.`

  const message = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama-3.1-8b-instant",
    temperature: 0,
    max_tokens: 1500,
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
    console.error("Parse failed:", content.substring(0, 300))
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
