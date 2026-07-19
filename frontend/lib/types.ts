// Request/response types mirroring the backend Pydantic schemas.

export interface ObserverState {
  location_name: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  timezone: string;
  local_datetime: string; // "YYYY-MM-DDTHH:mm:ss"
}

export interface SkyState {
  magnitude_limit: number;
  rotation_degrees: number;
  show_constellations: boolean;
  show_constellation_labels: boolean;
  show_planets: boolean;
  show_moon: boolean;
  show_sun: boolean;
  show_cardinal_directions: boolean;
}

export interface LayoutState {
  canvas_width_mm: number;
  canvas_height_mm: number;
  map_diameter_mm: number;
  map_center_x_mm: number | null;
  map_center_y_mm: number | null;
  outer_margin_mm: number;
}

export interface EngravingState {
  minimum_dot_mm: number;
  maximum_dot_mm: number;
  brightness_exponent: number;
  constellation_stroke_mm: number;
  minimum_gap_mm: number;
  material_preset: string;
}

export interface PersonalizationState {
  names: string;
  headline: string;
  location_text: string;
  date_text: string;
  time_text: string;
  custom_message: string;
  show_coordinates: boolean;
  show_time: boolean;
  names_font: string;
  details_font: string;
}

export interface ExportState {
  convert_text_to_paths: boolean;
  include_metadata: boolean;
}

export interface MapRequest {
  observer: ObserverState;
  sky: SkyState;
  layout: LayoutState;
  engraving: EngravingState;
  personalization: PersonalizationState;
  export: ExportState;
}

export interface ValidationIssue {
  level: "info" | "warning" | "error";
  code: string;
  message: string;
  count: number;
}

export interface PreviewResponse {
  svg: string;
  validation: { issues: ValidationIssue[]; ok: boolean };
  metadata: Record<string, unknown> & {
    utc_datetime: string;
    stars_above_horizon: number;
  };
  star_count: number;
  body_count: number;
}

export interface MaterialPreset {
  id: string;
  label: string;
  minimum_dot_mm: number;
  minimum_stroke_mm: number;
  minimum_text_height_mm: number;
  recommended_density: string;
  note: string;
}

export interface GeocodeResponse {
  display_name: string;
  latitude: number;
  longitude: number;
  timezone: string;
}
