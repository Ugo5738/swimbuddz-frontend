import { SessionEditorPage } from "@/components/admin/SessionEditorPage";

export default function NewSessionPage({
  searchParams,
}: {
  searchParams: {
    starts_at?: string;
    ends_at?: string;
    event_id?: string;
    event_title?: string;
    pool_id?: string;
    location_name?: string;
  };
}) {
  return (
    <SessionEditorPage
      initialStartsAt={searchParams.starts_at ?? null}
      initialEvent={
        searchParams.event_id
          ? {
              id: searchParams.event_id,
              title: searchParams.event_title ?? "",
              endsAt: searchParams.ends_at ?? null,
              poolId: searchParams.pool_id ?? null,
              locationName: searchParams.location_name ?? null,
            }
          : null
      }
    />
  );
}
