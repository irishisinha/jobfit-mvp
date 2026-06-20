"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface AssessmentResult {
  verdict: string
  fitScore: number
  atsMatch: number
  successProbability: number
  strengths: string[]
  gaps: string[]
  missingKeywords: string[]
}

interface SavedResume {
  id: string
  name: string
  content: string
}

export default function Assessment() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [resume, setResume] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [company, setCompany] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [error, setError] = useState("")
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([])
  const [resumeName, setResumeName] = useState("")
  const [showSavePrompt, setShowSavePrompt] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/")
  }, [status, router])

  useEffect(() => {
    const loadResumes = async () => {
      try {
        const res = await fetch("/api/resumes")
        if (res.ok) setSavedResumes(await res.json())
      } catch (err) {
        console.error("Error loading resumes:", err)
      }
    }
    if (status === "authenticated") loadResumes()
  }, [status])

  const handleLoadResume = (id: string) => {
    const r = savedResumes.find((x) => x.id === id)
    if (r) setResume(r.content)
  }

  const handleAssess = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      setError("Fill in both resume and job description")
      return
    }
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription, jobTitle, company }),
      })
      if (!res.ok) throw new Error("Assessment failed")
      const data = await res.json()
      setResult(data)
      setShowSavePrompt(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveResume = async () => {
    if (!resumeName.trim()) {
      setError("Enter resume name")
      return
    }
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: resume,
          name: resumeName,
          setDefault: savedResumes.length === 0,
        }),
      })
      if (res.ok) {
        setSavedResumes([await res.json(), ...savedResumes])
        setShowSavePrompt(false)
        setResumeName("")
      }
    } catch {
      setError("Failed to save")
    }
  }

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container-main">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">JobFit Assessment</h1>
          <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-secondary">Sign Out</button>
        </div>

        <p className="text-gray-600 mb-6">Welcome, {session?.user?.name}!</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <input type="text" placeholder="Job Title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" />
          <input type="text" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" />
        </div>

        {savedResumes.length > 0 && (
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Load saved resume:</label>
            <select onChange={(e) => handleLoadResume(e.target.value)} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg">
              <option value="">-- Select resume --</option>
              {savedResumes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Resume</h2>
            <textarea value={resume} onChange={(e) => setResume(e.target.value)} placeholder="Paste resume or select saved..." className="textarea-input h-80" />
          </div>
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Job Description</h2>
            <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste job description..." className="textarea-input h-80" />
          </div>
        </div>

        <div className="text-center mb-8">
          <button onClick={handleAssess} disabled={loading} className={`btn-primary ${loading ? "opacity-50 cursor-not-allowed" : ""}`}>
            {loading ? "Assessing..." : "Assess Fit"}
          </button>
        </div>

        {error && <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>}

        {showSavePrompt && result && (
          <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4">Save this resume?</h3>
            <div className="flex gap-4 items-end">
              <input type="text" placeholder="Resume name" value={resumeName} onChange={(e) => setResumeName(e.target.value)} className="flex-1 px-4 py-2 border-2 border-blue-300 rounded-lg" />
              <button onClick={handleSaveResume} className="btn-primary">Save</button>
              <button onClick={() => setShowSavePrompt(false)} className="btn-secondary">Skip</button>
            </div>
          </div>
        )}

        {result && (
          <div className="card bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-gray-600 text-sm mb-1">Verdict</p>
                <p className={`text-2xl font-bold ${result.verdict === "Strong Fit" ? "text-green-600" : result.verdict === "Moderate Fit" ? "text-yellow-600" : "text-red-600"}`}>{result.verdict}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-gray-600 text-sm mb-1">Fit Score</p>
                <p className="text-2xl font-bold text-blue-600">{(result.fitScore / 10).toFixed(1)}/10</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-gray-600 text-sm mb-1">ATS Match</p>
                <p className="text-2xl font-bold text-indigo-600">{result.atsMatch}%</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-gray-600 text-sm mb-1">Success Probability</p>
                <p className="text-2xl font-bold text-purple-600">{result.successProbability}%</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-xl font-bold text-green-600 mb-3">Strengths</h3>
                <ul className="space-y-2">
                  {result.strengths.map((s, i) => <li key={i} className="flex items-start gap-2"><span className="text-green-600 font-bold">?</span><span className="text-gray-700">{s}</span></li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-600 mb-3">Gaps</h3>
                <ul className="space-y-2">
                  {result.gaps.map((g, i) => <li key={i} className="flex items-start gap-2"><span className="text-red-600 font-bold">?</span><span className="text-gray-700">{g}</span></li>)}
                </ul>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-yellow-600 mb-3">Missing Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {result.missingKeywords.map((k, i) => <span key={i} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">{k}</span>)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
