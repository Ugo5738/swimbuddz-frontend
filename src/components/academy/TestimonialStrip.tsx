import { Card } from "@/components/ui/Card";
import type { Testimonial } from "@/lib/testimonials";

type Props = {
  testimonials: Testimonial[];
};

/**
 * Renders a 3-card testimonial strip. Returns null if the list is empty — so
 * you can safely render this on the landing page and it will only appear
 * once real graduate quotes exist. Pass the data from a loader or API call
 * once a testimonials source is wired in.
 */
export function TestimonialStrip({ testimonials }: Props) {
  if (!testimonials || testimonials.length === 0) return null;

  // Show up to 3
  const visible = testimonials.slice(0, 3);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
          In their words
        </p>
        <h2 className="text-2xl font-semibold text-slate-900 mt-1">
          What swimmers say after finishing a cohort.
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {visible.map((t) => (
          <Card key={t.id} className="space-y-4">
            <div className="text-3xl text-cyan-300 leading-none">&ldquo;</div>
            <blockquote className="text-sm text-slate-700 leading-relaxed -mt-2">
              {t.quote}
            </blockquote>
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
              {t.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.photo_url}
                  alt={t.name}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {t.initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{t.name}</p>
                <p className="text-xs text-slate-500 truncate">
                  {t.role}
                  {t.since ? ` · since ${t.since}` : ""}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
