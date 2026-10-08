// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { auth } from '@/auth';
import { SUBACCOUNT_PERCENTAGE_CHARGE } from '@/app/api/utils/paystackSubaccount';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      sellerType,
      fullName,
      businessName,
      whatsappNumber,
      momoNumber,
      ghanaCardPhoto,
      businessPermit,
      portfolioMedia,
    } = body;

    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    const userId = session.user.id.toString();

    // Require mobile money number for payment setup
    if (!momoNumber && !whatsappNumber) {
      return Response.json(
        { error: 'Mobile Money number is required for payment setup' },
        { status: 400 }
      );
    }

    const paymentNumber = momoNumber || whatsappNumber;

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
          account_number: paymentNumber.replace(/\s/g, ''),
          // The seller's subaccount receives 97%; Crestar's flat 3% platform
          // fee stays on the main balance.
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
        portfolio_media,
        is_registered_business,
        verification_status,
        paystack_subaccount_code,
        payment_setup_complete
      ) VALUES (
        ${userId},
        ${sellerType},
        ${fullName},
        ${businessName},
        ${paymentNumber},
        ${ghanaCardPhoto || null},
        ${businessPermit || null},
        ${portfolioMedia ? JSON.stringify(portfolioMedia) : null},
        ${businessPermit ? true : false},
        'pending',
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
        portfolio_media = EXCLUDED.portfolio_media,
        is_registered_business = EXCLUDED.is_registered_business,
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
