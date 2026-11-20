import Link from "next/link";
import { SessionDetailContent } from "@/components/swims/SessionDetailContent";

/** Direct links remain supported for refreshes, bookmarks and external shares. */
export default function SessionDetailsPage({ params }: { params: { id: string } }) {
  return <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
    <Link href="/account/bookings" className="inline-block text-sm font-semibold text-cyan-700 hover:underline">← My Swims</Link>
    <SessionDetailContent sessionId={params.id} />
  </main>;
}
