"use client"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
export default function InsightsPage() {
  const { data: session } = useSession()
  if (!session) return null
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow mb-8">
        <div className="container-main py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Career Insights</h1>
          <div className="flex gap-3">
            <Link href="/assessment" className="btn-secondary">Assessment</Link>
            <button onClick={() => signOut()} className="btn-secondary">Sign Out</button>
          </div>
        </div>
      </div>
      <div className="container-main py-8">
        <div className="bg-white rounded-lg p-8 shadow">
          <h2 className="text-2xl font-bold mb-4">Career Intelligence (Coming Soon)</h2>
          <p className="text-gray-600 mb-4">Get insights on market demand, salary ranges, interview prep, and competitor analysis</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg"><p className="font-bold">📊 Market Insights</p></div>
            <div className="p-4 bg-green-50 rounded-lg"><p className="font-bold">🎯 Competitor Analysis</p></div>
            <div className="p-4 bg-purple-50 rounded-lg"><p className="font-bold">🎤 Interview Prep</p></div>
            <div className="p-4 bg-yellow-50 rounded-lg"><p className="font-bold">💰 Salary Intelligence</p></div>
          </div>
        </div>
      </div>
    </div>
  )
}
