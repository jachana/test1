import type {
  GeocodeResponse,
  MapRequest,
  MaterialPreset,
  PreviewResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api/v1";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export function fetchPreview(request: MapRequest): Promise<PreviewResponse> {
  return postJson<PreviewResponse>("/maps/preview", request);
}

export function geocode(query: string): Promise<GeocodeResponse> {
  return postJson<GeocodeResponse>("/geocode", { query });
}

export async function fetchMaterials(): Promise<MaterialPreset[]> {
  const res = await fetch(`${API_BASE}/presets/materials`);
  if (!res.ok) throw new Error("Failed to load material presets");
  return res.json();
}

async function download(path: string, request: MapRequest, fallbackName: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadSvg(request: MapRequest) {
  return download("/maps/export/svg", request, "starmap.svg");
}

export function downloadPng(request: MapRequest) {
  return download("/maps/export/png", request, "starmap.png");
}
