import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SUPPORTED_LOCALES = ['pt-BR', 'en'];
const DEFAULT_LOCALE = 'pt-BR';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Locale detection (runs on all requests) ---
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  const response = NextResponse.next();

  if (!localeCookie || !SUPPORTED_LOCALES.includes(localeCookie)) {
    const acceptLang = request.headers.get('Accept-Language') || '';
    const detected = acceptLang.toLowerCase().startsWith('en') ? 'en' : DEFAULT_LOCALE;
    response.cookies.set('NEXT_LOCALE', detected, {
      path: '/',
      sameSite: 'strict',
      maxAge: 365 * 24 * 60 * 60,
    });
  }

  // --- Skip public/static paths ---
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/' ||
    pathname === '/favicon.ico' ||
    pathname === '/logo.png' ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return response;
  }

  // --- Auth check ---
  const hasSession = request.cookies.get('medflow-has-session');
  if (!hasSession) {
    const loginUrl = new URL('/auth/login', request.url);
    const redirect = NextResponse.redirect(loginUrl);
    // Preserve locale cookie on redirect
    if (!localeCookie || !SUPPORTED_LOCALES.includes(localeCookie)) {
      redirect.cookies.set('NEXT_LOCALE', DEFAULT_LOCALE, {
        path: '/',
        sameSite: 'strict',
        maxAge: 365 * 24 * 60 * 60,
      });
    }
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo\\.png|api).*)'],
};
