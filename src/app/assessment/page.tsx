'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

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
  const [resume, setResume] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  const handleAssess = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      setError('Please fill in both resume and job description')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, jobDescription }),
      })

      if (!response.ok) {
        throw new Error('Assessment failed')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container-main">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">JobFit Assessment</h1>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="btn-secondary"
          >
            Sign Out
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          Welcome, {session?.user?.name}! Paste your resume and job description to get started.
        </p>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Resume Input */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Resume</h2>
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Paste your resume here..."
              className="textarea-input h-80"
            />
          </div>

          {/* Job Description Input */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Job Description</h2>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              className="textarea-input h-80"
            />
          </div>
        </div>

        {/* Assess Button */}
        <div className="text-center mb-8">
          <button
            onClick={handleAssess}
            disabled={loading}
            className={`btn-primary ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Assessing...' : 'Assess Fit'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="card bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Assessment Results</h2>

            {/* Verdict Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-gray-600 text-sm mb-1">Verdict</p>
                <p className={`text-2xl font-bold ${
                  result.verdict === 'Strong Fit' ? 'text-green-600' :
                  result.verdict === 'Moderate Fit' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {result.verdict}
                </p>
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

            {/* Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Strengths */}
              <div>
                <h3 className="text-xl font-bold text-green-600 mb-3">Strengths</h3>
                <ul className="space-y-2">
                  {result.strengths.map((strength, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-600 font-bold mt-1">✓</span>
                      <span className="text-gray-700">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Gaps */}
              <div>
                <h3 className="text-xl font-bold text-red-600 mb-3">Gaps</h3>
                <ul className="space-y-2">
                  {result.gaps.map((gap, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-red-600 font-bold mt-1">✗</span>
                      <span className="text-gray-700">{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Missing Keywords */}
            <div>
              <h3 className="text-xl font-bold text-yellow-600 mb-3">Missing Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {result.missingKeywords.map((keyword, idx) => (
                  <span key={idx} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

