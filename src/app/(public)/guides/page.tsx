import { GuideGroup } from "@/components/guides/GuideGroup";
import { getAllGuides, groupGuidesByAudience } from "@/lib/guides";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guides · SwimBuddz",
  description:
    "Guides for SwimBuddz volunteers, members, coaches, and partners. Roles, programs, and how the community works.",
};

export default function GuidesIndexPage() {
  const groups = groupGuidesByAudience(getAllGuides());

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 py-8 sm:py-12">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">SwimBuddz Guides</h1>
        <p className="mt-2 text-sm text-slate-600">
          Everything you need — how volunteering works, how programs run, and how to get the most
          out of the community.
        </p>
      </header>

      <div className="flex flex-col gap-8">
        {groups.map((group) => (
          <GuideGroup key={group.audience} audience={group.audience} guides={group.guides} />
        ))}
      </div>
    </div>
  );
}
