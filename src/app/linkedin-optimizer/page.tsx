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
}

export default function LinkedInOptimizerPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [targetRoles, setTargetRoles] = useState("")
  const [currentHeadline, setCurrentHeadline] = useState("")
  const [currentAbout, setCurrentAbout] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/")
  }, [status, router])

  useEffect(() => {
    try {
      const stored = localStorage.getItem("jobfit_resumes")
      if (stored) {
        const parsed = JSON.parse(stored)
        setSavedResumes(parsed)
        setSelectedIds(parsed.map((r: SavedResume) => r.id))
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  const toggleResume = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleAnalyze = async () => {
    if (selectedIds.length === 0) {
      setError("Select at least one resume")
      return
    }
    if (!targetRoles.trim()) {
      setError("Enter the roles you're targeting")
      return
    }

    setLoading(true)
    setError("")
    setResult(null)

    try {
      const resumes = savedResumes.filter(r => selectedIds.includes(r.id))
      const res = await fetch("/api/linkedin-optimizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumes, targetRoles, currentHeadline, currentAbout }),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError("Failed to generate LinkedIn recommendations")
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
          <h1 className="text-3xl font-bold">LinkedIn Optimizer</h1>
          <div className="flex gap-3">
            <Link href="/insights" className="btn-secondary">Insights</Link>
            <Link href="/resumes" className="btn-secondary">Resumes</Link>
            <button onClick={() => signOut()} className="btn-secondary">Sign Out</button>
          </div>
        </div>
      </div>

      <div className="container-main py-8">
        {!result ? (
          <div className="bg-white rounded-lg p-8 shadow max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Build Your LinkedIn Strategy</h2>
            <p className="text-gray-600 mb-6">Pick the resume(s) that reflect your real experience, tell us what roles you're targeting, and we'll suggest truthful, recruiter-optimized profile changes.</p>

            <div className="mb-6">
              <label className="block text-sm font-bold mb-2">Which saved resumes should inform this?</label>
              {savedResumes.length === 0 ? (
                <p className="text-red-600 text-sm">No resumes saved yet. <Link href="/resumes" className="underline">Add one first</Link>.</p>
              ) : (
                <div className="space-y-2">
                  {savedResumes.map(r => (
                    <label key={r.id} className="flex items-center gap-2 p-2 border-2 border-gray-200 rounded-lg cursor-pointer">
                      <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleResume(r.id)} />
                      <span className="font-semibold">{r.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">Target Role(s) You're Applying To / Aspiring Toward</label>
              <input
                type="text"
                value={targetRoles}
                onChange={(e) => setTargetRoles(e.target.value)}
                placeholder="e.g., Senior Product Manager, Head of Product"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">Current LinkedIn Headline (optional)</label>
              <input
                type="text"
                value={currentHeadline}
                onChange={(e) => setCurrentHeadline(e.target.value)}
                placeholder="Paste your current headline"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold mb-2">Current LinkedIn About Section (optional)</label>
              <textarea
                value={currentAbout}
                onChange={(e) => setCurrentAbout(e.target.value)}
                placeholder="Paste your current About section"
                className="w-full h-32 px-4 py-3 border-2 border-gray-300 rounded-lg"
              />
            </div>

            {error && <div className="bg-red-100 border-2 border-red-500 text-red-800 p-4 rounded-lg mb-4">{error}</div>}

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className={`w-full px-6 py-3 rounded-lg font-bold text-white text-lg ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {loading ? "Analyzing..." : "Get LinkedIn Recommendations"}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-8 shadow">
              <h2 className="text-2xl font-bold mb-2 text-blue-700">Suggested Headline</h2>
              <p className="text-sm text-gray-500 mb-2">Current: {result.headline?.current}</p>
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-2">
                <p className="font-semibold">{result.headline?.suggested}</p>
              </div>
              <p className="text-sm text-gray-600">{result.headline?.why}</p>
            </div>

            <div className="bg-white rounded-lg p-8 shadow">
              <h2 className="text-2xl font-bold mb-4 text-green-700">Suggested About Section</h2>
              <textarea readOnly value={result.aboutSection?.suggested} className="w-full h-56 px-4 py-3 border-2 border-gray-300 rounded-lg font-mono text-sm mb-4" />
              <ul className="space-y-1">
                {(result.aboutSection?.keyChanges || []).map((c: string, i: number) => (
                  <li key={i} className="text-sm text-gray-700">â†’ {c}</li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="text-lg font-bold mb-3">Keywords Recruiters Search</h3>
                <div className="flex flex-wrap gap-2">
                  {(result.headlineKeywordsToInclude || []).map((k: string, i: number) => (
                    <span key={i} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">{k}</span>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="text-lg font-bold mb-3">Pinned Skills to Prioritize</h3>
                <ul className="space-y-1">
                  {(result.skillsSectionRecommendations || []).map((s: any, i: number) => (
                    <li key={i} className="text-sm">✓ {s.skill} — {s.action}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow">
              <h3 className="text-lg font-bold mb-3">Experience Section Tips</h3>
              <ul className="space-y-2">
                {(result.experienceSectionTips || []).map((t: string, i: number) => (
                  <li key={i} className="text-sm">â†’ {t}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 shadow">
              <h3 className="text-lg font-bold mb-3">Open To Work Setting</h3>
              <p className="text-sm">{result.openToWorkRecommendation}</p>
            </div>

            {result.consistencyCheck?.length > 0 && (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-3 text-red-700">Consistency Issues Across Your Resumes</h3>
                <ul className="space-y-2">
                  {result.consistencyCheck.map((c: string, i: number) => (
                    <li key={i} className="text-sm text-red-800">⚠ {c}</li>
                  ))}
                </ul>
              </div>
            )}

            <button onClick={() => setResult(null)} className="w-full btn-secondary py-3 text-lg font-bold">
              Analyze Different Roles
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
