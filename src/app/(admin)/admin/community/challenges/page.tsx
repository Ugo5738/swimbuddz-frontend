"use client";

/**
 * Admin → Challenges (list)
 *
 * List view only. The create + edit forms live on their own routes
 * (`/new` and `/[id]/edit`) so we can deep-link to "edit this one",
 * the page stays scannable, and the browser back/forward stack tells
 * an honest story.
 *
 * Cross-links from this page:
 *   - Create: /admin/community/challenges/new
 *   - Edit:   /admin/community/challenges/{id}/edit
 *   - Review submissions: /admin/community/challenges/submissions
 *   - Approval audit:     /admin/community/challenges/audit
 */

import { authedFetch, ClubChallenge } from "@/components/admin/challenges/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiEndpoints } from "@/lib/config";
import {
  Calendar,
  ClipboardCheck,
  Pencil,
  Plus,
  Shield,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminChallengesPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<ClubChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      // Trailing slash on the collection root avoids a 307 redirect to
      // `/challenges/` that the proxy rewrites to http:// (mixed content).
      const response = await authedFetch(`${apiEndpoints.challenges}/?active_only=false`);
      if (response.ok) {
        const data: ClubChallenge[] = await response.json();
        setChallenges(data);
      } else {
        console.error("Failed to fetch challenges:", response.status);
      }
    } catch (error) {
      console.error("Failed to fetch challenges:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (challenge: ClubChallenge): Promise<void> => {
    try {
      const response = await authedFetch(`${apiEndpoints.challenges}/${challenge.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !challenge.is_active }),
      });
      if (response.ok) await fetchChallenges();
    } catch (error) {
      console.error("Failed to toggle challenge status:", error);
    }
  };

  const handleDelete = async (challenge: ClubChallenge) => {
    if (
      !confirm(`Delete "${challenge.title}"? Existing submissions and media will also be removed.`)
    )
      return;
    try {
      const response = await authedFetch(`${apiEndpoints.challenges}/${challenge.id}`, {
        method: "DELETE",
      });
      if (response.ok) await fetchChallenges();
    } catch (error) {
      console.error("Failed to delete challenge:", error);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Club Challenge Management
          </h1>
          <p className="mt-2 text-slate-600">
            Create and manage challenges, badges, and submission rewards
          </p>
        </div>
        <div className="flex w-fit items-center gap-2">
          <Link href="/admin/community/challenges/submissions">
            <Button variant="secondary" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Review submissions
            </Button>
          </Link>
          <Link href="/admin/community/challenges/audit">
            <Button variant="secondary" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Approval audit
            </Button>
          </Link>
          <Link href="/admin/community/challenges/new">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Challenge
            </Button>
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="py-12 text-center text-slate-600">Loading challenges...</div>
      ) : challenges.length === 0 ? (
        <Card className="p-12 text-center">
          <Trophy className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No challenges yet</h3>
          <p className="mt-2 text-sm text-slate-600">Create your first challenge to get started.</p>
          <div className="mt-4">
            <Link href="/admin/community/challenges/new">
              <Button className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Challenge
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              onEdit={() => router.push(`/admin/community/challenges/${challenge.id}/edit`)}
              onToggle={() => handleToggleActive(challenge)}
              onDelete={() => handleDelete(challenge)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponent: rendered challenge card
// ---------------------------------------------------------------------------

function ChallengeCard({
  challenge,
  onEdit,
  onToggle,
  onDelete,
}: {
  challenge: ClubChallenge;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-1 items-start gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-amber-50 text-amber-600">
            {challenge.badge_image_url ? (
              <Image
                src={challenge.badge_image_url}
                alt={challenge.badge_name}
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <Trophy className="h-7 w-7" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900">{challenge.title}</h3>
              <Chip color={challenge.is_active ? "green" : "gray"}>
                {challenge.is_active ? "Active" : "Inactive"}
              </Chip>
              <Chip color="cyan">{challenge.challenge_type}</Chip>
              <Chip color="indigo">{challenge.audience}</Chip>
              <Chip color={challenge.format === "competition" ? "rose" : "blue"}>
                {challenge.format}
              </Chip>
              {challenge.is_public && <Chip color="violet">public</Chip>}
              {challenge.team_enabled && <Chip color="amber">team</Chip>}
            </div>

            {challenge.badge_name && (
              <div className="inline-flex items-center gap-1 text-sm text-amber-700">
                🏅 <span className="font-medium">{challenge.badge_name}</span>
              </div>
            )}

            {challenge.description && (
              <p className="text-sm text-slate-700">{challenge.description}</p>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              <span>
                <strong>{challenge.completion_count}</strong> approved
              </span>
              <span>
                <strong>{challenge.submission_count}</strong> submitted
              </span>
              {challenge.reward_bubbles_amount != null && (
                <span>💧 {challenge.reward_bubbles_amount} Bubbles</span>
              )}
              {challenge.reward_volunteer_hours != null && (
                <span>⏱ {challenge.reward_volunteer_hours} hrs</span>
              )}
              {challenge.starts_at && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(challenge.starts_at).toLocaleDateString()}
                  {challenge.ends_at && ` – ${new Date(challenge.ends_at).toLocaleDateString()}`}
                </span>
              )}
              {challenge.team_enabled && (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {challenge.team_min_size ?? 1}–{challenge.team_max_size ?? "∞"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={onEdit} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="secondary" onClick={onToggle}>
            {challenge.is_active ? "Deactivate" : "Activate"}
          </Button>
          <Button
            variant="secondary"
            onClick={onDelete}
            className="text-red-600 hover:bg-red-50"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Chip({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "green" | "gray" | "cyan" | "indigo" | "rose" | "blue" | "violet" | "amber";
}) {
  const palette: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-700",
    gray: "bg-slate-100 text-slate-600",
    cyan: "bg-cyan-50 text-cyan-700",
    indigo: "bg-indigo-50 text-indigo-700",
    rose: "bg-rose-50 text-rose-700",
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${palette[color]}`}>
      {children}
    </span>
  );
}
