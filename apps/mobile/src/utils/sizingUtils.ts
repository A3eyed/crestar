// @ts-nocheck
// ─── Sizing Categories ──────────────────────────────────────────────────────
export const SIZING_CATEGORIES = [
  {
    key: "apparel",
    label: "Apparel",
    icon: "👕",
    description: "XS–6XL with size system & type",
  },
  {
    key: "shoes",
    label: "Shoes / Footwear",
    icon: "👟",
    description: "Numeric + width designations",
  },
  {
    key: "pants",
    label: "Pants / Jeans",
    icon: "👖",
    description: "Waist × Inseam (e.g. 32/34)",
  },
  {
    key: "dress_shirts",
    label: "Dress Shirts",
    icon: "👔",
    description: "Neck × Sleeve (e.g. 15/32)",
  },
  {
    key: "home_furniture",
    label: "Home & Furniture",
    icon: "🛋️",
    description: "L × W × H dimensions",
  },
  {
    key: "bags",
    label: "Bags & Backpacks",
    icon: "🎒",
    description: "Volume / Capacity (e.g. 20L)",
  },
  {
    key: "unit_count",
    label: "Unit / Count",
    icon: "📦",
    description: "Pack count (e.g. 12-count)",
  },
  {
    key: "custom",
    label: "Custom / Other",
    icon: "✏️",
    description: "Free-text sizing",
  },
  {
    key: "none",
    label: "No Sizing",
    icon: "—",
    description: "One size / not applicable",
  },
];

// ─── Size Systems ────────────────────────────────────────────────────────────
export const SIZE_SYSTEMS = ["US", "UK", "EU", "IT", "JP", "AU", "FR"];

// ─── Size Types (Apparel Modifiers) ─────────────────────────────────────────
export const SIZE_TYPES = ["Regular", "Petite", "Tall", "Plus", "Maternity"];

// ─── Alpha Sizes (XS → 6XL) ─────────────────────────────────────────────────
export const ALPHA_SIZES_ORDERED = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "4XL",
  "5XL",
  "6XL",
  "One Size",
];

// ─── Shoe Sizes (US Men's baseline) ─────────────────────────────────────────
export const SHOE_SIZES_US = [
  "4",
  "4.5",
  "5",
  "5.5",
  "6",
  "6.5",
  "7",
  "7.5",
  "8",
  "8.5",
  "9",
  "9.5",
  "10",
  "10.5",
  "11",
  "11.5",
  "12",
  "12.5",
  "13",
  "14",
  "15",
];
export const SHOE_SIZES_UK = [
  "3",
  "3.5",
  "4",
  "4.5",
  "5",
  "5.5",
  "6",
  "6.5",
  "7",
  "7.5",
  "8",
  "8.5",
  "9",
  "9.5",
  "10",
  "10.5",
  "11",
  "12",
  "13",
  "14",
];
export const SHOE_SIZES_EU = [
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
];
export const SHOE_SIZES_JP = [
  "22",
  "22.5",
  "23",
  "23.5",
  "24",
  "24.5",
  "25",
  "25.5",
  "26",
  "26.5",
  "27",
  "27.5",
  "28",
  "28.5",
  "29",
  "30",
];
export const SHOE_WIDTHS = [
  "N (Narrow)",
  "M (Medium)",
  "W (Wide)",
  "XW (Extra Wide)",
];

// ─── Pants: Waist & Inseam ───────────────────────────────────────────────────
export const WAIST_SIZES = [
  "24",
  "25",
  "26",
  "27",
  "28",
  "29",
  "30",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "38",
  "40",
  "42",
  "44",
  "46",
  "48",
  "50",
  "52",
];
export const INSEAM_SIZES = ["26", "28", "30", "32", "34", "36"];

// ─── Dress Shirts: Neck & Sleeve ─────────────────────────────────────────────
export const NECK_SIZES = [
  "13",
  "13.5",
  "14",
  "14.5",
  "15",
  "15.5",
  "16",
  "16.5",
  "17",
  "17.5",
  "18",
  "18.5",
  "19",
];
export const SLEEVE_SIZES = ["30", "31", "32", "33", "34", "35", "36"];

// ─── Bags & Backpacks ────────────────────────────────────────────────────────
export const BAG_VOLUMES = [
  "5L",
  "8L",
  "10L",
  "12L",
  "15L",
  "18L",
  "20L",
  "22L",
  "25L",
  "30L",
  "35L",
  "40L",
  "45L",
  "50L",
  "60L",
  "70L",
  "80L",
  "100L",
];

// ─── Unit / Count ────────────────────────────────────────────────────────────
export const UNIT_COUNTS = [
  "1-count",
  "2-count",
  "3-count",
  "4-count",
  "6-count",
  "8-count",
  "10-count",
  "12-count",
  "16-count",
  "24-count",
  "32-count",
  "36-count",
  "48-count",
  "72-count",
  "100-count",
];

// ─── Dimension Units ─────────────────────────────────────────────────────────
export const DIMENSION_UNITS = ["cm", "inches"];

