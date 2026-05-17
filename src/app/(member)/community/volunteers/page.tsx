"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { StatsCard } from "@/components/ui/StatsCard";
import { OpportunityCard } from "@/components/volunteers/OpportunityCard";
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
import { useEffect, useMemo, useState } from "react";

type HubTab = "opportunities" | "interests";

export default function VolunteerHubPage() {
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [profileNotFound, setProfileNotFound] = useState(false);
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [upcoming, setUpcoming] = useState<VolunteerOpportunity[]>([]);
  const [summary, setSummary] = useState<HoursSummary | null>(null);
  const [rewards, setRewards] = useState<VolunteerReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Role selection (My Interests tab)
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(
    new Set(),
  );
  const [registering, setRegistering] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Inline claim on the Opportunities tab
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Role detail modal (kept for "Learn more")
  const [detailRole, setDetailRole] = useState<VolunteerRole | null>(null);

  // Tab state — defaults set after we know whether the member is registered
  // and whether they have any interests set.
  const [activeTab, setActiveTab] = useState<HubTab>("opportunities");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesData, upcomingData] = await Promise.all([
        VolunteersApi.listRoles(),
        VolunteersApi.listUpcomingOpportunities(),
      ]);
      setRoles(rolesData);
      setUpcoming(upcomingData);

      try {
        const profileData = await VolunteersApi.getMyProfile();
        setProfile(profileData);
        setProfileNotFound(false);

        if (profileData.preferred_roles?.length) {
          setSelectedRoleIds(new Set(profileData.preferred_roles));
        }

        const [summaryData, rewardsData] = await Promise.all([
          VolunteersApi.getMyHoursSummary(),
          VolunteersApi.getMyRewards(),
        ]);
        setSummary(summaryData);
        setRewards(rewardsData);

        // Registered members default to the Opportunities tab; if they
        // haven't picked any interests yet, surface that on the Opps tab
        // via a banner (rather than dumping them on Interests).
        setActiveTab("opportunities");
      } catch {
        setProfileNotFound(true);
        // Unregistered members go straight to the onboarding view — no tabs
        // shown, role grid + Join CTA is the whole page.
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
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
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
        const newProfile = await VolunteersApi.registerAsVolunteer({
          preferred_roles: roleIds.length > 0 ? roleIds : undefined,
        });
        setProfile(newProfile);
        setProfileNotFound(false);
        const summaryData = await VolunteersApi.getMyHoursSummary();
        setSummary(summaryData);
        // After first-time registration, drop them on the Opportunities tab
        // so they immediately see what they can sign up for.
        setActiveTab("opportunities");
      } else {
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

  const handleInlineClaim = async (oppId: string) => {
    setActionMsg(null);
    setError(null);
    setClaimingId(oppId);
    try {
      const slot = await VolunteersApi.claimSlot(oppId);
      setActionMsg(
        slot.status === "approved"
          ? "You're confirmed! See you there."
          : "Your request has been submitted.",
      );
      // Refresh the upcoming list so slots_filled and any "you're signed up"
      // state reflect immediately.
      const upcomingData = await VolunteersApi.listUpcomingOpportunities();
      setUpcoming(upcomingData);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to claim slot.";
      setError(message);
    } finally {
      setClaimingId(null);
    }
  };

  // Group roles by category section
  const groupedRoles = useMemo(() => {
    return Object.entries(CATEGORY_GROUPS)
      .map(([key, group]) => ({
        key,
        label: group.label,
        roles: roles.filter((r) => group.categories.includes(r.category)),
      }))
      .filter((g) => g.roles.length > 0);
  }, [roles]);

  const ungroupedRoles = useMemo(() => {
    const groupedCats = new Set(
      Object.values(CATEGORY_GROUPS).flatMap((g) => g.categories),
    );
    return roles.filter((r) => !groupedCats.has(r.category));
  }, [roles]);

  if (loading) {
    return <LoadingPage text="Loading volunteer hub..." />;
  }

  // ─── Unregistered: dedicated onboarding view (no tabs) ────────────────
  if (profileNotFound) {
    return (
      <OnboardingView
        roles={roles}
        groupedRoles={groupedRoles}
        ungroupedRoles={ungroupedRoles}
        selectedRoleIds={selectedRoleIds}
        onToggleRole={toggleRole}
        onLearnMore={setDetailRole}
        onJoin={handleRegisterOrUpdate}
        registering={registering}
        error={error}
        detailRole={detailRole}
        onCloseDetail={() => setDetailRole(null)}
      />
    );
  }

  // ─── Registered: header + tabs ────────────────────────────────────────
  const unredeemed = rewards.filter((r) => !r.is_redeemed);
  const tierColor =
    profile?.tier === "tier_3"
      ? "amber"
      : profile?.tier === "tier_2"
        ? "green"
        : "cyan";
  const hasNoInterests = !profile?.preferred_roles?.length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-4 md:py-8 pb-24">
      {/* Header */}
      <header className="space-y-3">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          Volunteer Hub
        </h1>
        <p className="text-sm md:text-base text-slate-600">
          Help make SwimBuddz sessions and events better. Pick the roles that
          interest you, and claim opportunities when they fit your schedule.
        </p>
      </header>

      {error && <Alert variant="error">{error}</Alert>}
      {actionMsg && <Alert variant="success">{actionMsg}</Alert>}

      {/* Always-visible profile context */}
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

      {/* Tabs */}
      <FilterTabs
        options={[
          { value: "opportunities" as const, label: "Open Opportunities" },
          { value: "interests" as const, label: "My Interests" },
        ]}
        value={activeTab}
        onChange={(v) => setActiveTab(v)}
      />

      {/* ── Opportunities tab ───────────────────────────── */}
      {activeTab === "opportunities" && (
        <section className="space-y-4">
          {hasNoInterests && (
            <Card className="border-cyan-200 bg-cyan-50">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-cyan-900">
                  Pick the roles you care about to get matched first when new
                  opportunities open.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setActiveTab("interests")}
                >
                  Set interests
                </Button>
              </div>
            </Card>
          )}

          {upcoming.length === 0 ? (
            <Card className="py-12 text-center">
              <Calendar className="mx-auto h-10 w-10 text-slate-400" />
              <p className="mt-3 text-slate-600">
                No open opportunities right now — check back soon.
              </p>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {upcoming.slice(0, 6).map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opp={opp}
                    memberTier={profile?.tier ?? null}
                    onClaim={handleInlineClaim}
                    claiming={claimingId === opp.id}
                  />
                ))}
              </div>
              {upcoming.length > 6 && (
                <Link
                  href="/community/volunteers/opportunities"
                  className="flex items-center justify-center gap-1 text-sm font-medium text-cyan-600 hover:text-cyan-700"
                >
                  View all {upcoming.length} opportunities{" "}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </>
          )}
        </section>
      )}

      {/* ── My Interests tab ────────────────────────────── */}
      {activeTab === "interests" && (
        <section className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">
              Your Volunteer Roles
            </h2>
            <p className="text-sm text-slate-500">
              Toggle roles on or off. Your preferences help us match you with
              the right opportunities.
            </p>
          </div>

          {groupedRoles.map((group) => (
            <div key={group.key} className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                {group.label}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.roles.map((role) => (
                  <RoleCard
                    key={role.id}
                    role={role}
                    isSelected={selectedRoleIds.has(role.id)}
                    onToggle={() => toggleRole(role.id)}
                    onLearnMore={() => setDetailRole(role)}
                  />
                ))}
              </div>
            </div>
          ))}

          {ungroupedRoles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Other Roles
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ungroupedRoles.map((role) => (
                  <RoleCard
                    key={role.id}
                    role={role}
                    isSelected={selectedRoleIds.has(role.id)}
                    onToggle={() => toggleRole(role.id)}
                    onLearnMore={() => setDetailRole(role)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Leaderboard link */}
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

      {/* Sticky save bar — only while editing interests */}
      {activeTab === "interests" && hasChanges && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              {selectedRoleIds.size} role
              {selectedRoleIds.size !== 1 ? "s" : ""} selected
            </p>
            <Button
              onClick={handleRegisterOrUpdate}
              disabled={registering}
              size="sm"
            >
              {registering ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Onboarding view (unregistered members) ────────────────────────────

interface OnboardingViewProps {
  roles: VolunteerRole[];
  groupedRoles: {
    key: string;
    label: string;
    roles: VolunteerRole[];
  }[];
  ungroupedRoles: VolunteerRole[];
  selectedRoleIds: Set<string>;
  onToggleRole: (id: string) => void;
  onLearnMore: (role: VolunteerRole) => void;
  onJoin: () => void;
  registering: boolean;
  error: string | null;
  detailRole: VolunteerRole | null;
  onCloseDetail: () => void;
}

function OnboardingView({
  roles,
  groupedRoles,
  ungroupedRoles,
  selectedRoleIds,
  onToggleRole,
  onLearnMore,
  onJoin,
  registering,
  error,
  detailRole,
  onCloseDetail,
}: OnboardingViewProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 py-4 md:py-8 pb-24">
      <header className="space-y-3 text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          Join the Volunteer Team
        </h1>
        <p className="text-sm md:text-base text-slate-600">
          Pick the roles you&apos;re interested in to get matched with the right
          opportunities. You can change these anytime.
        </p>
      </header>

      {error && <Alert variant="error">{error}</Alert>}

      <section className="space-y-5">
        {groupedRoles.map((group) => (
          <div key={group.key} className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              {group.label}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.roles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  isSelected={selectedRoleIds.has(role.id)}
                  onToggle={() => onToggleRole(role.id)}
                  onLearnMore={() => onLearnMore(role)}
                />
              ))}
            </div>
          </div>
        ))}

        {ungroupedRoles.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Other Roles
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ungroupedRoles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  isSelected={selectedRoleIds.has(role.id)}
                  onToggle={() => onToggleRole(role.id)}
                  onLearnMore={() => onLearnMore(role)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <RoleDetailModal
        role={detailRole}
        isOpen={!!detailRole}
        onClose={onCloseDetail}
      />

      {/* Always-visible Join CTA (sticky) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {selectedRoleIds.size > 0
              ? `${selectedRoleIds.size} role${selectedRoleIds.size !== 1 ? "s" : ""} selected`
              : roles.length > 0
                ? "Pick some roles, or join without — you can set them later"
                : "Loading roles…"}
          </p>
          <Button onClick={onJoin} disabled={registering} size="sm">
            {registering ? "Joining…" : "Join Volunteer Team"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Role Card (used by both views) ─────────────────────────────────

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

      {role.active_volunteers_count > 0 && (
        <p className="mt-2 text-xs text-slate-400">
          {role.active_volunteers_count} active volunteer
          {role.active_volunteers_count !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
