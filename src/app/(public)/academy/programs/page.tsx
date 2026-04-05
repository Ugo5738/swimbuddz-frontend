"use client";

import { Card } from "@/components/ui/Card";
import { AcademyApi, Program, ProgramLevel } from "@/lib/academy";
import Link from "next/link";
import { useEffect, useState } from "react";

function formatPrice(naira: number | undefined, currency: string | undefined): string | null {
  if (naira == null || naira <= 0) return null;
  const symbol = currency && currency.toUpperCase() !== "NGN" ? currency + " " : "₦";
  return `${symbol}${naira.toLocaleString()}`;
}

function levelLabel(level: string): string {
  return level.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const LEVEL_ORDER: ProgramLevel[] = [
  ProgramLevel.BEGINNER_1,
  ProgramLevel.BEGINNER_2,
  ProgramLevel.INTERMEDIATE,
  ProgramLevel.ADVANCED,
  ProgramLevel.SPECIALTY,
];

export default function ProgramsIndexPage() {
  const [programs, setPrograms] = useState<Program[] | null>(null);

  useEffect(() => {
    AcademyApi.listPublishedPrograms()
      .then((list) => setPrograms(list ?? []))
      .catch(() => setPrograms([]));
  }, []);

  if (programs === null) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
        <p className="text-lg font-medium text-slate-600">Loading programs…</p>
      </div>
    );
  }

  // Group by level
  const byLevel = programs.reduce<Record<string, Program[]>>((acc, p) => {
    const k = p.level || "specialty";
    (acc[k] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-10">
      {/* Breadcrumbs */}
      <nav className="text-sm text-slate-500">
        <Link href="/academy" className="hover:text-cyan-700">
          Academy
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900 font-medium">All Programs</span>
      </nav>

      {/* Header */}
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
          Academy Programs
        </p>
        <h1 className="text-4xl font-bold text-slate-900 md:text-5xl leading-tight">
          All published programs
        </h1>
        <p className="text-lg text-slate-600 max-w-3xl">
          Pick the program that matches where you are today and where you want to be in 4–8 weeks.
        </p>
      </header>

      {programs.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-3">📚</div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No programs published yet</h2>
          <p className="text-slate-600">Check back soon.</p>
        </Card>
      ) : (
        <div className="space-y-10">
          {LEVEL_ORDER.filter((lvl) => byLevel[lvl]?.length).map((lvl) => (
            <section key={lvl} className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">{levelLabel(lvl)}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {byLevel[lvl].map((program) => {
                  const price = formatPrice(program.price_amount, program.currency);
                  return (
                    <Link
                      key={program.id}
                      href={program.slug ? `/academy/programs/${program.slug}` : "/academy"}
                      className="group"
                    >
                      <Card className="h-full overflow-hidden p-0 transition-all hover:shadow-lg hover:-translate-y-0.5">
                        <div
                          className="aspect-[16/9] w-full bg-gradient-to-br from-slate-700 to-cyan-900"
                          style={
                            program.cover_image_url
                              ? {
                                  backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.5)), url(${program.cover_image_url})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                }
                              : undefined
                          }
                        />
                        <div className="p-4 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                              {program.duration_weeks} weeks
                            </span>
                            {price && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                                  From {price}
                                </span>
                              </>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-slate-900 leading-tight group-hover:text-cyan-700 transition-colors">
                            {program.name}
                          </h3>
                          {program.description && (
                            <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                              {program.description}
                            </p>
                          )}
                          <div className="pt-1">
                            <span className="text-xs font-semibold text-cyan-700 group-hover:text-cyan-800">
                              View details →
                            </span>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
