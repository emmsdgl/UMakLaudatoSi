import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * ============================================================================
 * MIDDLEWARE - Authentication Only (No Email Domain Restriction)
 * ============================================================================
 * All authenticated users can access protected routes.
 * Non-UMak users have a 1-time pledge limit enforced at the API level.
 * Admins have full access regardless of email domain.
 * ============================================================================
 */
export default withAuth(
  function middleware(req) {
    // All authenticated users can proceed - no email domain restriction
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Allow access if user is authenticated (has token)
        return !!token;
      },
    },
  }
);

export const config = {
  // Protect dashboard routes and API routes
  matcher: [
    "/home/:path*",
    "/calculator/:path*",
    "/eco-paths/:path*",
    "/rewards/:path*",
    "/wallet/:path*",
    "/ranks/:path*",
    "/profile/:path*",
    "/pledges/:path*",
    "/api/pledges/:path*",
    "/api/carbon-footprint/:path*",
    "/api/eco-paths/:path*",
  ],
};
