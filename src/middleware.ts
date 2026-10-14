import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple base64 decoding for edge runtime (where standard Buffer is not available)
function decodeJwtPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function normalizeRole(rawRole: string | undefined | null): string {
  if (!rawRole) return 'STUDENT';
  const r = String(rawRole).toUpperCase();
  if (r === 'ADMIN' || r === 'SUPER_ADMIN' || r === 'PLATFORM_ADMIN') return 'PLATFORM_ADMIN';
  if (r === 'COLLEGE' || r === 'COLLEGE_DEAN' || r === 'COLLEGE_ADMIN' || r === 'COLLEGE_PLACEMENT_OFFICER') return 'COLLEGE_ADMIN';
  if (r === 'RECRUITER' || r === 'COMPANY_ADMIN') return 'RECRUITER';
  if (r === 'VERIFICATION_OFFICER') return 'VERIFICATION_OFFICER';
  return 'STUDENT';
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Public paths that do not require auth
  if (path === '/unauthorized') {
    return NextResponse.next();
  }

  // Extract token from either cookie name
  const token = request.cookies.get('commandskill_access_token')?.value || request.cookies.get('sb-access-token')?.value

  let payload = token ? decodeJwtPayload(token) : null;
  // If token is present but expired
  if (payload && payload.exp && typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
    payload = null;
  }

  const hasValidAuth = Boolean(token && payload);
  const role = payload && payload.role ? normalizeRole(payload.role) : 'STUDENT';

  const isProtectedPath =
    path.startsWith('/dashboard') ||
    path.startsWith('/admin') ||
    path.startsWith('/college') ||
    path.startsWith('/recruiter') ||
    path.startsWith('/verification');

  // Redirect to login if accessing protected routes without valid auth
  if (isProtectedPath && !hasValidAuth) {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    // Clean up potentially stale/corrupt cookies
    if (token) {
      response.cookies.delete('commandskill_access_token');
      response.cookies.delete('commandskill_refresh_token');
      response.cookies.delete('sb-access-token');
    }
    return response;
  }

  // Handle authenticated users on landing page '/'
  if (path === '/' && hasValidAuth) {
    if (role === 'PLATFORM_ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (role === 'COLLEGE_ADMIN') {
      return NextResponse.redirect(new URL('/college/dashboard', request.url));
    }
    if (role === 'RECRUITER') {
      return NextResponse.redirect(new URL('/dashboard/recruiter', request.url));
    }
    if (role === 'VERIFICATION_OFFICER') {
      return NextResponse.redirect(new URL('/admin/verification', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Route Guard Logic for authenticated users
  if (hasValidAuth) {
    // Platform/Super Admins have omni-access across the platform
    if (role === 'PLATFORM_ADMIN') {
      return NextResponse.next();
    }

    // Admin paths
    if (path.startsWith('/admin')) {
      if (path.startsWith('/admin/verification') && role === 'VERIFICATION_OFFICER') {
        return NextResponse.next();
      }
      if (path.startsWith('/admin/students') && role === 'COLLEGE_ADMIN') {
        return NextResponse.next();
      }
      return NextResponse.rewrite(new URL('/unauthorized', request.url));
    }

    // Recruiter paths
    if (path.startsWith('/dashboard/recruiter') || path.startsWith('/recruiter') || path.startsWith('/company')) {
      if (role !== 'RECRUITER') {
        return NextResponse.rewrite(new URL('/unauthorized', request.url));
      }
      return NextResponse.next();
    }

    // College paths
    if (path.startsWith('/college')) {
      if (role !== 'COLLEGE_ADMIN') {
        return NextResponse.rewrite(new URL('/unauthorized', request.url));
      }
      return NextResponse.next();
    }

    // Verification Officer paths
    if (path.startsWith('/verification')) {
      if (role !== 'VERIFICATION_OFFICER') {
        return NextResponse.rewrite(new URL('/unauthorized', request.url));
      }
      return NextResponse.next();
    }

    // Generic /dashboard and /student paths
    if (path.startsWith('/dashboard') || path.startsWith('/student')) {
      // If a non-student lands on /dashboard, redirect them to their respective dashboard instead of denying access
      if (role === 'RECRUITER') {
        return NextResponse.redirect(new URL('/dashboard/recruiter', request.url));
      }
      if (role === 'COLLEGE_ADMIN') {
        return NextResponse.redirect(new URL('/college/dashboard', request.url));
      }
      if (role === 'VERIFICATION_OFFICER') {
        return NextResponse.redirect(new URL('/admin/verification', request.url));
      }
      if (role === 'STUDENT') {
        return NextResponse.next();
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images|favicon).*)',
  ],
}
