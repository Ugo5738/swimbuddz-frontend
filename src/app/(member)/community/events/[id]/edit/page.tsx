"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { OpenSwimForm } from "@/components/events/OpenSwimForm";
import { EventsApi, type EventResponse } from "@/lib/events";
import { MembersApi } from "@/lib/members";

export default function EditOpenSwimPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventResponse | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    Promise.all([
      EventsApi.get(eventId).catch(() => null),
      MembersApi.getMe()
        .then((m) => m.id as string)
        .catch(() => null),
    ]).then(([ev, id]) => {
      setEvent(ev);
      setMeId(id);
      setLoading(false);
    });
  }, [eventId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center text-slate-600">
        Loading…
      </div>
    );
  }

  const isOwner = !!event && !!meId && meId === event.created_by;
  const isOpenSwim = event?.event_type === "open_swim";

  if (!event || !isOwner || !isOpenSwim) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-12 text-center">
        <h2 className="text-xl font-bold text-slate-900">
          You can&apos;t edit this meet
        </h2>
        <p className="text-sm text-slate-600">
          Only the host can edit a meet they created.
        </p>
        <Button onClick={() => router.push("/community/events")}>
          Back to events
        </Button>
      </div>
    );
  }

  const handleCancel = async () => {
    if (
      !window.confirm(
        "Cancel this meet? Anyone who already paid will be refunded their Bubbles.",
      )
    ) {
      return;
    }
    setCancelling(true);
    try {
      await EventsApi.cancelOpenSwim(eventId);
      toast.success("Meet cancelled. Attendees have been refunded.");
      router.push("/community/events");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't cancel the meet.",
      );
      setCancelling(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <Link
        href={`/community/events/${eventId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-cyan-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to meet
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          Edit your meet
        </h1>
      </header>

      <OpenSwimForm mode="edit" eventId={eventId} initial={event} />

      <Card className="border-rose-200 p-6">
        <h3 className="text-sm font-semibold text-rose-700">Cancel this meet</h3>
        <p className="mt-1 text-xs text-slate-500">
          This removes the meet and refunds anyone who paid.
        </p>
        <Button
          variant="danger"
          onClick={handleCancel}
          disabled={cancelling}
          className="mt-3"
        >
          {cancelling ? "Cancelling…" : "Cancel meet"}
        </Button>
      </Card>
    </div>
  );
}
