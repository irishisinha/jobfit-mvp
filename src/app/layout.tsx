'use client'

import type { Metadata } from 'next'
import { SessionProvider } from 'next-auth/react'
import './globals.css'

// Note: Metadata export is not supported in client components
// For SEO, consider using a server component wrapper or next/head

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>JobFit - AI Job Assessment</title>
        <meta name="description" content="AI-powered job fit assessment tool" />
      </head>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
