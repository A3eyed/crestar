// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';
import { ensureAppUser, ensureIdentity } from '@/app/api/utils/ensureAppUser';
import { createPaystackSubaccount } from '@/app/api/utils/paystackSubaccount';

// Get business center for current user (ONE CENTER ONLY)
export async function GET(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await ensureAppUser(userId);

    let identity_id = null;
    try {
      const [link] = await sql`
        SELECT identity_id FROM identity_accounts
        WHERE user_id = ${userId}
        ORDER BY is_primary DESC NULLS LAST
        LIMIT 1
      `;
      identity_id = link?.identity_id || null;
    } catch {
      identity_id = null;
    }

    if (!identity_id) {
      return Response.json({
        has_center: false,
        center: null,
        available_types: ['seller', 'foodhub', 'creator', 'deliverer'],
      });
    }

    const centers = await sql`
      SELECT
        id,
        business_name,
        center_type,
        status,
        verification_status,
        full_name,
        phone_number,
        momo_number,
        delivery_method,
        vehicle_type,
        is_available,
        total_sales,
        total_deliveries,
        rating,
        commission_rate,
        payment_setup_complete,
        default_currency,
        country,
        region,
        city,
        created_at,
        updated_at
      FROM business_centers
      WHERE identity_id = ${identity_id}
      ORDER BY created_at ASC
      LIMIT 1
    `;

    const hasCenter = centers.length > 0;

    return Response.json({
      has_center: hasCenter,
      center: hasCenter ? centers[0] : null,
      available_types: hasCenter ? [] : ['seller', 'foodhub', 'creator', 'deliverer'],
    });
  } catch (error) {
    console.error('Business centers error:', error);
    return Response.json(
      { error: 'Internal server error', detail: String(error?.message || error) },
      { status: 500 },
    );
  }
}

