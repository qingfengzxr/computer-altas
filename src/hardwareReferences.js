// Dimensions are in millimeters, copied from the linked manufacturer sources.
// Geometry without a reference entry remains a generic educational component.
export const coolerReference = {
  manufacturer: "Noctua",
  model: "NH-L9i",
  url: "https://www.noctua.at/en/products/nh-l9i/specifications",
  dimensions: "95 × 92 × 23 mm",
  width: 95,
  depth: 92,
  height: 37,
  heatsinkHeight: 23,
  finCount: 54,
  pipeCount: 2,
  pipeDiameter: 6,
  base: [40.8, 40],
  verified: "2026-09-06",
};
export const fanReference = {
  manufacturer: "Noctua",
  model: "NF-A9x14 HS-PWM",
  url: "https://www.noctua.at/en/products/nh-l9i/specifications",
  mechanicalUrl:
    "https://www.noctua.at/en/products/nf-a9x14-pwm/specifications",
  dimensions: "92 × 92 × 14 mm",
  width: 92,
  height: 14,
  holeSpacing: 82.5,
  // The HS variant is the bundled NH-L9i fan. The shared frame uses this hole spacing.
  verified: "2026-09-06",
};
export const memoryReference = {
  manufacturer: "Kingston",
  model: "KVR26N19S8/8",
  url: "https://www.kingston.com/datasheets/KVR26N19S8_8.pdf",
  dimensions: "133.35 × 31.25 mm",
  length: 133.35,
  height: 31.25,
  contacts: 288,
  packages: 8,
  boardThickness: 1.2,
  // Board thickness is a nominal implementation value; it is not dimensioned in this sheet.
  verified: "2026-09-06",
};
export const hardwareReferences = {
  cooler: coolerReference,
  cpuFan: fanReference,
  ram1: memoryReference,
  ram2: memoryReference,
};
