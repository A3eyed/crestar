// @ts-nocheck
/**
 * Shared fulfillment helpers.
 *
 * Crestar supports exactly three ways a buyer can receive an order:
 *   1. pickup          — buyer collects from the seller's store (always free)
 *   2. seller_delivery — the seller's own delivery, priced per town they chose
 *   3. on_demand       — a Delivery Center rider who sets their own price
 *
 * International shipping is just a seller_delivery zone in another country.
 * We do not use third-party couriers, so every fee here is set by a human
 * (the seller, or the deliverer) — never estimated by us.
 */

export const FULFILLMENT_TYPES = ['pickup', 'seller_delivery', 'on_demand'];

export const PRICING_MODELS = ['FLAT_TOWN', 'FLAT_REGION', 'ROUTE', 'BASE_PLUS_PER_KM'];

/** Lower-case + trim, tolerant of null. */
export function norm(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}

/** Countries are stored inconsistently (name vs ISO code) — compare loosely. */
export function sameCountry(a, b) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  // "GH" vs "Ghana" — treat a 2-letter code as a prefix match
  if (x.length === 2 && y.startsWith(x)) return true;
  if (y.length === 2 && x.startsWith(y)) return true;
  return false;
}

/**
 * Pick the single best delivery zone for where the buyer actually is.
 *
 * Sellers set fees town by town, so an exact town hit always wins. If they
 * only covered the region (or the whole country) we fall back to that, which
 * is how most international zones end up being written.
 */
export function matchDeliveryZone(zones, buyerLocation) {
  const list = Array.isArray(zones) ? zones : [];
  const country = norm(buyerLocation?.country);
  const region = norm(buyerLocation?.region);
  const city = norm(buyerLocation?.city);

  const inCountry = list.filter((z) => sameCountry(z.country, country));
  const pool = country ? inCountry : list;

  const exactTown = pool.find(
    (z) => city && norm(z.city_name) === city && (!region || norm(z.region_name) === region)
  );
  if (exactTown) return { matched: exactTown, candidates: pool, precision: 'town' };

  const townAnyRegion = pool.find((z) => city && norm(z.city_name) === city);
  if (townAnyRegion) return { matched: townAnyRegion, candidates: pool, precision: 'town' };

  // A zone with no town set means "anywhere in this region"
  const regionWide = pool.find(
    (z) => region && norm(z.region_name) === region && !norm(z.city_name)
  );
  if (regionWide) return { matched: regionWide, candidates: pool, precision: 'region' };

  const anyInRegion = pool.find((z) => region && norm(z.region_name) === region);
  if (anyInRegion) return { matched: anyInRegion, candidates: pool, precision: 'region' };

  // A zone with neither region nor town means "anywhere in this country"
  const countryWide = pool.find((z) => !norm(z.region_name) && !norm(z.city_name));
  if (countryWide) return { matched: countryWide, candidates: pool, precision: 'country' };

  return { matched: null, candidates: pool, precision: null };
}

/**
 * Does a deliverer's coverage scope include this place?
 * An empty scope means "I go anywhere".
 */
export function scopeCovers(scope, location) {
  if (!scope || typeof scope !== 'object') return true;

  const countries = Array.isArray(scope.countries) ? scope.countries : [];
  const regions = Array.isArray(scope.regions) ? scope.regions : [];
  const towns = Array.isArray(scope.towns) ? scope.towns : [];

  if (!countries.length && !regions.length && !towns.length) return true;

  if (towns.length && towns.some((t) => norm(t) === norm(location?.city))) return true;
  if (regions.length && regions.some((r) => norm(r) === norm(location?.region))) return true;
  if (countries.length && countries.some((c) => sameCountry(c, location?.country))) return true;

  return false;
}

/** Explicit "from town A to town B" trips priced as a single fare. */
export function routeCovers(card, origin, destination) {
  const routes = card?.origin_scope?.routes || card?.destination_scope?.routes;
  if (!Array.isArray(routes) || routes.length === 0) return false;

  return routes.some((route) => {
    const fromOk = !route.fromTown || norm(route.fromTown) === norm(origin?.city);
    const toOk = !route.toTown || norm(route.toTown) === norm(destination?.city);
    return fromOk && toOk;
  });
}

/** Straight-line distance in km, or null when we don't have both pins. */
export function haversineKm(a, b) {
  const lat1 = Number(a?.latitude);
  const lon1 = Number(a?.longitude);
  const lat2 = Number(b?.latitude);
  const lon2 = Number(b?.longitude);
  if (![lat1, lon1, lat2, lon2].every((n) => Number.isFinite(n))) return null;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

/**
 * Turn a rate card into a number. Returns null when the card can't be priced
 * for this trip, so the caller can drop it rather than quote a wrong fee.
 */
export function computeRateCardFee(card, distanceKm) {
  const model = card?.pricing_model;

  if (model === 'BASE_PLUS_PER_KM') {
    const base = Number(card.base_fee) || 0;
    const perKm = Number(card.per_km_fee) || 0;
    const minimum = Number(card.minimum_fee) || 0;

    if (distanceKm === null || distanceKm === undefined) {
      // No pin on either end — the minimum is the only honest number we have
      return minimum > 0 ? Math.round(minimum * 100) / 100 : null;
    }
    const raw = base + perKm * distanceKm;
    return Math.round(Math.max(raw, minimum) * 100) / 100;
  }

  const flat = Number(card?.flat_fee);
  if (Number.isFinite(flat) && flat >= 0) return Math.round(flat * 100) / 100;
  return null;
}

/** Deliverer-written ETA wins; otherwise a coarse same-town / intercity guess. */
export function estimateEta(card, sellerLocation, buyerLocation) {
  if (card?.eta_text) return card.eta_text;
  const sameTown =
    norm(sellerLocation?.city) && norm(sellerLocation?.city) === norm(buyerLocation?.city);
  if (sameTown) return 'Same day';
  const sameCountryTrip = sameCountry(sellerLocation?.country, buyerLocation?.country);
  return sameCountryTrip ? '1–2 days' : '3–7 days';
}

/** Validate a deliverer rate card before it hits the database. */
export function validateRateCard(payload) {
  const errors = [];

  if (!payload?.name || !String(payload.name).trim()) {
    errors.push('Give this rate a name');
  }

  const model = payload?.pricingModel;
  if (!PRICING_MODELS.includes(model)) {
    errors.push('Choose how you want to charge');
  }

  if (model === 'BASE_PLUS_PER_KM') {
    const base = Number(payload.baseFee);
    const perKm = Number(payload.perKmFee);
    if (!Number.isFinite(base) || base < 0) errors.push('Enter a valid base fee');
    if (!Number.isFinite(perKm) || perKm <= 0) errors.push('Enter a valid per-kilometre fee');
  } else if (model) {
    const flat = Number(payload.flatFee);
    if (!Number.isFinite(flat) || flat < 0) errors.push('Enter a valid fee');
  }

  if (model === 'ROUTE') {
    const routes = payload?.originScope?.routes || payload?.destinationScope?.routes;
    if (!Array.isArray(routes) || routes.length === 0) {
      errors.push('Add at least one trip (collect from → deliver to)');
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Default settings for a seller who has never opened the fulfillment screen. */
export const DEFAULT_FULFILLMENT_SETTINGS = {
  enable_store_pickup: false,
  pickup_instructions: null,
  pickup_hours: null,
  enable_own_delivery_zones: true,
  allow_on_demand_deliverers: false,
};
