import { Card } from "@/components/ui/Card";

type LoadingCardProps = {
  text: string;
};

export function LoadingCard({ text }: LoadingCardProps) {
  return (
    <Card className="animate-pulse text-sm text-slate-500" aria-live="polite">
      {text}
    </Card>
  );
}
