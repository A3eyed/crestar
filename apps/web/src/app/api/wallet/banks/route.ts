// @ts-nocheck
import { auth } from "@/auth";

// GET /api/wallet/banks?country=ghana — list banks from Paystack
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country") || "ghana";

    const response = await fetch(
      `https://api.paystack.co/bank?country=${country}&use_cursor=false&perPage=100`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch banks from Paystack");
    }

    const data = await response.json();

    // Return simplified bank list
    const banks = (data.data || []).map((bank) => ({
      name: bank.name,
      code: bank.code,
      type: bank.type,
      currency: bank.currency,
    }));

    return Response.json({ banks });
  } catch (error) {
    console.error("Fetch banks error:", error);
    return Response.json(
      { error: "Failed to fetch bank list" },
      { status: 500 },
    );
  }
}
