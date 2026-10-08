// @ts-nocheck
export function getUserType(monetization) {
  const isSeller = monetization?.seller?.verification_status === "approved";
  const isCreator = monetization?.creator?.verification_status === "approved";
  const isDeliverer =
    monetization?.deliverer?.verification_status === "approved";
  const isMonetized =
    monetization?.hasAnyMonetization && (isSeller || isCreator || isDeliverer);

  // Determine seller type for dynamic icons
  const sellerType = monetization?.seller?.seller_type || null;

  return {
    isSeller,
    isCreator,
    isDeliverer,
    isMonetized,
    sellerType, // 'physical_goods' or 'food_beverage'
  };
}

export function getProfileTabs(userType, products, services) {
  const { isSeller, isCreator, isMonetized, sellerType } = userType;
  const tabs = [];

  tabs.push({ id: "posts", label: "Posts" });

  // Sellers get a dedicated Shop/Menu tab
  if (isSeller) {
    const shopLabel = sellerType === "food_beverage" ? "Menu" : "Shop";
    tabs.push({ id: "shop", label: shopLabel, sellerType });
  }

  // Always show Showcase tab (like TikTok)
  tabs.push({ id: "showcase", label: "Showcase", sellerType });

  if (isMonetized) {
    tabs.push({ id: "about", label: "About" });
  }

  return tabs;
}

export function getProductImage(item) {
  if (Array.isArray(item.media) && item.media.length > 0) {
    return item.media[0];
  }
  if (typeof item.media === "string") {
    return item.media;
  }
  return null;
}

export function getProductPrice(item) {
  return item.price || item.basic_price || 0;
}

export function getDisplayName(profile) {
  return (
    profile.display_name ||
    profile.business_name ||
    profile.full_name ||
    profile.username ||
    "User"
  );
}

export function getAvatarInitial(profile) {
  const name =
    profile.business_name || profile.display_name || profile.username;
  return name?.charAt(0)?.toUpperCase() || "U";
}
