// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';
import { ensureAppUser, ensureIdentity } from '@/app/api/utils/ensureAppUser';
import { ensureCoreSchema } from '@/app/api/utils/ensureSchema';
import { createPaystackSubaccount } from '@/app/api/utils/paystackSubaccount';
import { jsonUserError, UserMessages, logServerError } from '@/app/api/utils/userFacingError';

export async function GET(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: UserMessages.unauthorized }, { status: 401 });
    }

    await ensureCoreSchema();
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
        id, business_name, center_type, status, verification_status,
        full_name, phone_number, momo_number, delivery_method, vehicle_type,
        is_available, total_sales, total_deliveries, rating, commission_rate,
        payment_setup_complete, default_currency, country, region, city,
        created_at, updated_at
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
    return jsonUserError('business-centers/GET', error);
  }
}

export async function POST(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: UserMessages.unauthorized }, { status: 401 });
    }

    // Critical: create tables if Neon is missing Crestar schema
    const schema = await ensureCoreSchema();
    if (!schema.ok) {
      logServerError('business-centers/schema', schema.failed);
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
        { error: 'Please fill in your name and location to continue.' },
        { status: 400 },
      );
    }

    const validTypes = ['seller', 'foodhub', 'deliverer', 'creator'];
    if (!validTypes.includes(centerType)) {
      return Response.json({ error: 'Please choose a valid account type.' }, { status: 400 });
    }

    if (centerType === 'deliverer' && (!phoneNumber || !vehicleType)) {
      return Response.json(
        { error: 'Phone number and vehicle type are required for deliverers.' },
        { status: 400 },
      );
    }

    if ((centerType === 'seller' || centerType === 'foodhub') && !phoneNumber) {
      return Response.json(
        { error: 'A Mobile Money number is required so you can receive payouts.' },
        { status: 400 },
      );
    }

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
          error: 'You already have a business account on Crestar.',
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
        country,
      });
    }
    if (idPhotoBack) portfolioMedia.push({ type: 'id_verification_back', url: idPhotoBack });
    if (businessPermitPhoto)
      portfolioMedia.push({ type: 'business_permit', url: businessPermitPhoto });
    if (vehiclePhoto) portfolioMedia.push({ type: 'vehicle_photo', url: vehiclePhoto });

    // Paystack is non-blocking — subaccount may already exist from a prior attempt
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
          logServerError('paystack-subaccount', subaccountResult?.error);
        }
      } catch (e) {
        logServerError('paystack-subaccount', e);
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

      try {
        const crestarAccount = await sql`
          SELECT id FROM auth_users WHERE LOWER(username) = 'crestar' LIMIT 1
        `;
        if (crestarAccount.length > 0) {
          const welcomeMessage = `Welcome to Crestar, ${fullName}! Your account is live.`;
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
        logServerError('welcome-message', messageError);
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
        message: 'You\'re all set — your seller account is ready.',
      });
    } catch (dbError) {
      return jsonUserError('business-centers/INSERT', dbError, {
        userMessage: UserMessages.onboarding,
      });
    }
  } catch (error) {
    return jsonUserError('business-centers/POST', error, {
      userMessage: UserMessages.onboarding,
    });
  }
}
