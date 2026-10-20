import { sessionDiscoveryUrl } from "@/lib/swim-ia-routes";
import { redirect } from "next/navigation";

/** Preserve old sessions links, including booked/past query variants. */
export default async function LegacySessionsIndex({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const incoming = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
  }
  redirect(sessionDiscoveryUrl(params));
}
