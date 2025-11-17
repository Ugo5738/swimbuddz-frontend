import { notFound } from "next/navigation";
import { getSessionById } from "../../data";
import { SessionSignIn } from "./session-sign-in";

export default function SessionSignInPage({ params }: { params: { id: string } }) {
  const session = getSessionById(params.id);

  if (!session) {
    notFound();
  }

  return <SessionSignIn session={session} />;
}
