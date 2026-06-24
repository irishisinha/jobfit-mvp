"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"

export default function NavBar() {
  const { data: session } = useSession()

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        <div className="flex gap-6">
          <Link href="/" className="text-lg font-bold text-blue-600 hover:text-blue-700">
            JobFit
          </Link>
          <Link href="/resumes" className="text-gray-700 hover:text-gray-900">
            Resumes
          </Link>
          <Link href="/assessment" className="text-gray-700 hover:text-gray-900">
            Assessment
          </Link>
          <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
            Dashboard
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          {session?.user?.email && (
            <span className="text-sm text-gray-600">{session.user.email}</span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}
