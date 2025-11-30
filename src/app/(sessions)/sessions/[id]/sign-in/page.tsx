"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { SessionSignIn } from "./session-sign-in";
import { getSession, Session } from "@/lib/sessions";
import { LoadingCard } from "@/components/ui/LoadingCard";

export default function SessionSignInPage({ params }: { params: { id: string } }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getSession(params.id)
      .then(setSession)
      .catch((err) => {
        console.error("Failed to fetch session:", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return <LoadingCard text="Loading session..." />;
  }

  if (error || !session) {
    return notFound();
  }

  return <SessionSignIn session={session} />;
}
