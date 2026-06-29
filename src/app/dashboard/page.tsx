"use client"


import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"

interface Assessment {
  id: string
  jobTitle: string
  company: string
  verdict: string
  fitScore: number
  atsMatch: number
  successProbability: number
  tailorWorth: number
  createdAt: string
  strengths: string[]
  gaps: string[]
  missingKeywords: string[]
  jobDescription: string
  status: string
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterVerdict, setFilterVerdict] = useState("all")
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") loadAssessments()
  }, [status])

  const loadAssessments = async () => {
    try {
      const res = await fetch("/api/assessments")
      if (res.ok) {
        const data = await res.json()
        setAssessments(data || [])
      }
    } catch (err) {
      console.error("Error loading:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedAssessment) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/assessments/${selectedAssessment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        const updated = await res.json()
        setSelectedAssessment(updated)
        await loadAssessments()
      }
    } catch (err) {
      console.error("Error updating status:", err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const filtered = assessments.filter(a => {
    const search = a.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) || a.company?.toLowerCase().includes(searchTerm.toLowerCase())
    const verdict = filterVerdict === "all" || a.verdict === filterVerdict
    return search && verdict
  })

  const stats = {
    total: assessments.length,
    avg: assessments.length > 0 ? Math.round(assessments.reduce((sum, a) => sum + a.fitScore, 0) / assessments.length) : 0,
    strong: assessments.filter(a => a.fitScore >= 75).length,
    moderate: assessments.filter(a => a.fitScore >= 50 && a.fitScore < 75).length,
  }

  if (status === "loading") return <div className="p-8">Loading...</div>
  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow mb-8">
        <div className="container-main py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Assessment History</h1>
            <p className="text-gray-600">All your job assessments</p>
          </div>
          <div className="flex gap-3">
            <Link href="/assessment" className="btn-primary">New Assessment</Link>
            <Link href="/resumes" className="btn-secondary">Resumes</Link>
            <Link href="/linkedin-optimizer" className="btn-secondary">LinkedIn</Link>
            <Link href="/consistency-checker" className="btn-secondary">Checker</Link>
            <button onClick={() => signOut()} className="btn-secondary">Sign Out</button>
          </div>
        </div>
      </div>

      <div className="container-main py-8">
        {assessments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg p-6 shadow">
              <p className="text-gray-600 text-sm">Total</p>
              <p className="text-4xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow">
              <p className="text-gray-600 text-sm">Avg Fit</p>
              <p className="text-4xl font-bold text-blue-600">{stats.avg}%</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow">
              <p className="text-gray-600 text-sm">Strong (—°¥75%)</p>
              <p className="text-4xl font-bold text-green-600">{stats.strong}</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow">
              <p className="text-gray-600 text-sm">Moderate (50-75%)</p>
              <p className="text-4xl font-bold text-yellow-600">{stats.moderate}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg p-6 shadow mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Search by job or company..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-lg" />
            <select value={filterVerdict} onChange={(e) => setFilterVerdict(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-lg">
              <option value="all">All Verdicts</option>
              <option value="Strong Fit">Strong Fit</option>
              <option value="Moderate Fit">Moderate Fit</option>
              <option value="Weak Fit">Weak Fit</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-600">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg p-12 shadow text-center">
            <p className="text-gray-600 mb-4">No assessments yet</p>
            <Link href="/assessment" className="btn-primary">Start Assessment</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((a) => (
              <div key={a.id} className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition cursor-pointer" onClick={() => setSelectedAssessment(a)}>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-bold">Position</p>
                    <p className="text-lg font-bold text-gray-800">{a.jobTitle}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-bold">Company</p>
                    <p className="text-lg font-bold text-gray-800">{a.company}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-bold">Date</p>
                    <p className="text-lg font-semibold">{new Date(a.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-bold">Fit Score</p>
                    <p className="text-2xl font-bold text-blue-600">{a.fitScore}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-bold">Verdict</p>
                    <p className={`text-lg font-bold ${a.verdict === "Strong Fit" ? "text-green-600" : a.verdict === "Moderate Fit" ? "text-yellow-600" : "text-red-600"}`}>
                      {a.verdict}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="bg-blue-50 p-2 rounded"><p className="text-xs text-gray-600">ATS</p><p className="font-bold text-blue-600">{a.atsMatch}%</p></div>
                  <div className="bg-purple-50 p-2 rounded"><p className="text-xs text-gray-600">Success</p><p className="font-bold text-purple-600">{a.successProbability}%</p></div>
                  <div className="bg-orange-50 p-2 rounded"><p className="text-xs text-gray-600">Tailor</p><p className="font-bold text-orange-600">{a.tailorWorth}%</p></div>
                  <div className="bg-green-50 p-2 rounded"><p className="text-xs text-gray-600">Strengths</p><p className="font-bold">{a.strengths?.length || 0}</p></div>
                </div>

                {a.strengths && a.strengths.length > 0 && <p className="text-sm text-green-700 mb-2"><strong>Strengths:</strong> {a.strengths.slice(0, 2).join(", ")}{a.strengths.length > 2 ? "..." : ""}</p>}
                {a.gaps && a.gaps.length > 0 && <p className="text-sm text-red-700"><strong>Gaps:</strong> {a.gaps.slice(0, 2).join(", ")}{a.gaps.length > 2 ? "..." : ""}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">{selectedAssessment.jobTitle}</h2>
                <p className="text-gray-600">{selectedAssessment.company}</p>
              </div>
              <button onClick={() => setSelectedAssessment(null)} className="text-2xl text-gray-400 hover:text-gray-600">
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-600 uppercase font-bold">Fit Score</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedAssessment.fitScore}%</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-600 uppercase font-bold">ATS Match</p>
                  <p className="text-2xl font-bold text-purple-600">{selectedAssessment.atsMatch}%</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-600 uppercase font-bold">Success</p>
                  <p className="text-2xl font-bold text-green-600">{selectedAssessment.successProbability}%</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-600 uppercase font-bold">Tailor</p>
                  <p className="text-2xl font-bold text-orange-600">{selectedAssessment.tailorWorth}%</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 uppercase font-bold mb-2">Verdict</p>
                <p className={`text-lg font-bold ${selectedAssessment.verdict === "Strong Fit" ? "text-green-600" : selectedAssessment.verdict === "Moderate Fit" ? "text-yellow-600" : "text-red-600"}`}>
                  {selectedAssessment.verdict}
                </p>
              </div>

              {selectedAssessment.strengths && selectedAssessment.strengths.length > 0 && (
                <div>
                  <h3 className="font-bold text-green-700 mb-2">✓ Strengths</h3>
                  <ul className="space-y-1">
                    {selectedAssessment.strengths.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-gray-700">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAssessment.gaps && selectedAssessment.gaps.length > 0 && (
                <div>
                  <h3 className="font-bold text-red-700 mb-2">⚠ Gaps</h3>
                  <ul className="space-y-1">
                    {selectedAssessment.gaps.map((g: string, i: number) => (
                      <li key={i} className="text-sm text-gray-700">• {g}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAssessment.missingKeywords && selectedAssessment.missingKeywords.length > 0 && (
                <div>
                  <h3 className="font-bold text-yellow-700 mb-2">Missing Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAssessment.missingKeywords.map((k: string, i: number) => (
                      <span key={i} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="font-bold mb-3">Application Status</h3>
                <div className="flex gap-2 flex-wrap">
                  {["Saved", "Applied", "In Progress", "Interviewed", "Rejected", "Offered", "Accepted"].map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusUpdate(status)}
                      disabled={updatingStatus}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${
                        selectedAssessment.status === status
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                      } ${updatingStatus ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 uppercase font-bold mb-2">Assessment Date</p>
                <p className="text-sm text-gray-700">{new Date(selectedAssessment.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


