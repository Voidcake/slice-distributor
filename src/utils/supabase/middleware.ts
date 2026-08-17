import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database";

export const updateSession = async (request: NextRequest) => {
  const protectedRoutes = ["/dashboard", "/POS", "/reheat-station", "/protected"];
  const isProtectedRoute = protectedRoutes.some(
    (route) =>
      request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(`${route}/`),
  );

  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const user = await supabase.auth.getUser();

    if (isProtectedRoute && user.error) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    if (request.nextUrl.pathname === "/" && !user.error) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return response;
  } catch {
    if (isProtectedRoute) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("error", "Authentication is temporarily unavailable");
      return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
