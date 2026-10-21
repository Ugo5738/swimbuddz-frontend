import { redirect } from "next/navigation";

export default async function LegacyMemberSessions({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const incoming = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
  }
  redirect(`/account/find-a-swim/sessions${query.size ? `?${query.toString()}` : ""}`);
}
