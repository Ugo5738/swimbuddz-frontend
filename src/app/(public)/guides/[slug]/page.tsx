import { GuideMarkdown } from "@/components/guides/GuideMarkdown";
import { GuidePageView } from "@/components/guides/GuidePageView";
import { ShareButton } from "@/components/guides/ShareButton";
import { getAllGuides, getGuideBySlug } from "@/lib/guides";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type GuideDetailPageProps = {
  params: { slug: string };
};

export function generateStaticParams() {
  return getAllGuides().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: GuideDetailPageProps): Promise<Metadata> {
  const loaded = await getGuideBySlug(params.slug);
  if (!loaded) return { title: "Guide not found · SwimBuddz" };

  return {
    title: `${loaded.meta.title} · SwimBuddz`,
    description: loaded.meta.description,
  };
}

export default async function GuideDetailPage({ params }: GuideDetailPageProps) {
  const loaded = await getGuideBySlug(params.slug);
  if (!loaded) notFound();

  const { meta, content } = loaded;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      {/* Back link */}
      <Link
        href="/guides"
        className="inline-flex items-center gap-1 text-sm text-slate-600 transition hover:text-cyan-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All guides
      </Link>

      {/* Title + share */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {meta.emoji} {meta.audience.charAt(0).toUpperCase() + meta.audience.slice(1)}
          </p>
        </div>
        <ShareButton slug={meta.slug} title={meta.title} description={meta.description} />
      </div>

      {/* Content */}
      <div className="mt-4">
        <GuideMarkdown content={content} />
      </div>

      {/* Footer — back to index */}
      <div className="mt-12 border-t border-slate-200 pt-6">
        <Link
          href="/guides"
          className="inline-flex items-center gap-1 text-sm text-slate-600 transition hover:text-cyan-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to all guides
        </Link>
      </div>

      <GuidePageView slug={meta.slug} audience={meta.audience} />
    </div>
  );
}
