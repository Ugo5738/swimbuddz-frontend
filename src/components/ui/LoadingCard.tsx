import { Card } from "@/components/ui/Card";

type LoadingCardProps = {
  text?: string;
};

/**
 * LoadingCard - Displays a loading spinner inside a card container.
 * Use for inline loading states within a page (e.g., loading a section).
 * For full-page loading states, use LoadingPage instead.
 */
export function LoadingCard({ text = "Loading..." }: LoadingCardProps) {
  return (
    <Card className="p-6" aria-live="polite">
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
        <p className="text-lg font-medium text-slate-600">{text}</p>
      </div>
    </Card>
  );
}

/**
 * LoadingPage - Displays a centered loading spinner for full-page loading states.
 * Use this when the entire page content is loading.
 */
export function LoadingPage({ text = "Loading..." }: LoadingCardProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4" aria-live="polite">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
      <p className="text-lg font-medium text-slate-600">{text}</p>
    </div>
  );
}
