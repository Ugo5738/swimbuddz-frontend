"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Element focused before the modal opened — restored on close so keyboard
  // users land back where they were.
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Capture/restore focus around the modal's open lifetime.
  useEffect(() => {
    if (!isOpen) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    // Defer so the portal has rendered before we move focus into it.
    const t = window.setTimeout(() => {
      const node = dialogRef.current;
      if (!node) return;
      const first = node.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? node).focus();
    }, 0);
    return () => {
      window.clearTimeout(t);
      lastFocusedRef.current?.focus?.();
    };
  }, [isOpen]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      // Focus trap: keep Tab/Shift+Tab cycling inside the dialog.
      const node = dialogRef.current;
      if (!node) return;
      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[calc(100vw-1rem)] sm:max-w-lg rounded-lg bg-white p-4 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto outline-none"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2
            id={titleId}
            className="text-lg sm:text-xl font-semibold text-slate-900"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 -m-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
