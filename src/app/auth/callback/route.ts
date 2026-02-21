import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";
  const nextPath =
    next.startsWith("/") && !next.startsWith("//") ? next : "/account";

  if (code) {
    try {
      const cookieStore = cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              cookieStore.set({ name, value, ...options });
            },
            remove(name: string, options: CookieOptions) {
              cookieStore.set({ name, value: "", ...options });
            },
          },
        },
      );

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        // Best-effort: complete any pending registration so member routes don't fail on first login
        // Skip this for password recovery — the user already has a member profile.
        const isPasswordReset = nextPath === "/reset-password";
        if (!isPasswordReset) {
          try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (token) {
              const apiBaseUrl =
                process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
              await fetch(
                `${apiBaseUrl}/api/v1/pending-registrations/complete`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              );
            }
          } catch {
            // Ignore completion failures - it may already be completed.
          }
        }

        return NextResponse.redirect(`${origin}${nextPath}`);
      } else {
        console.error("Supabase auth error:", error);
        return NextResponse.redirect(
          `${origin}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`,
        );
      }
    } catch (err) {
      console.error("Auth callback error:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.redirect(
        `${origin}/auth/auth-code-error?error=${encodeURIComponent(message)}`,
      );
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_code`);
}
