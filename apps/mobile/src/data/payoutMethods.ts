// @ts-nocheck
/**
 * Paystack-aligned payout methods for African markets.
 * Crestar is built for African sellers — methods follow the user's country.
 */

const DEFAULT_METHODS = [
  {
    code: "mobile_money",
    name: "Mobile Money",
    description: "Payout to your mobile money wallet",
    icon: "📱",
    fields: [
      { key: "phone_number", label: "Phone Number", type: "phone", placeholder: "Phone number" },
      { key: "account_name", label: "Registered Name", type: "text" },
    ],
  },
  {
    code: "bank_transfer",
    name: "Bank Transfer",
    description: "Payout to your bank account",
    icon: "🏦",
    fields: [
      { key: "account_number", label: "Account Number", type: "text" },
      { key: "bank_code", label: "Bank", type: "bank_search" },
      { key: "account_name", label: "Account Name", type: "text" },
    ],
  },
];

export const PAYOUT_METHODS = {
  GH: [
    {
      code: "mobile_money",
      name: "Mobile Money",
      description: "MTN, Telecel, AT Money",
      icon: "📱",
      fields: [
        {
          key: "network",
          label: "Network",
          type: "select",
          options: ["MTN", "Telecel", "AirtelTigo"],
        },
        {
          key: "phone_number",
          label: "Phone Number",
          type: "phone",
          placeholder: "+233 XX XXX XXXX",
        },
        { key: "account_name", label: "Registered Name", type: "text" },
      ],
    },
    {
      code: "bank_transfer",
      name: "Bank Transfer",
      description: "Direct bank deposit",
      icon: "🏦",
      fields: [
        { key: "account_number", label: "Account Number", type: "text" },
        { key: "bank_code", label: "Bank", type: "bank_search" },
        { key: "account_name", label: "Account Name", type: "text" },
      ],
    },
  ],
  NG: [
    {
      code: "bank_transfer",
      name: "Bank Transfer",
      description: "Naira payout to any Nigerian bank",
      icon: "🏦",
      fields: [
        { key: "account_number", label: "Account Number", type: "text", placeholder: "10-digit NUBAN" },
        { key: "bank_code", label: "Bank", type: "bank_search" },
        { key: "account_name", label: "Account Name", type: "text" },
      ],
    },
  ],
  KE: [
    {
      code: "mpesa",
      name: "M-Pesa",
      description: "Instant payout to M-Pesa",
      icon: "📱",
      fields: [
        { key: "phone_number", label: "M-Pesa Number", type: "phone", placeholder: "07XX XXX XXX" },
        { key: "account_name", label: "Registered Name", type: "text" },
      ],
    },
    {
      code: "bank_transfer",
      name: "Bank Transfer",
      description: "Kenyan bank account",
      icon: "🏦",
      fields: [
        { key: "account_number", label: "Account Number", type: "text" },
        { key: "bank_code", label: "Bank", type: "bank_search" },
        { key: "account_name", label: "Account Name", type: "text" },
      ],
    },
  ],
  ZA: [
    {
      code: "bank_transfer",
      name: "Bank Transfer",
      description: "EFT to South African bank",
      icon: "🏦",
      fields: [
        { key: "account_number", label: "Account Number", type: "text" },
        { key: "bank_code", label: "Bank", type: "bank_search" },
        { key: "account_name", label: "Account Name", type: "text" },
      ],
    },
  ],
  UG: DEFAULT_METHODS,
  TZ: DEFAULT_METHODS,
  RW: DEFAULT_METHODS,
  CI: DEFAULT_METHODS,
  SN: DEFAULT_METHODS,
  CM: DEFAULT_METHODS,
  EG: DEFAULT_METHODS,
  ET: DEFAULT_METHODS,
  ZM: DEFAULT_METHODS,
  BW: DEFAULT_METHODS,
};

export const getPayoutMethodsByCountry = (countryCode) => {
  const code = (countryCode || "GH").toUpperCase();
  return PAYOUT_METHODS[code] || DEFAULT_METHODS;
};

export const getPayoutMethodByCode = (countryCode, methodCode) => {
  const methods = getPayoutMethodsByCountry(countryCode);
  return methods.find((method) => method.code === methodCode);
};

export const PAYOUT_METHODS_BY_COUNTRY = PAYOUT_METHODS;

export const AFRICA_COUNTRY_OPTIONS = [
  { code: "GH", name: "Ghana" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" },
  { code: "TZ", name: "Tanzania" },
  { code: "UG", name: "Uganda" },
  { code: "RW", name: "Rwanda" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "SN", name: "Senegal" },
  { code: "CM", name: "Cameroon" },
  { code: "EG", name: "Egypt" },
  { code: "ET", name: "Ethiopia" },
  { code: "ZM", name: "Zambia" },
  { code: "BW", name: "Botswana" },
];
