import { redirect } from "next/navigation";

/** Legacy Sessions Hub entry: all discovery now lives under Find a Swim. */
export default async function LegacySessionsIndex({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
  }
  redirect(`/find-a-swim/sessions${query.size ? `?${query.toString()}` : ""}`);
}
