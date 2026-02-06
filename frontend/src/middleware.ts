import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes to protect from public access
const PROTECTED_ROUTES = ['/leads', '/dashboard'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Block access to protected routes - redirect to home
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/leads/:path*', '/dashboard/:path*'],
};
