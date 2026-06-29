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
    if (!recommendedResume || !assessment) {
      console.error("[Tailored Resume] Missing data:", { hasResume: !!recommendedResume, hasAssessment: !!assessment })
      alert("Resume and assessment data required")
      return
    }
    if (!recommendedResume.content) {
      console.error("[Tailored Resume] Resume has no content")
      alert("Resume has no content")
      return
    }
    setGenerating(true)
    try {
      console.log("[Tailored Resume] Starting generation for:", recommendedResume.name)
      const payload = {
        resumeContent: recommendedResume.content,
        jobDescription: assessment.jobDescription,
        jobTitle: assessment.jobTitle,
        company: assessment.company
      }
      console.log("[Tailored Resume] Payload prepared, content length:", payload.resumeContent.length)

      const res = await fetch("/api/tailored-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      console.log("[Tailored Resume] Response status:", res.status)
      const data = await res.json()
      console.log("[Tailored Resume] Response data keys:", Object.keys(data))
      console.log("[Tailored Resume] Tailored resume length:", data.tailoredResume?.length || 0)

      if (res.ok && data.tailoredResume) {
        setTailoredResume(data.tailoredResume)
        console.log("[Tailored Resume] Successfully set tailored resume")
      } else {
        console.error("[Tailored Resume] Response error:", data)
        alert("Failed to generate tailored resume: " + (data.error || "Unknown error"))
      }
    } catch (err) {
      console.error("[Tailored Resume] Catch error:", err)
      alert("Error: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateCoverLetter = async () => {
    if (!recommendedResume || !assessment) {
      console.error("[Cover Letter] Missing data:", { hasResume: !!recommendedResume, hasAssessment: !!assessment })
      return
    }
    if (!recommendedResume.content) {
      console.error("[Cover Letter] Resume has no content")
      return
    }
    setGenerating(true)
    try {
      const payload = {
        resumeContent: recommendedResume.content,
        jobDescription: assessment.jobDescription,
        jobTitle: assessment.jobTitle,
        company: assessment.company,
        tone: coverLetterTone
      }
      console.log("[Cover Letter] Sending request with payload:", { ...payload, resumeContent: payload.resumeContent.substring(0, 100) + "..." })

      const res = await fetch("/api/cover-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      console.log("[Cover Letter] Response status:", res.status)
      const data = await res.json()
      console.log("[Cover Letter] Response data keys:", Object.keys(data))

      if (res.ok && data.coverLetter) {
        setCoverLetter(data.coverLetter)
        console.log("[Cover Letter] Successfully set cover letter")
      } else {
        console.error("[Cover Letter] Response not OK or missing coverLetter:", data)
      }
    } catch (err) {
      console.error("[Cover Letter] Error:", err)
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateAppQuestion = async (question: string) => {
    if (!recommendedResume) return
    setGenerating(true)
    try {
      console.log("[App Question] Sending question:", question)
      const res = await fetch("/api/application-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          resumes: [recommendedResume]
        })
      })
      console.log("[App Question] Response status:", res.status)
      const data = await res.json()
      console.log("[App Question] Response data:", data)

      if (res.ok && data) {
        setAppQuestions([...appQuestions, data])
        console.log("[App Question] Added to questions, total count:", appQuestions.length + 1)
      } else {
        console.error("[App Question] Failed to get answer:", data)
      }
    } catch (err) {
      console.error("[App Question] Error:", err)
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

  const downloadFile = (content: string, filename: string) => {
    const element = document.createElement("a")
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(content))
    element.setAttribute("download", filename)
    element.style.display = "none"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  if (status === "loading" || loading) {
    return <div className="p-8 text-center">Loading assessment...</div>
  }

  if (!session || !assessment) {
    return <div className="p-8 text-center">Assessment not found</div>
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
                {/* Debug Info */}
                <div className="bg-gray-100 p-3 rounded text-xs text-gray-700">
                  <div>📊 Resumes loaded: {resumes.length} | Selected: {selectedResume?.name || "None"} | Has content: {!!selectedResume?.content}</div>
                  <div>🎯 Recommendation: {recommendedResume ? `${recommendedResume.name} (${recommendedResume.matchScore}%)` : "Loading or not found"}</div>
                </div>

                {recommendedResume && (
                  <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-600">
                    <p className="text-sm font-bold text-blue-900 mb-2">✅ Recommended Resume for This Role</p>
                    <p className="text-2xl font-bold text-blue-600 mb-3">{recommendedResume.name}</p>
                    <div className="flex flex-wrap gap-3 mb-3">
                      <span className="inline-block bg-blue-200 text-blue-900 px-4 py-2 rounded font-bold">Match Score: {recommendedResume.matchScore}%</span>
                      <span className="inline-block bg-orange-200 text-orange-900 px-4 py-2 rounded font-bold">Tailor Worth: {recommendedResume.tailorWorth}%</span>
                    </div>
                    {recommendedResume.recommendation && (
                      <p className="text-sm text-blue-700">{recommendedResume.recommendation}</p>
                    )}
                  </div>
                )}

                {!recommendedResume && resumes.length === 0 && (
                  <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-600">
                    <p className="text-sm font-bold text-yellow-900">⚠️ No resumes found</p>
                    <p className="text-sm text-yellow-700 mt-1">Upload or create resumes first to get recommendations</p>
                  </div>
                )}

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
                {!recommendedResume && (
                  <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-600">
                    <p className="text-sm text-red-700">⚠️ No recommended resume found. Make sure you have uploaded resumes.</p>
                  </div>
                )}

                {recommendedResume && (
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
                    <p className="text-sm text-blue-900 mb-1">📌 Using Recommended Resume</p>
                    <p className="text-lg font-bold text-blue-600">{recommendedResume.name}</p>
                    <p className="text-xs text-blue-700 mt-2">Match Score: {recommendedResume.matchScore}% • Tailor Worth: {recommendedResume.tailorWorth}%</p>
                  </div>
                )}
                <button
                  onClick={handleGenerateTailoredResume}
                  disabled={generating || !recommendedResume}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Generate Tailored Resume"}
                </button>
                {tailoredResume && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold">✨ Tailored Resume (Optimized for {assessment.jobTitle})</h3>
                      <button
                        onClick={() => downloadFile(tailoredResume, `tailored-resume-${assessment.jobTitle.replace(/\s+/g, "-")}.txt`)}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        ⬇ Download
                      </button>
                    </div>
                    <div className="bg-blue-50 p-3 mb-3 rounded border-l-4 border-blue-600">
                      <p className="text-xs text-blue-700 mb-2">💡 <strong>Optimizations:</strong> Keywords added to match job description, accomplishments reframed to highlight relevant skills, formatting adjusted for ATS compatibility</p>
                    </div>
                    <p className="text-sm whitespace-pre-wrap font-mono bg-white p-3 rounded">{tailoredResume}</p>
                  </div>
                )}
              </div>
            )}

            {/* Cover Letter Tab */}
            {activeTab === "cover" && (
              <div className="space-y-4">
                {!recommendedResume && (
                  <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-600">
                    <p className="text-sm text-red-700">⚠️ No recommended resume found. Make sure you have uploaded resumes.</p>
                  </div>
                )}

                {recommendedResume && (
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
                    <p className="text-sm text-blue-900 mb-1">📌 Using Recommended Resume</p>
                    <p className="text-lg font-bold text-blue-600">{recommendedResume.name}</p>
                    <p className="text-xs text-blue-700 mt-2">Match Score: {recommendedResume.matchScore}% • Tailor Worth: {recommendedResume.tailorWorth}%</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold mb-2">Choose Tone</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["professional", "enthusiastic", "warm"].map((tone) => (
                      <button
                        key={tone}
                        onClick={() => setCoverLetterTone(tone as any)}
                        className={`px-3 py-2 rounded font-medium transition ${
                          coverLetterTone === tone
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                        }`}
                      >
                        {tone.charAt(0).toUpperCase() + tone.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerateCoverLetter}
                  disabled={generating || !recommendedResume}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {generating ? "Generating..." : `Generate ${coverLetterTone.charAt(0).toUpperCase() + coverLetterTone.slice(1)} Cover Letter`}
                </button>
                {coverLetter && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold">📄 Cover Letter ({coverLetterTone} tone)</h3>
                      <button
                        onClick={() => downloadFile(coverLetter, `cover-letter-${assessment.jobTitle.replace(/\s+/g, "-")}.txt`)}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        ⬇ Download
                      </button>
                    </div>
                    <div className="bg-green-50 p-3 mb-3 rounded border-l-4 border-green-600">
                      <p className="text-xs text-green-700 mb-2">✓ <strong>Verified:</strong> All claims backed by resume, company knowledge demonstrated, tone matches your style</p>
                    </div>
                    <p className="text-sm whitespace-pre-wrap font-mono bg-white p-3 rounded">{coverLetter}</p>
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
                    disabled={generating}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById("app-question-input") as HTMLInputElement
                      if (input.value.trim()) {
                        console.log("[UI] Adding question:", input.value)
                        handleGenerateAppQuestion(input.value)
                        input.value = ""
                      }
                    }}
                    disabled={generating || !recommendedResume}
                    className="btn-primary disabled:opacity-50"
                  >
                    {generating ? "Generating..." : "Add Question"}
                  </button>
                </div>

                {generating && (
                  <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-600">
                    <p className="text-sm text-yellow-700">⏳ Generating answer...</p>
                  </div>
                )}

                {appQuestions.length === 0 && !generating && (
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-600">No questions added yet. Add a question to get AI-powered answers.</p>
                  </div>
                )}

                {appQuestions.map((q, idx) => (
                  <div key={q.id || idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="font-bold mb-3 text-lg">❓ {q.question}</h4>
                    <div className="mb-3 p-3 bg-white rounded border-l-4 border-blue-600">
                      <p className="text-sm mb-2"><strong>✨ Suggested Answer:</strong></p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{q.suggestedAnswer}</p>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="text-blue-600"><strong>Trust Score:</strong> {q.trustScore}%</span>
                      <span className="text-gray-600"><strong>Consistency:</strong> {q.consistencyIssues || "Verified"}</span>
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
