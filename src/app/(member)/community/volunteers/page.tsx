"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { StatsCard } from "@/components/ui/StatsCard";
import { RoleDetailModal } from "@/components/volunteers/RoleDetailModal";
import {
  CATEGORY_GROUPS,
  CATEGORY_LABELS,
  RECOGNITION_LABELS,
  TIER_SHORT_LABELS,
  VolunteersApi,
  type HoursSummary,
  type VolunteerOpportunity,
  type VolunteerProfile,
  type VolunteerReward,
  type VolunteerRole,
} from "@/lib/volunteers";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Shield,
  Star,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function VolunteerHubPage() {
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [profileNotFound, setProfileNotFound] = useState(false);
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [upcoming, setUpcoming] = useState<VolunteerOpportunity[]>([]);
  const [summary, setSummary] = useState<HoursSummary | null>(null);
  const [rewards, setRewards] = useState<VolunteerReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline role selection (replaces modal)
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(
    new Set(),
  );
  const [registering, setRegistering] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Role detail modal (kept for "Learn more")
  const [detailRole, setDetailRole] = useState<VolunteerRole | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load roles (public) + upcoming opportunities (public)
      const [rolesData, upcomingData] = await Promise.all([
        VolunteersApi.listRoles(),
        VolunteersApi.listUpcomingOpportunities(),
      ]);
      setRoles(rolesData);
      setUpcoming(upcomingData);

      // Try to load volunteer profile (may 404 if not registered)
      try {
        const profileData = await VolunteersApi.getMyProfile();
        setProfile(profileData);

        // Pre-select roles from existing profile
        if (profileData.preferred_roles?.length) {
          setSelectedRoleIds(new Set(profileData.preferred_roles));
        }

        // If registered, load summary and rewards
        const [summaryData, rewardsData] = await Promise.all([
          VolunteersApi.getMyHoursSummary(),
          VolunteersApi.getMyRewards(),
        ]);
        setSummary(summaryData);
        setRewards(rewardsData);
      } catch {
        setProfileNotFound(true);
      }
    } catch {
      setError("Failed to load volunteer data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
    setHasChanges(true);
  };

  const handleRegisterOrUpdate = async () => {
    setRegistering(true);
    setError(null);
    try {
      const roleIds = Array.from(selectedRoleIds);
      if (profileNotFound) {
        // First-time registration
        const newProfile = await VolunteersApi.registerAsVolunteer({
          preferred_roles: roleIds.length > 0 ? roleIds : undefined,
        });
        setProfile(newProfile);
        setProfileNotFound(false);
        // Load summary after registration
        const summaryData = await VolunteersApi.getMyHoursSummary();
        setSummary(summaryData);
      } else {
        // Update existing profile
        const updated = await VolunteersApi.updateMyProfile({
          preferred_roles: roleIds,
        });
        setProfile(updated);
      }
      setHasChanges(false);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return <LoadingPage text="Loading volunteer hub..." />;
  }

  const unredeemed = rewards.filter((r) => !r.is_redeemed);
  const tierColor =
    profile?.tier === "tier_3"
      ? "amber"
      : profile?.tier === "tier_2"
        ? "green"
        : "cyan";

  // Group roles by category section
  const groupedRoles = Object.entries(CATEGORY_GROUPS)
    .map(([key, group]) => {
      const groupRoles = roles.filter((r) =>
        group.categories.includes(r.category),
      );
      return { key, label: group.label, roles: groupRoles };
    })
    .filter((g) => g.roles.length > 0);

  // Any remaining roles not in a group
  const groupedCats = new Set(
    Object.values(CATEGORY_GROUPS).flatMap((g) => g.categories),
  );
  const ungroupedRoles = roles.filter((r) => !groupedCats.has(r.category));

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-4 md:py-8">
      {/* Header */}
      <header className="space-y-3">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          Volunteer Hub
        </h1>
        <p className="text-sm md:text-base text-slate-600">
          Help make SwimBuddz sessions and events better. Volunteering is
          rotational, flexible, and rewarding — pick the roles that interest you
          and claim opportunities when they fit your schedule.
        </p>
      </header>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Profile Summary (if registered) */}
      {profile && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            label="Total Hours"
            value={summary.total_hours.toFixed(1)}
            icon={<Clock className="h-5 w-5" />}
            color="cyan"
            description={`${summary.hours_this_month.toFixed(1)} this month`}
          />
          <StatsCard
            label="Tier"
            value={TIER_SHORT_LABELS[profile.tier]}
            icon={<Shield className="h-5 w-5" />}
            color={tierColor as "cyan" | "green" | "amber"}
            description={
              summary.next_tier_hours_needed
                ? `${summary.next_tier_hours_needed.toFixed(0)}h to next milestone`
                : "Top milestone reached"
            }
          />
          <StatsCard
            label="Sessions"
            value={summary.total_sessions}
            icon={<Calendar className="h-5 w-5" />}
            color="blue"
          />
          <StatsCard
            label="Reliability"
            value={`${profile.reliability_score}%`}
            icon={<Star className="h-5 w-5" />}
            color={profile.reliability_score >= 80 ? "green" : "amber"}
          />
        </div>
      )}

      {/* Recognition Badge */}
      {profile?.recognition_tier && (
        <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-amber-600" />
            <div>
              <span className="font-semibold text-amber-900">
                {RECOGNITION_LABELS[profile.recognition_tier]}
              </span>
              <span className="text-sm text-amber-700 ml-2">
                Volunteer Recognition
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Unredeemed Rewards */}
      {unredeemed.length > 0 && (
        <Card>
          <h3 className="mb-3 font-semibold text-slate-900">Your Rewards</h3>
          <div className="space-y-2">
            {unredeemed.map((reward) => (
              <div
                key={reward.id}
                className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-emerald-900">{reward.title}</p>
                  {reward.description && (
                    <p className="text-sm text-emerald-700">
                      {reward.description}
                    </p>
                  )}
                </div>
                <Badge variant="success">Available</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Volunteer Roles (primary content) ───────────────── */}
      <section className="space-y-5">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">
            {profileNotFound ? "Choose Your Roles" : "Your Volunteer Roles"}
          </h2>
          <p className="text-sm text-slate-500">
            {profileNotFound
              ? "Select the roles you're interested in to join the volunteer team. You can change these anytime."
              : "Toggle roles on or off. Your preferences help us match you with the right opportunities."}
          </p>
        </div>

        {groupedRoles.map((group) => (
          <div key={group.key} className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              {group.label}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.roles.map((role) => {
                const isSelected = selectedRoleIds.has(role.id);
                return (
                  <RoleCard
                    key={role.id}
                    role={role}
                    isSelected={isSelected}
                    onToggle={() => toggleRole(role.id)}
                    onLearnMore={() => setDetailRole(role)}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {ungroupedRoles.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Other Roles
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ungroupedRoles.map((role) => {
                const isSelected = selectedRoleIds.has(role.id);
                return (
                  <RoleCard
                    key={role.id}
                    role={role}
                    isSelected={isSelected}
                    onToggle={() => toggleRole(role.id)}
                    onLearnMore={() => setDetailRole(role)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── Upcoming Opportunities ───────────────────────── */}
      {upcoming.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              Upcoming Opportunities
            </h2>
            <Link
              href="/community/volunteers/opportunities"
              className="flex items-center gap-1 text-sm font-medium text-cyan-600 hover:text-cyan-700"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {upcoming.slice(0, 4).map((opp) => (
              <Link
                key={opp.id}
                href={`/community/volunteers/opportunities/${opp.id}`}
              >
                <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {opp.title}
                      </h3>
                      <Badge
                        variant={
                          opp.slots_filled >= opp.slots_needed
                            ? "warning"
                            : "info"
                        }
                      >
                        {opp.slots_filled}/{opp.slots_needed} filled
                      </Badge>
                    </div>
                    {opp.role_title && (
                      <Badge variant="default">{opp.role_title}</Badge>
                    )}
                    <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                      <span>
                        {new Date(opp.date).toLocaleDateString("en-NG", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {opp.start_time && (
                        <span>{opp.start_time.slice(0, 5)}</span>
                      )}
                      {opp.location_name && <span>{opp.location_name}</span>}
                    </div>
                    {opp.opportunity_type === "approval_required" && (
                      <p className="text-xs text-amber-600">
                        Requires admin approval
                      </p>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Leaderboard Link */}
      <Link href="/community/volunteers/leaderboard" className="mt-2 block">
        <Card className="flex items-center justify-between transition-shadow hover:shadow-md cursor-pointer">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-amber-500" />
            <span className="font-medium text-slate-900">
              Volunteer Leaderboard
            </span>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </Card>
      </Link>

      {/* Role Detail Modal */}
      <RoleDetailModal
        role={detailRole}
        isOpen={!!detailRole}
        onClose={() => setDetailRole(null)}
      />

      {/* Sticky bottom bar for confirm/save */}
      {(profileNotFound || hasChanges) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              {profileNotFound
                ? selectedRoleIds.size > 0
                  ? `${selectedRoleIds.size} role${selectedRoleIds.size !== 1 ? "s" : ""} selected`
                  : "Join without selecting roles, or pick some above"
                : `${selectedRoleIds.size} role${selectedRoleIds.size !== 1 ? "s" : ""} selected`}
            </p>
            <Button
              onClick={handleRegisterOrUpdate}
              disabled={registering}
              size="sm"
            >
              {registering
                ? "Saving..."
                : profileNotFound
                  ? "Join Volunteer Team"
                  : "Save Changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Role Card Component ──────────────────────────────────────────────

type RoleCardProps = {
  role: VolunteerRole;
  isSelected: boolean;
  onToggle: () => void;
  onLearnMore: () => void;
};

function RoleCard({ role, isSelected, onToggle, onLearnMore }: RoleCardProps) {
  return (
    <div
      onClick={onToggle}
      className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
        isSelected
          ? "border-cyan-500 bg-cyan-50/50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <CheckCircle className="h-5 w-5 text-cyan-600" />
        </div>
      )}

      <div className="flex items-start gap-3 pr-6">
        <span className="text-2xl leading-none">{role.icon || "🙋"}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-900">{role.title}</h4>
          <p className="mt-0.5 text-xs text-slate-500">
            {CATEGORY_LABELS[role.category] || role.category}
          </p>
          {role.description && (
            <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">
              {role.description}
            </p>
          )}
          <button
            type="button"
            className="mt-2 text-xs font-medium text-cyan-600 hover:text-cyan-700"
            onClick={(e) => {
              e.stopPropagation();
              onLearnMore();
            }}
          >
            Learn more
          </button>
        </div>
      </div>

      {/* Active volunteers count */}
      {role.active_volunteers_count > 0 && (
        <p className="mt-2 text-xs text-slate-400">
          {role.active_volunteers_count} active volunteer
          {role.active_volunteers_count !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
