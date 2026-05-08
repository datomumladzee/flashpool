"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, AlertTriangle, ChevronDown, Info, X } from "lucide-react";
import type { ErrorLevel } from "@/lib/errors";

type Action = { label: string; href?: string; onClick?: () => void };

interface ErrorBannerProps {
  variant?: ErrorLevel;
  title: string;
  message?: string;
  action?: Action;
  raw?: string;
  onDismiss?: () => void;
  className?: string;
}

const VARIANT: Record<
  ErrorLevel,
  {
    container: string;
    iconColor: string;
    Icon: typeof AlertCircle;
  }
> = {
  error: {
    container:
      "border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/[0.08]",
    iconColor: "text-[color:var(--destructive)]",
    Icon: AlertCircle,
  },
  warning: {
    container: "border-gold/35 bg-gold/[0.08]",
    iconColor: "text-gold",
    Icon: AlertTriangle,
  },
  info: {
    container: "border-[color:var(--border)] bg-white/[0.04]",
    iconColor: "text-cream-muted",
    Icon: Info,
  },
};

export default function ErrorBanner({
  variant = "error",
  title,
  message,
  action,
  raw,
  onDismiss,
  className = "",
}: ErrorBannerProps) {
  const [open, setOpen] = useState(false);
  const v = VARIANT[variant];
  const Icon = v.Icon;

  return (
    <motion.div
      role={variant === "info" ? "status" : "alert"}
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex flex-col gap-2 rounded-2xl border px-4 py-3 ${v.container} ${className}`}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={`mt-[2px] size-4 shrink-0 ${v.iconColor}`}
          strokeWidth={2}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold leading-tight text-cream">
            {title}
          </p>
          {message && (
            <p className="mt-1 text-[14px] leading-[1.5] text-cream-muted">
              {message}
            </p>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="-mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-cream-muted/70 transition-colors hover:bg-white/[0.06] hover:text-cream sm:size-7"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        )}
      </div>

      {(action || raw) && (
        <div className="flex flex-wrap items-center justify-between gap-2 pl-7">
          <div className="flex items-center gap-2">
            {action &&
              (action.href ? (
                <a
                  href={action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-gold/40 bg-gold/[0.12] px-3 py-1.5 text-[13px] font-bold text-gold transition-colors hover:bg-gold/[0.2]"
                >
                  {action.label} ↗
                </a>
              ) : (
                <button
                  type="button"
                  onClick={action.onClick}
                  className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-gold/40 bg-gold/[0.12] px-3 py-1.5 text-[13px] font-bold text-gold transition-colors hover:bg-gold/[0.2]"
                >
                  {action.label}
                </button>
              ))}
          </div>
          {raw && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="inline-flex items-center gap-1 font-[family-name:var(--font-mono-jb)] text-[10px] uppercase tracking-[0.12em] text-cream-muted/70 transition-colors hover:text-cream"
            >
              Details
              <ChevronDown
                className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}
                strokeWidth={2}
              />
            </button>
          )}
        </div>
      )}

      <AnimatePresence initial={false}>
        {open && raw && (
          <motion.pre
            key="raw"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-7 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[color:var(--border)] bg-black/40 p-3 font-[family-name:var(--font-mono-jb)] text-[10px] leading-[1.5] text-cream-muted"
          >
            {raw}
          </motion.pre>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
