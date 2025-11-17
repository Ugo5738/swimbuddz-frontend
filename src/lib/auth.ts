import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are missing.");
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export async function getCurrentAccessToken() {
  const {
    data: { session }
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
