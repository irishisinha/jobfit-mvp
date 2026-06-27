"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"

interface SavedResume {
  id: string
  name: string
  content: string
  createdAt: string
  matchScore?: number
  tailorWorth?: number
  recommendation?: string
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
  const [inputMode, setInputMode] = useState<"paste" | "url">("paste")
  const [jobUrl, setJobUrl] = useState("")
  const [loadingUrl, setLoadingUrl] = useState(false)
  const [jobTitle, setJobTitle] = useState("")
  const [company, setCompany] = useState("")
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedResume, setSelectedResume] = useState<SavedResume | null>(null)
  const [allResumes, setAllResumes] = useState<SavedResume[]>([])
  const [step, setStep] = useState<"input" | "results">("input")
  const [extractedJobTitle, setExtractedJobTitle] = useState("")
  const [extractedCompany, setExtractedCompany] = useState("")
  const [coverLetter, setCoverLetter] = useState("")
  const [tailoredResume, setTailoredResume] = useState("")
  const [linkedInMessage, setLinkedInMessage] = useState("")
  const [gapQuestions, setGapQuestions] = useState<Array<{mentioned: string; canYouAdd: string}>>([])
  const [loadingGaps, setLoadingGaps] = useState(false)
    const [coverLetterLoading, setCoverLetterLoading] = useState(false)
  const [tailoredLoading, setTailoredLoading] = useState(false)
  const [linkedInLoading, setLinkedInLoading] = useState(false)

  const [coverLetterTone, setCoverLetterTone] = useState<"professional" | "enthusiastic" | "warm">("professional")

  const saveToLocalStorage = (assessment: any) => {
    try {
      const stored = localStorage.getItem("jobfit_assessments") || "[]"
      const assessments = JSON.parse(stored)
      assessments.unshift(assessment)
      localStorage.setItem("jobfit_assessments", JSON.stringify(assessments.slice(0, 100)))
    } catch (e) {
      console.error("LocalStorage save error:", e)
    }
  }

  
  useEffect(() => {
    // Regenerate cover letter when tone changes (if one already exists)
    if (coverLetter && selectedResume && jobDescription && result) {
      handleGenerateCoverLetter()
    }
  }, [coverLetterTone, selectedResume, jobDescription, result, coverLetter])

  useEffect(() => {
    if (status === "unauthenticated") router.push("/")
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return
    
    const loadResumes = async () => {
      try {
        const res = await fetch("/api/resumes")
        if (res.ok) {
          const data = await res.json()
          setSavedResumes(data || [])
        }
      } catch (e) {
        console.error("Error loading resumes:", e)
        try {
          const stored = localStorage.getItem("jobfit_resumes")
          if (stored) setSavedResumes(JSON.parse(stored))
        } catch (err) {
          console.error("Error loading from localStorage:", err)
        }
      }
    }
    loadResumes()
  }, [status])


  const handleFetchFromUrl = async () => {
    if (!jobUrl.trim()) {
      setError("Please enter a URL")
      return
    }
    setLoadingUrl(true)
    setError("")
    try {
      const res = await fetch("/api/fetch-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jobUrl }),
      })
      const data = await res.json()
      if (data.jobDescription) {
        setJobDescription(data.jobDescription)
        setInputMode("paste")
      } else {
        setError(data.error || "Failed to fetch URL")
      }
    } catch (err) {
      setError("Failed to fetch from URL")
    } finally {
      setLoadingUrl(false)
    }
  }
  const handleAnalyzeJob = async () => {
    if (!jobDescription.trim()) {
      setError("Please enter a job description")
      return
    }
    if (savedResumes.length === 0) {
      setError("Please save at least one resume first")
      return
    }

    setLoading(true)
    setError("")
    setStep("results")

    try {
      const extractRes = await fetch("/api/extract-job-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      })
      const extractData = await extractRes.json()
      const extractedTitle = extractData.jobTitle || "Job Position"
      const extractedCompany = extractData.company || "Company"
      setExtractedJobTitle(extractedTitle)
      setExtractedCompany(extractedCompany)

      const res = await fetch("/api/suggest-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, jobTitle: extractedTitle, company: extractedCompany, resumes: savedResumes }),
      })

      const data = await res.json()
      const suggestions = data.suggestions || []
      const scored = savedResumes.map(resume => {
        const match = suggestions.find((s: any) => s.id === resume.id)
        return { ...resume, matchScore: match?.score || 50, tailorWorth: match?.tailorWorth, recommendation: match?.recommendation }
      })

      const sorted = scored.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
      setAllResumes(sorted)

      const topResume = sorted[0]
      setSelectedResume(topResume)

      const assessRes = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: topResume.content, jobDescription, jobTitle: extractedTitle, company: extractedCompany, tone: coverLetterTone }),
      })

      if (!assessRes.ok) throw new Error("Assessment failed")
      const assessData = await assessRes.json()
      setResult(assessData)

      // Fetch gap questions for resume enhancement
      try {
        setLoadingGaps(true)
        const gapsRes = await fetch("/api/resume-gaps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resume: topResume.content,
            jobDescription,
          }),
        })
        const gapsData = await gapsRes.json()
        setGapQuestions(gapsData.gaps || [])
      } catch (e) {
        console.error("Gap questions error:", e)
        setGapQuestions([])
      } finally {
        setLoadingGaps(false)
      }
      
       try {
        const saveRes = await fetch("/api/assessments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobTitle: extractedTitle,
            company: extractedCompany,
            jobDescription,
            verdict: assessData.verdict,
            fitScore: assessData.fitScore,
            atsMatch: assessData.atsMatch,
            successProbability: assessData.successProbability,
            tailorWorth: assessData.tailorWorth,
            strengths: assessData.strengths,
            gaps: assessData.gaps,
            missingKeywords: assessData.missingKeywords,
            resumeId: topResume.id,
            selectedResume: topResume.name,
          }),
        })
        if (!saveRes.ok) {
          const errData = await saveRes.json()
          console.error("Assessment save error:", errData)
        } else {
          console.log("Assessment saved successfully")
        }
      } catch (err) {
        console.error("Assessment save failed:", err)
      }
      saveToLocalStorage({ id: Date.now().toString(), jobTitle: extractedTitle, company: extractedCompany, jobDescription, verdict: assessData.verdict, fitScore: assessData.fitScore, atsMatch: assessData.atsMatch, successProbability: assessData.successProbability, tailorWorth: assessData.tailorWorth, strengths: assessData.strengths, gaps: assessData.gaps, missingKeywords: assessData.missingKeywords, resumeId: topResume.id,
            selectedResume: topResume.name, status: "not-applied", createdAt: new Date().toISOString() })
    } catch (err) {
      setError("Failed to analyze job and resumes")
      setStep("input")
    } finally {
      setLoading(false)
    }
  }

  const handleSelectDifferentResume = async (resume: SavedResume) => {
    setSelectedResume(resume)
    setResult(null)
    setCoverLetter("")
    setTailoredResume("")
    setLinkedInMessage("")
    setLoading(true)

    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: resume.content, jobDescription, jobTitle, company , tone: coverLetterTone,
        }),
      })
      if (!res.ok) throw new Error("Assessment failed")
      const data = await res.json()
      setResult(data)
      
       try {
        const saveRes = await fetch("/api/assessments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobTitle: extractedJobTitle,
            company: extractedCompany,
            jobDescription,
            verdict: data.verdict,
            fitScore: data.fitScore,
            atsMatch: data.atsMatch,
            successProbability: data.successProbability,
            tailorWorth: data.tailorWorth,
            strengths: data.strengths,
            gaps: data.gaps,
            missingKeywords: data.missingKeywords,
            resumeId: resume.id,
            selectedResume: resume.name,
          }),
        })
        if (!saveRes.ok) {
          const errData = await saveRes.json()
          console.error("Assessment save error:", errData)
        } else {
          console.log("Assessment saved successfully")
        }
      } catch (err) {
        console.error("Assessment save failed:", err)
      }
      saveToLocalStorage({ id: Date.now().toString(), jobTitle: extractedJobTitle, company: extractedCompany, jobDescription, verdict: data.verdict, fitScore: data.fitScore, atsMatch: data.atsMatch, successProbability: data.successProbability, tailorWorth: data.tailorWorth, strengths: data.strengths, gaps: data.gaps, missingKeywords: data.missingKeywords, resumeId: resume.id,
            selectedResume: resume.name, status: "not-applied", createdAt: new Date().toISOString() })
    } catch (err) {
      setError("Failed to assess this resume")
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
        body: JSON.stringify({ resume: selectedResume.content, jobDescription, jobTitle, company, strengths: result.strengths, gaps: result.gaps, missingKeywords: result.missingKeywords , tone: coverLetterTone,
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
      // Store data for tailor page
      const tailorData = {
        resume: selectedResume.content,
        jobDescription,
        jobTitle,
        company,
        gaps: result.gaps || [],
        missingKeywords: result.missingKeywords || [],
        originalAtsMatch: result.atsMatch
      }
      sessionStorage.setItem("tailorData", JSON.stringify(tailorData))
      
      // Navigate to tailor page
      router.push("/tailor")
    } catch (err) {
      console.error("Error navigating to tailor:", err)
    }
  }

    const handleGenerateLinkedIn = async () => {
    if (!result || !selectedResume) return
    try {
      const res = await fetch("/api/linkedin-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: selectedResume.content, jobDescription, jobTitle, company , tone: coverLetterTone,
        }),
      })
      const data = await res.json()
      setLinkedInMessage(data.linkedInMessage || "Failed to generate")
    } catch (err) {
      setLinkedInMessage("Failed to generate")
    }
  }

  if (status === "loading") return <div className="p-8 text-center"><p>Loading assessment...</p></div>
  if (status === "unauthenticated") return <div className="p-8 text-center"><p>Please sign in</p></div>
  if (!session) return <div className="p-8 text-center"><p>Initializing...</p></div>

  
  const downloadDocx = async (content: string, filename: string) => {
    try {
      const res = await fetch("/api/generate-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, title: filename })
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${filename}.docx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error("Download error:", err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow mb-8">
        <div className="container-main py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">JobFit Assessment</h1>
          <div className="flex gap-3">
            <Link href="/resumes" className="btn-secondary">Resumes</Link>
            <Link href="/dashboard" className="btn-secondary">Dashboard</Link>
            <Link href="/linkedin-optimizer" className="btn-secondary">LinkedIn</Link>
            <Link href="/consistency-checker" className="btn-secondary">Checker ({savedResumes.length})</Link>
            <button onClick={() => signOut()} className="btn-secondary">Sign Out</button>
          </div>
        </div>
      </div>

      <div className="container-main py-8">
        {step === "input" && (
          <div className="bg-white rounded-lg p-8 shadow max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Analyze a Job</h2>
            <div className="mb-6">
              <div className="flex gap-2 mb-4">
                <button onClick={() => setInputMode("paste")} className={`px-4 py-2 rounded-lg font-bold ${inputMode === "paste" ? "bg-blue-600 text-white" : "bg-gray-200"}`}>Paste JD</button>
                <button onClick={() => setInputMode("url")} className={`px-4 py-2 rounded-lg font-bold ${inputMode === "url" ? "bg-blue-600 text-white" : "bg-gray-200"}`}>Fetch from URL</button>
              </div>
              
              {inputMode === "paste" ? (
                <div>
                  <label className="block text-sm font-bold mb-2">Job Description</label>
                  <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the job description..." className="w-full h-48 px-4 py-3 border-2 border-gray-300 rounded-lg font-mono text-sm" />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-bold mb-2">Job URL</label>
                  <div className="flex gap-2">
                    <input type="url" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} placeholder="https://example.com/job-listing" className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg" />
                    <button onClick={handleFetchFromUrl} disabled={loadingUrl || !jobUrl.trim()} className={`px-6 py-3 rounded-lg font-bold text-white ${loadingUrl ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}>
                      {loadingUrl ? "Fetching..." : "Fetch"}
                    </button>
                  </div>
                </div>
              )}
            </div>
            {error && <div className="bg-red-100 border-2 border-red-500 text-red-800 p-4 rounded-lg mb-4">{error}</div>}
            <button onClick={handleAnalyzeJob} disabled={loading || !jobDescription.trim() || savedResumes.length === 0} className={`w-full px-6 py-3 rounded-lg font-bold text-white text-lg ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
              {loading ? "Analyzing..." : "Analyze & Get Recommendation"}
            </button>
          </div>
        )}

        {step === "results" && result && selectedResume && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border-2 border-green-500 shadow-lg">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white bg-opacity-70 rounded-lg p-3">
                  <p className="text-xs font-bold text-green-700 uppercase mb-1">Position</p>
                  <p className="text-lg font-bold text-gray-800">{extractedJobTitle}</p>
                </div>
                <div className="bg-white bg-opacity-70 rounded-lg p-3">
                  <p className="text-xs font-bold text-green-700 uppercase mb-1">Company</p>
                  <p className="text-lg font-bold text-gray-800">{extractedCompany}</p>
                </div>
              </div>

              <div className="bg-white bg-opacity-70 rounded-lg p-3 mb-4">
                <p className="text-xs font-bold text-green-700 uppercase mb-1">Selected Resume</p>
                <p className="text-lg font-semibold text-gray-800">{selectedResume.name}</p>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-white rounded p-2">
                  <p className="text-xs text-gray-600">Fit Score</p>
                  <p className="text-xl font-bold text-blue-600">{result.fitScore}%</p>
                </div>
                <div className="bg-white rounded p-2">
                  <p className="text-xs text-gray-600">ATS Match</p>
                  <p className="text-xl font-bold text-indigo-600">{result.atsMatch}%</p>
                </div>
                <div className="bg-white rounded p-2">
                  <p className="text-xs text-gray-600">Success Rate</p>
                  <p className="text-xl font-bold text-purple-600">{result.successProbability}%</p>
                </div>
                <div className={`rounded p-2 ${result.tailorWorth < 5 ? "bg-green-100" : result.tailorWorth < 20 ? "bg-yellow-100" : "bg-orange-100"}`}>
                  <p className="text-xs text-gray-600">Tailor Worth</p>
                  <p className={`text-xl font-bold ${result.tailorWorth < 5 ? "text-green-600" : result.tailorWorth < 20 ? "text-yellow-600" : "text-orange-600"}`}>{result.tailorWorth}%</p>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-green-300">
                {result.fitScore >= 75 ? (
                  <div className="bg-green-100 rounded-lg p-3 mb-3">
                    <p className="text-sm font-bold text-green-800">âœ“ APPLY: Strong match with your qualifications</p>
                  </div>
                ) : result.fitScore >= 50 ? (
                  <div className="bg-yellow-100 rounded-lg p-3 mb-3">
                    <p className="text-sm font-bold text-yellow-800">âš¡ APPLY WITH TAILORING: Moderate match - optimize your materials</p>
                  </div>
                ) : (
                  <div className="bg-red-100 rounded-lg p-3 mb-3">
                    <p className="text-sm font-bold text-red-800">âŒ RISKY: Weak match - significant skill gaps</p>
                  </div>
                )}
              </div>


            </div>

            <div className="bg-white rounded-lg p-8 shadow">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-green-600 mb-3">Strengths</h3>
                  <ul className="space-y-2">
                    {(result.strengths || []).map((s, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-green-600 mr-2">âœ“</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-600 mb-3">Gaps to Address</h3>
                  <ul className="space-y-2">
                    {(result.gaps || []).map((g, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-red-600 mr-2">â€”Â '</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
              {gapQuestions.length > 0 && (
                <div className="mb-6 border-t pt-6">
                  <h3 className="text-lg font-bold text-blue-600 mb-3">📝 Enhance Your Resume</h3>
                  <div className="space-y-3">
                    {gapQuestions.map((q, i) => (
                      <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="font-semibold text-sm text-blue-900 mb-2">You mentioned: <em>{q.mentioned}</em></p>
                        <p className="text-sm text-blue-800"><strong>Can you add:</strong> {q.canYouAdd}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
                <h3 className="text-lg font-bold text-yellow-600 mb-3">Keywords to Emphasize</h3>
                <div className="flex flex-wrap gap-2">
                  {(result.missingKeywords || []).map((k, i) => (
                    <span key={i} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">{k}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="text-lg font-bold text-blue-600 mb-4">📋 Cover Letter</h3>
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setCoverLetterTone("professional")} className={`px-3 py-1 rounded text-sm ${coverLetterTone === "professional" ? "bg-blue-600 text-white" : "bg-gray-200"}`}>Professional</button>
                  <button onClick={() => setCoverLetterTone("enthusiastic")} className={`px-3 py-1 rounded text-sm ${coverLetterTone === "enthusiastic" ? "bg-blue-600 text-white" : "bg-gray-200"}`}>Enthusiastic</button>
                  <button onClick={() => setCoverLetterTone("warm")} className={`px-3 py-1 rounded text-sm ${coverLetterTone === "warm" ? "bg-blue-600 text-white" : "bg-gray-200"}`}>Warm</button>
                </div>
                {coverLetterLoading ? (
                  <div className="flex flex-col items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                    <p className="text-sm text-gray-600">Generating cover letter...</p>
                  </div>
                ) : coverLetter ? (
                  <div className="space-y-2">
                    <textarea value={coverLetter} readOnly className="w-full h-48 px-4 py-3 border-2 border-gray-300 rounded-lg text-xs font-mono" />
                    <button onClick={() => downloadDocx(coverLetter, "Cover-Letter")} className="w-full btn-primary">â¬‡ï¸ Download</button>
                  </div>
                ) : (
                  <button onClick={handleGenerateCoverLetter} className="w-full btn-primary">Generate</button>
                )}
              </div>

              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="text-lg font-bold text-green-600 mb-4">✏️ Tailored Resume</h3>
                {tailoredLoading ? (
                  <div className="flex flex-col items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-3"></div>
                    <p className="text-sm text-gray-600">Generating tailored resume...</p>
                  </div>
                ) : tailoredResume ? (
                  <div className="space-y-2">
                    <textarea value={tailoredResume} readOnly className="w-full h-48 px-4 py-3 border-2 border-gray-300 rounded-lg text-xs font-mono" />
                    <button onClick={() => downloadDocx(tailoredResume, "Tailored-Resume")} className="w-full btn-primary">â¬‡ï¸ Download</button>
                  </div>
                ) : (
                  <button onClick={handleGenerateTailoredResume} disabled={result.tailorWorth < 5} className={`w-full ${result.tailorWorth < 5 ? "opacity-50 cursor-not-allowed btn-secondary" : "btn-primary"}`}>
                <h3 className="text-lg font-bold text-green-600 mb-4">✏️ Tailored Resume</h3>
                  </button>
                )}
              </div>

              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="text-lg font-bold text-purple-600 mb-4">✉️ LinkedIn Outreach</h3>
                {linkedInMessage ? (
                  <div className="space-y-2">
                    <textarea value={linkedInMessage} readOnly className="w-full h-48 px-4 py-3 border-2 border-gray-300 rounded-lg text-xs font-mono" />
                    <button onClick={() => downloadDocx(linkedInMessage, "LinkedIn-Outreach")} className="w-full btn-primary">â¬‡ï¸ Download</button>
                  </div>
                ) : (
                  <button onClick={handleGenerateLinkedIn} className="w-full btn-primary">Generate</button>
                )}
              </div>
            </div>

            {allResumes.length > 1 && (
              <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
                <h3 className="text-lg font-bold text-gray-700 mb-4">Try Other Resumes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {allResumes.slice(1).map((resume) => (
                    <button key={resume.id} onClick={() => handleSelectDifferentResume(resume)} className="text-left p-3 rounded-lg border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition">
                      <p className="font-bold text-gray-800">{resume.name}</p>
                      <p className="text-sm text-gray-600">Match: {resume.matchScore}%</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => setStep("input")} className="w-full btn-secondary py-3 text-lg font-bold">Analyze Another Job</button>
          </div>
        )}
      </div>
    </div>
  )
}






















