"use client";

import { useState, useEffect, useRef } from "react";

// ============================================================================
// TYPES
// ============================================================================

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 150 }, (_, i) => CURRENT_YEAR - i);

// ============================================================================
// HELPERS
// ============================================================================

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function parse(value: string) {
  if (!value) return { day: "", month: "", year: "" };
  const [y, m, d] = value.split("-");
  return {
    year:  y ?? "",
    month: m ?? "",
    day:   d === "01" ? "" : (d ?? ""),
  };
}

function buildLabel(year: string, month: string, day: string): string | null {
  if (!year && !month) return null;
  if (year && month && day) {
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  }
  if (year && month) return `${MONTHS[parseInt(month) - 1]} ${year}`;
  return year || null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DatePicker({ value, onChange, placeholder = "Selecciona fecha" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [year, setYear] = useState(() => parse(value).year);
  const [month, setMonth] = useState(() => parse(value).month);
  const [day, setDay] = useState(() => parse(value).day);
  const lastEmittedRef = useRef(value);

  useEffect(() => {
    if (value !== lastEmittedRef.current) {
      lastEmittedRef.current = value;
      const parsed = parse(value);
      setYear(parsed.year);
      setMonth(parsed.month);
      setDay(parsed.day);
    }
  }, [value]);

  const displayLabel = buildLabel(year, month, day);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function emit(y: string, m: string, d: string) {
    setYear(y);
    setMonth(m);
    setDay(d);

    let next = "";
    if (y && m && d) {
      const maxDay = daysInMonth(parseInt(m), parseInt(y));
      const safeDay = Math.min(parseInt(d), maxDay).toString().padStart(2, "0");
      next = `${y}-${m.padStart(2, "0")}-${safeDay}`;
    } else if (y && m) {
      next = `${y}-${m.padStart(2, "0")}-01`;
    }

    lastEmittedRef.current = next;
    onChange(next);
  }

  function handleClear() {
    setYear("");
    setMonth("");
    setDay("");
    lastEmittedRef.current = "";
    onChange("");
  }

  const availableDays = year && month
    ? Array.from({ length: daysInMonth(parseInt(month), parseInt(year)) }, (_, i) => i + 1)
    : Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full px-3 py-2 bg-surface-raised border rounded-lg text-sm text-left transition-colors flex items-center justify-between ${
          open
            ? "border-violet-accent/50 ring-1 ring-violet-accent/20"
            : "border-surface-border hover:border-violet-accent/30"
        }`}
      >
        <span className={displayLabel ? "text-zinc-100" : "text-zinc-600"}>
          {displayLabel ?? placeholder}
        </span>
        <div className="flex items-center gap-1.5">
          {displayLabel && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="text-zinc-600 hover:text-zinc-300 text-xs px-1"
            >
              ✕
            </span>
          )}
          <span className="text-zinc-600 text-xs">📅</span>
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-full z-50 bg-[#0f0f17] border border-violet-accent/20 rounded-xl shadow-2xl p-4 space-y-3">

          {/* Month + Year */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Mes</label>
              <select
                value={month}
                onChange={(e) => emit(year, e.target.value, day)}
                className="w-full px-2 py-1.5 bg-surface-raised border border-surface-border rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-violet-accent/50 transition-colors"
              >
                <option value="">— mes —</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Año</label>
              <select
                value={year}
                onChange={(e) => emit(e.target.value, month, day)}
                className="w-full px-2 py-1.5 bg-surface-raised border border-surface-border rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-violet-accent/50 transition-colors"
              >
                <option value="">— año —</option>
                {YEARS.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Day grid */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
              Día <span className="text-zinc-600 normal-case">(opcional)</span>
            </label>
            <div className="grid grid-cols-7 gap-1">
              {availableDays.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => emit(year, month, String(d).padStart(2, "0"))}
                  className={`py-1 rounded-md text-xs font-medium transition-colors ${
                    day === String(d).padStart(2, "0")
                      ? "bg-violet-accent/30 border border-violet-accent/50 text-violet-300"
                      : "text-zinc-400 hover:bg-surface-raised hover:text-zinc-200"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Hint */}
          <p className="text-[10px] text-zinc-600 text-center">
            Si no conoces el día exacto, solo selecciona mes y año
          </p>

          {/* Confirm */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full py-1.5 rounded-lg text-xs font-medium bg-violet-accent/20 border border-violet-accent/40 text-violet-300 hover:bg-violet-accent/30 transition-colors"
          >
            Confirmar
          </button>
        </div>
      )}
    </div>
  );
}