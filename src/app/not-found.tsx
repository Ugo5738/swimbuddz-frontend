import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="mx-auto max-w-md p-8 text-center">
        <p className="text-5xl font-bold text-slate-300">404</p>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <div className="mt-6">
          <Link href="/">
            <Button>Go home</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
