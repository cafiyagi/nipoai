import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Paths that bypass Supabase session refresh entirely.
 * These endpoints use their own authentication mechanisms:
 *   - /api/webhooks/*  — Stripe signature verification
 *   - /api/slack/*     — Slack request signature
 */
// M-6: Only skip auth for webhook/callback paths that use their own verification
const SKIP_AUTH_PREFIXES = ["/api/webhooks", "/api/slack/callback", "/api/slack/oauth"];

/**
 * Paths that require an authenticated session.
 * Unauthenticated visitors are redirected to /login.
 */
const PROTECTED_PREFIXES = ["/dashboard"];

/**
 * Paths that authenticated users should not see.
 * Logged-in visitors are redirected to /dashboard.
 */
const AUTH_PAGES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // -------------------------------------------------------------------------
  // 1. Skip session refresh for webhook / slack routes
  // -------------------------------------------------------------------------
  if (SKIP_AUTH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // -------------------------------------------------------------------------
  // 2. Refresh the Supabase session (reads + writes cookies)
  // -------------------------------------------------------------------------
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies into the outgoing request so downstream
          // Server Components see the refreshed token immediately.
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          // Also write them into the response so the browser stores them.
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // IMPORTANT: Do NOT call supabase.auth.getSession() here.
  // Only getUser() sends a request to the Supabase Auth server to
  // validate the token. getSession() reads from local storage and
  // can be spoofed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // -------------------------------------------------------------------------
  // 3. Redirect unauthenticated users away from protected pages
  // -------------------------------------------------------------------------
  if (
    !user &&
    PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    // Preserve the originally requested path so we can redirect back
    // after a successful login.
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // -------------------------------------------------------------------------
  // 4. Redirect authenticated users away from auth pages and landing page
  // -------------------------------------------------------------------------
  if (user && (pathname === "/" || AUTH_PAGES.some((page) => pathname.startsWith(page)))) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *   - _next/static  (static files)
     *   - _next/image   (image optimization)
     *   - favicon.ico   (favicon)
     *   - public assets (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
