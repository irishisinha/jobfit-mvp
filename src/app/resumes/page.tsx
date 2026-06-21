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
    console.log("Loading resumes...")
    setLoading(true)
    try {
      const res = await fetch("/api/resumes")
      console.log("Resumes fetch status:", res.status)
      if (res.ok) {
        const data = await res.json()
        console.log("Resumes loaded:", data.length, "items")
        setResumes(data)
      }
    } catch (err) {
      console.error("Error loading resumes:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveResume = async () => {
    console.log("Saving:", { name: newResumeName, length: newResumeContent.length })
    if (!newResumeName.trim() || !newResumeContent.trim()) {
      setError("Name and content required")
      return
    }
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newResumeName, content: newResumeContent }),
      })
      console.log("Save response:", res.status)
      const data = await res.json()
      console.log("Response data:", data)
      if (!res.ok) throw new Error(data.error || "Save failed")
      setSuccess("Saved!")
      setNewResumeName("")
      setNewResumeContent("")
      setShowForm(false)
      setTimeout(() => loadResumes(), 500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed"
      console.error(msg)
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteResume = async (id: string) => {
    if (!confirm("Delete?")) return
    try {
      await fetch(`/api/resumes/${ id }`, { method: "DELETE" })
      loadResumes()
    } catch (err) {
      console.error("Delete error:", err)
    }
  }

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow mb-8">
        <div className="container-main py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Resume Library</h1>
            <p className="text-gray-600">Logged in as: {session.user?.email}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/assessment" className="btn-secondary">Assessment</Link>
            <Link href="/dashboard" className="btn-secondary">Dashboard</Link>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-secondary">Sign Out</button>
          </div>
        </div>
      </div>

      <div className="container-main py-8">
        <button onClick={() => setShowForm(!showForm)} className="btn-primary mb-8">
          {showForm ? "Cancel" : "+ Add Resume"}
        </button>

        {error && <div className="bg-red-100 border-2 border-red-500 text-red-800 p-4 rounded-lg mb-4">{error}</div>}
        {success && <div className="bg-green-100 border-2 border-green-500 text-green-800 p-4 rounded-lg mb-4">{success}</div>}

        {showForm && (
          <div className="bg-white rounded-lg p-6 shadow mb-8">
            <h2 className="text-2xl font-bold mb-4">Add Resume</h2>
            <input type="text" value={newResumeName} onChange={(e) => setNewResumeName(e.target.value)} placeholder="Resume name" className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg mb-4" />
            <textarea value={newResumeContent} onChange={(e) => setNewResumeContent(e.target.value)} placeholder="Resume content" className="w-full h-64 px-4 py-3 border-2 border-gray-300 rounded-lg mb-4" />
            <button onClick={handleSaveResume} disabled={saving} className={`px-6 py-2 rounded-lg font-semibold text-white ${saving ? "bg-gray-400" : "bg-blue-600"}`}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}

        {loading ? <p className="text-center text-gray-600">Loading...</p> : resumes.length === 0 ? (
          <div className="bg-white rounded-lg p-8 shadow text-center">
            <p className="text-gray-600 mb-4">No resumes yet</p>
            <button onClick={() => setShowForm(true)} className="btn-primary">Add First Resume</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resumes.map((r) => (
              <div key={r.id} className="bg-white rounded-lg p-6 shadow">
                <h3 className="text-xl font-bold mb-2">{r.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{new Date(r.createdAt).toLocaleDateString()}</p>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{r.content.substring(0, 150)}...</p>
                <div className="flex gap-2">
                  <button onClick={() => handleDeleteResume(r.id)} className="flex-1 btn-secondary">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
