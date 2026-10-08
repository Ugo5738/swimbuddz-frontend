import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Beyond the Pool | SwimBuddz",
  description:
    "Real conversations and swimmer stories about water confidence, consistency, community and learning to swim as an adult.",
  openGraph: {
    title: "Beyond the Pool | SwimBuddz",
    description:
      "Conversations about the lives and journeys of swimmers, on land and in the water.",
    type: "website",
  },
};

export default function BeyondThePoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
