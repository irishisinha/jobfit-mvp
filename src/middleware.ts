import { withAuth } from "next-auth/middleware"

export const config = {
  matcher: [
    "/resumes",
    "/assessment",
    "/dashboard",
    "/consistency-checker",
    "/insights",
    "/linkedin-optimizer"
  ]
}

export default withAuth(
  function middleware() {
    return null
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    }
  }
)
