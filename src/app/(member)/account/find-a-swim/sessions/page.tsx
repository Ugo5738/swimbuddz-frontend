import { redirect } from "next/navigation";

/** Legacy URLs remain valid; discovery is owned by the new Find a Swim page. */
export default async function LegacyFindSessions({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const incoming = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value)) value.forEach(item => query.append(key, item));
  }
  const view = query.get("view");
  if (["past", "history", "booked", "my"].includes(view || "")) {
    redirect(`/account/bookings?view=${view === "past" ? "history" : view}`);
  }
  query.delete("view");
  redirect(`/account/find-a-swim${query.size ? `?${query.toString()}` : ""}`);
}
