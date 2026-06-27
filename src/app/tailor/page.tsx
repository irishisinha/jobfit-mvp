"use client"
export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import NavBar from "@/components/NavBar"

interface TailorData {
  resume: string
  jobDescription: string
  jobTitle: string
  company: string
  gaps: string[]
  missingKeywords: string[]
  originalAtsMatch?: number
}

export default function TailorPage() {
  const router = useRouter()
  const [tailoredResume, setTailoredResume] = useState("")
  const [changeSummary, setChangeSummary] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [originalAtsMatch, setOriginalAtsMatch] = useState<number | null>(null)
  const [improvedAtsMatch, setImprovedAtsMatch] = useState<number | null>(null)
  const [atsLoading, setAtsLoading] = useState(false)

  useEffect(() => {
    const data = sessionStorage.getItem("tailorData")
    if (!data) {
      setError("No assessment data found")
      setLoading(false)
      return
    }

    const parsedData: TailorData = JSON.parse(data)
    setOriginalAtsMatch(parsedData.originalAtsMatch || null)
    generateTailoredResume(parsedData)
  }, [])

  const generateTailoredResume = async (data: TailorData) => {
    try {
      console.log("Calling tailor API...")
      
      const res = await fetch("/api/tailor-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: data.resume,
          jobDescription: data.jobDescription,
          jobTitle: data.jobTitle,
          company: data.company,
          gaps: data.gaps || [],
          missingKeywords: data.missingKeywords || []
        })
      })

      if (res.ok) {
        const result = await res.json()
        console.log("Raw API response:", result.tailoredResume?.substring(0, 500))
        
        let resume = (result.tailoredResume || "")
          .split("\n")
          .filter((line: string) => !line.toLowerCase().match(/(tailored|generated|date|created)[\s:]/))
          .join("\n")
          .trim()
        
        setTailoredResume(resume)
        setChangeSummary(result.changeSummary || "")
        
        if (data.jobDescription && resume) {
          setAtsLoading(true)
          await calculateImprovedAts(resume, data.jobDescription)
        }
      } else {
        const errorText = await res.text()
        console.error("API error:", errorText)
        setError(`Failed to generate tailored resume (${res.status})`)
      }
    } catch (err: any) {
      console.error("Error generating resume:", err)
      setError(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const calculateImprovedAts = async (resume: string, jobDesc: string) => {
    try {
      const res = await fetch("/api/calculate-ats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription: jobDesc })
      })

      if (res.ok) {
        const result = await res.json()
        setImprovedAtsMatch(result.atsMatch)
      } else {
        setImprovedAtsMatch(null)
      }
    } catch (err) {
      console.error("Error calculating ATS:", err)
      setImprovedAtsMatch(null)
    } finally {
      setAtsLoading(false)
    }
  }

  const renderResumeWithHighlights = (text: string) => {
    // Split by highlight markers and preserve the markers in the result
    const regex = /\[\[\[HIGHLIGHT_START\]\]\](.*?)\[\[\[HIGHLIGHT_END\]\]\]/gs
    const parts: Array<{type: 'text' | 'highlight', content: string}> = []
    let lastIndex = 0
    let match

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        })
      }
      parts.push({
        type: 'highlight',
        content: match[1]
      })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      })
    }

    if (parts.length === 0) {
      parts.push({ type: 'text', content: text })
    }

    return (
      <div className="whitespace-pre-wrap bg-gray-50 p-6 rounded border border-gray-300 font-mono text-sm leading-relaxed">
        {parts.map((part, idx) => (
          part.type === 'highlight' ? (
            <span key={idx} className="bg-yellow-300 font-bold px-0.5 rounded" style={{color: '#1a1a1a'}}>
              {part.content}
            </span>
          ) : (
            <span key={idx}>{part.content}</span>
          )
        ))}
      </div>
    )
  }

  const downloadResume = () => {
    const cleanText = tailoredResume
      .replace(/\[\[\[HIGHLIGHT_START\]\]\]/g, "")
      .replace(/\[\[\[HIGHLIGHT_END\]\]\]/g, "")
    const element = document.createElement("a")
    const file = new Blob([cleanText], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = "tailored_resume.txt"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const copyToClipboard = () => {
    const cleanText = tailoredResume
      .replace(/\[\[\[HIGHLIGHT_START\]\]\]/g, "")
      .replace(/\[\[\[HIGHLIGHT_END\]\]\]/g, "")
    navigator.clipboard.writeText(cleanText)
    alert("Resume copied to clipboard!")
  }

  if (loading) return <div className="p-8 text-center">Generating tailored resume...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            
            {originalAtsMatch !== null && (
              <div className="mb-8">
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded mb-2">
                  <h3 className="font-bold text-yellow-900 mb-3">ATS Match Estimate:</h3>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-700">{originalAtsMatch}%</div>
                      <div className="text-sm text-yellow-600">Before</div>
                    </div>
                    <div className="text-2xl text-yellow-400">→</div>
                    <div className="text-center">
                      {atsLoading ? (
                        <div className="text-sm text-yellow-600">Calculating...</div>
                      ) : improvedAtsMatch !== null ? (
                        <>
                          <div className="text-2xl font-bold text-green-700">{improvedAtsMatch}%</div>
                          <div className="text-sm text-green-600">After</div>
                          <div className="text-xs text-green-600 mt-1">
                            ({improvedAtsMatch > originalAtsMatch ? '+' : ''}{improvedAtsMatch - originalAtsMatch}%)
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-red-600">Could not calculate</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                  <p className="text-xs text-blue-700">
                    <strong>Note:</strong> ATS scores are estimates based on keyword analysis. Actual ATS systems vary by company. Improvements typically range 10-20% from keyword optimization. This shows potential improvement from tailoring.
                  </p>
                </div>
              </div>
            )}

            {changeSummary && (
              <div className="mb-8 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <h3 className="font-bold text-blue-900 mb-2">Changes Made for Job Fit:</h3>
                <div className="text-sm text-blue-800 whitespace-pre-wrap">
                  {changeSummary}
                </div>
              </div>
            )}

            <div className="mb-4 p-3 bg-orange-50 border-l-4 border-orange-400 rounded">
              <p className="text-sm text-orange-700"><strong>💡 Highlighted sections in yellow</strong> show where keywords were added or optimized for ATS.</p>
            </div>
            
            <div className="flex gap-3 mb-6">
              <button
                onClick={downloadResume}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Download Resume
              </button>
              <button
                onClick={copyToClipboard}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Copy to Clipboard
              </button>
            </div>

            {renderResumeWithHighlights(tailoredResume)}
          </div>

          <div className="text-center">
            <Link href="/assessment" className="text-blue-600 hover:underline">
              ← Back to Assessment
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}



