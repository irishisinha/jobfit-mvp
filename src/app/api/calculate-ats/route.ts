import { NextRequest, NextResponse } from "next/server"

// Normalize text for better keyword matching
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/-/g, '')
    .replace(/'/g, '')
    .trim()
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

// CRITICAL: Focus on top 10-15 most important keywords (by frequency)
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
  
  console.log("Top critical keywords:", topKeywords)
  
  // Check how many top keywords appear in resume
  let resumeKeywords = normalizedResume.split(/\W+/).filter(w => w.length > 3)
  resumeKeywords = expandAbbreviations(resumeKeywords)
  
  const resumeStemmed = new Set(resumeKeywords.map(simpleStem))
  const matches = topKeywords.filter(k => resumeStemmed.has(k)).length
  
  // Score based on TOP keywords only (not all keywords)
  // 15 keywords: 70% match = 10/15, 80% match = 12/15, 90% match = 13/15
  const percentage = Math.round((matches / Math.max(topKeywords.length, 1)) * 100)
  
  console.log(`Critical keywords match: ${matches}/${topKeywords.length} = ${percentage}%`)
  
  // Clamp between 20-100 (but 70-85% is realistic GOOD)
  return Math.min(100, Math.max(20, percentage))
}

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json()

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("Calculating ATS match on TOP CRITICAL keywords...")
    
    const atsMatch = calculateAtsMatch(resume, jobDescription)
    
    console.log("Final ATS score (based on critical keywords):", atsMatch)

    return NextResponse.json({ atsMatch })
  } catch (error: any) {
    console.error("ATS calculation error:", error.message)
    return NextResponse.json({ 
      error: `Failed to calculate ATS match: ${error.message}` 
    }, { status: 500 })
  }
}
