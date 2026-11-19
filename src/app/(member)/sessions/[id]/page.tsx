import { SessionDetailContent } from "@/components/swims/SessionDetailContent";

/** Direct links remain supported for refreshes, bookmarks and external shares. */
export default function SessionDetailsPage({ params }: { params: { id: string } }) {
  return <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
    <SessionDetailContent sessionId={params.id} />
  </main>;
}
