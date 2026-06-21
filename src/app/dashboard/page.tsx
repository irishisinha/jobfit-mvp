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
    if (status === "unauthenticated") router.push("/")
  }, [status, router])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/assessments")
        if (res.ok) setAssessments(await res.json())
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    if (status === "authenticated") load()
  }, [status])

  const filtered = assessments.filter(a => {
    const search = a.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) || a.company.toLowerCase().includes(searchTerm.toLowerCase())
    const verdict = !filterVerdict || a.verdict === filterVerdict
    return search && verdict
  })

  const stats = {
    total: assessments.length,
    avgFitScore: assessments.length > 0 ? (assessments.reduce((s, a) => s + a.fitScore / 10, 0) / assessments.length).toFixed(1) : "0",
    strongFits: assessments.filter(a => a.verdict === "Strong Fit").length,
    moderateFits: assessments.filter(a => a.verdict === "Moderate Fit").length,
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
              <p className="text-gray-600">Your job fit analysis history</p>
            </div>
            <div className="flex gap-3">
              <Link href="/assessment" className="btn-primary">New Assessment</Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-secondary">Sign Out</button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-main py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
        </div>

        <div className="bg-white rounded-lg p-6 shadow mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Search by job title or company..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" />
            <select value={filterVerdict} onChange={(e) => setFilterVerdict(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none">
              <option value="">All Verdicts</option>
              <option value="Strong Fit">Strong Fit</option>
              <option value="Moderate Fit">Moderate Fit</option>
              <option value="Weak Fit">Weak Fit</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-600">Loading assessments...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg p-8 shadow text-center">
            <p className="text-gray-600 mb-4">No assessments found</p>
            <Link href="/assessment" className="btn-primary">Create Your First Assessment</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {(filtered || []).map(a => (
              <div key={a.id} className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{a.jobTitle}</h3>
                    <p className="text-gray-600">{a.company}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${a.verdict === "Strong Fit" ? "bg-green-100 text-green-800" : a.verdict === "Moderate Fit" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                    {a.verdict}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Fit Score</p>
                    <p className="text-2xl font-bold text-blue-600">{(a.fitScore / 10).toFixed(1)}/10</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">ATS Match</p>
                    <p className="text-2xl font-bold text-indigo-600">{a.atsMatch}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Success Probability</p>
                    <p className="text-2xl font-bold text-purple-600">{a.successProbability}%</p>
                  </div>
                </div>

                <div className="text-sm text-gray-500 mb-3">
                  {new Date(a.createdAt).toLocaleDateString()} at {new Date(a.createdAt).toLocaleTimeString()}
                </div>

                <button className="btn-primary">View Details</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

