// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      fullName,
      phoneNumber,
      vehicleType,
      ghanaCardPhoto,
      vehiclePhoto,
      operatingRegions,
      intercityRoutes,
    } = body;

    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    const userId = session.user.id.toString();

    // Parse operating regions and intercity routes
    const regionsArray = operatingRegions
      ? typeof operatingRegions === "string"
        ? operatingRegions.split(",").filter(Boolean)
        : operatingRegions
      : [];
    const routesArray = intercityRoutes
      ? typeof intercityRoutes === "string"
        ? intercityRoutes.split(",").filter(Boolean)
        : intercityRoutes
      : [];

    // Create deliverer profile
    const [profile] = await sql`
      INSERT INTO deliverer_profiles (
        user_id,
        full_name,
        phone_number,
        vehicle_type,
        ghana_card_photo,
        vehicle_photo,
        verification_status,
        is_available,
        operating_regions,
        intercity_routes
      ) VALUES (
        ${userId},
        ${fullName},
        ${phoneNumber},
        ${vehicleType},
        ${ghanaCardPhoto},
        ${vehiclePhoto || null},
        'pending',
        false,
        ${JSON.stringify(regionsArray)},
        ${JSON.stringify(routesArray)}
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone_number = EXCLUDED.phone_number,
        vehicle_type = EXCLUDED.vehicle_type,
        ghana_card_photo = EXCLUDED.ghana_card_photo,
        vehicle_photo = EXCLUDED.vehicle_photo,
        operating_regions = EXCLUDED.operating_regions,
        intercity_routes = EXCLUDED.intercity_routes,
        updated_at = NOW()
      RETURNING *
    `;

    return Response.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("Deliverer onboarding error:", error);
    return Response.json(
      { error: "Failed to create deliverer profile" },
      { status: 500 },
    );
  }
}
