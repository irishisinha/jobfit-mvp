import { NextRequest, NextResponse } from "next/server"

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

// SAME logic as assess endpoint - identical keyword matching
function calculateAtsMatch(resume: string, jobDescription: string): number {
  // Normalize both texts
  const normalizedJob = normalizeText(jobDescription)
  const normalizedResume = normalizeText(resume)
  
  // Extract words (> 3 chars to avoid "the", "and", etc)
  let jobKeywords = normalizedJob.split(/\W+/).filter(w => w.length > 3)
  let resumeKeywords = normalizedResume.split(/\W+/).filter(w => w.length > 3)
  
  // Expand abbreviations
  jobKeywords = expandAbbreviations(jobKeywords)
  resumeKeywords = expandAbbreviations(resumeKeywords)
  
  // Apply stemming for better matching
  const jobStemmed = new Set(jobKeywords.map(simpleStem))
  const resumeStemmed = new Set(resumeKeywords.map(simpleStem))
  
  // Count matches (keywords that appear in both)
  const matches = Array.from(jobStemmed).filter(k => resumeStemmed.has(k)).length
  
  // Calculate percentage based on job requirements
  const percentage = Math.round((matches / Math.max(jobStemmed.size, 1)) * 100)
  
  // Clamp between 20-100
  return Math.min(100, Math.max(20, percentage))
}

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json()

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("Calculating ATS match with improved keyword matching...")
    
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
