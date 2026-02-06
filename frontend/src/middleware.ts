import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes to protect from public access (production only)
const PROTECTED_ROUTES = ['/leads', '/dashboard'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Only block in production (Vercel), allow locally
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/leads/:path*', '/dashboard/:path*'],
};
