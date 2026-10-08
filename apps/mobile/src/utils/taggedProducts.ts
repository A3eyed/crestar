// @ts-nocheck
/**
 * Shared helpers for TikTok-style tagged products on videos.
 *
 * Videos come back from several endpoints (/api/feed, /api/videos/user/[id], search)
 * with slightly different casing, so every read goes through these helpers.
 * Missing stock is not sold out. Only an explicit 0 is sold out.
 */
export function getTaggedItems(video) {
  if (!video) return [];
  const raw =
    video.taggedItems || video.tagged_items || video.product_tags || [];
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (tag) =>
      tag &&
      (tag.productId || tag.serviceId || tag.product_id || tag.service_id)
  );
}

export function getTagId(tag) {
  if (!tag) return null;
  return (
    tag.productId || tag.serviceId || tag.product_id || tag.service_id || null
  );
}

export function getTagTitle(tag) {
  if (!tag) return "View product";
  return (
    tag.productTitle ||
    tag.serviceTitle ||
    tag.product_title ||
    tag.service_title ||
    tag.title ||
    "View product"
  );
}

export function getTagPrice(tag) {
  if (!tag) return null;
  const raw =
    tag.productPrice ??
    tag.servicePrice ??
    tag.product_price ??
    tag.service_price ??
    tag.price ??
    null;
  if (raw === null || raw === undefined || raw === "") return null;
  const parsed = typeof raw === "number" ? raw : parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getTagCurrency(tag) {
  return tag?.currency || tag?.productCurrency || tag?.seller_currency || "GHS";
}

export function getTagImage(tag, video) {
  const media = tag?.productMedia || tag?.product_media || tag?.media || null;
  if (Array.isArray(media) && media.length > 0) {
    const first = media[0];
    if (typeof first === "string" && first) return first;
    if (first?.url) return first.url;
    if (first?.uri) return first.uri;
  }
  if (typeof media === "string" && media) return media;
  return (
    video?.thumbnail_url || video?.thumbnailUrl || video?.thumbnail || null
  );
}

export function getTagStock(tag) {
  if (!tag) return null;
  const raw =
    tag.productStock ??
    tag.product_stock ??
    tag.stockQuantity ??
    tag.stock_quantity ??
    tag.stock ??
    null;
  if (raw === null || raw === undefined || raw === "") return null;
  const parsed = typeof raw === "number" ? raw : parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isTagSoldOut(tag) {
  return getTagStock(tag) === 0;
}

export function normalizeTaggedProduct(tag, video = {}) {
  const isService =
    !!(tag?.serviceId || tag?.service_id) &&
    !(tag?.productId || tag?.product_id);
  const title = getTagTitle(tag);
  const price = getTagPrice(tag);
  const stock = getTagStock(tag);
  return {
    id: getTagId(tag),
    name: title,
    title,
    productName: title,
    price: price === null ? 0 : price,
    productPrice: price === null ? 0 : price,
    currency: getTagCurrency(tag),
    image: getTagImage(tag, video),
    stock,
    stockQuantity: stock,
    isService,
    type: isService ? "service" : "product",
    seller:
      video.businessName ||
      video.business_name ||
      video.displayName ||
      video.display_name ||
      (video.username ? `@${video.username}` : ""),
    sellerId:
      video.creatorUserId || video.creator_user_id || video.sellerId || null,
    originVideoId: video.id || null,
    originCreatorId: video.creatorUserId || video.creator_user_id || null,
  };
}

const seenAnchors = new Set();

export function hasSeenProductAnchor(videoId) {
  if (!videoId) return false;
  return seenAnchors.has(String(videoId));
}

export function markProductAnchorSeen(videoId) {
  if (!videoId) return;
  seenAnchors.add(String(videoId));
}

export function resetSeenProductAnchors() {
  seenAnchors.clear();
}