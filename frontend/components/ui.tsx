"use client";

import { ReactNode } from "react";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-panel/60 p-4">
      <h2 className="section-title mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="control-label">{label}</span>
      <input
        className="control-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block">
      <span className="control-label">{label}</span>
      <input
        type="number"
        className="control-input"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  display,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  display?: string;
}) {
  return (
    <label className="block">
      <span className="control-label flex justify-between">
        <span>{label}</span>
        <span className="text-sky-300 normal-case">{display ?? value}</span>
      </span>
      <input
        type="range"
        className="w-full accent-sky-500"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 py-0.5 text-sm text-slate-200">
      <span>{label}</span>
      <input
        type="checkbox"
        className="h-4 w-4 accent-sky-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="control-label">{label}</span>
      <select className="control-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
