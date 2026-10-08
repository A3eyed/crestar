// @ts-nocheck
/**
 * Brand Colors - Centralized color definitions
 * Use these constants throughout the app for consistency
 */

export const BRAND_COLORS = {
  // Primary brand color (gold)
  primary: "#D4AF37",
  primaryRGB: "212, 175, 55",

  // Primary color variations
  primary10: "rgba(212, 175, 55, 0.1)",
  primary15: "rgba(212, 175, 55, 0.15)",
  primary20: "rgba(212, 175, 55, 0.2)",
  primary30: "rgba(212, 175, 55, 0.3)",
  primary40: "rgba(212, 175, 55, 0.4)",
  primary50: "rgba(212, 175, 55, 0.5)",
  primary60: "rgba(212, 175, 55, 0.6)",
  primary70: "rgba(212, 175, 55, 0.7)",
  primary80: "rgba(212, 175, 55, 0.8)",
  primary90: "rgba(212, 175, 55, 0.9)",

  // Success colors (gold to match brand)
  success: "#D4AF37",
  successRGB: "212, 175, 55",

  // Warning colors
  warning: "#F59E0B",
  warningRGB: "245, 158, 11",

  // Error colors
  error: "#EF4444",
  errorRGB: "239, 68, 68",

  // Neutral colors
  white: "#FFFFFF",
  black: "#000000",
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },
};

// Helper function to create rgba from hex
export function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default BRAND_COLORS;
