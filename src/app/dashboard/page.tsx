"use client"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect } from "react"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") router.push("/")
  }, [status, router])

  if (status === "loading") return <div className="p-8">Loading...</div>
  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow mb-8">
        <div className="container-main py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Your Activity</h1>
          <div className="flex gap-3">
            <Link href="/consistency-checker" className="btn-secondary">Checker</Link>
            <Link href="/assessment" className="btn-secondary">Assessment</Link>
            <button onClick={() => signOut()} className="btn-secondary">Sign Out</button>
          </div>
        </div>
      </div>

      <div className="container-main py-8">
        <div className="bg-white rounded-lg p-8 shadow">
          <h2 className="text-2xl font-bold mb-4">Activity Dashboard (Coming Soon)</h2>
          <p className="text-gray-600">
            Track your assessments, check consistency history, and monitor improvements over time.
          </p>
          <div className="mt-6 space-y-4">
            <Link href="/consistency-checker" className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
              <p className="font-bold text-blue-900">Start: Check Resume Consistency</p>
              <p className="text-sm text-blue-800">Ensure your resumes don't contradict each other</p>
            </Link>
            <Link href="/assessment" className="block p-4 bg-green-50 rounded-lg hover:bg-green-100 transition">
              <p className="font-bold text-green-900">Run: Job Assessment</p>
              <p className="text-sm text-green-800">Get fit score and recommendations for a job</p>
            </Link>
            <Link href="/linkedin-optimizer" className="block p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition">
              <p className="font-bold text-purple-900">Optimize: LinkedIn Profile</p>
              <p className="text-sm text-purple-800">AI-generated headline and about section</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
