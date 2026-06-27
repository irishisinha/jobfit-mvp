"use client"


import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import NavBar from "@/components/NavBar"
import { extractTextFromFile } from "@/lib/fileParser"

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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  useEffect(() => {
    if (status === "authenticated") {
      loadResumes()
    }
  }, [status])

  const loadResumes = async () => {
    try {
      setDebugMsg("Loading resumes...")
      const res = await fetch("/api/resumes")
      if (res.ok) {
        const data = await res.json()
        setResumes(data || [])
        setDebugMsg(`Loaded ${data?.length || 0} resumes`)
      } else {
        throw new Error("Failed to load")
      }
    } catch (e) {
      console.error("Error:", e)
      setDebugMsg("Error loading resumes")
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const text = await extractTextFromFile(file)
      const resumeName = file.name.replace(/\.[^/.]+$/, "")

      const saveRes = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: resumeName, content: text })
      })

      if (saveRes.ok) {
        await loadResumes()
        setDebugMsg(`"${resumeName}" uploaded successfully`)
      } else {
        throw new Error("Failed to save")
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
        await loadResumes()
      }
    } catch (error) {
      console.error("Delete error:", error)
    }
  }

  const handleEditName = async (id: string, newName: string) => {
    if (!newName.trim()) {
      setEditingId(null)
      return
    }

    try {
      const res = await fetch(`/api/resumes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() })
      })

      if (res.ok) {
        await loadResumes()
        setEditingId(null)
      }
    } catch (error) {
      console.error("Edit error:", error)
    }
  }

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-8">My Resumes</h1>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <label className="flex items-center justify-center w-full px-4 py-6 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100">
              <div className="text-center">
                <p className="text-blue-600 font-semibold">Click to upload resume</p>
                <p className="text-sm text-gray-500">Supports TXT, PDF, DOCX</p>
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
                <div key={resume.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      {editingId === resume.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => handleEditName(resume.id, editingName)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleEditName(resume.id, editingName)
                            } else if (e.key === "Escape") {
                              setEditingId(null)
                            }
                          }}
                          autoFocus
                          className="text-lg font-semibold text-gray-800 border border-blue-400 px-2 py-1 rounded w-full"
                        />
                      ) : (
                        <h3
                          onClick={() => {
                            setEditingId(resume.id)
                            setEditingName(resume.name)
                          }}
                          className="text-lg font-semibold text-gray-800 cursor-pointer hover:text-blue-600"
                        >
                          {resume.name} ✎
                        </h3>
                      )}
                      <p className="text-sm text-gray-500">
                        {resume.createdAt ? new Date(resume.createdAt).toLocaleDateString() : "Just now"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/assessment?resumeId=${resume.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
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
    </>
  )
}
