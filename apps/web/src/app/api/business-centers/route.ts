// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';
import { createPaystackSubaccount } from '@/app/api/utils/paystackSubaccount';

// Get business center for current user's identity (ONE CENTER ONLY)
export async function GET(request) {
  try {
    // Get authenticated user (supports both web and mobile)
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's identity
    const userIdentity = await sql`
      SELECT identity_id FROM "user" WHERE id = ${userId}
    `;

    if (userIdentity.length === 0 || !userIdentity[0].identity_id) {
      return Response.json({
        has_center: false,
        center: null,
        available_types: ['seller', 'foodhub', 'creator', 'deliverer'],
      });
    }

    const identity_id = userIdentity[0].identity_id;

    // Get the ONE business center for this identity
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
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create a new business center (ONE-TIME ONLY - PERMANENT TRANSFORMATION)
export async function POST(request) {
  try {
    // Get authenticated user (supports both web and mobile)
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      centerType, // 'seller', 'foodhub', 'deliverer', 'creator'
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

    // Validate required fields (ID verification is no longer required)
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
        { status: 400 }
      );
    }

    // Validate center type
    const validTypes = ['seller', 'foodhub', 'deliverer', 'creator'];
    if (!validTypes.includes(centerType)) {
      return Response.json({ error: 'Invalid center type' }, { status: 400 });
    }

    // Validate deliverer-specific requirements
    if (centerType === 'deliverer' && (!phoneNumber || !vehicleType)) {
      return Response.json(
        { error: 'Phone number and vehicle type are required for deliverers' },
        { status: 400 }
      );
    }

    // Validate seller/foodhub-specific requirements (payment setup)
    if ((centerType === 'seller' || centerType === 'foodhub') && !phoneNumber) {
      return Response.json(
        { error: 'Phone number (Mobile Money) is required for sellers and FoodHub owners' },
        { status: 400 }
      );
    }

    // Get user's identity, create one if doesn't exist
    let userIdentity = await sql`
      SELECT identity_id FROM "user" WHERE id = ${userId}
    `;

    let identity_id;
    if (userIdentity.length === 0 || !userIdentity[0].identity_id) {
      // Create new identity for this user
      const newIdentity = await sql`
        INSERT INTO identities DEFAULT VALUES RETURNING id
      `;
      identity_id = newIdentity[0].id;

      // Update "user" with identity
      await sql`
        UPDATE "user" SET identity_id = ${identity_id} WHERE id = ${userId}
      `;

      // Create identity_accounts link
      await sql`
        INSERT INTO identity_accounts (identity_id, user_id, is_primary)
        VALUES (${identity_id}, ${userId}, true)
      `;

      // Create wallet account for the new identity
      await sql`
        INSERT INTO wallet_accounts (identity_id, account_type, actual_balance, pending_balance)
        VALUES (${identity_id}, 'personal', 0, 0)
      `;
    } else {
      identity_id = userIdentity[0].identity_id;

      // Check if this identity already has a business center (PREVENT MULTIPLE)
      const existingCenter = await sql`
        SELECT id, center_type FROM business_centers WHERE identity_id = ${identity_id}
      `;

      if (existingCenter.length > 0) {
        // Determine dashboard route so the client can redirect
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
          { status: 400 }
        );
      }

      // Ensure wallet account exists for existing identity
      const walletExists = await sql`
        SELECT id FROM wallet_accounts WHERE identity_id = ${identity_id}
      `;

      if (walletExists.length === 0) {
        await sql`
          INSERT INTO wallet_accounts (identity_id, account_type, actual_balance, pending_balance)
          VALUES (${identity_id}, 'personal', 0, 0)
        `;
      }
    }

    // Build portfolio_media JSON (ID information is optional now)
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
      portfolioMedia.push({
        type: 'id_verification_back',
        url: idPhotoBack,
      });
    }

    if (businessPermitPhoto) {
      portfolioMedia.push({
        type: 'business_permit',
        url: businessPermitPhoto,
      });
    }

    if (vehiclePhoto) {
      portfolioMedia.push({
        type: 'vehicle_photo',
        url: vehiclePhoto,
      });
    }

    // 💰 PAYSTACK SUBACCOUNT CREATION (AUTOMATIC — DOES NOT BLOCK ONBOARDING)
    // Fires on every center creation using the registered Mobile Money number.
    // If Paystack fails, onboarding still succeeds and the code is created
    // lazily at first payment or via the admin backfill.
    let paystackSubaccountCode = null;

    if (phoneNumber) {
      const subaccountResult = await createPaystackSubaccount({
        businessName: businessName || fullName,
        accountNumber: phoneNumber,
        settlementBank: 'MTN',
      });

      if (subaccountResult.subaccountCode) {
        paystackSubaccountCode = subaccountResult.subaccountCode;
        console.log(
          `✅ Paystack subaccount ${paystackSubaccountCode} created for new ${centerType} (user ${userId})`
        );
      } else {
        console.error(
          `⚠️ Paystack subaccount creation failed during onboarding (user ${userId}):`,
          subaccountResult.error
        );
      }
    }

    // Create the business center (ONE-TIME PERMANENT TRANSFORMATION)
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

      // 🛡️ AUTO WELCOME MESSAGE from @Crestar admin account
      try {
        // Find @Crestar system account
        const crestarAccount = await sql`
          SELECT id FROM "user"
          WHERE username = 'crestar' AND is_system_account = true
          LIMIT 1
        `;

        if (crestarAccount.length > 0) {
          const welcomeMessage =
            centerType === 'seller' || centerType === 'foodhub'
              ? `🎉 Welcome to Crestar, ${fullName}! Your ${centerType === 'seller' ? 'Seller' : 'FoodHub'} account is now live.\n\n📋 Safety Guidelines:\n• List genuine products only\n• Respond to customer inquiries within 24 hours\n• Ship orders promptly\n• Maintain high quality standards\n\n💰 Crestar charges one flat 3% fee on every sale — you keep 97%, and there are no other platform fees. (If a creator's video drives a sale, they also earn the affiliate commission you set, 5% by default.)\n\n⚙️ Set up your payout method via Profile → Settings → Wallet to start receiving payments.\n\nNeed help? Reply to this message anytime!`
              : centerType === 'creator'
                ? `🎉 Welcome to Crestar Creator Program, ${fullName}!\n\n🎬 How it works:\n• Post videos and tag products from any seller\n• When someone buys through your video, you earn 5% commission\n• No stock needed — just great content!\n\n💰 Crestar charges one flat 3% fee, so you keep 97% of every commission. Earnings are paid to your wallet automatically, already net of the fee.\n\nStart creating and earning today!`
                : `🎉 Welcome to Crestar, ${fullName}! Your Deliverer account is now active.\n\n📋 Safety Guidelines:\n• Verify delivery PINs before completing deliveries\n• Handle packages with care\n• Maintain professionalism with customers\n• Keep your vehicle safe\n\n💰 Crestar charges one flat 3% fee on delivery fees — you keep 97%.\n\n⚙️ Set up your payout method via Profile → Settings → Wallet to receive your earnings.\n\nNeed help? Reply to this message anytime!`;

          // ✅ FIX: use the actual messages table columns (sender_id, receiver_id, content)
          await sql`
            INSERT INTO messages (
              sender_id,
              receiver_id,
              content,
              is_read
            ) VALUES (
              ${crestarAccount[0].id.toString()},
              ${userId.toString()},
              ${welcomeMessage},
              false
            )
          `;
        }
      } catch (messageError) {
        console.error('Failed to send welcome message:', messageError);
        // Don't fail the onboarding if messaging fails
      }

      // Determine dashboard route based on center type
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
        message: `${centerType.charAt(0).toUpperCase() + centerType.slice(1)} center created successfully. You're ready to start earning!`,
      });
    } catch (dbError) {
      console.error('Business center insert failed:', dbError);

      return Response.json(
        {
          error: 'Failed to create business center in database',
          hint: 'Please contact support if this issue persists',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Business center creation error:', error);

    return Response.json(
      {
        error: 'Failed to create business center',
      },
      { status: 500 }
    );
  }
}
