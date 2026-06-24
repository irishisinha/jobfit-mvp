"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"

interface SavedResume {
  id: string
  name: string
  content: string
  createdAt?: string
}

export default function ResumesPage() {
  const { status } = useSession()
  const [resumes, setResumes] = useState<SavedResume[]>([])
  const [debugMsg, setDebugMsg] = useState("")
  const [uploading, setUploading] = useState(false)

  // Load resumes from database (not localStorage)
  useEffect(() => {
    if (status === "authenticated") {
      loadResumes()
    }
  }, [status])

  const loadResumes = async () => {
    try {
      setDebugMsg("Loading resumes from database...")
      const res = await fetch("/api/resumes")
      if (res.ok) {
        const data = await res.json()
        setResumes(data || [])
        // Update localStorage with database data (backup only)
        if (data && data.length > 0) {
          localStorage.setItem("jobfit_resumes", JSON.stringify(data))
        }
        setDebugMsg(`Loaded ${data?.length || 0} resumes from database`)
      } else {
        throw new Error("Failed to load from API")
      }
    } catch (e) {
      console.error("Error loading resumes:", e)
      // Fallback to localStorage only if API fails
      try {
        const stored = localStorage.getItem("jobfit_resumes")
        if (stored) {
          const data = JSON.parse(stored)
          setResumes(data)
          setDebugMsg(`Loaded ${data.length} resumes from cache (offline mode)`)
        } else {
          setDebugMsg("No resumes found")
        }
      } catch (err) {
        setDebugMsg("Error loading resumes")
      }
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const text = await file.text()
      const resumeName = file.name.replace(/\.[^/.]+$/, "") // Remove extension

      // Save to database
      const saveRes = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: resumeName,
          content: text
        })
      })

      if (saveRes.ok) {
        // Reload from database to get the new resume
        await loadResumes()
        setDebugMsg(`Resume "${resumeName}" uploaded successfully`)
      } else {
        throw new Error("Failed to save resume")
      }
    } catch (error) {
      console.error("Upload error:", error)
      setDebugMsg("Failed to upload resume")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this resume?")) return

    try {
      const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" })
      if (res.ok) {
        // Reload from database
        await loadResumes()
      }
    } catch (error) {
      console.error("Delete error:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">My Resumes</h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <label className="flex items-center justify-center w-full px-4 py-6 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100">
            <div className="text-center">
              <p className="text-blue-600 font-semibold">Click to upload resume (PDF/TXT)</p>
              <p className="text-sm text-gray-500">or drag and drop</p>
            </div>
            <input
              type="file"
              onChange={handleFileUpload}
              accept=".pdf,.txt,.docx"
              disabled={uploading}
              className="hidden"
            />
          </label>
          {uploading && <p className="text-center mt-2 text-blue-600">Uploading...</p>}
          {debugMsg && <p className="text-center mt-2 text-sm text-gray-600">{debugMsg}</p>}
        </div>

        <div className="grid gap-4">
          {resumes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No resumes yet. Upload one to get started.</p>
            </div>
          ) : (
            resumes.map((resume) => (
              <div key={resume.id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-800">{resume.name}</h3>
                  <p className="text-sm text-gray-500">
                    {resume.createdAt ? new Date(resume.createdAt).toLocaleDateString() : "Just now"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href="/assessment" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Use Resume
                  </Link>
                  <button
                    onClick={() => handleDelete(resume.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
