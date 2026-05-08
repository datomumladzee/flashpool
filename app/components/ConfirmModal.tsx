"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

type Variant = "danger" | "warning" | "default";

interface ConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
}

const VARIANT_STYLES: Record<
  Variant,
  {
    Icon: typeof AlertCircle;
    iconColor: string;
    confirmBtn: string;
  }
> = {
  danger: {
    Icon: AlertCircle,
    iconColor: "text-[color:var(--destructive)]",
    // Solid destructive — same shape as the gold primary so muscle memory
    // works, but red so the action reads as destructive.
    confirmBtn:
      "bg-[color:var(--destructive)] text-cream shadow-[0_18px_40px_-16px_rgba(255,107,107,0.7)] hover:scale-[1.01] hover:shadow-[0_26px_60px_-14px_rgba(255,107,107,0.95)]",
  },
  warning: {
    Icon: AlertTriangle,
    iconColor: "text-gold",
    // Gold primary — matches the rest of the app's main CTA so the
    // confirmation button reads as the recommended path forward.
    confirmBtn:
      "bg-gold text-[#1a0e0e] shadow-[0_18px_40px_-16px_rgba(232,181,71,0.7)] hover:scale-[1.01] hover:shadow-[0_26px_60px_-14px_rgba(232,181,71,0.95)]",
  },
  default: {
    Icon: Info,
    iconColor: "text-cream-muted",
    confirmBtn:
      "bg-gold text-[#1a0e0e] shadow-[0_18px_40px_-16px_rgba(232,181,71,0.7)] hover:scale-[1.01] hover:shadow-[0_26px_60px_-14px_rgba(232,181,71,0.95)]",
  },
};

export default function ConfirmModal({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Focus management: capture whoever was focused before, focus the destructive
  // action on open (the user can hit Enter to confirm or Tab to Cancel), and
  // restore focus when the modal closes.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // Defer one frame so the modal is mounted and animatable before we focus.
    const id = requestAnimationFrame(() => {
      confirmRef.current?.focus();
    });
    return () => {
      cancelAnimationFrame(id);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Lock the page scroll while the modal is open so the backdrop reads as
  // truly modal — same pattern Navbar uses for the mobile menu.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape closes; Tab is trapped between the two buttons (only two focusable
  // elements inside the dialog, so a simple two-way wrap is enough — no full
  // focus-trap library needed).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === "Tab") {
        const active = document.activeElement;
        if (e.shiftKey) {
          if (active === cancelRef.current) {
            e.preventDefault();
            confirmRef.current?.focus();
          }
        } else {
          if (active === confirmRef.current) {
            e.preventDefault();
            cancelRef.current?.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  const v = VARIANT_STYLES[variant];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-modal-root"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          // Role on the wrapper isn't enough — the dialog itself carries the
          // role + aria attributes below.
        >
          {/* Backdrop — clicking dismisses. The button element makes it focusable-skippable
              and gives it a proper accessible label. */}
          <motion.button
            type="button"
            aria-label="Close dialog"
            onClick={onCancel}
            tabIndex={-1}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />

          {/* Card — matches the elevated card styling on Pool / Create pages:
              red-card bg, gold-tinted border, soft shadow + inset highlight. */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            aria-describedby="confirm-modal-message"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            // min() keeps the modal at 28rem on desktop and naturally caps
            // it to the viewport (minus the outer p-4 padding) on phones,
            // satisfying the max-w-[calc(100vw-2rem)] mobile spec without
            // colliding with another max-w utility.
            className="relative w-full max-w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[rgba(232,181,71,0.22)] bg-[color:var(--red-card)] p-6 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.75),_inset_0_1px_0_0_rgba(255,255,255,0.05)] sm:p-7"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span
                aria-hidden
                className={`mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.05] ring-1 ring-[rgba(232,181,71,0.18)] ${v.iconColor}`}
              >
                <v.Icon className="size-5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="confirm-modal-title"
                  className="text-[18px] font-bold leading-tight text-cream sm:text-[20px]"
                >
                  {title}
                </h2>
                <p
                  id="confirm-modal-message"
                  className="mt-2 text-[14px] leading-[1.6] text-cream-muted"
                >
                  {message}
                </p>
              </div>
            </div>

            {/* Action row — stack on phones (full-width buttons), side-by-side
                from sm+. Confirm sits on the right per platform conventions
                (rightmost = primary action). Both ≥ 44px tall. */}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                ref={cancelRef}
                type="button"
                onClick={onCancel}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[color:var(--border)] bg-transparent px-5 py-3 text-[14px] font-semibold text-cream transition-all duration-200 hover:border-cream-muted/50 hover:bg-white/[0.04]"
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={onConfirm}
                className={`inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 py-3 text-[14px] font-bold transition-all duration-200 ${v.confirmBtn}`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
