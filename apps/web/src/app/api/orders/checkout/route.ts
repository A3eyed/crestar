// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { resolveUserId } from "@/app/api/utils/auth";
import {
  money,
  platformFeeOn,
  netOfPlatformFee,
} from "@/app/api/utils/platformFee";

function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

function generateDeliveryPin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Helper to get a consistent conversation ID between two users
function getConversationId(userId1, userId2) {
  const sorted = [userId1.toString(), userId2.toString()].sort();
  return `conv_${sorted[0]}_${sorted[1]}`;
}

// Auto-send order confirmation message from seller to buyer
async function sendOrderConfirmationMessage(
  sellerId,
  buyerId,
  order,
  deliveryPin,
  itemDescriptions
) {
  try {
    const conversationId = getConversationId(sellerId, buyerId);
    const itemsList = itemDescriptions.map((desc) => `  • ${desc}`).join("\n");
    const messageText =
      `📦 Order Confirmed!\n\n` +
      `Order #${order.order_number}\n\n` +
      `Items:\n${itemsList}\n\n` +
      `Total: ${parseFloat(order.total_amount).toFixed(2)}\n\n` +
      `🔐 Delivery PIN: ${deliveryPin}\n` +
      `This PIN will be attached to your package. Enter it in the app after you receive your delivery to release payment.\n\n` +
      `Your order is being prepared. You'll receive updates here. Thank you for your order!`;
    await sql(
      `INSERT INTO messages (conversation_id, sender_user_id, receiver_user_id, message_text)
       VALUES ($1, $2, $3, $4)`,
      [conversationId, sellerId, buyerId, messageText]
    );
  } catch (error) {
    console.error("Failed to send order confirmation message:", error);
  }
}

/**
 * Resolve user ID and email - supports both web session and mobile JWT
 */
async function resolveUser(request) {
  const userId = await resolveUserId(request);
  if (!userId) return null;
  const [user] = await sql`SELECT email FROM auth_users WHERE id = ${userId}`;
  return { userId, email: user?.email || null };
}

/**
 * Resolve the REAL owner of every cart line, server-side.
 */
async function resolveItemSellers(items) {
  const productIds = [
    ...new Set(
      items
        .filter((i) => (i.itemType || i.type || "product") !== "service")
        .map((i) => i.productId || i.id)
        .filter(Boolean)
    ),
  ];
  const serviceIds = [
    ...new Set(
      items
        .filter((i) => (i.itemType || i.type) === "service")
        .map((i) => i.serviceId || i.id)
        .filter(Boolean)
    ),
  ];
  const ownerById = new Map();
  if (productIds.length > 0) {
    const rows = await sql`
      SELECT id, seller_id FROM products WHERE id = ANY(${productIds}::uuid[])
    `;
    for (const row of rows)
      ownerById.set(String(row.id), String(row.seller_id));
  }
  if (serviceIds.length > 0) {
    const rows = await sql`
      SELECT id, seller_id FROM services WHERE id = ANY(${serviceIds}::uuid[])
    `;
    for (const row of rows)
      ownerById.set(String(row.id), String(row.seller_id));
  }
  const resolved = [];
  const unresolved = [];
  for (const item of items) {
    const key = String(item.productId || item.serviceId || item.id || "");
    const trueOwner = ownerById.get(key);
    const claimed = item.sellerId || item.seller || null;
    const sellerId =
      trueOwner || (claimed && claimed !== "platform" ? String(claimed) : null);
    if (!sellerId) {
      unresolved.push(item.title || item.name || key || "an item");
      continue;
    }
    if (trueOwner && claimed && String(claimed) !== trueOwner) {
      console.warn(
        `[checkout] cart claimed seller ${claimed} for item ${key}, real owner is ${trueOwner} — using the real owner`
      );
    }
    resolved.push({ ...item, sellerId });
  }
  return { resolved, unresolved };
}

/**
 * Cart-based checkout
 */
