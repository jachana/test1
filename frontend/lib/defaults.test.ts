import { describe, expect, it } from "vitest";

import { densityToMagnitude, magnitudeToDensity } from "./defaults";

describe("star density mapping", () => {
  it("maps density 1 to magnitude 3.0 (fewest stars)", () => {
    expect(densityToMagnitude(1)).toBe(3.0);
  });

  it("maps density 10 to magnitude 7.0 (most stars)", () => {
    expect(densityToMagnitude(10)).toBe(7.0);
  });

  it("is monotonic increasing", () => {
    expect(densityToMagnitude(3)).toBeLessThan(densityToMagnitude(7));
  });

  it("clamps out-of-range density", () => {
    expect(densityToMagnitude(0)).toBe(3.0);
    expect(densityToMagnitude(99)).toBe(7.0);
  });

  it("round-trips approximately", () => {
    const mag = densityToMagnitude(5);
    const density = magnitudeToDensity(mag);
    expect(density).toBeGreaterThanOrEqual(4);
    expect(density).toBeLessThanOrEqual(6);
  });
});
