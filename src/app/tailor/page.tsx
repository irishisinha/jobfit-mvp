"use client"

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
    const parts = text.split(/(\[\[\[HIGHLIGHT_START\]\]\].*?\[\[\[HIGHLIGHT_END\]\]\])/g)
    
    return (
      <div className="prose max-w-none whitespace-pre-wrap bg-gray-50 p-6 rounded border border-gray-300 font-mono text-sm">
        {parts.map((part, idx) => {
          if (part.includes("[[[HIGHLIGHT_START]]]")) {
            const highlighted = part
              .replace("[[[HIGHLIGHT_START]]]", "")
              .replace("[[[HIGHLIGHT_END]]]", "")
            return (
              <span key={idx} className="bg-yellow-200 font-semibold px-1 rounded">
                {highlighted}
              </span>
            )
          }
          return <span key={idx}>{part}</span>
        })}
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
              <div className="mb-8 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                <h3 className="font-bold text-yellow-900 mb-3">ATS Match Improvement:</h3>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-700">{originalAtsMatch}%</div>
                    <div className="text-sm text-yellow-600">Before Tailoring</div>
                  </div>
                  <div className="text-2xl text-yellow-400">→</div>
                  <div className="text-center">
                    {atsLoading ? (
                      <div className="text-sm text-yellow-600">Calculating ATS score...</div>
                    ) : improvedAtsMatch !== null ? (
                      <>
                        <div className="text-2xl font-bold text-green-700">{improvedAtsMatch}%</div>
                        <div className="text-sm text-green-600">After Tailoring</div>
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

