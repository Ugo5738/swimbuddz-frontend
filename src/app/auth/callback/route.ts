import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/profile";

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
                        }
                    }
                }
            );

            const { error } = await supabase.auth.exchangeCodeForSession(code);

            if (!error) {
                return NextResponse.redirect(`${origin}${next}?action=complete_registration`);
            } else {
                console.error("Supabase auth error:", error);
                return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`);
            }
        } catch (err) {
            console.error("Auth callback error:", err);
            const message = err instanceof Error ? err.message : "Unknown error";
            return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(message)}`);
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_code`);
}
