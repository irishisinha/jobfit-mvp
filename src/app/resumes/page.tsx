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
  const [newName, setNewName] = useState("")
  const [newContent, setNewContent] = useState("")
  const [debugMsg, setDebugMsg] = useState("Initializing...")

  useEffect(() => {
    if (status === "unauthenticated") router.push("/")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      setDebugMsg("Loading from localStorage...")
      setTimeout(() => {
        try {
          const stored = localStorage.getItem("jobfit_resumes")
          setDebugMsg(`Found: ${stored ? "Yes" : "No"}`)
          if (stored) {
            const parsed = JSON.parse(stored)
            setResumes(parsed)
          }
        } catch (e) {
          setDebugMsg(`Error: ${String(e)}`)
        }
      }, 100)
    }
  }, [status])

  const handleSave = () => {
    setDebugMsg("Saving...")
    
    if (!newName.trim()) {
      setDebugMsg("Error: Name empty")
      return
    }

    try {
      const resume: SavedResume = {
        id: Date.now().toString(),
        name: newName,
        content: newContent,
        createdAt: new Date().toISOString(),
      }

      const current = resumes
      const updated = [resume, ...current]

      // Save to database
      try {
        await fetch("/api/resumes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: resume.name, content: resume.content })
        })
      } catch (e) {
        console.error("Failed to save resume to database:", e)
      }
      localStorage.setItem("jobfit_resumes", JSON.stringify(updated))
      setResumes(updated)
      setNewName("")
      setNewContent("")
      setDebugMsg(`Saved! Total: ${updated.length}`)
    } catch (e) {
      setDebugMsg(`Save error: ${String(e)}`)
    }
  }

  const handleDelete = (id: string) => {
    const updated = resumes.filter(r => r.id !== id)
    localStorage.setItem("jobfit_resumes", JSON.stringify(updated))
    setResumes(updated)
    setDebugMsg(`Deleted. Total: ${updated.length}`)
  }

  if (status === "loading") return <div className="p-8">Loading...</div>
  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow mb-8">
        <div className="container-main py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Resume Library</h1>
          <div className="flex gap-3">
            <Link href="/assessment" className="btn-primary">Assessment</Link>
            <button onClick={() => signOut()} className="btn-secondary">Sign Out</button>
          </div>
        </div>
      </div>

      <div className="container-main py-8">
        <div className="bg-yellow-100 border-2 border-yellow-500 p-4 rounded-lg mb-8">
          <p className="font-mono text-sm font-bold">{debugMsg}</p>
          <p className="font-mono text-xs text-gray-600">Resumes saved: {resumes.length}</p>
        </div>

        <div className="bg-white rounded-lg p-8 shadow mb-8">
          <h2 className="text-2xl font-bold mb-6">Add Resume</h2>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Resume name"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-4 text-lg"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Resume content"
            className="w-full h-48 px-4 py-3 border-2 border-gray-300 rounded-lg mb-4"
          />
          <button onClick={handleSave} className="btn-primary px-6 py-3 text-lg font-bold">
            Save Resume
          </button>
        </div>

        {resumes.length === 0 ? (
          <div className="bg-white rounded-lg p-12 shadow text-center">
            <p className="text-gray-600 text-lg">No resumes yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resumes.map((r) => (
              <div key={r.id} className="bg-white rounded-lg p-6 shadow border-l-4 border-blue-500">
                <h3 className="text-xl font-bold mb-2">{r.name}</h3>
                <p className="text-gray-500 text-sm mb-4">{new Date(r.createdAt).toLocaleDateString()}</p>
                <p className="text-gray-600 text-sm mb-4 bg-gray-50 p-3 rounded whitespace-pre-wrap font-mono text-xs">
                  {r.content.substring(0, 150)}...
                </p>
                <button onClick={() => handleDelete(r.id)} className="btn-secondary w-full">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
