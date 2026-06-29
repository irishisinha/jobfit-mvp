"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"

interface Assessment {
  id: string
  jobTitle: string
  company: string
  jobDescription: string
  verdict: string
  fitScore: number
  atsMatch: number
  successProbability: number
  tailorWorth: number
  strengths: string[]
  gaps: string[]
  missingKeywords: string[]
  status: string
  createdAt: string
  resumeId?: string
}

interface SavedResume {
  id: string
  name: string
  content: string
}

interface ApplicationQuestion {
  id: string
  question: string
  suggestedAnswer: string
  trustScore: number
  userAnswer?: string
  consistencyIssues?: string
}

interface RecommendedResume extends SavedResume {
  matchScore: number
  tailorWorth: number
  recommendation: string
}

export default function AssessmentDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [resumes, setResumes] = useState<SavedResume[]>([])
  const [selectedResume, setSelectedResume] = useState<SavedResume | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "tailor" | "cover" | "questions">("overview")
  const [tailoredResume, setTailoredResume] = useState("")
  const [coverLetter, setCoverLetter] = useState("")
  const [coverLetterTone, setCoverLetterTone] = useState<"professional" | "enthusiastic" | "warm">("professional")
  const [linkedInMessage, setLinkedInMessage] = useState("")
  const [appQuestions, setAppQuestions] = useState<ApplicationQuestion[]>([])
  const [generating, setGenerating] = useState(false)
  const [status_state, setStatusState] = useState("")
  const [recommendedResume, setRecommendedResume] = useState<RecommendedResume | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      loadAssessment()
      loadResumes()
    }
  }, [status, params.id])

  const getRecommendedResume = async () => {
    if (!assessment || resumes.length === 0) return
    try {
      const res = await fetch("/api/suggest-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: assessment.jobDescription,
          jobTitle: assessment.jobTitle,
          company: assessment.company,
          resumes
        })
      })
      if (res.ok) {
        const data = await res.json()
        const suggestions = data.suggestions || []
        const scored = resumes.map(r => {
          const match = suggestions.find((s: any) => s.id === r.id)
          return { ...r, matchScore: match?.score || 50, tailorWorth: match?.tailorWorth || 0, recommendation: match?.recommendation || "" }
        })
        const sorted = scored.sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0))
        if (sorted.length > 0) {
          setRecommendedResume(sorted[0])
          setSelectedResume(sorted[0])
        }
      }
    } catch (err) {
      console.error("Error getting resume recommendation:", err)
    }
  }

  useEffect(() => {
    if (assessment && resumes.length > 0 && !recommendedResume) {
      getRecommendedResume()
    }
  }, [assessment, resumes])

  const loadAssessment = async () => {
    try {
      const res = await fetch("/api/assessments")
      if (res.ok) {
        const data = await res.json()
        const found = data.find((a: any) => a.id === params.id)
        if (found) {
          setAssessment(found)
          setStatusState(found.status || "Saved")
        }
      }
    } catch (err) {
      console.error("Error loading assessment:", err)
    } finally {
      setLoading(false)
    }
  }

  const loadResumes = async () => {
    try {
      const res = await fetch("/api/resumes")
      if (res.ok) {
        const data = await res.json()
        setResumes(data || [])
        if (data.length > 0) setSelectedResume(data[0])
      }
    } catch (err) {
      console.error("Error loading resumes:", err)
    }
  }

  const handleGenerateTailoredResume = async () => {
    if (!selectedResume || !assessment) return
    setGenerating(true)
    try {
      const res = await fetch("/api/tailored-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeContent: selectedResume.content,
          jobDescription: assessment.jobDescription,
          jobTitle: assessment.jobTitle,
          company: assessment.company
        })
      })
      if (res.ok) {
        const data = await res.json()
        setTailoredResume(data.tailoredResume)
      }
    } catch (err) {
      console.error("Error generating tailored resume:", err)
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateCoverLetter = async () => {
    if (!selectedResume || !assessment) return
    setGenerating(true)
    try {
      const res = await fetch("/api/cover-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeContent: selectedResume.content,
          jobDescription: assessment.jobDescription,
          jobTitle: assessment.jobTitle,
          company: assessment.company,
          tone: coverLetterTone
        })
      })
      if (res.ok) {
        const data = await res.json()
        setCoverLetter(data.coverLetter)
      }
    } catch (err) {
      console.error("Error generating cover letter:", err)
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateAppQuestion = async (question: string) => {
    if (!selectedResume) return
    setGenerating(true)
    try {
      const res = await fetch("/api/application-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          resumes: [selectedResume]
        })
      })
      if (res.ok) {
        const data = await res.json()
        setAppQuestions([...appQuestions, data])
      }
    } catch (err) {
      console.error("Error generating answer:", err)
    } finally {
      setGenerating(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/assessments/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        setStatusState(newStatus)
      }
    } catch (err) {
      console.error("Error updating status:", err)
    }
  }

  if (status === "loading") {
    return <div className="p-8 text-center">Loading assessment...</div>
  }

  if (!session) {
    return null
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-8 text-center">Loading assessment...</div>
  }

  if (!assessment) {
    return <div className="min-h-screen bg-gray-50 p-8 text-center">Assessment not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="container-main py-4">
          <div className="flex justify-between items-center mb-4">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">← Back to Dashboard</Link>
            <button onClick={() => signOut()} className="text-gray-600 hover:text-gray-800">Sign Out</button>
          </div>
          <h1 className="text-3xl font-bold mb-2">{assessment.jobTitle}</h1>
          <p className="text-gray-600">{assessment.company}</p>
        </div>
      </div>

      <div className="container-main py-8">
        {/* Status Bar */}
        <div className="bg-white rounded-lg p-6 shadow mb-8">
          <p className="text-sm text-gray-600 mb-2">Application Status</p>
          <div className="flex gap-2 flex-wrap">
            {["Saved", "Applied", "In Progress", "Interviewed", "Offered", "Accepted", "Rejected"].map(s => (
              <button
                key={s}
                onClick={() => handleStatusUpdate(s)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  status_state === s
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">Assessed: {new Date(assessment.createdAt).toLocaleDateString()}</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="flex border-b">
            {["overview", "tailor", "cover", "questions"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-4 font-medium transition ${
                  activeTab === tab
                    ? "border-b-4 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {tab === "overview" && "Assessment"}
                {tab === "tailor" && "Tailored Resume"}
                {tab === "cover" && "Cover Letter"}
                {tab === "questions" && "Application Questions"}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 uppercase">Fit Score</p>
                    <p className="text-3xl font-bold text-blue-600">{assessment.fitScore}%</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 uppercase">ATS Match</p>
                    <p className="text-3xl font-bold text-purple-600">{assessment.atsMatch}%</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 uppercase">Success Probability</p>
                    <p className="text-3xl font-bold text-green-600">{assessment.successProbability}%</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 uppercase">Tailor Worth</p>
                    <p className="text-3xl font-bold text-orange-600">{assessment.tailorWorth}%</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-2">Verdict</h3>
                  <p className={`text-lg font-bold ${
                    assessment.verdict === "Strong Fit" ? "text-green-600" :
                    assessment.verdict === "Moderate Fit" ? "text-yellow-600" :
                    "text-red-600"
                  }`}>
                    {assessment.verdict}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-bold mb-3 text-green-700">Strengths</h3>
                    <ul className="space-y-2">
                      {assessment.strengths?.map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-green-600">✓</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-3 text-red-700">Gaps</h3>
                    <ul className="space-y-2">
                      {assessment.gaps?.map((g, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-red-600">✗</span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-3 text-yellow-700">Missing Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {assessment.missingKeywords?.map((k, i) => (
                      <span key={i} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold mb-2">Job Description</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{assessment.jobDescription.slice(0, 1000)}...</p>
                </div>
              </div>
            )}

            {/* Tailored Resume Tab */}
            {activeTab === "tailor" && (
              <div className="space-y-4">
                {recommendedResume && (
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
                    <p className="text-sm font-bold text-blue-900 mb-1">Recommended Resume</p>
                    <p className="text-2xl font-bold text-blue-600">{recommendedResume.name}</p>
                    <div className="flex gap-4 mt-2">
                      <span className="inline-block bg-blue-200 text-blue-800 px-3 py-1 rounded text-sm font-bold">Match: {recommendedResume.matchScore}%</span>
                      <span className="inline-block bg-orange-200 text-orange-800 px-3 py-1 rounded text-sm font-bold">Tailor Worth: {recommendedResume.tailorWorth}%</span>
                    </div>
                    {recommendedResume.recommendation && (
                      <p className="text-sm text-blue-700 mt-3">{recommendedResume.recommendation}</p>
                    )}
                  </div>
                )}

                {!recommendedResume && resumes.length > 0 && (
                  <div>
                    <label className="block text-sm font-bold mb-2">Select Resume</label>
                    <select
                      value={selectedResume?.id || ""}
                      onChange={(e) => setSelectedResume(resumes.find(r => r.id === e.target.value) || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      {resumes.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={handleGenerateTailoredResume}
                  disabled={generating || !selectedResume}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {generating ? "Generating..." : `Generate Tailored Resume${recommendedResume ? " (" + recommendedResume.name + ")" : ""}`}
                </button>
                {tailoredResume && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-bold mb-2">Tailored Resume</h3>
                    <p className="text-sm whitespace-pre-wrap">{tailoredResume}</p>
                  </div>
                )}
              </div>
            )}

            {/* Cover Letter Tab */}
            {activeTab === "cover" && (
              <div className="space-y-4">
                {recommendedResume && (
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600 mb-4">
                    <p className="text-sm font-bold text-blue-900">Using Recommended Resume</p>
                    <p className="text-lg font-bold text-blue-600">{recommendedResume.name}</p>
                    <p className="text-sm text-blue-700 mt-2">Match Score: {recommendedResume.matchScore}%</p>
                  </div>
                )}

                {!recommendedResume && resumes.length > 0 && (
                  <div>
                    <label className="block text-sm font-bold mb-2">Resume</label>
                    <select
                      value={selectedResume?.id || ""}
                      onChange={(e) => setSelectedResume(resumes.find(r => r.id === e.target.value) || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      {resumes.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold mb-2">Tone</label>
                  <select
                    value={coverLetterTone}
                    onChange={(e) => setCoverLetterTone(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="professional">Professional</option>
                    <option value="enthusiastic">Enthusiastic</option>
                    <option value="warm">Warm</option>
                  </select>
                </div>
                <button
                  onClick={handleGenerateCoverLetter}
                  disabled={generating || !selectedResume}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Generate Cover Letter"}
                </button>
                {coverLetter && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-bold mb-2">Cover Letter</h3>
                    <p className="text-sm whitespace-pre-wrap">{coverLetter}</p>
                  </div>
                )}
              </div>
            )}

            {/* Questions Tab */}
            {activeTab === "questions" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">Add application questions to get tailored answers based on your resume</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter a question..."
                    id="app-question-input"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById("app-question-input") as HTMLInputElement
                      if (input.value.trim()) {
                        handleGenerateAppQuestion(input.value)
                        input.value = ""
                      }
                    }}
                    disabled={generating}
                    className="btn-primary disabled:opacity-50"
                  >
                    {generating ? "..." : "Add"}
                  </button>
                </div>

                {appQuestions.map(q => (
                  <div key={q.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="font-bold mb-2">{q.question}</h4>
                    <div className="mb-3 p-3 bg-white rounded border-l-4 border-blue-600">
                      <p className="text-sm mb-2"><strong>Suggested Answer:</strong></p>
                      <p className="text-sm text-gray-700">{q.suggestedAnswer}</p>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="text-blue-600"><strong>Trust Score:</strong> {q.trustScore}%</span>
                      {q.userAnswer && <span className="text-green-600"><strong>Your Answer:</strong> Saved</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
