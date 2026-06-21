"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"

interface AssessmentResult {
  verdict: string
  fitScore: number
  atsMatch: number
  successProbability: number
  tailorWorth: number
  strengths: string[]
  gaps: string[]
  missingKeywords: string[]
}

export default function Assessment() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [resume, setResume] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [company, setCompany] = useState("")
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [coverLetter, setCoverLetter] = useState("")
  const [tailoredResume, setTailoredResume] = useState("")
  const [linkedInMessage, setLinkedInMessage] = useState("")
  const [generatingCL, setGeneratingCL] = useState(false)
  const [generatingTR, setGeneratingTR] = useState(false)
  const [generatingLI, setGeneratingLI] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/")
  }, [status, router])

  const handleAssess = async () => {
    setError("")
    setResult(null)
    setLoading(true)

    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription, jobTitle, company }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Assessment failed")
      }

      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assessment failed")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateCoverLetter = async () => {
    if (!result) return
    setGeneratingCL(true)
    try {
      const res = await fetch("/api/cover-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription, jobTitle, company, strengths: result.strengths, gaps: result.gaps, missingKeywords: result.missingKeywords }),
      })
      const data = await res.json()
      setCoverLetter(data.coverLetter || "Failed to generate")
    } catch (err) {
      setCoverLetter("Failed to generate cover letter")
    } finally {
      setGeneratingCL(false)
    }
  }

  const handleGenerateTailoredResume = async () => {
    if (!result) return
    setGeneratingTR(true)
    try {
      const res = await fetch("/api/tailored-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription, jobTitle, company }),
      })
      const data = await res.json()
      setTailoredResume(data.tailoredResume || "Failed to generate")
    } catch (err) {
      setTailoredResume("Failed to generate tailored resume")
    } finally {
      setGeneratingTR(false)
    }
  }

  const handleGenerateLinkedIn = async () => {
    if (!result) return
    setGeneratingLI(true)
    try {
      const res = await fetch("/api/linkedin-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription, jobTitle, company }),
      })
      const data = await res.json()
      setLinkedInMessage(data.message || "Failed to generate")
    } catch (err) {
      setLinkedInMessage("Failed to generate LinkedIn message")
    } finally {
      setGeneratingLI(false)
    }
  }

  const downloadAsText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow mb-8">
        <div className="container-main py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">JobFit Assessment</h1>
            <p className="text-gray-600">Welcome, {session.user?.name}! Paste your resume and job description to get started.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard" className="btn-secondary">Dashboard</Link>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-secondary">Sign Out</button>
          </div>
        </div>
      </div>

      <div className="container-main py-8">
        {!result ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-lg p-6 shadow">
                <label className="block text-lg font-bold text-blue-600 mb-4">Your Resume</label>
                <textarea value={resume} onChange={(e) => setResume(e.target.value)} placeholder="Paste your resume here..." className="w-full h-64 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" />
              </div>
              <div className="bg-white rounded-lg p-6 shadow">
                <label className="block text-lg font-bold text-gray-800 mb-4">Job Description</label>
                <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the job description here..." className="w-full h-64 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Job Title (optional)" className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" />
              <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (optional)" className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" />
            </div>

            <div className="text-center">
              <button onClick={handleAssess} disabled={loading || !resume || !jobDescription} className={`px-8 py-3 rounded-lg font-semibold text-white ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
                {loading ? "Analyzing..." : "Assess Fit"}
              </button>
            </div>

            {error && <div className="mt-6 bg-red-100 border-2 border-red-500 rounded-lg p-4 text-red-800">{error}</div>}
          </>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-8 shadow">
              <h2 className="text-3xl font-bold mb-6">Assessment Results</h2>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm mb-1">Verdict</p>
                  <p className={`text-lg font-bold ${result.verdict === "Strong Fit" ? "text-green-600" : result.verdict === "Moderate Fit" ? "text-yellow-600" : "text-red-600"}`}>{result.verdict}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm mb-1">Fit Score</p>
                  <p className="text-2xl font-bold text-blue-600">{(result.fitScore / 10).toFixed(1)}/10</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm mb-1">ATS Match</p>
                  <p className="text-2xl font-bold text-indigo-600">{result.atsMatch}%</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm mb-1">Success</p>
                  <p className="text-2xl font-bold text-purple-600">{result.successProbability}%</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm mb-1">Tailor Worth</p>
                  <p className={`text-2xl font-bold ${result.tailorWorth >= 70 ? "text-orange-600" : result.tailorWorth >= 40 ? "text-yellow-600" : "text-gray-600"}`}>{result.tailorWorth}%</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-green-600 mb-3">Strengths</h3>
                  <ul className="space-y-2">{result.strengths?.filter(s => s && s !== "N/A").map((s, i) => <li key={i} className="flex items-start"><span className="text-green-600 mr-2">?</span><span>{s}</span></li>)}</ul>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-600 mb-3">Gaps</h3>
                  <ul className="space-y-2">{result.gaps?.filter(g => g && g !== "N/A").map((g, i) => <li key={i} className="flex items-start"><span className="text-red-600 mr-2">!</span><span>{g}</span></li>)}</ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-yellow-600 mb-3">Missing Keywords</h3>
                <div className="flex flex-wrap gap-2">{result.missingKeywords?.filter(k => k && k !== "N/A").map((k, i) => <span key={i} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">{k}</span>)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="text-lg font-bold text-blue-600 mb-4">?? Cover Letter</h3>
                {coverLetter ? (
                  <>
                    <textarea value={coverLetter} readOnly className="w-full h-48 px-4 py-3 border-2 border-gray-300 rounded-lg mb-3 text-sm" />
                    <button onClick={() => downloadAsText(coverLetter, "cover_letter.txt")} className="btn-primary w-full">Download</button>
                  </>
                ) : (
                  <button onClick={handleGenerateCoverLetter} disabled={generatingCL} className={`w-full px-4 py-2 rounded-lg font-semibold text-white ${generatingCL ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
                    {generatingCL ? "Generating..." : "Generate Cover Letter"}
                  </button>
                )}
              </div>

              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="text-lg font-bold text-green-600 mb-4">?? Tailored Resume</h3>
                {tailoredResume ? (
                  <>
                    <textarea value={tailoredResume} readOnly className="w-full h-48 px-4 py-3 border-2 border-gray-300 rounded-lg mb-3 text-sm" />
                    <button onClick={() => downloadAsText(tailoredResume, "tailored_resume.txt")} className="btn-primary w-full">Download</button>
                  </>
                ) : (
                  <button onClick={handleGenerateTailoredResume} disabled={generatingTR || result.tailorWorth < 30} className={`w-full px-4 py-2 rounded-lg font-semibold text-white ${generatingTR || result.tailorWorth < 30 ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}>
                    {generatingTR ? "Generating..." : result.tailorWorth < 30 ? "Not Needed (Already Good Fit)" : "Generate Tailored Resume"}
                  </button>
                )}
              </div>

              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="text-lg font-bold text-purple-600 mb-4">?? LinkedIn Outreach</h3>
                {linkedInMessage ? (
                  <>
                    <textarea value={linkedInMessage} readOnly className="w-full h-48 px-4 py-3 border-2 border-gray-300 rounded-lg mb-3 text-sm" />
                    <button onClick={() => downloadAsText(linkedInMessage, "linkedin_message.txt")} className="btn-primary w-full">Download</button>
                  </>
                ) : (
                  <button onClick={handleGenerateLinkedIn} disabled={generatingLI} className={`w-full px-4 py-2 rounded-lg font-semibold text-white ${generatingLI ? "bg-gray-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"}`}>
                    {generatingLI ? "Generating..." : "Generate LinkedIn Message"}
                  </button>
                )}
              </div>
            </div>

            <button onClick={() => setResult(null)} className="btn-secondary w-full">New Assessment</button>
          </div>
        )}
      </div>
    </div>
  )
}
