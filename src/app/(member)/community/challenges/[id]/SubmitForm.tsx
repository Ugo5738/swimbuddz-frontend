"use client";

/**
 * SubmitForm — member-facing form for attempting a challenge.
 *
 * Handles solo and team submissions. Proof media is uploaded one file at a
 * time via uploadMedia(file, "challenge_proof"); the resulting media_ids
 * are then sent in a single `POST /challenges/{id}/submissions` call.
 *
 * Team selection uses the public member directory (members who opted into
 * the community directory). The captain (current user) is added by the
 * backend automatically — only OTHER teammates go in `team_member_ids`.
 */

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { apiGet } from "@/lib/api";
import {
  Challenge,
  ChallengeSubmissionPayload,
  isVideoUrl,
  submitChallenge,
} from "@/lib/challenges";
import { uploadMedia } from "@/lib/media";
import {
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface DirectoryMember {
  id: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  profile_photo_url?: string | null;
  membership_tier?: string;
}

interface UploadedProof {
  media_id: string;
  file_url: string;
  is_video: boolean;
  filename: string;
}

interface SubmitFormProps {
  challenge: Challenge;
  onSuccess: (message: string) => void;
}

export function SubmitForm({ challenge, onSuccess }: SubmitFormProps) {
  const [note, setNote] = useState("");
  const [uploads, setUploads] = useState<UploadedProof[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [me, setMe] = useState<{ id: string } | null>(null);
  const [teammates, setTeammates] = useState<DirectoryMember[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolve the current member's id so we can exclude self from teammate picker
  useEffect(() => {
    let cancelled = false;
    apiGet<{ id: string }>("/api/v1/members/me", { auth: true })
      .then((member) => {
        if (!cancelled) setMe(member);
      })
      .catch(() => {
        // Not fatal — backend will still verify auth on submit
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploadingCount((n) => n + files.length);
    try {
      const newUploads: UploadedProof[] = [];
      for (const file of Array.from(files)) {
        try {
          const media = await uploadMedia(file, "challenge_proof");
          newUploads.push({
            media_id: media.id,
            file_url: media.file_url,
            is_video: file.type.startsWith("video/") || isVideoUrl(media.file_url),
            filename: file.name,
          });
        } catch (err) {
          setUploadError(
            err instanceof Error ? err.message : `Upload failed: ${file.name}`,
          );
        } finally {
          setUploadingCount((n) => Math.max(0, n - 1));
        }
      }
      if (newUploads.length) {
        setUploads((prev) => [...prev, ...newUploads]);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setUploadingCount(0);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeUpload = (mediaId: string) => {
    setUploads((prev) => prev.filter((u) => u.media_id !== mediaId));
  };

  const teamCount = 1 + teammates.length; // captain + others
  const teamSizeOk = !challenge.team_enabled
    ? !teammates.length
    : (challenge.team_min_size == null || teamCount >= challenge.team_min_size) &&
      (challenge.team_max_size == null || teamCount <= challenge.team_max_size);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (uploadingCount > 0) {
      setError("Wait for all uploads to finish.");
      return;
    }
    if (uploads.length === 0) {
      setError("Add at least one proof video or photo.");
      return;
    }
    if (challenge.team_enabled && !teamSizeOk) {
      setError(
        `Team size must be ${challenge.team_min_size ?? 1}–${
          challenge.team_max_size ?? "∞"
        }. You have ${teamCount}.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload: ChallengeSubmissionPayload = {
        challenge_id: challenge.id,
        submission_note: note.trim() || null,
        proof_media: uploads.map((u, idx) => ({
          media_id: u.media_id,
          order_idx: idx,
        })),
        team_member_ids: challenge.team_enabled
          ? teammates.map((m) => m.id)
          : [],
      };
      await submitChallenge(payload);
      onSuccess(
        challenge.team_enabled
          ? "Team attempt submitted! An admin will review it shortly."
          : "Attempt submitted! An admin will review it shortly.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Proof upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          Proof — photos or videos of your attempt
          <span className="ml-1 text-rose-600">*</span>
        </label>
        <div className="rounded-md border border-dashed border-slate-300 p-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2"
            disabled={uploadingCount > 0}
          >
            {uploadingCount > 0 ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading… ({uploadingCount} left)
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Add files
              </>
            )}
          </Button>
          {uploadError && (
            <p className="mt-2 text-sm text-rose-600">{uploadError}</p>
          )}
        </div>

        {uploads.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {uploads.map((u) => (
              <div
                key={u.media_id}
                className="relative overflow-hidden rounded-md border border-slate-200"
              >
                {u.is_video ? (
                  <video
                    src={u.file_url}
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-video w-full bg-slate-900"
                  />
                ) : (
                  <img
                    src={u.file_url}
                    alt={u.filename}
                    className="aspect-video w-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeUpload(u.media_id)}
                  className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-slate-700 shadow hover:text-rose-600"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Optional note */}
      <Textarea
        label="Note (optional)"
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anything the admin should know — context, time, equipment used, etc."
      />

      {/* Team selection */}
      {challenge.team_enabled && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Teammates ({teamCount} total — needs{" "}
            {challenge.team_min_size ?? 1}
            {challenge.team_max_size ? `–${challenge.team_max_size}` : "+"})
          </label>
          <TeamPicker
            selected={teammates}
            onChange={setTeammates}
            excludeMemberId={me?.id ?? null}
          />
          <p className="text-xs text-slate-500">
            You're added automatically as captain. Add the rest of your team
            here.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit attempt"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Team picker (members from the public directory)
// ---------------------------------------------------------------------------

function TeamPicker({
  selected,
  onChange,
  excludeMemberId,
}: {
  selected: DirectoryMember[];
  onChange: (next: DirectoryMember[]) => void;
  excludeMemberId: string | null;
}) {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<DirectoryMember[]>("/api/v1/members/directory")
      .then((data) => {
        if (!cancelled) setMembers(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedIds = useMemo(
    () => new Set(selected.map((m) => m.id)),
    [selected],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => m.id !== excludeMemberId && !selectedIds.has(m.id))
      .filter((m) => {
        if (!q) return true;
        const haystack = [
          m.display_name,
          m.first_name ?? "",
          m.last_name ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 30);
  }, [members, query, selectedIds, excludeMemberId]);

  return (
    <div ref={containerRef} className="relative space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-2">
        {selected.map((m) => (
          <span
            key={m.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700"
          >
            {m.profile_photo_url ? (
              <img
                src={m.profile_photo_url}
                alt={m.display_name}
                className="h-4 w-4 rounded-full object-cover"
              />
            ) : (
              <ImageIcon className="h-3 w-3" />
            )}
            {m.display_name}
            <button
              type="button"
              onClick={() =>
                onChange(selected.filter((s) => s.id !== m.id))
              }
              aria-label={`Remove ${m.display_name}`}
              className="ml-0.5 rounded hover:text-rose-600"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <Input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder={
            selected.length === 0
              ? "Search members to add…"
              : "Add another teammate…"
          }
          className="!min-w-[8rem] flex-1 !border-0 !p-1 !shadow-none focus:!ring-0"
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading members…
            </div>
          ) : error ? (
            <div className="px-3 py-3 text-sm text-rose-600">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-500">
              {query
                ? "No matching members."
                : "Type to search the community directory."}
            </div>
          ) : (
            <ul role="listbox" className="py-1">
              {filtered.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange([...selected, m]);
                      setQuery("");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-cyan-50"
                  >
                    {m.profile_photo_url ? (
                      <img
                        src={m.profile_photo_url}
                        alt={m.display_name}
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100">
                        <ImageIcon className="h-4 w-4 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {m.display_name}
                      </p>
                      {m.membership_tier && (
                        <p className="truncate text-xs text-slate-500">
                          {m.membership_tier}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
