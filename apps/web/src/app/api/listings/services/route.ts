// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST(request) {
  try {
    const body = await request.json();

    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    const userId = session.user.id.toString();

    const {
      title,
      description,
      media,
      category,
      basicPrice,
      basicDescription,
      standardPrice,
      standardDescription,
      premiumPrice,
      premiumDescription,
      requirements,
    } = body;

    const [service] = await sql`
      INSERT INTO services (
        seller_id,
        title,
        description,
        media,
        category,
        basic_price,
        basic_description,
        standard_price,
        standard_description,
        premium_price,
        premium_description,
        requirements,
        status
      ) VALUES (
        ${userId},
        ${title},
        ${description},
        ${JSON.stringify(media)},
        ${category},
        ${basicPrice},
        ${basicDescription},
        ${standardPrice},
        ${standardDescription},
        ${premiumPrice},
        ${premiumDescription},
        ${requirements},
        'active'
      )
      RETURNING *
    `;

    return Response.json({ success: true, service });
  } catch (error) {
    console.error("Create service error:", error);
    return Response.json(
      { error: "Failed to create service listing" },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get("sellerId");
    const category = searchParams.get("category");

    // Build query string and values array
    let queryString = "SELECT * FROM services WHERE status = $1";
    let values = ["active"];
    let paramIndex = 2;

    if (sellerId) {
      queryString += ` AND seller_id = $${paramIndex}`;
      values.push(sellerId);
      paramIndex++;
    }
    if (category) {
      queryString += ` AND category = $${paramIndex}`;
      values.push(category);
      paramIndex++;
    }

    queryString += " ORDER BY created_at DESC";

    const services = await sql(queryString, values);

    return Response.json({ services });
  } catch (error) {
    console.error("Get services error:", error);
    return Response.json({ error: "Failed to get services" }, { status: 500 });
  }
}
