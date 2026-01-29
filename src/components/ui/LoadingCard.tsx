import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

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
    <Card className="p-6">
      <div className="flex flex-col items-center justify-center py-12">
        <LoadingSpinner size="lg" text={text} />
      </div>
    </Card>
  );
}
