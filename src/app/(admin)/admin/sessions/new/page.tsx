import { SessionEditorPage } from "@/components/admin/SessionEditorPage";

export default function NewSessionPage({
  searchParams,
}: {
  searchParams: { starts_at?: string };
}) {
  return <SessionEditorPage initialStartsAt={searchParams.starts_at ?? null} />;
}
