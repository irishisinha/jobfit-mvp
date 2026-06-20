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
  const [coverLetter, setCoverLetter] = useState("")
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false)
  const [coverLetterTone, setCoverLetterTone] = useState("professional")
  const [tailoredResume, setTailoredResume] = useState("")
  const [generatingTailoredResume, setGeneratingTailoredResume] = useState(false)
  const [linkedInMessage, setLinkedInMessage] = useState("")
  const [generatingLinkedIn, setGeneratingLinkedIn] = useState(false)
  const [recipientName, setRecipientName] = useState("")
  const [recipientRole, setRecipientRole] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") router.push("/")
  }, [status, router])

  const downloadAsText = (text: string, filename: string) => {
    const element = document.createElement("a")
    const file = new Blob([text], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = filename
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const handleAssess = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      setError("Fill in both resume and job description")
      return
    }
    setLoading(true)
    setError("")
    setResult(null)
    setCoverLetter("")
    setTailoredResume("")
    setLinkedInMessage("")

    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription, jobTitle, company }),
      })
      if (!res.ok) throw new Error("Assessment failed")
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateCoverLetter = async () => {
    setGeneratingCoverLetter(true)
    try {
      const res = await fetch("/api/cover-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume,
          jobDescription,
          jobTitle,
          company,
          tone: coverLetterTone,
          strengths: result?.strengths || [],
          gaps: result?.gaps || [],
          missingKeywords: result?.missingKeywords || [],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setCoverLetter(data.content)
      } else {
        setError("Failed to generate cover letter")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    } finally {
      setGeneratingCoverLetter(false)
    }
  }

  const handleGenerateTailoredResume = async () => {
    setGeneratingTailoredResume(true)
    try {
      const res = await fetch("/api/tailored-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume,
          jobDescription,
          jobTitle,
          company,
          strengths: result?.strengths || [],
          gaps: result?.gaps || [],
          missingKeywords: result?.missingKeywords || [],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setTailoredResume(data.content)
      } else {
        setError("Failed to generate tailored resume")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    } finally {
      setGeneratingTailoredResume(false)
    }
  }

  const handleGenerateLinkedIn = async () => {
    setGeneratingLinkedIn(true)
    try {
      const res = await fetch("/api/linkedin-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume,
          jobDescription,
          jobTitle,
          company,
          recipientName,
          recipientRole,
          strengths: result?.strengths || [],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setLinkedInMessage(data.content)
      } else {
        setError("Failed to generate LinkedIn message")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    } finally {
      setGeneratingLinkedIn(false)
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Resume</h2>
            <textarea value={resume} onChange={(e) => setResume(e.target.value)} placeholder="Paste resume here..." className="textarea-input h-80" />
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

        {result && (
          <div className="card bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Assessment Results</h2>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
            <div className="mb-8">
              <h3 className="text-xl font-bold text-yellow-600 mb-3">Missing Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {result.missingKeywords.map((k, i) => <span key={i} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">{k}</span>)}
              </div>
            </div>

            {/* Cover Letter */}
            <div className="border-t-2 border-gray-300 pt-8 mb-8">
              <h3 className="text-2xl font-bold text-indigo-600 mb-4">Generate Cover Letter</h3>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Tone:</label>
                <select value={coverLetterTone} onChange={(e) => setCoverLetterTone(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-lg">
                  <option value="professional">Professional</option>
                  <option value="enthusiastic">Enthusiastic</option>
                  <option value="creative">Creative</option>
                  <option value="formal">Formal</option>
                </select>
              </div>
              <button onClick={handleGenerateCoverLetter} disabled={generatingCoverLetter} className={`btn-primary ${generatingCoverLetter ? "opacity-50 cursor-not-allowed" : ""}`}>
                {generatingCoverLetter ? "Generating..." : "Generate Cover Letter"}
              </button>
              {coverLetter && (
                <div className="mt-6 bg-white rounded-lg p-6 shadow">
                  <h4 className="text-xl font-bold text-gray-800 mb-4">Your Cover Letter</h4>
                  <textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none h-64" />
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => navigator.clipboard.writeText(coverLetter)} className="btn-primary">Copy</button>
                    <button onClick={() => downloadAsText(coverLetter, "cover-letter.txt")} className="btn-secondary">Download</button>
                  </div>
                </div>
              )}
            </div>

            {/* Tailored Resume */}
            <div className="border-t-2 border-gray-300 pt-8 mb-8">
              <h3 className="text-2xl font-bold text-blue-600 mb-4">Optimize Resume for This Role</h3>
              <p className="text-gray-600 mb-4">Reorganize and highlight relevant skills to match this job (stays truthful)</p>
              <button onClick={handleGenerateTailoredResume} disabled={generatingTailoredResume} className={`btn-primary ${generatingTailoredResume ? "opacity-50 cursor-not-allowed" : ""}`}>
                {generatingTailoredResume ? "Optimizing..." : "Generate Tailored Resume"}
              </button>
              {tailoredResume && (
                <div className="mt-6 bg-white rounded-lg p-6 shadow">
                  <h4 className="text-xl font-bold text-gray-800 mb-4">Your Tailored Resume</h4>
                  <textarea value={tailoredResume} onChange={(e) => setTailoredResume(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none h-64" />
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => navigator.clipboard.writeText(tailoredResume)} className="btn-primary">Copy</button>
                    <button onClick={() => downloadAsText(tailoredResume, "tailored-resume.txt")} className="btn-secondary">Download</button>
                  </div>
                </div>
              )}
            </div>

            {/* LinkedIn Outreach */}
            <div className="border-t-2 border-gray-300 pt-8">
              <h3 className="text-2xl font-bold text-blue-600 mb-4">LinkedIn Outreach Message</h3>
              <p className="text-gray-600 mb-4">Personalized message to connect with hiring manager</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input type="text" placeholder="Recipient name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" />
                <input type="text" placeholder="Recipient role" value={recipientRole} onChange={(e) => setRecipientRole(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" />
              </div>
              <button onClick={handleGenerateLinkedIn} disabled={generatingLinkedIn} className={`btn-primary ${generatingLinkedIn ? "opacity-50 cursor-not-allowed" : ""}`}>
                {generatingLinkedIn ? "Generating..." : "Generate LinkedIn Message"}
              </button>
              {linkedInMessage && (
                <div className="mt-6 bg-white rounded-lg p-6 shadow">
                  <h4 className="text-xl font-bold text-gray-800 mb-4">Your LinkedIn Message</h4>
                  <textarea value={linkedInMessage} onChange={(e) => setLinkedInMessage(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none h-40" />
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => navigator.clipboard.writeText(linkedInMessage)} className="btn-primary">Copy</button>
                    <button onClick={() => downloadAsText(linkedInMessage, "linkedin-message.txt")} className="btn-secondary">Download</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
