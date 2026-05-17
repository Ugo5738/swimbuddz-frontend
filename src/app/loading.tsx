import { LoadingCard } from "@/components/ui/LoadingCard";

export default function RootLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <LoadingCard text="Loading…" />
    </div>
  );
}