export async function POST(request) {
  try {
    const authResult = await resolveUser(request);
    if (!authResult) {
      return Response.json(
        { error: "Please sign in to place an order" },
        { status: 401 }
      );
    }
    const { userId: buyerId, email: buyerEmail } = authResult;

    // ✅ Email validation (required by Paystack)
    if (!buyerEmail) {
      return Response.json(
        {
          error:
            "Your account is missing an email address. Please update your profile before placing an order.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { items, deliveryAddress, phoneNumber, recipientName } = body;

    if (!items || items.length === 0) {
      return Response.json({ error: "Cart is empty" }, { status: 400 });
    }
    if (!deliveryAddress) {
      return Response.json(
        { error: "Delivery address is required" },
        { status: 400 }
      );
    }

    // Group items by real seller
    const { resolved: resolvedItems, unresolved } = await resolveItemSellers(
      items
    );
    if (unresolved.length > 0) {
      return Response.json(
        {
          error: `We couldn't work out who sells ${unresolved.join(
            ", "
          )}. Please remove ${
            unresolved.length > 1 ? "those items" : "that item"
          } and add ${
            unresolved.length > 1 ? "them" : "it"
          } to your cart again.`,
        },
        { status: 400 }
      );
    }

    const sellerGroups = {};
    for (const item of resolvedItems) {
      const sellerId = item.sellerId;
      if (!sellerGroups[sellerId]) {
        sellerGroups[sellerId] = [];
      }
      sellerGroups[sellerId].push(item);
    }

    const createdOrders = [];
    let grandTotal = 0;

    // ✅ Fixed delivery address structure
    const addressObj =
      typeof deliveryAddress === "object" && deliveryAddress !== null
        ? deliveryAddress
        : { address: deliveryAddress };

    const deliveryAddressJson = JSON.stringify({
      ...addressObj,
      phone: phoneNumber,
      recipientName: recipientName || null,
      latitude: body.latitude || null,
      longitude: body.longitude || null,
      landmark: body.landmark || null,
      city: body.city || addressObj.city || null,
      region: body.region || addressObj.region || null,
      country: body.country || addressObj.country || "GH",
    });

    // Create one order per seller
    for (const [sellerId, sellerItems] of Object.entries(sellerGroups)) {
      const orderNumber = generateOrderNumber();
      const deliveryPin = generateDeliveryPin();

      // ── SERVER-SIDE PRICE VALIDATION ──
      const unavailableItems = [];
      for (const item of sellerItems) {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const itemId = String(item.id || "").trim();
        if (!itemId || !uuidRegex.test(itemId)) {
          console.log(
            `ℹ️ Skipping price validation for non-DB item: ${item.name}`
          );
          continue;
        }
        item.id = itemId;

        const [dbProduct] =
          await sql`SELECT price FROM products WHERE id = ${itemId}`;
        if (dbProduct) {
          const clientPrice = parseFloat(item.price);
          const dbPrice = parseFloat(dbProduct.price);
          const validPrices = [dbPrice];
          let variantPriceMatched = false;

          try {
            const productVariants = await sql`
              SELECT variant_type, variant_value, price_adjustment
              FROM product_variants WHERE product_id = ${itemId}
            `;
            for (const v of productVariants) {
              const adj = parseFloat(v.price_adjustment) || 0;
              validPrices.push(dbPrice + adj);
            }
            if (item.selectedColor) {
              const colorVariant = productVariants.find(
                (v) =>
                  v.variant_type === "color" &&
                  v.variant_value === item.selectedColor
              );
              if (colorVariant) {
                const exactPrice =
                  dbPrice + (parseFloat(colorVariant.price_adjustment) || 0);
                variantPriceMatched =
                  Math.abs(clientPrice - exactPrice) <= 0.01;
              }
            }
          } catch (variantErr) {
            console.error("Variant price lookup failed:", variantErr);
          }

          const matchesAnyValidPrice =
            variantPriceMatched ||
            validPrices.some((p) => Math.abs(clientPrice - p) <= 0.01);

          if (!matchesAnyValidPrice) {
            return Response.json(
              {
                error: "Price mismatch detected. Please refresh and try again.",
              },
              { status: 400 }
            );
          }
        } else {
          // Check if it's a service
          const [dbService] = await sql`
            SELECT basic_price, standard_price, premium_price
            FROM services
            WHERE id = ${itemId}
          `;
          if (dbService) {
            const clientServicePrice = parseFloat(item.price) || 0;
            const tierPrices = [
              dbService.basic_price,
              dbService.standard_price,
              dbService.premium_price,
            ]
              .filter((p) => p !== null && p !== undefined)
              .map((p) => parseFloat(p));
            const matchesTier =
              tierPrices.length === 0 ||
              tierPrices.some((p) => Math.abs(p - clientServicePrice) < 0.01);
            if (!matchesTier) {
              return Response.json(
                {
                  error: `The price of "${
                    item.name || "an item"
                  }" has changed. Please remove it from your cart and add it again.`,
                },
                { status: 400 }
              );
            }
            continue;
          }

          unavailableItems.push({
            id: itemId,
            cartKey: item.cartKey || null,
            name: item.name || "Unknown item",
          });
        }
      }

      if (unavailableItems.length > 0) {
        const names = unavailableItems.map((i) => `"${i.name}"`).join(", ");
        const isSingle = unavailableItems.length === 1;
        return Response.json(
          {
            error: `${names} ${
              isSingle ? "is" : "are"
            } no longer available and ${
              isSingle ? "has" : "have"
            } been removed from your cart. Please try again.`,
            unavailableItems,
            code: "ITEMS_UNAVAILABLE",
          },
          { status: 404 }
        );
      }

      // Calculate totals
      let subtotal = 0;
      const itemDescriptions = [];

      const originVideoId = sellerItems[0]?.originVideoId || null;
      const originCreatorId = sellerItems[0]?.originCreatorId || null;
      const isCreatorSale = !!(originVideoId && originCreatorId);

      for (const item of sellerItems) {
        const itemPrice = parseFloat(item.price) || 0;
        const itemQty = parseInt(item.quantity) || 1;
        subtotal += itemPrice * itemQty;
        itemDescriptions.push(`${item.name} x${itemQty}`);
      }

      // Delivery fee
      let seller = null;
      let deliveryFee = 0;
      try {
        const sellerRows = await sql(
          "SELECT * FROM professional_profiles WHERE user_id = $1",
          [sellerId]
        );
        seller = sellerRows[0] || null;
      } catch (e) {}

      if (seller) {
        try {
          const buyerCity = addressObj.city || body.city || null;
          const buyerRegion = addressObj.region || body.region || null;
          const buyerCountry = addressObj.country || body.country || "GH";

          let matchedZone = null;

          if (buyerCity) {
            const cityMatch = await sql(
              `SELECT * FROM seller_delivery_zones
               WHERE seller_user_id = $1 AND is_active = true
               AND LOWER(city_name) = LOWER($2)
               LIMIT 1`,
              [sellerId, buyerCity]
            );
            if (cityMatch.length > 0) matchedZone = cityMatch[0];
          }

          if (!matchedZone && buyerRegion) {
            const regionMatch = await sql(
              `SELECT * FROM seller_delivery_zones
               WHERE seller_user_id = $1 AND is_active = true
               AND LOWER(region_name) = LOWER($2)
               LIMIT 1`,
              [sellerId, buyerRegion]
            );
            if (regionMatch.length > 0) matchedZone = regionMatch[0];
          }

          if (!matchedZone && buyerCountry) {
            const countryMatch = await sql(
              `SELECT * FROM seller_delivery_zones
               WHERE seller_user_id = $1 AND is_active = true
               AND country = $2
               LIMIT 1`,
              [sellerId, buyerCountry]
            );
            if (countryMatch.length > 0) matchedZone = countryMatch[0];
          }

          if (!matchedZone) {
            const fallback = await sql(
              `SELECT * FROM seller_delivery_zones
               WHERE seller_user_id = $1 AND is_active = true
               ORDER BY is_free_delivery DESC, delivery_fee ASC LIMIT 1`,
              [sellerId]
            );
            if (fallback.length > 0) matchedZone = fallback[0];
          }

          if (matchedZone && !matchedZone.is_free_delivery) {
            deliveryFee = parseFloat(matchedZone.delivery_fee) || 0;
          }
        } catch (e) {
          console.error("Delivery zone lookup error:", e);
        }
      }

      // ✅ Fixed: Calculate totalAmount
      const totalAmount = subtotal + deliveryFee;

      const platformFee = platformFeeOn(subtotal);
      const sellerPayout = netOfPlatformFee(subtotal);
      const attributedCreatorId =
        typeof originCreatorId !== "undefined" ? originCreatorId : null;
      const creatorCommission = attributedCreatorId
        ? money((subtotal * 5) / 100)
        : 0;

      const firstItem = sellerItems[0];
      const combinedTitle =
        sellerItems.length === 1
          ? firstItem.name
          : `${firstItem.name} + ${sellerItems.length - 1} more`;
      const itemType = "product";
      let itemId = firstItem.id;
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(itemId)) {
        itemId = null;
      }

      const attributionExpiresAt = isCreatorSale
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      let orderResult;
      if (itemId) {
        orderResult = await sql(
          `INSERT INTO orders (
            order_number, buyer_id, seller_id, item_type, item_id, item_title,
            quantity, unit_price, subtotal, platform_fee, delivery_fee,
            total_amount, seller_payout, delivery_address, delivery_pin,
            delivery_latitude, delivery_longitude, status,
            creator_commission, origin_video_id, origin_creator_id, attribution_expires_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
          ) RETURNING *`,
          [
            orderNumber,
            buyerId,
            sellerId,
            itemType,
            itemId,
            combinedTitle,
            sellerItems.reduce(
              (sum, i) => sum + (parseInt(i.quantity) || 1),
              0
            ),
            parseFloat(firstItem.price) || 0,
            subtotal,
            platformFee,
            deliveryFee,
            totalAmount,
            sellerPayout,
            deliveryAddressJson,
            deliveryPin,
            body.latitude || null,
            body.longitude || null,
            "pending_payment",
            creatorCommission,
            originVideoId,
            originCreatorId,
            attributionExpiresAt,
          ]
        );
      } else {
        orderResult = await sql(
          `INSERT INTO orders (
            order_number, buyer_id, seller_id, item_type, item_id, item_title,
            quantity, unit_price, subtotal, platform_fee, delivery_fee,
            total_amount, seller_payout, delivery_address, delivery_pin,
            delivery_latitude, delivery_longitude, status,
            creator_commission, origin_video_id, origin_creator_id, attribution_expires_at
          ) VALUES (
            $1, $2, $3, $4, uuid_generate_v4(), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
          ) RETURNING *`,
          [
            orderNumber,
            buyerId,
            sellerId,
            itemType,
            combinedTitle,
            sellerItems.reduce(
              (sum, i) => sum + (parseInt(i.quantity) || 1),
              0
            ),
            parseFloat(firstItem.price) || 0,
            subtotal,
            platformFee,
            deliveryFee,
            totalAmount,
            sellerPayout,
            deliveryAddressJson,
            deliveryPin,
            body.latitude || null,
            body.longitude || null,
            "pending_payment",
            creatorCommission,
            originVideoId,
            originCreatorId,
            attributionExpiresAt,
          ]
        );
      }

      const order = orderResult[0];
      grandTotal += totalAmount;

      createdOrders.push({
        order,
        deliveryPin,
        items: itemDescriptions,
      });
    }

    // ── Paystack Payment ──
    let paymentUrl = null;
    const paymentReference = `PAY-${Date.now()
      .toString(36)
      .toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;

    try {
      const paystackPayload = {
        email: buyerEmail,
        amount: Math.round(grandTotal * 100), // GHS → pesewas
        reference: paymentReference,
        callback_url:
          body.callbackUrl ||
          `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/payment/callback`,
        metadata: {
          buyer_id: buyerId,
          order_count: createdOrders.length,
          order_ids: createdOrders.map((o) => o.order.id),
        },
      };

      const paystackResponse = await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(paystackPayload),
        }
      );

      if (paystackResponse.ok) {
        const paystackData = await paystackResponse.json();
        paymentUrl = paystackData.data.authorization_url;

        for (const { order } of createdOrders) {
          await sql(
            `UPDATE orders SET payment_reference = $1, updated_at = NOW() WHERE id = $2`,
            [paystackData.data.reference, order.id]
          );
        }
      } else {
        const errorData = await paystackResponse.json();
        console.error("Paystack error:", errorData);
      }
    } catch (paystackError) {
      console.error("Paystack initialization error:", paystackError);
    }

    // Send confirmation messages
    for (const { order, deliveryPin, items: itemDescs } of createdOrders) {
      await sendOrderConfirmationMessage(
        order.seller_id,
        buyerId,
        order,
        deliveryPin,
        itemDescs
      );
    }

    return Response.json({
      success: true,
      orders: createdOrders.map((o) => ({
        id: o.order.id,
        orderNumber: o.order.order_number,
        deliveryPin: o.deliveryPin,
        total: parseFloat(o.order.total_amount),
        items: o.items,
      })),
      paymentUrl,
      grandTotal,
      reference: paymentReference,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return Response.json(
      { error: error.message || "Checkout failed. Please try again." },
      { status: 500 }
    );
  }
}