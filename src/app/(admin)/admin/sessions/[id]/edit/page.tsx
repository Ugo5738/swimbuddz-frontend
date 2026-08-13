import { SessionEditorPage } from "@/components/admin/SessionEditorPage";

export default function EditSessionPage({ params }: { params: { id: string } }) {
  return <SessionEditorPage sessionId={params.id} />;
}
