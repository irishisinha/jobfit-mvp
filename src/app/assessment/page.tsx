"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Document, Packer, Paragraph, HeadingLevel } from "docx"

interface SavedResume {
  id: string
  name: string
  content: string
  createdAt: string
  matchScore?: number
}

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
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([])
  const [jobDescription, setJobDescription] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [company, setCompany] = useState("")
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedResume, setSelectedResume] = useState<SavedResume | null>(null)
  const [step, setStep] = useState<"input" | "select" | "results">("input")
  const [clTone, setClTone] = useState("professional")
  const [coverLetter, setCoverLetter] = useState("")
  const [tailoredResume, setTailoredResume] = useState("")
  const [linkedInMessage, setLinkedInMessage] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") router.push("/")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      loadSavedResumes()
    }
  }, [status])

  const loadSavedResumes = () => {
    try {
      const stored = localStorage.getItem("jobfit_resumes")
      if (stored) {
        setSavedResumes(JSON.parse(stored))
      }
    } catch (e) {
      console.error("Error loading resumes:", e)
    }
  }

  const handleAnalyzeJob = async () => {
    if (!jobDescription.trim()) {
      setError("Please enter a job description")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Score all saved resumes against this job
      const scored = await Promise.all(
        savedResumes.map(async (resume) => {
          try {
            const res = await fetch("/api/suggest-resume", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jobDescription, jobTitle, company }),
            })
            const data = await res.json()
            const suggestions = data.suggestions || []
            const match = suggestions.find((s: any) => s.id === resume.id)
            return { ...resume, matchScore: match?.score || 50 }
          } catch (err) {
            return { ...resume, matchScore: 50 }
          }
        })
      )

      setSavedResumes(scored.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)))
      setStep("select")
    } catch (err) {
      setError("Failed to analyze resumes")
    } finally {
      setLoading(false)
    }
  }

  const handleSelectResume = async (resume: SavedResume) => {
    setSelectedResume(resume)
    setStep("results")
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: resume.content,
          jobDescription,
          jobTitle,
          company,
        }),
      })

      if (!res.ok) throw new Error("Assessment failed")
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError("Assessment failed")
      setStep("select")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateCoverLetter = async () => {
    if (!result || !selectedResume) return

    try {
      const res = await fetch("/api/cover-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: selectedResume.content,
          jobDescription,
          jobTitle,
          company,
          tone: clTone,
          strengths: result.strengths,
          gaps: result.gaps,
          missingKeywords: result.missingKeywords,
        }),
      })
      const data = await res.json()
      setCoverLetter(data.coverLetter || "Failed to generate")
    } catch (err) {
      setCoverLetter("Failed to generate")
    }
  }

  const handleGenerateTailoredResume = async () => {
    if (!result || !selectedResume) return

    try {
      const res = await fetch("/api/tailored-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: selectedResume.content,
          jobDescription,
          jobTitle,
          company,
        }),
      })
      const data = await res.json()
      setTailoredResume(data.tailoredResume || "Failed to generate")
    } catch (err) {
      setTailoredResume("Failed to generate")
    }
  }

  const handleGenerateLinkedIn = async () => {
    if (!result || !selectedResume) return

    try {
      const res = await fetch("/api/linkedin-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: selectedResume.content,
          jobDescription,
          jobTitle,
          company,
        }),
      })
      const data = await res.json()
      setLinkedInMessage(data.linkedInMessage || "Failed to generate")
    } catch (err) {
      setLinkedInMessage("Failed to generate")
    }
  }

  if (status === "loading") return <div className="p-8">Loading...</div>
  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow mb-8">
        <div className="container-main py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">JobFit Assessment</h1>
          <div className="flex gap-3">
            <Link href="/resumes" className="btn-secondary">My Resumes</Link>
            <Link href="/dashboard" className="btn-secondary">Dashboard</Link>
            <button onClick={() => signOut()} className="btn-secondary">Sign Out</button>
          </div>
        </div>
      </div>

      <div className="container-main py-8">
        {step === "input" && (
          <div className="bg-white rounded-lg p-8 shadow">
            <h2 className="text-2xl font-bold mb-6">Enter Job Details</h2>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">Job Description</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description..."
                className="w-full h-48 px-4 py-3 border-2 border-gray-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Job Title"
                className="px-4 py-2 border-2 border-gray-300 rounded-lg"
              />
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company"
                className="px-4 py-2 border-2 border-gray-300 rounded-lg"
              />
            </div>
            {error && <div className="bg-red-100 border-2 border-red-500 text-red-800 p-4 rounded-lg mb-4">{error}</div>}
            <button
              onClick={handleAnalyzeJob}
              disabled={loading || !jobDescription.trim()}
              className={`px-6 py-3 rounded-lg font-bold text-white text-lg ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {loading ? "Analyzing..." : "Analyze Job & Show Resume Matches"}
            </button>
          </div>
        )}

        {step === "select" && savedResumes.length > 0 && (
          <div className="bg-white rounded-lg p-8 shadow">
            <h2 className="text-2xl font-bold mb-6">Select Resume for This Job</h2>
            <p className="text-gray-600 mb-6">Your resumes ranked by match score:</p>
            <div className="space-y-3">
              {savedResumes.map((resume) => (
                <div key={resume.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold">{resume.name}</h3>
                    <p className="text-sm text-gray-600">Match Score: {resume.matchScore}%</p>
                  </div>
                  <button
                    onClick={() => handleSelectResume(resume)}
                    className="btn-primary"
                  >
                    Use This Resume
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "results" && result && selectedResume && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-8 shadow">
              <h2 className="text-2xl font-bold mb-2">Assessment Results for "{selectedResume.name}"</h2>
              <p className="text-gray-600 mb-6">Job: {jobTitle} at {company}</p>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm mb-1">Verdict</p>
                  <p className={`text-lg font-bold ${result.verdict === "Strong Fit" ? "text-green-600" : result.verdict === "Moderate Fit" ? "text-yellow-600" : "text-red-600"}`}>
                    {result.verdict}
                  </p>
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
                  <p className="text-gray-600 text-sm mb-1">Success Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{result.successProbability}%</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm mb-1">Tailor Worth</p>
                  <p className="text-2xl font-bold text-orange-600">{result.tailorWorth}%</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-green-600 mb-3">Strengths</h3>
                  <ul className="space-y-2">
                    {(result.strengths || []).map((s, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-green-600 mr-2">→</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-600 mb-3">Gaps</h3>
                  <ul className="space-y-2">
                    {(result.gaps || []).map((g, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-red-600 mr-2">→</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-yellow-600 mb-3">Missing Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {(result.missingKeywords || []).map((k, i) => (
                    <span key={i} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="text-lg font-bold text-blue-600 mb-4">📄 Cover Letter</h3>
                {coverLetter ? (
                  <textarea value={coverLetter} readOnly className="w-full h-48 px-4 py-3 border-2 border-gray-300 rounded-lg mb-3 text-xs font-mono" />
                ) : (
                  <button onClick={handleGenerateCoverLetter} className="w-full btn-primary">
                    Generate Cover Letter
                  </button>
                )}
              </div>

              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="text-lg font-bold text-green-600 mb-4">📋 Tailored Resume</h3>
                {tailoredResume ? (
                  <textarea value={tailoredResume} readOnly className="w-full h-48 px-4 py-3 border-2 border-gray-300 rounded-lg mb-3 text-xs font-mono" />
                ) : (
                  <button onClick={handleGenerateTailoredResume} disabled={result.tailorWorth < 30} className={`w-full ${result.tailorWorth < 30 ? "btn-secondary opacity-50" : "btn-primary"}`}>
                    {result.tailorWorth < 30 ? "Already Good Fit" : "Generate Tailored Resume"}
                  </button>
                )}
              </div>

              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="text-lg font-bold text-purple-600 mb-4">💼 LinkedIn Message</h3>
                {linkedInMessage ? (
                  <textarea value={linkedInMessage} readOnly className="w-full h-48 px-4 py-3 border-2 border-gray-300 rounded-lg mb-3 text-xs font-mono" />
                ) : (
                  <button onClick={handleGenerateLinkedIn} className="w-full btn-primary">
                    Generate LinkedIn Message
                  </button>
                )}
              </div>
            </div>

            <button onClick={() => setStep("input")} className="w-full btn-secondary py-3 text-lg font-bold">
              Analyze Another Job
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
