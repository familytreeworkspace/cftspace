import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request })

  const { pathname } = request.nextUrl

  // Check if user has auth token in cookies (Edge Runtime compatible)
  const authToken = request.cookies.get('sb-auth-token')?.value ||
                    request.cookies.get('sb:token')?.value ||
                    request.cookies.get('sb-session')?.value

  const isAuthenticated = !!authToken

  // Public routes
  if (pathname === '/login' || pathname === '/') {
    if (isAuthenticated) {
      // Already logged in → dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Protected routes - not logged in → login page
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}
