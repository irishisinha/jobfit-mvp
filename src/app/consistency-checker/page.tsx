"use client"

import { unstable_noStore } from "next/cache"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"

interface SavedResume {
  id: string
  name: string
  content: string
  createdAt: string
}

export default function ConsistencyCheckerPage() {
  unstable_noStore()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [resumes, setResumes] = useState<SavedResume[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") router.push("/")
  }, [status, router])

  useEffect(() => {
    try {
      const stored = localStorage.getItem("jobfit_resumes")
      if (stored) {
        setResumes(JSON.parse(stored))
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  const handleCheck = async () => {
    if (resumes.length < 2) {
      setError("Add at least 2 resumes to check for inconsistencies")
      return
    }

    setLoading(true)
    setError("")
    setResult(null)

    try {
      const res = await fetch("/api/consistency-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumes }),
      })
      if (!res.ok) throw new Error("Check failed")
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError("Failed to check consistency")
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") return <div className="p-8">Loading...</div>
  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow mb-8">
        <div className="container-main py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Resume Consistency Checker</h1>
            <p className="text-gray-600">Catch contradictions before LinkedIn sees them</p>
          </div>
          <div className="flex gap-3">
            <Link href="/assessment" className="btn-secondary">Assessment</Link>
            <Link href="/resumes" className="btn-secondary">My Resumes</Link>
            <button onClick={() => signOut()} className="btn-secondary">Sign Out</button>
          </div>
        </div>
      </div>

      <div className="container-main py-8">
        {!result ? (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg p-8 shadow mb-8">
              <h2 className="text-2xl font-bold mb-4 text-blue-700">Why This Matters</h2>
              <p className="text-gray-700 mb-4">
                You have multiple resumes for different roles (Senior PM, Product Manager, Consultant, etc.). Great,” but if they contradict each other, LinkedIn and hiring managers will notice.
              </p>
              <ul className="space-y-2 text-gray-700">
                <li>• Resume A says you managed $10M P&L, Resume B says $1M '” which is true?</li>
                <li>• Resume A lists 5 years at Company X, Resume B lists 7 years '” which is real?</li>
                <li>• Resume A claims "Head of Product" title, Resume B says "Senior PM" at same company same time</li>
                <li>• Dates overlap or don't add up '” recruiter spots the lie immediately</li>
              </ul>
              <p className="text-gray-700 mt-4 font-semibold">
                This tool finds those contradictions BEFORE you paste into LinkedIn.
              </p>
            </div>

            <div className="bg-white rounded-lg p-8 shadow">
              <h2 className="text-2xl font-bold mb-4">Your Saved Resumes</h2>
              {resumes.length === 0 ? (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">No resumes saved yet.</p>
                  <Link href="/resumes" className="btn-primary">Save Your First Resume</Link>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-6">
                    {resumes.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <span className="font-semibold">{r.name}</span>
                        <span className="text-xs text-gray-500">({typeof r.content === 'string' ? r.content.split(" ").length : 0} words)</span>
                      </div>
                    ))}
                  </div>
                  {resumes.length < 2 ? (
                    <p className="text-red-600 text-sm mb-4">Add at least 2 resumes to check for inconsistencies</p>
                  ) : (
                    <button
                      onClick={handleCheck}
                      disabled={loading}
                      className={`w-full px-6 py-3 rounded-lg font-bold text-white text-lg ${loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
                    >
                      {loading ? "Analyzing..." : `Check ${resumes.length} Resumes for Contradictions`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className={`rounded-lg p-8 shadow ${result.hasIssues ? "bg-red-50 border-2 border-red-300" : "bg-green-50 border-2 border-green-300"}`}>
              <h2 className={`text-2xl font-bold mb-2 ${result.hasIssues ? "text-red-700" : "text-green-700"}`}>
                {result.hasIssues ? "âš ï¸ Issues Found" : "âœ“ All Clear"}
              </h2>
              <p className={`text-lg ${result.hasIssues ? "text-red-800" : "text-green-800"}`}>
                {result.summary}
              </p>
            </div>

            {result.hasIssues && (
              <div className="bg-white rounded-lg p-8 shadow">
                <h3 className="text-xl font-bold text-red-700 mb-4">Contradictions Detected</h3>
                <div className="space-y-4">
                  {result.issues?.map((issue: any, i: number) => (
                    <div key={i} className="p-4 bg-red-50 border-l-4 border-red-600 rounded-lg">
                      <p className="font-semibold text-red-900">{issue.type}</p>
                      <p className="text-sm text-red-800 mt-1">{issue.description}</p>
                      <p className="text-xs text-red-700 mt-2 font-mono">{issue.evidence}</p>
                      <p className="text-sm mt-2 text-gray-700"><strong>Fix:</strong> {issue.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.truthfulnessScore && (
              <div className="bg-white rounded-lg p-8 shadow">
                <h3 className="text-xl font-bold mb-4">Truthfulness Score</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Consistency</p>
                    <p className="text-3xl font-bold text-blue-700">{result.truthfulnessScore.consistency}%</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Verifiable Facts</p>
                    <p className="text-3xl font-bold text-blue-700">{result.truthfulnessScore.verifiable}%</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Hiring Risk</p>
                    <p className="text-3xl font-bold text-blue-700">{result.truthfulnessScore.hiringRisk}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
              <p className="text-sm text-blue-900">
                <strong>Next Step:</strong> Fix the issues above, then update your LinkedIn profile using our LinkedIn Optimizer.
                <Link href="/linkedin-optimizer" className="underline ml-2">Go to LinkedIn Optimizer â†’</Link>
              </p>
            </div>

            <button onClick={() => setResult(null)} className="w-full btn-secondary py-3 text-lg font-bold">
              Check Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

