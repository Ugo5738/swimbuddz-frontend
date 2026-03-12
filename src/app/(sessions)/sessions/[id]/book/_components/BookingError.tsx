import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

type BookingErrorProps = {
  sessionId: string;
  errorMessage: string;
};

export function BookingError({ sessionId, errorMessage }: BookingErrorProps) {
  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <Card className="p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-400 to-orange-500 text-white text-3xl">
            !
          </div>
          <h1 className="text-2xl font-bold text-red-600">Payment Issue</h1>
          <p className="text-slate-600">{errorMessage}</p>
        </div>

        <div className="flex flex-col gap-3">
          <Link href={`/sessions/${sessionId}/book`}>
            <Button className="w-full">Try Again</Button>
          </Link>
          <Link href="/account/billing">
            <Button variant="secondary" className="w-full">
              Check Billing
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
