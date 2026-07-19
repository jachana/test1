import type { MapRequest } from "./types";

// Default request mirrors the specification example (Chesapeake, Virginia).
export const DEFAULT_REQUEST: MapRequest = {
  observer: {
    location_name: "Chesapeake, Virginia, USA",
    latitude: 36.7682,
    longitude: -76.2875,
    elevation_m: 0,
    timezone: "America/New_York",
    local_datetime: "2017-09-26T21:30:00",
  },
  sky: {
    magnitude_limit: 5.8,
    rotation_degrees: 0,
    show_constellations: true,
    show_constellation_labels: false,
    show_planets: true,
    show_moon: true,
    show_sun: false,
    show_cardinal_directions: true,
  },
  layout: {
    canvas_width_mm: 300,
    canvas_height_mm: 400,
    map_diameter_mm: 220,
    map_center_x_mm: null,
    map_center_y_mm: null,
    outer_margin_mm: 15,
  },
  engraving: {
    minimum_dot_mm: 0.3,
    maximum_dot_mm: 1.8,
    brightness_exponent: 1.8,
    constellation_stroke_mm: 0.2,
    minimum_gap_mm: 0.2,
    material_preset: "birch_plywood",
  },
  personalization: {
    names: "Angelina & Michael",
    headline: "When Two Became One",
    location_text: "Chesapeake, VA",
    date_text: "September 26, 2017",
    time_text: "9:30 PM",
    custom_message: "",
    show_coordinates: true,
    show_time: false,
    names_font: "script-default",
    details_font: "sans-default",
  },
  export: {
    convert_text_to_paths: false, // preview uses live text; export converts to paths
    include_metadata: true,
  },
};

// Star-density control maps a simple 1..10 slider to a magnitude limit (3.0-7.0).
export function densityToMagnitude(density: number): number {
  const clamped = Math.min(10, Math.max(1, density));
  return Math.round((3.0 + ((clamped - 1) / 9) * (7.0 - 3.0)) * 10) / 10;
}

export function magnitudeToDensity(mag: number): number {
  return Math.round(((mag - 3.0) / (7.0 - 3.0)) * 9 + 1);
}