// Create a new business center (ONE-TIME)
export async function POST(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await ensureAppUser(userId);

    const body = await request.json();
    const {
      centerType,
      fullName,
      businessName,
      phoneNumber,
      vehicleType,
      country,
      region,
      city,
      idType,
      idPhotoFront,
      idPhotoBack,
      businessPermitPhoto,
      vehiclePhoto,
    } = body;

    if (!centerType || !fullName || !country || !region || !city) {
      return Response.json(
        {
          error: 'Center type, full name, and location are required',
          missing_fields: {
            centerType: !centerType,
            fullName: !fullName,
            country: !country,
            region: !region,
            city: !city,
          },
        },
        { status: 400 },
      );
    }

    const validTypes = ['seller', 'foodhub', 'deliverer', 'creator'];
    if (!validTypes.includes(centerType)) {
      return Response.json({ error: 'Invalid center type' }, { status: 400 });
    }

    if (centerType === 'deliverer' && (!phoneNumber || !vehicleType)) {
      return Response.json(
        { error: 'Phone number and vehicle type are required for deliverers' },
        { status: 400 },
      );
    }

    if ((centerType === 'seller' || centerType === 'foodhub') && !phoneNumber) {
      return Response.json(
        { error: 'Phone number (Mobile Money) is required for sellers and FoodHub owners' },
        { status: 400 },
      );
    }

    // Identity without depending on public."user"
    const identity_id = await ensureIdentity(userId);

    const existingCenter = await sql`
      SELECT id, center_type FROM business_centers WHERE identity_id = ${identity_id}
    `;

    if (existingCenter.length > 0) {
      const existingRoutes = {
        seller: '/seller/dashboard',
        foodhub: '/seller/dashboard',
        deliverer: '/deliverer/dashboard',
        creator: '/affiliate/dashboard',
      };
      return Response.json(
        {
          error: 'You already have a business center. Each user can only have one center.',
          existing_center_type: existingCenter[0].center_type,
          dashboard_route: existingRoutes[existingCenter[0].center_type] || '/',
        },
        { status: 400 },
      );
    }

    const portfolioMedia = [];
    if (idPhotoFront) {
      portfolioMedia.push({
        type: 'id_verification',
        id_type: idType || null,
        url: idPhotoFront,
        country: country,
      });
    }
    if (idPhotoBack) {
      portfolioMedia.push({ type: 'id_verification_back', url: idPhotoBack });
    }
    if (businessPermitPhoto) {
      portfolioMedia.push({ type: 'business_permit', url: businessPermitPhoto });
    }
    if (vehiclePhoto) {
      portfolioMedia.push({ type: 'vehicle_photo', url: vehiclePhoto });
    }

    let paystackSubaccountCode = null;
    if (phoneNumber) {
      try {
        const subaccountResult = await createPaystackSubaccount({
          businessName: businessName || fullName,
          accountNumber: phoneNumber,
          settlementBank: 'MTN',
        });
        if (subaccountResult?.subaccountCode) {
          paystackSubaccountCode = subaccountResult.subaccountCode;
        } else {
          console.error(
            `⚠️ Paystack subaccount creation failed during onboarding (user ${userId}):`,
            subaccountResult?.error,
          );
        }
      } catch (e) {
        console.error('Paystack error (non-blocking):', e?.message);
      }
    }

    try {
      const newCenter = await sql`
        INSERT INTO business_centers (
          identity_id,
          business_name,
          center_type,
          status,
          verification_status,
          full_name,
          phone_number,
          momo_number,
          vehicle_type,
          country,
          region,
          city,
          portfolio_media,
          ghana_card_photo,
          business_permit_photo,
          vehicle_photo,
          paystack_subaccount_code,
          payment_setup_complete
        ) VALUES (
          ${identity_id},
          ${businessName || fullName},
          ${centerType},
          'active',
          'approved',
          ${fullName},
          ${phoneNumber || null},
          ${phoneNumber || null},
          ${vehicleType || null},
          ${country},
          ${region},
          ${city},
          ${JSON.stringify(portfolioMedia)}::jsonb,
          ${idPhotoFront || null},
          ${businessPermitPhoto || null},
          ${vehiclePhoto || null},
          ${paystackSubaccountCode},
          ${!!paystackSubaccountCode}
        ) RETURNING id, center_type, business_name, full_name, paystack_subaccount_code
      `;

      // Optional welcome message — never block onboarding
      try {
        const crestarAccount = await sql`
          SELECT id FROM auth_users
          WHERE LOWER(username) = 'crestar'
          LIMIT 1
        `;
        if (crestarAccount.length > 0) {
          const welcomeMessage =
            centerType === 'seller' || centerType === 'foodhub'
              ? `Welcome to Crestar, ${fullName}! Your seller account is live. Crestar charges a flat 3% fee on sales.`
              : centerType === 'creator'
                ? `Welcome to Crestar Creator Program, ${fullName}!`
                : `Welcome to Crestar, ${fullName}! Your Deliverer account is active.`;
          await sql`
            INSERT INTO messages (sender_id, receiver_id, content, is_read)
            VALUES (
              ${crestarAccount[0].id.toString()},
              ${userId.toString()},
              ${welcomeMessage},
              false
            )
          `;
        }
      } catch (messageError) {
        console.error('Failed to send welcome message:', messageError);
      }

      const dashboardRoutes = {
        seller: '/seller/dashboard',
        foodhub: '/seller/dashboard',
        deliverer: '/deliverer/dashboard',
        creator: '/affiliate/dashboard',
      };

      return Response.json({
        success: true,
        center: newCenter[0],
        dashboard_route: dashboardRoutes[centerType],
        has_paystack: !!paystackSubaccountCode,
        payment_setup_required: !paystackSubaccountCode,
        message: `${centerType.charAt(0).toUpperCase() + centerType.slice(1)} center created successfully.`,
      });
    } catch (dbError) {
      console.error('Business center insert failed:', dbError);
      return Response.json(
        {
          error: 'Failed to create business center in database',
          detail: String(dbError?.message || dbError),
          hint: 'Tables may be missing — run Crestar migrations on Neon.',
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Business center creation error:', error);
    return Response.json(
      {
        error: 'Failed to create business center',
        detail: String(error?.message || error),
      },
      { status: 500 },
    );
  }
}
