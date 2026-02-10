import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_ROUTES = ['/leads', '/dashboard', '/batch', '/instagram', '/settings'];

// Routes that are always accessible
const PUBLIC_ROUTES = ['/', '/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Always allow public routes
  if (PUBLIC_ROUTES.some(route => pathname === route)) {
    return NextResponse.next();
  }
  
  // For protected routes in production, redirect to login
  // (Auth check happens client-side via localStorage)
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    // Let the client-side auth guard handle this
    // We can't check localStorage in middleware (server-side)
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/leads/:path*', '/dashboard/:path*', '/batch/:path*', '/instagram/:path*', '/settings/:path*'],
};
