"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  value: string; // "YYYY-MM-DDTHH:MM" (datetime-local format)
  onChange: (next: string) => void;
  placeholder?: string;
  error?: boolean;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function toDateTimeLocal(date: Date, hour: number, minute: number) {
  const y = date.getFullYear();
  const mo = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${mo}-${d}T${pad2(hour)}:${pad2(minute)}`;
}

function formatDisplay(s: string) {
  if (!s) return null;
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return null;
  const date = dt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  // 24h time, e.g. "15:01"
  const time = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
  return `${date} · ${time}`;
}

// Scoped class so the inline <style> below targets only this picker without
// leaking to anything else on the page.
const WRAP_CLS = "fp-datepicker";

// Approx height of the (compact) popover — used to decide flip-up.
const POPOVER_H = 360;

export default function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date and time",
  error = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [placeAbove, setPlaceAbove] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Seed internal state from the parent value, falling back to a sensible default
  const seed = useMemo(() => {
    if (!value) return { date: undefined as Date | undefined, hour: 12, minute: 0 };
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return { date: undefined, hour: 12, minute: 0 };
    return { date: dt, hour: dt.getHours(), minute: dt.getMinutes() };
  }, [value]);

  const [date, setDate] = useState<Date | undefined>(seed.date);
  const [hour, setHour] = useState(seed.hour);
  const [minute, setMinute] = useState(seed.minute);

  // When opening, decide whether to flip above the trigger if there's no
  // room for the popover below the trigger in the viewport.
  useEffect(() => {
    if (!open || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    const above = rect.top;
    setPlaceAbove(below < POPOVER_H && above > below);
  }, [open]);

  // Outside click + Escape closes the popover.
  // Note: the time-row Selects portal their dropdowns to <body>, so a click
  // on an option lands outside our wrapRef. We treat any click inside a
  // shadcn select-content panel as "still inside the picker."
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (wrapRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest('[data-slot="select-content"]')
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Push every change up to the parent (only once we have a date)
  useEffect(() => {
    if (!date) return;
    onChange(toDateTimeLocal(date, hour, minute));
  }, [date, hour, minute, onChange]);

  const display = formatDisplay(value);

  // Shared classNames for the two Select fields in the time row
  const timeTriggerCls =
    "h-8 min-w-[58px] rounded-md border border-[color:var(--border)] bg-[color:var(--red-input)] px-2.5 py-0 font-[family-name:var(--font-mono-jb)] text-[12px] text-cream gap-1 transition-colors hover:bg-[color:var(--red-input)]/85 focus-visible:border-gold/55 focus-visible:ring-2 focus-visible:ring-gold/25 [&>span]:flex-1 [&>span]:text-center";
  const timeContentCls =
    "max-h-56 rounded-lg border border-[color:var(--border)] bg-[color:var(--red-card)] py-1 font-[family-name:var(--font-mono-jb)] text-[12px] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)]";
  const timeItemCls =
    "rounded-md px-2 py-1 text-cream focus:bg-gold focus:text-[#1a0e0e] data-[selected=true]:bg-gold/15 data-[selected=true]:text-gold";

  return (
    <div ref={wrapRef} className={`relative ${WRAP_CLS}`}>
      {/* Component-scoped CSS overrides for react-day-picker. Inline so the
          picker is self-contained and we don't pollute globals.css. */}
      <style>{`
        .${WRAP_CLS} .rdp-root {
          --rdp-day-height: 1.9rem;
          --rdp-day-width: 1.9rem;
          --rdp-day_button-height: 1.7rem;
          --rdp-day_button-width: 1.7rem;
          --rdp-months-gap: 0.5rem;
          --rdp-day-font: inherit;
          --rdp-weekday-padding: 0.25rem 0;
          color: var(--cream);
        }
        .${WRAP_CLS} .rdp-month {
          margin: 0;
        }
        .${WRAP_CLS} .rdp-month_caption {
          color: var(--cream);
          font-weight: 600;
          font-size: 13px;
          padding: 0.25rem 0;
        }
        .${WRAP_CLS} .rdp-nav {
          height: 1.9rem;
        }
        .${WRAP_CLS} .rdp-button_previous,
        .${WRAP_CLS} .rdp-button_next {
          height: 1.6rem;
          width: 1.6rem;
          border-radius: 0.4rem;
          color: var(--gold);
          transition: background 0.15s ease;
        }
        .${WRAP_CLS} .rdp-button_previous:hover,
        .${WRAP_CLS} .rdp-button_next:hover {
          background: rgba(232,168,56,0.12);
        }
        .${WRAP_CLS} .rdp-chevron {
          fill: var(--gold);
          height: 14px;
          width: 14px;
        }
        .${WRAP_CLS} .rdp-weekday {
          font-family: var(--font-mono-jb), monospace;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(212,160,160,0.75);
          font-weight: 500;
          padding: 0.2rem 0;
        }
        .${WRAP_CLS} .rdp-day_button {
          border: 0;
          background: transparent;
          color: var(--cream);
          border-radius: 0.4rem;
          font: inherit;
          font-size: 12px;
          transition: background 0.15s ease;
        }
        .${WRAP_CLS} .rdp-day_button:hover {
          background: rgba(232,168,56,0.15);
        }
        .${WRAP_CLS} .rdp-selected .rdp-day_button {
          background: var(--gold);
          color: #1a0e0e;
          font-weight: 700;
        }
        .${WRAP_CLS} .rdp-selected .rdp-day_button:hover {
          background: var(--gold);
        }
        .${WRAP_CLS} .rdp-today:not(.rdp-selected) .rdp-day_button {
          outline: 1px solid rgba(232,168,56,0.6);
          outline-offset: -2px;
          color: var(--gold);
        }
        .${WRAP_CLS} .rdp-outside .rdp-day_button {
          opacity: 0.35;
        }
        .${WRAP_CLS} .rdp-disabled .rdp-day_button {
          opacity: 0.2;
          cursor: not-allowed;
        }
      `}</style>

      {/* Trigger — looks identical to the form's other inputs */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-invalid={error || undefined}
        className={
          "w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-left text-[15px] outline-none transition-all duration-200 focus:bg-white/[0.06] focus:ring-2 " +
          (error
            ? "border-[color:var(--destructive)]/70 focus:border-[color:var(--destructive)] focus:ring-[color:var(--destructive)]/20 "
            : "border-[color:var(--border)] focus:border-gold/55 focus:ring-gold/20 ") +
          (display ? "text-cream" : "text-cream-muted/50")
        }
      >
        {display ?? placeholder}
      </button>

      {/* Popover — flips above the trigger when there's no room below */}
      {open && (
        <div
          role="dialog"
          className={
            "absolute left-0 right-0 z-50 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--red-card)] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)] " +
            (placeAbove ? "bottom-full mb-2" : "top-full mt-2")
          }
        >
          {/* Calendar */}
          <div className="px-2 pt-2 pb-1">
            <DayPicker
              mode="single"
              selected={date}
              onSelect={setDate}
              showOutsideDays
              defaultMonth={date}
            />
          </div>

          {/* Time row */}
          <div className="flex items-center justify-between gap-2 border-t border-[color:var(--border)] bg-black/20 px-3 py-2.5">
            <span className="font-[family-name:var(--font-mono-jb)] text-[10px] uppercase tracking-[0.16em] text-cream-muted/85">
              Time
            </span>

            <div className="flex items-center gap-1.5">
              {/* Hour (24h: 00–23) */}
              <Select
                value={String(hour)}
                onValueChange={(v) => setHour(Number(v))}
              >
                <SelectTrigger className={timeTriggerCls} aria-label="Hour">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={timeContentCls}>
                  {Array.from({ length: 24 }).map((_, i) => (
                    <SelectItem
                      key={i}
                      value={String(i)}
                      className={timeItemCls}
                    >
                      {pad2(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-cream-muted">:</span>

              {/* Minute (00–59) */}
              <Select
                value={String(minute)}
                onValueChange={(v) => setMinute(Number(v))}
              >
                <SelectTrigger className={timeTriggerCls} aria-label="Minute">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={timeContentCls}>
                  {Array.from({ length: 60 }).map((_, i) => (
                    <SelectItem
                      key={i}
                      value={String(i)}
                      className={timeItemCls}
                    >
                      {pad2(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={!date}
              className="rounded-md bg-gold px-3 py-1.5 text-[11px] font-bold text-[#1a0e0e] transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:bg-gold/40 disabled:hover:scale-100"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