// ─── Shoe Sizes by System ────────────────────────────────────────────────────
export function getShoesBySystem(system) {
  switch (system) {
    case "UK":
      return SHOE_SIZES_UK;
    case "EU":
      return SHOE_SIZES_EU;
    case "JP":
      return SHOE_SIZES_JP;
    case "US":
    default:
      return SHOE_SIZES_US;
  }
}

/**
 * Build a display label for an apparel size, appending size type modifier.
 * e.g. buildApparelLabel("L", "Tall", "US") → "L Tall (US)"
 *      buildApparelLabel("XL", "Regular", "EU") → "XL (EU)"
 */
export function buildApparelLabel(size, sizeType, sizeSystem) {
  let label = size;
  if (sizeType && sizeType !== "Regular") label += ` ${sizeType}`;
  if (sizeSystem) label += ` (${sizeSystem})`;
  return label;
}

/**
 * Build shoe size label including width.
 * e.g. buildShoeLabel("10", "W (Wide)", "US") → "US 10 W"
 */
export function buildShoeLabel(size, width, sizeSystem) {
  const widthCode = width ? width.split(" ")[0] : null;
  let label = sizeSystem ? `${sizeSystem} ${size}` : size;
  if (widthCode && widthCode !== "M") label += ` ${widthCode}`;
  return label;
}

/**
 * Build pants/dress shirt combined-measurement label.
 * buildComboLabel("32", "34") → "32/34"
 */
export function buildComboLabel(first, second) {
  if (!first || !second) return "";
  return `${first}/${second}`;
}

/**
 * Generate all Waist × Inseam combinations from selected arrays.
 */
export function generatePantsCombos(waistSizes, inseamSizes) {
  const combos = [];
  for (const w of waistSizes) {
    for (const i of inseamSizes) {
      combos.push(buildComboLabel(w, i));
    }
  }
  return combos;
}

/**
 * Generate all Neck × Sleeve combinations from selected arrays.
 */
export function generateShirtCombos(neckSizes, sleeveSizes) {
  const combos = [];
  for (const n of neckSizes) {
    for (const s of sleeveSizes) {
      combos.push(buildComboLabel(n, s));
    }
  }
  return combos;
}

/**
 * Normalize a raw size string into a canonical form for clean filtering.
 *   "10 US" → "US 10"
 *   "US10"  → "US 10"
 *   "L Tall" → "L Tall"
 */
export function normalizeSize(raw) {
  if (!raw) return "";
  const s = raw.trim();
  // "10 US" or "10US"
  const trailingSystem = s.match(/^(\d+\.?\d*)\s*(US|UK|EU|IT|JP|AU|FR)$/i);
  if (trailingSystem)
    return `${trailingSystem[2].toUpperCase()} ${trailingSystem[1]}`;
  // "US10"
  const leadingSystem = s.match(/^(US|UK|EU|IT|JP|AU|FR)(\d+\.?\d*)$/i);
  if (leadingSystem)
    return `${leadingSystem[1].toUpperCase()} ${leadingSystem[2]}`;
  return s;
}

/**
 * Sort sizes in logical (non-alphabetical) order.
 */
export function sortSizes(sizes = [], category = "apparel") {
  if (!sizes.length) return [];
  if (category === "apparel") {
    return [...sizes].sort((a, b) => {
      const aBase = a.split(" ")[0];
      const bBase = b.split(" ")[0];
      const ai = ALPHA_SIZES_ORDERED.indexOf(aBase);
      const bi = ALPHA_SIZES_ORDERED.indexOf(bBase);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  }
  if (["shoes", "bags", "unit_count"].includes(category)) {
    return [...sizes].sort((a, b) => {
      const an = parseFloat(a);
      const bn = parseFloat(b);
      if (!isNaN(an) && !isNaN(bn)) return an - bn;
      return a.localeCompare(b);
    });
  }
  if (category === "pants") {
    return [...sizes].sort((a, b) => {
      const [aw = "0", ai2 = "0"] = a.split("/");
      const [bw = "0", bi2 = "0"] = b.split("/");
      const waistDiff = parseFloat(aw) - parseFloat(bw);
      return waistDiff !== 0 ? waistDiff : parseFloat(ai2) - parseFloat(bi2);
    });
  }
  if (category === "dress_shirts") {
    return [...sizes].sort((a, b) => {
      const [an2 = "0", as2 = "0"] = a.split("/");
      const [bn2 = "0", bs2 = "0"] = b.split("/");
      const neckDiff = parseFloat(an2) - parseFloat(bn2);
      return neckDiff !== 0 ? neckDiff : parseFloat(as2) - parseFloat(bs2);
    });
  }
  return [...sizes].sort((a, b) => a.localeCompare(b));
}

/**
 * Convert dimensional specs object to a human-readable label.
 * e.g. { length: "120", width: "60", height: "75", unit: "cm" }
 *   → "120 × 60 × 75 cm"
 */
export function dimensionalLabel(specs) {
  if (!specs) return "";
  const { length, width, height, unit } = specs;
  const parts = [length, width, height].filter(Boolean);
  if (!parts.length) return "";
  return `${parts.join(" × ")} ${unit || "cm"}`;
}
