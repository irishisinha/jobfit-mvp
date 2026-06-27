"use client"

import { useSession, signIn } from "next-auth/react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/consistency-checker")
    }
  }, [status, router])

  // Show Sign In button immediately, don't wait for auth check
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container-main py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">JobFit</h1>
          <p className="text-xl text-gray-600">The Truthful AI for Job Applications</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg p-8 shadow-lg">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-2xl font-bold mb-4">Check Your Resumes</h3>
            <p className="text-gray-600">Before LinkedIn or recruiters see them, check for contradictions that could sink your application.</p>
          </div>

          <div className="bg-white rounded-lg p-8 shadow-lg">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-2xl font-bold mb-4">Get Job Insights</h3>
            <p className="text-gray-600">Market data, salary ranges, interview prep, and what competitors have that you don't.</p>
          </div>

          <div className="bg-white rounded-lg p-8 shadow-lg">
            <div className="text-4xl mb-4">💼</div>
            <h3 className="text-2xl font-bold mb-4">Optimize LinkedIn</h3>
            <p className="text-gray-600">AI-recommended headline, about section, and skills tailored to your target roles.</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto bg-white rounded-lg p-12 shadow-lg mb-12">
          <h2 className="text-3xl font-bold text-center mb-6">Why Truthfulness Matters</h2>
          <p className="text-gray-700 mb-4">Many AI resume tools will help you <em>exaggerate</em> skills or claim expertise you don't have. That backfires in interviews and reference checks.</p>
          
          <p className="text-gray-900 font-bold mb-4">JobFit only uses skills and achievements explicitly in your resume. No BS. That means:</p>
          
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="text-green-600 mr-3">✓</span>
              <span>Cover letters that highlight real strengths, address real gaps honestly</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-3">✓</span>
              <span>Resumes tailored by reordering (not lying), grounded in facts</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-3">✓</span>
              <span>LinkedIn profile that matches your actual experience</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-3">✓</span>
              <span>Interview prep that doesn't set you up to fail</span>
            </li>
          </ul>
        </div>

        <div className="text-center">
          <button
            onClick={() => signIn("google", { callbackUrl: "/assessment" })}
            className="px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-bold hover:bg-blue-700 transition"
          >
            Sign In with Google
          </button>
        </div>

        <div className="mt-12 text-center text-gray-600 text-sm">
          <p>Secured with NextAuth.js • Your data is never used for training</p>
        </div>
      </div>
    </div>
  )
}
