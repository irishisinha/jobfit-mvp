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
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterVerdict, setFilterVerdict] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    const loadAssessments = async () => {
      try {
        const res = await fetch("/api/assessments")
        if (res.ok) {
          const data = await res.json()
          setAssessments(data)
        }
      } catch (err) {
        console.error("Failed to load assessments:", err)
      } finally {
        setLoading(false)
      }
    }

    if (status === "authenticated") {
      loadAssessments()
    }
  }, [status])

  const filteredAssessments = assessments.filter((a) => {
    const matchesSearch =
      a.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.company.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesVerdict = !filterVerdict || a.verdict === filterVerdict
    return matchesSearch && matchesVerdict
  })

  const stats = {
    total: assessments.length,
    avgFitScore: assessments.length > 0
      ? (assessments.reduce((sum, a) => sum + a.fitScore / 10, 0) / assessments.length).toFixed(1)
      : "0",
    strongFits: assessments.filter((a) => a.verdict === "Strong Fit").length,
    moderateFits: assessments.filter((a) => a.verdict === "Moderate Fit").length,
    avgTailorWorth: assessments.length > 0
      ? Math.round(assessments.reduce((sum, a) => sum + a.tailorWorth, 0) / assessments.length)
      : 0,
  }

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow">
        <div className="container-main py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Assessment Dashboard</h1>
              <p className="text-gray-600">Your job fit analysis history & insights</p>
            </div>
            <div className="flex gap-3">
              <Link href="/assessment" className="btn-primary">New Assessment</Link>
              <Link href="/resumes" className="btn-secondary">My Resumes</Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-secondary">Sign Out</button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-main py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 shadow">
            <p className="text-gray-600 text-sm mb-2">Total Assessments</p>
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow">
            <p className="text-gray-600 text-sm mb-2">Avg Fit Score</p>
            <p className="text-3xl font-bold text-indigo-600">{stats.avgFitScore}/10</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow">
            <p className="text-gray-600 text-sm mb-2">Strong Fits</p>
            <p className="text-3xl font-bold text-green-600">{stats.strongFits}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow">
            <p className="text-gray-600 text-sm mb-2">Moderate Fits</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.moderateFits}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow">
            <p className="text-gray-600 text-sm mb-2">Avg Tailor Worth</p>
            <p className="text-3xl font-bold text-orange-600">{stats.avgTailorWorth}%</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Search by job title or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
            <select
              value={filterVerdict}
              onChange={(e) => setFilterVerdict(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Verdicts</option>
              <option value="Strong Fit">Strong Fit</option>
              <option value="Moderate Fit">Moderate Fit</option>
              <option value="Weak Fit">Weak Fit</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-600">Loading assessments...</div>
        ) : filteredAssessments.length === 0 ? (
          <div className="bg-white rounded-lg p-8 shadow text-center">
            <p className="text-gray-600 mb-4">No assessments found</p>
            <Link href="/assessment" className="btn-primary">Create Your First Assessment</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAssessments.map((assessment) => (
              <div key={assessment.id} className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{assessment.jobTitle}</h3>
                    <p className="text-gray-600">{assessment.company}</p>
                  </div>
                  <div className="flex gap-2">
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      assessment.verdict === "Strong Fit" ? "bg-green-100 text-green-800" :
                      assessment.verdict === "Moderate Fit" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {assessment.verdict}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      assessment.tailorWorth >= 70 ? "bg-orange-100 text-orange-800" :
                      assessment.tailorWorth >= 40 ? "bg-yellow-100 text-yellow-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      Tailor: {assessment.tailorWorth}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Fit Score</p>
                    <p className="text-2xl font-bold text-blue-600">{(assessment.fitScore / 10).toFixed(1)}/10</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">ATS Match</p>
                    <p className="text-2xl font-bold text-indigo-600">{assessment.atsMatch}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Success</p>
                    <p className="text-2xl font-bold text-purple-600">{assessment.successProbability}%</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-gray-600 text-sm mb-1">Date</p>
                    <p className="text-sm text-gray-800">{new Date(assessment.createdAt).toLocaleDateString()} at {new Date(assessment.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded p-3 mb-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-bold text-green-600 mb-1">Strengths:</p>
                      <p className="text-gray-700">{assessment.strengths.slice(0, 2).join(", ")}</p>
                    </div>
                    <div>
                      <p className="font-bold text-red-600 mb-1">Gaps:</p>
                      <p className="text-gray-700">{assessment.gaps.slice(0, 2).join(", ")}</p>
                    </div>
                    <div>
                      <p className="font-bold text-yellow-600 mb-1">Keywords:</p>
                      <p className="text-gray-700">{assessment.missingKeywords.slice(0, 2).join(", ")}</p>
                    </div>
                  </div>
                </div>

                <Link href="/assessment" className="btn-primary inline-block">View Full Assessment</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
