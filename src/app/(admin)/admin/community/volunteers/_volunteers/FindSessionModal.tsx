"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { VolunteerOpportunity } from "@/lib/volunteers";

import { formatDate } from "../utils";

type Candidate = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location_name?: string | null;
};

type Props = {
  suggestForOpp: VolunteerOpportunity | null;
  suggestCandidates: Candidate[];
  suggestLoading: boolean;
  attachingSessionId: string | null;
  onClose: () => void;
  onAttach: (sessionId: string) => Promise<void>;
};

export function FindSessionModal({
  suggestForOpp,
  suggestCandidates,
  suggestLoading,
  attachingSessionId,
  onClose,
  onAttach,
}: Props) {
  return (
    <Modal
      isOpen={!!suggestForOpp}
      onClose={onClose}
      title={suggestForOpp ? `Find session — ${suggestForOpp.title}` : "Find session"}
    >
      {suggestForOpp && (
        <div className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Looking for sessions on <strong>{formatDate(suggestForOpp.date)}</strong>
            {suggestForOpp.location_name && (
              <>
                {" "}
                at <strong>{suggestForOpp.location_name}</strong>
              </>
            )}
            . Click a session to attach this opportunity to it — members booking that session will
            then see this volunteer slot.
          </div>

          {suggestLoading ? (
            <p className="py-6 text-center text-sm text-slate-500">Searching…</p>
          ) : suggestCandidates.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              No sessions found on this date
              {suggestForOpp.location_name ? ` at "${suggestForOpp.location_name}"` : ""}. Either
              the location string doesn't match any session's location, or no session exists yet
              on that date.
            </div>
          ) : (
            <ul className="space-y-2">
              {suggestCandidates.map((s) => {
                const startDt = new Date(s.starts_at);
                const endDt = new Date(s.ends_at);
                const timeRange = `${startDt.toLocaleTimeString("en-NG", {
                  hour: "2-digit",
                  minute: "2-digit",
                })} – ${endDt.toLocaleTimeString("en-NG", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`;
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{s.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {timeRange}
                        {s.location_name && ` · ${s.location_name}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onAttach(s.id)}
                      disabled={attachingSessionId !== null}
                    >
                      {attachingSessionId === s.id ? "Attaching…" : "Attach"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
