import { safeReturnPath } from "@/lib/returnPath";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/config";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";
  const nextPath = safeReturnPath(next) ?? "/account";
  const isPasswordReset = nextPath === "/reset-password";

  function redirectError(message: string) {
    // Recovery errors belong on the reset page, which can also read any
    // Supabase error fragment preserved by the browser across this redirect.
    const url = new URL(
      isPasswordReset ? "/reset-password" : "/auth/auth-code-error",
      origin,
    );
    url.searchParams.set("error", message);
    return NextResponse.redirect(url);
  }

  const authError = searchParams.get("error");
  if (authError) {
    return redirectError(searchParams.get("error_description") || authError);
  }

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
        // Best-effort: complete any pending registration so member routes don't fail on first login.
        // Skip this for password recovery — the user already has a member profile.
        if (!isPasswordReset) {
          try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (token) {
              await fetch(
                `${API_BASE_URL}/api/v1/pending-registrations/complete`,
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
        return redirectError(error.message);
      }
    } catch (err) {
      console.error("Auth callback error:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      return redirectError(message);
    }
  }

  // Return the user to an error page with instructions
  return redirectError("no_code");
}
