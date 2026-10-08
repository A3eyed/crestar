// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Get categories for the current seller
export async function GET(request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const categoryType = searchParams.get("type"); // 'physical_goods', 'food_beverage', 'services'

  const query = categoryType
    ? sql`SELECT * FROM product_categories WHERE seller_id = ${session.user.id} AND category_type = ${categoryType} ORDER BY category_name`
    : sql`SELECT * FROM product_categories WHERE seller_id = ${session.user.id} ORDER BY category_type, category_name`;

  const categories = await query;
  return Response.json({ categories });
}

// Create a new category
export async function POST(request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { categoryName, categoryType } = await request.json();

  if (!categoryName || !categoryType) {
    return Response.json(
      { error: "Category name and type are required" },
      { status: 400 },
    );
  }

  try {
    const [category] = await sql`
      INSERT INTO product_categories (seller_id, category_name, category_type)
      VALUES (${session.user.id}, ${categoryName}, ${categoryType})
      ON CONFLICT (seller_id, category_name, category_type) DO NOTHING
      RETURNING *
    `;

    return Response.json({ category });
  } catch (error) {
    console.error("Category creation error:", error);
    return Response.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}
