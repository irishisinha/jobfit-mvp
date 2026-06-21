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

  useEffect(() => {
    if (status === "unauthenticated") router.push("/")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      loadResumes()
    }
  }, [status])

  const loadResumes = async () => {
    try {
      const res = await fetch("/api/resumes")
      if (res.ok) {
        setResumes(await res.json())
      }
    } catch (err) {
      console.error("Failed to load resumes:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveResume = async () => {
    if (!newResumeName.trim() || !newResumeContent.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newResumeName, content: newResumeContent }),
      })
      if (res.ok) {
        setNewResumeName("")
        setNewResumeContent("")
        setShowForm(false)
        await loadResumes()
      }
    } catch (err) {
      console.error("Failed to save resume:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteResume = async (id: string) => {
    if (!confirm("Delete this resume?")) return
    try {
      const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" })
      if (res.ok) {
        await loadResumes()
      }
    } catch (err) {
      console.error("Failed to delete resume:", err)
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
            <p className="text-gray-600">Manage your resumes for different job applications</p>
          </div>
          <div className="flex gap-3">
            <Link href="/assessment" className="btn-secondary">New Assessment</Link>
            <Link href="/dashboard" className="btn-secondary">Dashboard</Link>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-secondary">Sign Out</button>
          </div>
        </div>
      </div>

      <div className="container-main py-8">
        <div className="mb-8">
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? "Cancel" : "+ Add New Resume"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg p-6 shadow mb-8">
            <h2 className="text-2xl font-bold mb-4">Save New Resume</h2>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">Resume Name</label>
              <input type="text" value={newResumeName} onChange={(e) => setNewResumeName(e.target.value)} placeholder="e.g., Software Engineer Resume, Product Manager Resume" className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">Resume Content</label>
              <textarea value={newResumeContent} onChange={(e) => setNewResumeContent(e.target.value)} placeholder="Paste your resume here..." className="w-full h-64 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" />
            </div>
            <button onClick={handleSaveResume} disabled={saving || !newResumeName.trim() || !newResumeContent.trim()} className={`px-6 py-2 rounded-lg font-semibold text-white ${saving ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
              {saving ? "Saving..." : "Save Resume"}
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-600">Loading resumes...</div>
        ) : resumes.length === 0 ? (
          <div className="bg-white rounded-lg p-8 shadow text-center">
            <p className="text-gray-600 mb-4">No resumes saved yet</p>
            <button onClick={() => setShowForm(true)} className="btn-primary">Add Your First Resume</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resumes.map((resume) => (
              <div key={resume.id} className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{resume.name}</h3>
                <p className="text-gray-500 text-sm mb-4">{new Date(resume.createdAt).toLocaleDateString()}</p>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{resume.content.substring(0, 200)}...</p>
                <div className="flex gap-2">
                  <Link href={`/assessment?resume=${resume.id}`} className="flex-1 btn-primary text-center">Use for Assessment</Link>
                  <button onClick={() => handleDeleteResume(resume.id)} className="flex-1 btn-secondary">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
