"use client";

import type { PreviewResponse, ValidationIssue } from "@/lib/types";

const LEVEL_STYLES: Record<ValidationIssue["level"], string> = {
  info: "border-slate-600 text-slate-300",
  warning: "border-amber-500 text-amber-300",
  error: "border-rose-500 text-rose-300",
};

export function Preview({
  preview,
  loading,
  error,
}: {
  preview: PreviewResponse | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="relative flex-1 rounded-lg border border-slate-800 bg-white p-4">
        {loading && (
          <div className="absolute right-4 top-4 z-10 rounded bg-sky-600 px-2 py-1 text-xs text-white">
            updating…
          </div>
        )}
        {error ? (
          <div className="flex h-full items-center justify-center text-center text-rose-600">
            {error}
          </div>
        ) : preview ? (
          <div
            className="mx-auto h-full w-full [&>svg]:mx-auto [&>svg]:h-full [&>svg]:w-auto"
            // The SVG is generated server-side as deterministic vector geometry.
            dangerouslySetInnerHTML={{ __html: preview.svg }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            Enter details to generate a preview.
          </div>
        )}
      </div>

      {preview && (
        <div className="rounded-lg border border-slate-800 bg-panel/60 p-3 text-sm">
          <div className="mb-2 flex flex-wrap gap-x-6 gap-y-1 text-slate-300">
            <span>
              Stars: <b className="text-slate-100">{preview.star_count}</b>
            </span>
            <span>
              Bodies: <b className="text-slate-100">{preview.body_count}</b>
            </span>
            <span>
              UTC: <b className="text-slate-100">{preview.metadata.utc_datetime}</b>
            </span>
            <span>
              Validation:{" "}
              <b className={preview.validation.ok ? "text-emerald-400" : "text-rose-400"}>
                {preview.validation.ok ? "OK" : "has errors"}
              </b>
            </span>
          </div>
          <ul className="space-y-1">
            {preview.validation.issues.length === 0 && (
              <li className="text-emerald-400">No laser-safety warnings.</li>
            )}
            {preview.validation.issues.map((issue, i) => (
              <li
                key={i}
                className={`rounded border-l-2 pl-2 ${LEVEL_STYLES[issue.level]}`}
              >
                <span className="uppercase text-xs mr-2">{issue.level}</span>
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
