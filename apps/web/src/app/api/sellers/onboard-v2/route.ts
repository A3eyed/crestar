// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { auth } from '@/auth';
import { SUBACCOUNT_PERCENTAGE_CHARGE } from '@/app/api/utils/paystackSubaccount';

// Country code → currency mapping
const COUNTRY_CURRENCY = {
  GH: 'GHS',
  NG: 'NGN',
  US: 'USD',
  GB: 'GBP',
  AE: 'AED',
  IN: 'INR',
  CN: 'CNY',
  CA: 'CAD',
  JP: 'JPY',
  ZA: 'ZAR',
  KE: 'KES',
  FR: 'EUR',
  DE: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  PT: 'EUR',
  IE: 'EUR',
  AT: 'EUR',
  GR: 'EUR',
  FI: 'EUR',
  LU: 'EUR',
};

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      sellerType,
      fullName,
      businessName,
      momoNumber,
      ghanaCardPhoto,
      businessPermitPhoto,
      country,
      region,
      city,
    } = body;

    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    const userId = session.user.id.toString();

    // Only physical_goods and food_beverage allowed now (no services)
    if (!['physical_goods', 'food_beverage'].includes(sellerType)) {
      return Response.json(
        {
          error: 'Invalid seller type. Only physical_goods and food_beverage are supported.',
        },
        { status: 400 }
      );
    }

    // Require mobile money number for payment setup
    if (!momoNumber) {
      return Response.json(
        { error: 'Mobile Money number is required for payment setup' },
        { status: 400 }
      );
    }

    const isRegisteredBusiness = !!businessPermitPhoto;
    const countryCode = (country || 'GH').toUpperCase();
    const defaultCurrency = COUNTRY_CURRENCY[countryCode] || 'GHS';

    // ── Step 1: Create Paystack subaccount FIRST (mandatory) ──────────────
    let paystackSubaccount = null;
    try {
      const paystackResponse = await fetch('https://api.paystack.co/subaccount', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_name: businessName || fullName,
          settlement_bank: 'MTN', // Mobile Money
          account_number: momoNumber.replace(/\s/g, ''),
          // Seller settles 97%; Crestar's flat 3% platform fee stays behind.
          percentage_charge: SUBACCOUNT_PERCENTAGE_CHARGE,
        }),
      });

      if (!paystackResponse.ok) {
        const errBody = await paystackResponse.json();
        console.error('Paystack subaccount creation failed:', errBody);
        return Response.json(
          {
            error:
              'Failed to create payment account. Please check your Mobile Money number and try again.',
            details: errBody.message || 'Paystack error',
          },
          { status: 400 }
        );
      }

      const paystackData = await paystackResponse.json();
      paystackSubaccount = paystackData.data.subaccount_code;

      if (!paystackSubaccount) {
        throw new Error('Paystack did not return a subaccount code');
      }
    } catch (paystackError) {
      console.error('Paystack subaccount creation error:', paystackError);
      return Response.json(
        {
          error:
            'Payment account setup failed. Please verify your Mobile Money number and try again.',
          details: paystackError.message,
        },
        { status: 500 }
      );
    }

    // ── Step 2: Create professional profile with subaccount ───────────────
    const [profile] = await sql`
      INSERT INTO professional_profiles (
        user_id,
        seller_type,
        full_name,
        business_name,
        momo_number,
        ghana_card_photo,
        business_permit_photo,
        is_registered_business,
        verification_status,
        country,
        region,
        city,
        default_currency,
        paystack_subaccount_code,
        payment_setup_complete
      ) VALUES (
        ${userId},
        ${sellerType},
        ${fullName},
        ${businessName || null},
        ${momoNumber || null},
        ${ghanaCardPhoto || null},
        ${businessPermitPhoto || null},
        ${isRegisteredBusiness},
        'approved',
        ${countryCode},
        ${region || null},
        ${city || null},
        ${defaultCurrency},
        ${paystackSubaccount},
        true
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET
        seller_type = EXCLUDED.seller_type,
        full_name = EXCLUDED.full_name,
        business_name = EXCLUDED.business_name,
        momo_number = EXCLUDED.momo_number,
        ghana_card_photo = EXCLUDED.ghana_card_photo,
        business_permit_photo = EXCLUDED.business_permit_photo,
        is_registered_business = EXCLUDED.is_registered_business,
        verification_status = 'approved',
        country = COALESCE(EXCLUDED.country, professional_profiles.country),
        region = COALESCE(EXCLUDED.region, professional_profiles.region),
        city = COALESCE(EXCLUDED.city, professional_profiles.city),
        default_currency = COALESCE(EXCLUDED.default_currency, professional_profiles.default_currency),
        paystack_subaccount_code = EXCLUDED.paystack_subaccount_code,
        payment_setup_complete = EXCLUDED.payment_setup_complete,
        updated_at = NOW()
      RETURNING *
    `;

    console.log(
      `✅ Seller onboarded successfully: ${userId} with Paystack subaccount: ${paystackSubaccount}`
    );

    return Response.json({
      success: true,
      profile: {
        ...profile,
        paystack_subaccount_code: paystackSubaccount,
      },
    });
  } catch (error) {
    console.error('Seller onboarding error:', error);
    return Response.json({ error: 'Failed to create seller profile' }, { status: 500 });
  }
}

// Get seller profile
export async function GET(request) {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    const userId = session.user.id.toString();

    const [profile] = await sql`
      SELECT * FROM professional_profiles
      WHERE user_id = ${userId}
    `;

    if (!profile) {
      return Response.json({ profile: null });
    }

    return Response.json({ profile });
  } catch (error) {
    console.error('Get seller profile error:', error);
    return Response.json({ error: 'Failed to get seller profile' }, { status: 500 });
  }
}
