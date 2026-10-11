import { Card } from "@/components/ui/Card";

export type ReportingSection = {
  available: boolean;
  metrics: Record<string, number | null>;
  details?: Record<string, unknown>;
  notes?: string[];
};

export type QuarterlyEcosystemData = {
  version: number;
  computed_at: string;
  source?: "snapshot" | "live_preview";
  sections: Record<string, ReportingSection>;
  highlights: Array<{ title: string; description: string; status: string; sources?: string[] }>;
  external_podcast_episodes?: Array<{
    episode_number: number; title: string; url: string;
    original_release_at: string | null; verification: string; note?: string;
  }>;
};

const groups: Array<{ key: string; title: string; metrics: Array<[string, string]> }> = [
  { key: "members", title: "Clubs & pods", metrics: [
    ["clubs_configured", "Configured Clubs"], ["clubs_with_enrollments", "Clubs with enrollments"],
    ["pods_configured", "Configured pods"], ["pods_with_assignments", "Pods with quarter assignments"],
    ["pods_populated_at_end", "Populated pods at quarter-end"], ["pod_members_at_end", "Pod members at quarter-end"],
    ["club_published_plans", "Published plans covering quarter"], ["club_prepaid_enrollments", "Prepaid enrollments"],
    ["club_transition_enrollments", "Transition enrollments"],
  ] },
  { key: "sessions", title: "Sessions & guest booking", metrics: [
    ["locations_with_calendar_sessions", "Locations on calendar"], ["locations_with_recorded_swims", "Locations with swims"],
    ["calendar_sessions", "Calendar sessions"], ["completed_sessions", "Completed-status sessions"],
    ["sessions_with_checkins", "Sessions with check-ins"], ["guest_checkins", "Recorded guest visits"],
    ["group_bookings", "Group bookings"], ["confirmed_group_bookings", "Confirmed group bookings"],
    ["attached_guest_reservations", "Attached guest reservations"], ["guest_passes", "Guest passes"],
  ] },
  { key: "media", title: "Private Media Vaults", metrics: [
    ["vaults_created", "Vaults created"], ["vaults_populated", "Vaults with original uploads"],
    ["original_assets_uploaded", "Original assets uploaded"], ["media_contributors", "Contributors"],
    ["vault_original_assets_uploaded", "Original assets in vaults"],
    ["original_assets_published", "Original assets published"],
  ] },
  { key: "wallet", title: "Bubbles & checkout", metrics: [
    ["reward_bubbles", "Reward Bubbles"], ["reward_grants", "Reward grants"], ["reward_recipients", "Reward recipients"],
    ["purchase_bubbles", "Bubbles used for purchases"], ["purchase_users", "Purchase users"],
    ["refund_bubbles", "Refund Bubbles"], ["wallet_credits", "All wallet credits"], ["wallet_debits", "All wallet debits"],
  ] },
  { key: "members", title: "Community Experience ticketing", metrics: [
    ["experience_confirmed_orders", "Confirmed orders booked"], ["experience_named_tickets", "Named tickets"],
    ["experience_package_purchases", "Package entitlements"], ["experience_checkins", "Event check-ins"],
    ["experience_unique_attendees", "Distinct attendees"],
  ] },
  { key: "strokelab", title: "Stroke Lab", metrics: [
    ["strokelab_submissions", "Submissions"], ["strokelab_public_submissions", "Public submissions"],
    ["strokelab_completed_in_period", "Completed in quarter"],
  ] },
  { key: "academy", title: "Academy cohort records", metrics: [
    ["cohorts_in_window", "Cohorts overlapping quarter"], ["cohorts_started", "Cohorts started"],
    ["cohorts_ended", "Scheduled cohort ends"], ["certificates_issued", "Certificates recorded"],
    ["progress_updates_in_period", "Progress records updated"],
  ] },
  { key: "content", title: "Content & podcasts", metrics: [
    ["content_posts_published", "Articles published"], ["podcast_episodes_published", "Podcast episodes registered"],
  ] },
];

export function QuarterlyEcosystem({ data }: { data?: QuarterlyEcosystemData | null }) {
  if (!data) return <Card className="p-4 text-sm text-slate-600">Extended quarterly metrics have not been collected for this snapshot.</Card>;
  return <section className="space-y-4" aria-label="Extended quarterly metrics">
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Clubs, pods & new services</h2>
      <p className="text-sm text-slate-500">{data.source === "live_preview" ? "Live preview — regenerate the quarter to save these figures." : "Captured with the quarter snapshot."} Configured groups, bookings and recorded participation have separate totals.</p>
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {groups.map(group => {
        const section = data.sections[group.key];
        return <Card key={group.title} className="p-4">
          <h3 className="font-semibold text-slate-900">{group.title}</h3>
          <dl className="mt-3 space-y-2 text-sm">
            {group.metrics.map(([key, label]) => <div key={key} className="flex justify-between gap-3">
              <dt className="text-slate-600">{label}</dt>
              <dd className="font-semibold text-slate-900">{section?.available && section.metrics[key] != null ? section.metrics[key]?.toLocaleString() : "Unknown"}</dd>
            </div>)}
          </dl>
          {!!section?.notes?.length && <details className="mt-3 text-xs text-slate-500">
            <summary className="cursor-pointer">How these totals are counted</summary>
            {section.notes.map(note => <p key={note} className="mt-2">{note}</p>)}
          </details>}
        </Card>;
      })}
    </div>
    {!!data.external_podcast_episodes?.length && <Card className="p-4 space-y-3">
      <h3 className="font-semibold text-slate-900">Beyond the Pool — external episode records</h3>
      <p className="text-sm text-slate-500">{data.external_podcast_episodes.length} episodes identified for this quarter. These are separate from registered content totals; dates awaiting confirmation are marked below.</p>
      {data.external_podcast_episodes.map(episode => <div key={episode.url} className="text-sm">
        <a href={episode.url} target="_blank" rel="noreferrer" className="font-medium text-cyan-700 hover:underline">Episode {episode.episode_number}: {episode.title}</a>
        <p className="text-slate-500">{episode.original_release_at || "Original broadcast date pending"} · {episode.verification === "youtube_verified" ? "Date verified on YouTube" : "Reported by the team"}</p>
        {episode.note && <p className="mt-1 text-xs text-slate-500">{episode.note}</p>}
      </div>)}
    </Card>}
    {!!data.highlights.length && <Card className="p-4">
      <h3 className="font-semibold text-slate-900">What changed in the system</h3>
      <p className="mt-1 text-sm text-slate-500">Documented capabilities and plans; usage is measured separately above.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {data.highlights.map(item => <div key={item.title}>
          <h4 className="font-medium text-slate-900">{item.title} <span className="ml-1 text-xs font-normal text-slate-500">{item.status === "planning" ? "Planning" : item.status === "expanded" ? "Expanded" : "Added"}</span></h4>
          <p className="mt-1 text-sm text-slate-600">{item.description}</p>
        </div>)}
      </div>
    </Card>}
  </section>;
}
