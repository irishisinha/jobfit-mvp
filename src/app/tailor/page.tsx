"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import NavBar from "@/components/NavBar"

interface TailorData {
  resume: string
  jobDescription: string
  jobTitle: string
  company: string
  gaps: string[]
  missingKeywords: string[]
}

export default function TailorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tailoredResume, setTailoredResume] = useState("")
  const [changeSummary, setChangeSummary] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const data = sessionStorage.getItem("tailorData")
    if (!data) {
      setError("No assessment data found")
      setLoading(false)
      return
    }

    const parsedData: TailorData = JSON.parse(data)
    generateTailoredResume(parsedData)
  }, [])

  const generateTailoredResume = async (data: TailorData) => {
    try {
      console.log("Calling tailor API with:", { gaps: data.gaps?.length, keywords: data.missingKeywords?.length })
      
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

      console.log("Tailor API response status:", res.status)
      
      if (res.ok) {
        const result = await res.json()
        console.log("Got result with changeSummary:", !!result.changeSummary)
        
        let resume = (result.tailoredResume || "")
          .split("\n")
          .filter((line: string) => !line.toLowerCase().match(/(tailored|generated|date|created)[\s:]/))
          .join("\n")
          .trim()
        
        setTailoredResume(resume)
        setChangeSummary(result.changeSummary || "")
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

  const downloadResume = () => {
    const element = document.createElement("a")
    const file = new Blob([tailoredResume], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = "tailored_resume.txt"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tailoredResume)
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
            {changeSummary && (
              <div className="mb-8 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <h3 className="font-bold text-blue-900 mb-2">Changes Made for Job Fit:</h3>
                <div className="text-sm text-blue-800 whitespace-pre-wrap">
                  {changeSummary}
                </div>
              </div>
            )}
            
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

            <div className="prose max-w-none whitespace-pre-wrap bg-gray-50 p-6 rounded border border-gray-300 font-mono text-sm">
              {tailoredResume}
            </div>
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
