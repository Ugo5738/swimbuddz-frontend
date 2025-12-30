import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are missing.");
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

/**
 * Get the current access token, with automatic session cleanup on error.
 * If the session is invalid or expired, signs out and redirects to login.
 */
export async function getCurrentAccessToken(): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.warn("Session error detected, signing out:", error.message);
      await handleInvalidSession();
      return null;
    }

    return session?.access_token ?? null;
  } catch (err) {
    console.error("Error getting session:", err);
    return null;
  }
}

/**
 * Handle invalid/expired sessions by signing out and redirecting to login.
 */
async function handleInvalidSession(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore signout errors - we're already in a bad state
  }

  // Only redirect if we're in a browser context
  if (typeof window !== "undefined") {
    // Clear any stale local storage
    localStorage.removeItem("sb-" + supabaseUrl?.split("//")[1]?.split(".")[0] + "-auth-token");
    window.location.href = "/login?session=expired";
  }
}

/**
 * Initialize auth state change listener.
 * Call this once when the app loads to handle session events.
 */
export function initAuthListener(): void {
  if (typeof window === "undefined") return;

  supabase.auth.onAuthStateChange((event, session) => {
    // Handle token refresh errors
    if (event === "TOKEN_REFRESHED" && !session) {
      console.warn("Token refresh failed, session is invalid");
      handleInvalidSession();
    }

    // Handle explicit sign out
    if (event === "SIGNED_OUT") {
      // Clear any cached data
      console.log("User signed out");
    }

    // Handle initial session check failure
    if (event === "INITIAL_SESSION" && !session) {
      // User is not logged in - this is fine for public pages
      console.log("No initial session found");
    }
  });
}

/**
 * Refresh the session manually. Returns true if successful.
 */
export async function refreshSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();

    if (error || !data.session) {
      console.warn("Session refresh failed:", error?.message);
      await handleInvalidSession();
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error refreshing session:", err);
    await handleInvalidSession();
    return false;
  }
}
