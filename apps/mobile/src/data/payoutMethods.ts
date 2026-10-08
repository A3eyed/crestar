// @ts-nocheck
// Paystack supported payout methods for Ghana
// Crestar currently operates in Ghana as the primary market
// Platform expansion to additional markets is planned for future releases
export const PAYOUT_METHODS = {
  GH: [
    {
      code: "mobile_money",
      name: "Mobile Money",
      description: "MTN, Vodafone, AirtelTigo",
      icon: "📱",
      fields: [
        {
          key: "network",
          label: "Network",
          type: "select",
          options: ["MTN", "Vodafone", "AirtelTigo"],
        },
        {
          key: "phone_number",
          label: "Phone Number",
          type: "phone",
          placeholder: "+233 XX XXX XXXX",
        },
      ],
    },
    {
      code: "bank_transfer",
      name: "Bank Transfer",
      description: "Direct bank deposit",
      icon: "🏦",
      fields: [
        { key: "account_number", label: "Account Number", type: "text" },
        {
          key: "bank_code",
          label: "Bank",
          type: "bank_search",
          options: [
            "Absa Bank Ghana",
            "Access Bank Ghana",
            "Agricultural Development Bank (ADB)",
            "Bank of Africa Ghana",
            "CAL Bank",
            "Consolidated Bank Ghana (CBG)",
            "Ecobank Ghana",
            "FBNBank Ghana",
            "Fidelity Bank Ghana",
            "First Atlantic Bank",
            "First National Bank Ghana (FNB)",
            "GCB Bank",
            "GT Bank Ghana",
            "National Investment Bank (NIB)",
            "OmniBSIC Bank Ghana",
            "Premium Bank Ghana",
            "Prudential Bank Ghana",
            "Republic Bank Ghana",
            "Société Générale Ghana",
            "Stanbic Bank Ghana",
            "Standard Chartered Bank Ghana",
            "United Bank for Africa (UBA Ghana)",
            "Universal Merchant Bank (UMB)",
            "Zenith Bank Ghana",
          ],
        },
        { key: "account_name", label: "Account Name", type: "text" },
      ],
    },
  ],
};

export const getPayoutMethodsByCountry = (countryCode) => {
  // Currently only Ghana is supported
  return PAYOUT_METHODS[countryCode] || PAYOUT_METHODS.GH || [];
};

export const getPayoutMethodByCode = (countryCode, methodCode) => {
  const methods = getPayoutMethodsByCountry(countryCode);
  return methods.find((method) => method.code === methodCode);
};

export const PAYOUT_METHODS_BY_COUNTRY = PAYOUT_METHODS;
