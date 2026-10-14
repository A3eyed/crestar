// @ts-nocheck
/**
 * Crestar Africa markets — countries, regions, and Paystack-aligned payout methods.
 * Paystack operates across multiple African markets; methods vary by country.
 */

export const AFRICA_COUNTRIES = [
  { code: 'GH', name: 'Ghana', currency: 'GHS', paystackCountry: 'ghana' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', paystackCountry: 'nigeria' },
  { code: 'KE', name: 'Kenya', currency: 'KES', paystackCountry: 'kenya' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', paystackCountry: 'south africa' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS', paystackCountry: 'tanzania' },
  { code: 'UG', name: 'Uganda', currency: 'UGX', paystackCountry: 'uganda' },
  { code: 'RW', name: 'Rwanda', currency: 'RWF', paystackCountry: 'rwanda' },
  { code: 'CI', name: "Côte d'Ivoire", currency: 'XOF', paystackCountry: 'ivory coast' },
  { code: 'SN', name: 'Senegal', currency: 'XOF', paystackCountry: 'senegal' },
  { code: 'CM', name: 'Cameroon', currency: 'XAF', paystackCountry: 'cameroon' },
  { code: 'EG', name: 'Egypt', currency: 'EGP', paystackCountry: 'egypt' },
  { code: 'ET', name: 'Ethiopia', currency: 'ETB', paystackCountry: 'ethiopia' },
  { code: 'ZM', name: 'Zambia', currency: 'ZMW', paystackCountry: 'zambia' },
  { code: 'BW', name: 'Botswana', currency: 'BWP', paystackCountry: 'botswana' },
  { code: 'GH_OTHER', name: 'Other African country', currency: 'USD', paystackCountry: null },
];

export const REGIONS_BY_COUNTRY = {
  GH: [
    'Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern', 'Volta', 'Northern',
    'Upper East', 'Upper West', 'Bono', 'Bono East', 'Ahafo', 'Savannah', 'North East',
    'Oti', 'Western North',
  ],
  NG: [
    'Lagos', 'Abuja (FCT)', 'Kano', 'Rivers', 'Oyo', 'Kaduna', 'Enugu', 'Delta',
    'Anambra', 'Ogun', 'Edo', 'Imo', 'Plateau', 'Kwara', 'Ondo', 'Other',
  ],
  KE: [
    'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kiambu', 'Machakos',
    'Nyeri', 'Kakamega', 'Other',
  ],
  ZA: [
    'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State',
    'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape',
  ],
  TZ: ['Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Mbeya', 'Zanzibar', 'Other'],
  UG: ['Kampala', 'Wakiso', 'Mukono', 'Jinja', 'Mbarara', 'Gulu', 'Other'],
  RW: ['Kigali', 'Northern', 'Southern', 'Eastern', 'Western'],
  CI: ['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Other'],
  SN: ['Dakar', 'Thiès', 'Saint-Louis', 'Kaolack', 'Other'],
  CM: ['Centre (Yaoundé)', 'Littoral (Douala)', 'West', 'Northwest', 'Other'],
  EG: ['Cairo', 'Giza', 'Alexandria', 'Other'],
  ET: ['Addis Ababa', 'Oromia', 'Amhara', 'Other'],
  ZM: ['Lusaka', 'Copperbelt', 'Other'],
  BW: ['Gaborone', 'Francistown', 'Other'],
};

export const PAYOUT_METHODS_BY_COUNTRY = {
  GH: [
    {
      code: 'mtn_momo',
      type: 'mobile_money',
      name: 'MTN Mobile Money',
      description: 'Instant payout to your MTN MoMo wallet',
      fields: [
        { key: 'phone_number', label: 'MoMo Number', type: 'phone', placeholder: '024 XXX XXXX' },
        { key: 'account_name', label: 'Registered Name', type: 'text', placeholder: 'Name on MoMo account' },
      ],
    },
    {
      code: 'vodafone_cash',
      type: 'mobile_money',
      name: 'Telecel Cash',
      description: 'Instant payout to your Telecel Cash wallet',
      fields: [
        { key: 'phone_number', label: 'Telecel Cash Number', type: 'phone', placeholder: '020 XXX XXXX' },
        { key: 'account_name', label: 'Registered Name', type: 'text', placeholder: 'Name on account' },
      ],
    },
    {
      code: 'airteltigo_money',
      type: 'mobile_money',
      name: 'AT Money',
      description: 'Instant payout to your AT Money wallet',
      fields: [
        { key: 'phone_number', label: 'AT Money Number', type: 'phone', placeholder: '027 XXX XXXX' },
        { key: 'account_name', label: 'Registered Name', type: 'text', placeholder: 'Name on account' },
      ],
    },
    {
      code: 'bank_transfer',
      type: 'bank_transfer',
      name: 'Bank Transfer',
      description: '1 to 3 business days to your bank account',
      fields: [
        { key: 'bank_name', label: 'Bank', type: 'bank_search', placeholder: 'Select your bank' },
        { key: 'account_number', label: 'Account Number', type: 'text', placeholder: 'Enter account number' },
        { key: 'account_name', label: 'Account Holder Name', type: 'text', placeholder: 'Name on bank account' },
      ],
    },
  ],
  NG: [
    {
      code: 'bank_transfer',
      type: 'bank_transfer',
      name: 'Bank Transfer',
      description: 'Naira payout to any Nigerian bank',
      fields: [
        { key: 'bank_name', label: 'Bank', type: 'bank_search', placeholder: 'Select your bank' },
        { key: 'account_number', label: 'Account Number', type: 'text', placeholder: '10-digit NUBAN' },
        { key: 'account_name', label: 'Account Name', type: 'text', placeholder: 'Name on account' },
      ],
    },
  ],
  KE: [
    {
      code: 'mpesa',
      type: 'mobile_money',
      name: 'M-Pesa',
      description: 'Instant payout to your M-Pesa number',
      fields: [
        { key: 'phone_number', label: 'M-Pesa Number', type: 'phone', placeholder: '07XX XXX XXX' },
        { key: 'account_name', label: 'Registered Name', type: 'text', placeholder: 'Name on M-Pesa' },
      ],
    },
    {
      code: 'bank_transfer',
      type: 'bank_transfer',
      name: 'Bank Transfer',
      description: 'Payout to a Kenyan bank account',
      fields: [
        { key: 'bank_name', label: 'Bank', type: 'bank_search', placeholder: 'Select your bank' },
        { key: 'account_number', label: 'Account Number', type: 'text', placeholder: 'Account number' },
        { key: 'account_name', label: 'Account Name', type: 'text', placeholder: 'Name on account' },
      ],
    },
  ],
  ZA: [
    {
      code: 'bank_transfer',
      type: 'bank_transfer',
      name: 'Bank Transfer',
      description: 'EFT to a South African bank account',
      fields: [
        { key: 'bank_name', label: 'Bank', type: 'bank_search', placeholder: 'Select your bank' },
        { key: 'account_number', label: 'Account Number', type: 'text', placeholder: 'Account number' },
        { key: 'account_name', label: 'Account Name', type: 'text', placeholder: 'Name on account' },
      ],
    },
  ],
  TZ: [
    {
      code: 'mpesa_tz',
      type: 'mobile_money',
      name: 'M-Pesa Tanzania',
      description: 'Mobile money payout',
      fields: [
        { key: 'phone_number', label: 'Phone Number', type: 'phone', placeholder: '07XX XXX XXX' },
        { key: 'account_name', label: 'Registered Name', type: 'text', placeholder: 'Name on account' },
      ],
    },
    {
      code: 'bank_transfer',
      type: 'bank_transfer',
      name: 'Bank Transfer',
      description: 'Bank deposit',
      fields: [
        { key: 'bank_name', label: 'Bank', type: 'bank_search', placeholder: 'Select your bank' },
        { key: 'account_number', label: 'Account Number', type: 'text', placeholder: 'Account number' },
        { key: 'account_name', label: 'Account Name', type: 'text', placeholder: 'Name on account' },
      ],
    },
  ],
  UG: [
    {
      code: 'mobile_money_ug',
      type: 'mobile_money',
      name: 'Mobile Money',
      description: 'MTN / Airtel Uganda',
      fields: [
        { key: 'phone_number', label: 'Phone Number', type: 'phone', placeholder: '07XX XXX XXX' },
        { key: 'account_name', label: 'Registered Name', type: 'text', placeholder: 'Name on account' },
      ],
    },
    {
      code: 'bank_transfer',
      type: 'bank_transfer',
      name: 'Bank Transfer',
      description: 'Bank deposit',
      fields: [
        { key: 'bank_name', label: 'Bank', type: 'bank_search', placeholder: 'Select your bank' },
        { key: 'account_number', label: 'Account Number', type: 'text', placeholder: 'Account number' },
        { key: 'account_name', label: 'Account Name', type: 'text', placeholder: 'Name on account' },
      ],
    },
  ],
  DEFAULT: [
    {
      code: 'mobile_money',
      type: 'mobile_money',
      name: 'Mobile Money',
      description: 'Payout to your mobile money wallet',
      fields: [
        { key: 'phone_number', label: 'Phone Number', type: 'phone', placeholder: 'Phone number' },
        { key: 'account_name', label: 'Registered Name', type: 'text', placeholder: 'Name on account' },
      ],
    },
    {
      code: 'bank_transfer',
      type: 'bank_transfer',
      name: 'Bank Transfer',
      description: 'Payout to your bank account',
      fields: [
        { key: 'bank_name', label: 'Bank', type: 'bank_search', placeholder: 'Select or type bank name' },
        { key: 'account_number', label: 'Account Number', type: 'text', placeholder: 'Account number' },
        { key: 'account_name', label: 'Account Name', type: 'text', placeholder: 'Name on account' },
      ],
    },
  ],
};

export function getRegionsForCountry(countryCode) {
  if (!countryCode || countryCode === 'GH_OTHER' || countryCode === 'OTHER') return null;
  return REGIONS_BY_COUNTRY[countryCode] || null;
}

export function getPayoutMethodsForCountry(countryCode) {
  const code = countryCode === 'GH_OTHER' || countryCode === 'OTHER' ? 'DEFAULT' : countryCode;
  return PAYOUT_METHODS_BY_COUNTRY[code] || PAYOUT_METHODS_BY_COUNTRY.DEFAULT;
}

export function getCountryMeta(countryCode) {
  return AFRICA_COUNTRIES.find((c) => c.code === countryCode) || AFRICA_COUNTRIES[0];
}

export const BROADCAST_AUDIENCES = [
  { id: 'everyone', label: 'Everyone', description: 'All Crestar users' },
  { id: 'sellers', label: 'Sellers', description: 'Approved product sellers' },
  { id: 'foodhub', label: 'FoodHub vendors', description: 'Approved food & drinks businesses' },
  { id: 'creators', label: 'Creators', description: 'Creator program members' },
  { id: 'deliverers', label: 'Deliverers', description: 'Delivery partners' },
];
