"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Preview } from "@/components/Preview";
import { NumberField, Section, Select, Slider, TextField, Toggle } from "@/components/ui";
import {
  downloadPng,
  downloadSvg,
  fetchMaterials,
  fetchPreview,
  geocode,
} from "@/lib/api";
import { DEFAULT_REQUEST, densityToMagnitude, magnitudeToDensity } from "@/lib/defaults";
import type { MapRequest, MaterialPreset, PreviewResponse } from "@/lib/types";

const FONT_OPTIONS = [
  { value: "script-default", label: "Script (Great Vibes)" },
  { value: "sans-default", label: "Sans (DejaVu Sans)" },
  { value: "serif-default", label: "Serif (DejaVu Serif)" },
];

export default function EditorPage() {
  const [request, setRequest] = useState<MapRequest>(DEFAULT_REQUEST);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<MaterialPreset[]>([]);
  const [geoQuery, setGeoQuery] = useState("Chesapeake, Virginia");
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Generic nested-update helper keeps text/layout/sky state cleanly separated.
  function update<K extends keyof MapRequest>(section: K, patch: Partial<MapRequest[K]>) {
    setRequest((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }));
  }

  useEffect(() => {
    fetchMaterials().then(setMaterials).catch(() => setMaterials([]));
  }, []);

  // Debounced live preview. The backend caches astronomy by sky key, so
  // editing text/layout re-renders quickly without recomputing the sky.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPreview(request);
        setPreview(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Preview failed");
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [request]);

  const runGeocode = useCallback(async () => {
    setGeoStatus("Searching…");
    try {
      const r = await geocode(geoQuery);
      update("observer", {
        location_name: r.display_name,
        latitude: Math.round(r.latitude * 10000) / 10000,
        longitude: Math.round(r.longitude * 10000) / 10000,
        timezone: r.timezone,
      });
      setGeoStatus(`Found: ${r.display_name.slice(0, 60)}`);
    } catch (e) {
      setGeoStatus(e instanceof Error ? e.message : "Not found");
    }
  }, [geoQuery]);

  const o = request.observer;
  const s = request.sky;
  const l = request.layout;
  const eng = request.engraving;
  const p = request.personalization;

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-800 px-6 py-4">
        <h1 className="text-xl font-semibold">
          Star-Map Laser Studio{" "}
          <span className="text-sm font-normal text-slate-400">
            historically accurate · laser-ready SVG
          </span>
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[420px_1fr]">
        {/* ---- Controls ---- */}
        <div className="space-y-4">
          <Section title="A · Location & Time">
            <div className="flex gap-2">
              <input
                className="control-input"
                value={geoQuery}
                onChange={(e) => setGeoQuery(e.target.value)}
                placeholder="City search"
                onKeyDown={(e) => e.key === "Enter" && runGeocode()}
              />
              <button
                onClick={runGeocode}
                className="whitespace-nowrap rounded-md bg-sky-600 px-3 text-sm hover:bg-sky-500"
              >
                Search
              </button>
            </div>
            {geoStatus && <p className="text-xs text-slate-400">{geoStatus}</p>}
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Latitude"
                value={o.latitude}
                step={0.0001}
                onChange={(v) => update("observer", { latitude: v })}
              />
              <NumberField
                label="Longitude"
                value={o.longitude}
                step={0.0001}
                onChange={(v) => update("observer", { longitude: v })}
              />
            </div>
            <TextField
              label="Timezone (IANA)"
              value={o.timezone}
              onChange={(v) => update("observer", { timezone: v })}
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="control-label">Date</span>
                <input
                  type="date"
                  className="control-input"
                  value={o.local_datetime.slice(0, 10)}
                  onChange={(e) =>
                    update("observer", {
                      local_datetime: `${e.target.value}T${o.local_datetime.slice(11)}`,
                    })
                  }
                />
              </label>
              <label className="block">
                <span className="control-label">Local time</span>
                <input
                  type="time"
                  className="control-input"
                  value={o.local_datetime.slice(11, 16)}
                  onChange={(e) =>
                    update("observer", {
                      local_datetime: `${o.local_datetime.slice(0, 10)}T${e.target.value}:00`,
                    })
                  }
                />
              </label>
            </div>
          </Section>

          <Section title="B · Sky">
            <Slider
              label="Star density"
              min={1}
              max={10}
              value={magnitudeToDensity(s.magnitude_limit)}
              display={`mag ≤ ${s.magnitude_limit}`}
              onChange={(v) => update("sky", { magnitude_limit: densityToMagnitude(v) })}
            />
            <Slider
              label="Rotation"
              min={-180}
              max={180}
              value={s.rotation_degrees}
              display={`${s.rotation_degrees}°`}
              onChange={(v) => update("sky", { rotation_degrees: v })}
            />
            <Toggle
              label="Constellation lines"
              checked={s.show_constellations}
              onChange={(v) => update("sky", { show_constellations: v })}
            />
            <Toggle
              label="Constellation labels"
              checked={s.show_constellation_labels}
              onChange={(v) => update("sky", { show_constellation_labels: v })}
            />
            <Toggle
              label="Planets"
              checked={s.show_planets}
              onChange={(v) => update("sky", { show_planets: v })}
            />
            <Toggle
              label="Moon"
              checked={s.show_moon}
              onChange={(v) => update("sky", { show_moon: v })}
            />
            <Toggle
              label="Cardinal directions"
              checked={s.show_cardinal_directions}
              onChange={(v) => update("sky", { show_cardinal_directions: v })}
            />
          </Section>

          <Section title="C · Layout">
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Canvas width (mm)"
                value={l.canvas_width_mm}
                onChange={(v) => update("layout", { canvas_width_mm: v })}
              />
              <NumberField
                label="Canvas height (mm)"
                value={l.canvas_height_mm}
                onChange={(v) => update("layout", { canvas_height_mm: v })}
              />
              <NumberField
                label="Map diameter (mm)"
                value={l.map_diameter_mm}
                onChange={(v) => update("layout", { map_diameter_mm: v })}
              />
              <NumberField
                label="Outer margin (mm)"
                value={l.outer_margin_mm}
                onChange={(v) => update("layout", { outer_margin_mm: v })}
              />
              <NumberField
                label="Map vertical center (mm)"
                value={l.map_center_y_mm ?? Math.round(l.map_diameter_mm / 2 + l.outer_margin_mm)}
                onChange={(v) => update("layout", { map_center_y_mm: v })}
              />
            </div>
          </Section>

          <Section title="D · Personalization">
            <TextField label="Names" value={p.names} onChange={(v) => update("personalization", { names: v })} />
            <TextField
              label="Headline"
              value={p.headline}
              onChange={(v) => update("personalization", { headline: v })}
            />
            <TextField
              label="Location text"
              value={p.location_text}
              onChange={(v) => update("personalization", { location_text: v })}
            />
            <TextField
              label="Date text"
              value={p.date_text}
              onChange={(v) => update("personalization", { date_text: v })}
            />
            <TextField
              label="Custom message"
              value={p.custom_message}
              onChange={(v) => update("personalization", { custom_message: v })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Select
                label="Names font"
                value={p.names_font}
                options={FONT_OPTIONS}
                onChange={(v) => update("personalization", { names_font: v })}
              />
              <Select
                label="Details font"
                value={p.details_font}
                options={FONT_OPTIONS}
                onChange={(v) => update("personalization", { details_font: v })}
              />
            </div>
            <Toggle
              label="Show coordinates"
              checked={p.show_coordinates}
              onChange={(v) => update("personalization", { show_coordinates: v })}
            />
            <Toggle
              label="Show time"
              checked={p.show_time}
              onChange={(v) => update("personalization", { show_time: v })}
            />
          </Section>

          <Section title="E · Engraving">
            <Select
              label="Material preset"
              value={eng.material_preset}
              options={materials.map((m) => ({ value: m.id, label: m.label }))}
              onChange={(v) => update("engraving", { material_preset: v })}
            />
            <button
              className="text-xs text-sky-400 hover:underline"
              onClick={() => setAdvanced((a) => !a)}
            >
              {advanced ? "Hide" : "Show"} advanced controls
            </button>
            {advanced && (
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="Min dot (mm)"
                  value={eng.minimum_dot_mm}
                  step={0.05}
                  onChange={(v) => update("engraving", { minimum_dot_mm: v })}
                />
                <NumberField
                  label="Max dot (mm)"
                  value={eng.maximum_dot_mm}
                  step={0.05}
                  onChange={(v) => update("engraving", { maximum_dot_mm: v })}
                />
                <NumberField
                  label="Brightness exponent"
                  value={eng.brightness_exponent}
                  step={0.1}
                  onChange={(v) => update("engraving", { brightness_exponent: v })}
                />
                <NumberField
                  label="Constellation stroke (mm)"
                  value={eng.constellation_stroke_mm}
                  step={0.05}
                  onChange={(v) => update("engraving", { constellation_stroke_mm: v })}
                />
              </div>
            )}
          </Section>

          <Section title="F · Export">
            <Toggle
              label="Convert text to paths (recommended for export)"
              checked={request.export.convert_text_to_paths}
              onChange={(v) => update("export", { convert_text_to_paths: v })}
            />
            <div className="flex gap-2">
              <button
                onClick={() => downloadSvg({ ...request, export: { ...request.export, convert_text_to_paths: true } })}
                className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium hover:bg-emerald-500"
              >
                Download SVG
              </button>
              <button
                onClick={() => downloadPng(request)}
                className="flex-1 rounded-md bg-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-600"
              >
                Download PNG
              </button>
            </div>
            <p className="text-xs text-slate-500">
              SVG export converts text to vector paths so fonts are not required on the laser
              machine. Colours separate LightBurn operations: red = cut, blue = score, black =
              engrave.
            </p>
          </Section>
        </div>

        {/* ---- Live preview ---- */}
        <div className="min-h-[70vh] lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <Preview preview={preview} loading={loading} error={error} />
        </div>
      </div>
    </main>
  );
}
