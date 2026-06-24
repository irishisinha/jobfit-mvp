"use client"

import { unstable_noStore } from "next/cache"

import { useSession, signIn } from "next-auth/react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function Home() {
  unstable_noStore()
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/consistency-checker")
    }
  }, [status, router])

  if (status === "loading") return <div className="p-8">Loading...</div>

  if (status === "authenticated") {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container-main py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">JobFit</h1>
          <p className="text-xl text-gray-600">The Truthful AI for Job Applications</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-4xl mb-4">ðŸ”</div>
            <h3 className="text-xl font-bold mb-2">Check Your Resumes</h3>
            <p className="text-gray-600 text-sm">Before LinkedIn or recruiters see them, check for contradictions that could sink your application.</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-4xl mb-4">ðŸ“Š</div>
            <h3 className="text-xl font-bold mb-2">Get Job Insights</h3>
            <p className="text-gray-600 text-sm">Market data, salary ranges, interview prep, and what competitors have that you don't.</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-4xl mb-4">ðŸ’¼</div>
            <h3 className="text-xl font-bold mb-2">Optimize LinkedIn</h3>
            <p className="text-gray-600 text-sm">AI-recommended headline, about section, and skills tailored to your target roles.</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-8 shadow-lg max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-center mb-6">Why Truthfulness Matters</h2>
          <p className="text-gray-700 mb-4">
            Many AI resume tools will help you <em>exaggerate</em> skills or claim expertise you don't have. That backfires in interviews and reference checks.
          </p>
          <p className="text-gray-700 mb-4">
            <strong>JobFit only uses skills and achievements explicitly in your resume.</strong> No BS. That means:
          </p>
          <ul className="space-y-2 text-gray-700 mb-6">
            <li>âœ“ Cover letters that highlight real strengths, address real gaps honestly</li>
            <li>âœ“ Resumes tailored by reordering (not lying), grounded in facts</li>
            <li>âœ“ LinkedIn profile that matches your actual experience</li>
            <li>âœ“ Interview prep that doesn't set you up to fail</li>
          </ul>
          <p className="text-sm text-gray-600 text-center">
            Better callbacks from jobs you can actually do. Fewer rejections from lies discovered in background checks.
          </p>
        </div>

        <div className="text-center">
          <button
            onClick={() => signIn("google", { callbackUrl: "/consistency-checker" })}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-lg shadow-lg"
          >
            Sign In with Google
          </button>
          <p className="text-sm text-gray-600 mt-4">Start with Consistency Checker (free for first check)</p>
        </div>
      </div>
    </div>
  )
}
