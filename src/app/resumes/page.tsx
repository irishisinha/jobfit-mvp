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

export default function ResumesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [resumes, setResumes] = useState<SavedResume[]>([])
  const [loading, setLoading] = useState(true)
  const [newResumeName, setNewResumeName] = useState("")
  const [newResumeContent, setNewResumeContent] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") router.push("/")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      loadResumes()
    }
  }, [status])

  const loadResumes = async () => {
    setLoading(true)
    try {
      // Try API first
      const res = await fetch("/api/resumes")
      if (res.ok) {
        const data = await res.json()
        setResumes(data)
        localStorage.setItem("resumes", JSON.stringify(data))
        return
      }
    } catch (err) {
      console.log("API failed, using localStorage")
    }
    
    // Fallback to localStorage
    const stored = localStorage.getItem("resumes")
    if (stored) {
      setResumes(JSON.parse(stored))
    }
    setLoading(false)
  }

  const handleSaveResume = async () => {
    if (!newResumeName.trim() || !newResumeContent.trim()) {
      setError("Name and content required")
      return
    }

    setSaving(true)
    setError("")
    setSuccess("")

    const newResume: SavedResume = {
      id: Date.now().toString(),
      name: newResumeName,
      content: newResumeContent,
      createdAt: new Date().toISOString(),
    }

    try {
      // Save to API
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newResumeName, content: newResumeContent }),
      })
      console.log("API save result:", res.status)
    } catch (err) {
      console.log("API save failed, using localStorage")
    }

    // Always save to localStorage
    const updated = [...resumes, newResume]
    setResumes(updated)
    localStorage.setItem("resumes", JSON.stringify(updated))

    setSuccess("Resume saved!")
    setNewResumeName("")
    setNewResumeContent("")
    setShowForm(false)
    setSaving(false)
  }

  const handleDeleteResume = async (id: string) => {
    if (!confirm("Delete this resume?")) return
    const updated = resumes.filter(r => r.id !== id)
    setResumes(updated)
    localStorage.setItem("resumes", JSON.stringify(updated))
    
    try {
      await fetch(`/api/resumes/${ id }`, { method: "DELETE" })
    } catch (err) {
      console.log("API delete failed")
    }
  }

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow mb-8">
        <div className="container-main py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">?? Resume Library</h1>
            <p className="text-gray-600">{session.user?.email}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/assessment" className="btn-primary">Assessment</Link>
            <Link href="/dashboard" className="btn-secondary">Dashboard</Link>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-secondary">Sign Out</button>
          </div>
        </div>
      </div>

      <div className="container-main py-8">
        <button onClick={() => setShowForm(!showForm)} className="btn-primary mb-8 text-lg">
          {showForm ? "? Cancel" : "+ Add New Resume"}
        </button>

        {error && <div className="bg-red-100 border-2 border-red-500 text-red-800 p-4 rounded-lg mb-4 font-semibold">{error}</div>}
        {success && <div className="bg-green-100 border-2 border-green-500 text-green-800 p-4 rounded-lg mb-4 font-semibold">{success}</div>}

        {showForm && (
          <div className="bg-white rounded-lg p-8 shadow mb-8 border-2 border-blue-200">
            <h2 className="text-2xl font-bold mb-6">Save New Resume</h2>
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Resume Name</label>
              <input 
                type="text" 
                value={newResumeName} 
                onChange={(e) => setNewResumeName(e.target.value)} 
                placeholder="e.g., Senior Developer Resume, Product Manager Resume" 
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg" 
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Resume Content</label>
              <textarea 
                value={newResumeContent} 
                onChange={(e) => setNewResumeContent(e.target.value)} 
                placeholder="Paste your full resume here..." 
                className="w-full h-96 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-mono text-sm" 
              />
            </div>
            <button 
              onClick={handleSaveResume} 
              disabled={saving || !newResumeName.trim() || !newResumeContent.trim()} 
              className={`px-8 py-3 rounded-lg font-bold text-white text-lg ${saving ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {saving ? "? Saving..." : "? Save Resume"}
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-600 text-lg">Loading resumes...</div>
        ) : resumes.length === 0 ? (
          <div className="bg-white rounded-lg p-12 shadow text-center border-2 border-dashed border-gray-300">
            <p className="text-gray-600 mb-6 text-lg">No resumes saved yet</p>
            <button onClick={() => setShowForm(true)} className="btn-primary text-lg">+ Add Your First Resume</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resumes.map((r) => (
              <div key={r.id} className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition border-l-4 border-blue-500">
                <h3 className="text-xl font-bold text-gray-800 mb-2">?? {r.name}</h3>
                <p className="text-gray-500 text-sm mb-4">{new Date(r.createdAt).toLocaleDateString()}</p>
                <p className="text-gray-600 text-sm mb-6 line-clamp-3 bg-gray-50 p-3 rounded">{r.content.substring(0, 200)}...</p>
                <div className="flex gap-2">
                  <Link href={`/assessment?resume=${ r.id }`} className="flex-1 btn-primary text-center">Use</Link>
                  <button onClick={() => handleDeleteResume(r.id)} className="flex-1 btn-secondary">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 p-4 bg-blue-50 rounded-lg text-center text-sm text-gray-600">
          ?? Resumes are saved locally on this device
        </div>
      </div>
    </div>
  )
}
