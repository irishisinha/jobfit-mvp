"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import NavBar from "@/components/NavBar"

export default function TailorResumePage() {
  const [tailoredResume, setTailoredResume] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const assessmentData = sessionStorage.getItem("currentAssessment")
    if (assessmentData) {
      const data = JSON.parse(assessmentData)
      generateTailoredResume(data)
    } else {
      setError("No assessment data found. Please complete an assessment first.")
      setLoading(false)
    }
  }, [])

  const generateTailoredResume = async (data: any) => {
    try {
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
        let resume = (result.tailoredResume || "").replace("Tailored Resume", "").trim()
        setTailoredResume(resume)
      } else {
        setError("Failed to generate tailored resume")
      }
    } catch (err) {
      setError("Error generating resume")
      console.error(err)
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
              ? Back to Assessment
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
