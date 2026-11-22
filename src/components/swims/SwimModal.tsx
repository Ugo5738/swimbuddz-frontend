"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Native modal provides focus trapping, Escape support and a real dialog role. */
export function SwimModal({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (node && !node.open) node.showModal();
    return () => { if (node?.open) node.close(); };
  }, []);
  return <dialog
    ref={ref}
    aria-label={title}
    onClose={onClose}
    onClick={(event) => {
      if (event.target === event.currentTarget) event.currentTarget.close();
    }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/65"
  >
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <button type="button" aria-label="Close" onClick={() => ref.current?.close()}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-700">
        <X className="h-5 w-5" />
      </button>
    </header>
    <div className="space-y-5 p-5 sm:p-6">{children}</div>
  </dialog>;
}
