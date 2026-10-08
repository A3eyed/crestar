// @ts-nocheck
import { AFRICA_COUNTRIES } from "./countries/africa";
import { AMERICAS_COUNTRIES } from "./countries/americas";
import { ASIA_COUNTRIES } from "./countries/asia";
import { EUROPE_COUNTRIES } from "./countries/europe";
import { OCEANIA_COUNTRIES } from "./countries/oceania";

// Country data for identity verification and future market expansion
// Currently operating in Ghana (GH) with plans to expand to other African markets
export const COUNTRIES = [
  ...AFRICA_COUNTRIES,
  ...AMERICAS_COUNTRIES,
  ...ASIA_COUNTRIES,
  ...EUROPE_COUNTRIES,
  ...OCEANIA_COUNTRIES,
];

// ── Universal fallback shown for any country without specific IDs ──────────
const UNIVERSAL_IDS = [
  {
    code: "passport",
    name: "International Passport",
    primary: true,
    requiresBothSides: false,
  },
  {
    code: "national_id",
    name: "National ID Card",
    primary: false,
    requiresBothSides: true,
  },
  {
    code: "drivers_license",
    name: "Driver's License",
    primary: false,
    requiresBothSides: true,
  },
];

// ── Country-specific ID types ─────────────────────────────────────────────
const COUNTRY_IDS = {
  GH: [
    {
      code: "ghana_card",
      name: "Ghana Card (National ID)",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "International Passport",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "drivers_license",
      name: "Driver's License (DVLA)",
      primary: false,
      requiresBothSides: true,
    },
    {
      code: "voters_id",
      name: "Voter's ID Card",
      primary: false,
      requiresBothSides: true,
    },
    {
      code: "nhis_card",
      name: "NHIS Card",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "ssnit_card",
      name: "SSNIT Card",
      primary: false,
      requiresBothSides: false,
    },
  ],
  NG: [
    {
      code: "nin",
      name: "NIN Slip / National ID (NIMC)",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "International Passport",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "drivers_license",
      name: "Driver's License (FRSC)",
      primary: false,
      requiresBothSides: true,
    },
    {
      code: "voters_card",
      name: "Permanent Voter's Card (INEC)",
      primary: false,
      requiresBothSides: true,
    },
    {
      code: "bvn",
      name: "Bank Verification Number (BVN)",
      primary: false,
      requiresBothSides: false,
    },
  ],
  KE: [
    {
      code: "national_id",
      name: "Kenyan National ID",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "International Passport",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "drivers_license",
      name: "Driver's License",
      primary: false,
      requiresBothSides: true,
    },
    {
      code: "kra_pin",
      name: "KRA PIN Certificate",
      primary: false,
      requiresBothSides: false,
    },
  ],
  ZA: [
    {
      code: "sa_id",
      name: "South African ID Book / Smart Card",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "International Passport",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "drivers_license",
      name: "Driver's License",
      primary: false,
      requiresBothSides: true,
    },
  ],
  TZ: [
    {
      code: "nida",
      name: "NIDA National ID",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "International Passport",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "drivers_license",
      name: "Driver's License",
      primary: false,
      requiresBothSides: true,
    },
    {
      code: "voters_id",
      name: "Voter's Registration Card",
      primary: false,
      requiresBothSides: true,
    },
  ],
  UG: [
    {
      code: "national_id",
      name: "Uganda National ID",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "International Passport",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "drivers_license",
      name: "Driver's License",
      primary: false,
      requiresBothSides: true,
    },
  ],
  RW: [
    {
      code: "national_id",
      name: "Rwanda National ID (Indangamuntu)",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "International Passport",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "drivers_license",
      name: "Driver's License",
      primary: false,
      requiresBothSides: true,
    },
  ],
  ET: [
    {
      code: "national_id",
      name: "Ethiopian National ID (Fayda)",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "International Passport",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "drivers_license",
      name: "Driver's License",
      primary: false,
      requiresBothSides: true,
    },
  ],
  CM: [
    {
      code: "national_id",
      name: "Cameroon National ID",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "International Passport",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "drivers_license",
      name: "Driver's License",
      primary: false,
      requiresBothSides: true,
    },
  ],
  SN: [
    {
      code: "cni",
      name: "Carte Nationale d'Identité (CNI)",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "International Passport",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "drivers_license",
      name: "Driver's License",
      primary: false,
      requiresBothSides: true,
    },
  ],
  GB: [
    {
      code: "passport",
      name: "UK Passport",
      primary: true,
      requiresBothSides: false,
    },
    {
      code: "drivers_license",
      name: "UK Driver's License (DVLA)",
      primary: false,
      requiresBothSides: true,
    },
    {
      code: "biometric_card",
      name: "Biometric Residence Permit (BRP)",
      primary: false,
      requiresBothSides: true,
    },
  ],
  US: [
    {
      code: "drivers_license",
      name: "State Driver's License / State ID",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "US Passport / Passport Card",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "real_id",
      name: "REAL ID",
      primary: false,
      requiresBothSides: true,
    },
  ],
  CA: [
    {
      code: "drivers_license",
      name: "Provincial Driver's License",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "Canadian Passport",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "health_card",
      name: "Provincial Health Card",
      primary: false,
      requiresBothSides: true,
    },
  ],
  AU: [
    {
      code: "drivers_license",
      name: "Australian Driver's License",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "Australian Passport",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "medicare_card",
      name: "Medicare Card",
      primary: false,
      requiresBothSides: false,
    },
  ],
  AE: [
    {
      code: "emirates_id",
      name: "Emirates ID",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "International Passport",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "uae_residence",
      name: "UAE Residence Visa",
      primary: false,
      requiresBothSides: true,
    },
  ],
  IN: [
    {
      code: "aadhaar",
      name: "Aadhaar Card",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "Indian Passport",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "pan_card",
      name: "PAN Card",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "voters_id",
      name: "Voter ID (EPIC)",
      primary: false,
      requiresBothSides: true,
    },
    {
      code: "drivers_license",
      name: "Driver's License",
      primary: false,
      requiresBothSides: true,
    },
  ],
  ZM: [
    {
      code: "national_id",
      name: "Zambia National Registration Card (NRC)",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "International Passport",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "drivers_license",
      name: "Driver's License",
      primary: false,
      requiresBothSides: true,
    },
  ],
  ZW: [
    {
      code: "national_id",
      name: "Zimbabwe National ID",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "International Passport",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "drivers_license",
      name: "Driver's License",
      primary: false,
      requiresBothSides: true,
    },
  ],
  MW: [
    {
      code: "national_id",
      name: "Malawi National ID",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "International Passport",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "drivers_license",
      name: "Driver's License",
      primary: false,
      requiresBothSides: true,
    },
  ],
  MZ: [
    {
      code: "national_id",
      name: "Mozambique Bilhete de Identidade",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "International Passport",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "drivers_license",
      name: "Driver's License",
      primary: false,
      requiresBothSides: true,
    },
  ],
  DE: [
    {
      code: "personalausweis",
      name: "German ID Card (Personalausweis)",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "German Passport (Reisepass)",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "drivers_license",
      name: "Driver's License (Führerschein)",
      primary: false,
      requiresBothSides: true,
    },
  ],
  FR: [
    {
      code: "cni",
      name: "Carte Nationale d'Identité",
      primary: true,
      requiresBothSides: true,
    },
    {
      code: "passport",
      name: "French Passport",
      primary: false,
      requiresBothSides: false,
    },
    {
      code: "drivers_license",
      name: "Permis de Conduire",
      primary: false,
      requiresBothSides: true,
    },
  ],
};

export const getCountryByCode = (code) => {
  return COUNTRIES.find((country) => country.code === code);
};

export const getRegionsByCountry = (countryCode) => {
  const country = getCountryByCode(countryCode);
  return country ? country.regions : [];
};

export const getIdTypesByCountry = (countryCode) => {
  // Return country-specific IDs if defined, otherwise universal fallback
  return COUNTRY_IDS[countryCode] || UNIVERSAL_IDS;
};

export const getPrimaryIdType = (countryCode) => {
  const idTypes = getIdTypesByCountry(countryCode);
  return idTypes.find((id) => id.primary) || idTypes[0];
};
