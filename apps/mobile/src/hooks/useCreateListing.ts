// @ts-nocheck
import { useState } from "react";
import { Alert } from "react-native";
import { authenticatedFetch } from "@/utils/authenticatedFetch";

function cleanNumber(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function drinkTitle(base, row) {
  const pack = Number(row.packSize) > 1 ? ` (Pack of ${row.packSize})` : "";
  return [base, row.flavor, row.volume].filter(Boolean).join(", ") + pack;
}

function foodTitle(base, row) {
  const pack = Number(row.packSize) > 1 ? ` (${row.packSize}-pack)` : "";
  return (
    [base, row.servingSize, row.weightLabel, row.preparation]
      .filter(Boolean)
      .join(", ") + pack
  );
}

export function useCreateListing() {
  const [submitting, setSubmitting] = useState(false);

  const createListing = async (payload, onSuccess) => {
    const listingKind = payload.listingKind || "general";
    const title = payload.title?.trim();

    if (!title) {
      Alert.alert(
        "Add a title",
        "Give your listing a name buyers will search for."
      );
      return;
    }
    if (!Array.isArray(payload.media) || payload.media.length === 0) {
      Alert.alert(
        "Add a photo",
        "Listings with at least one photo sell far better."
      );
      return;
    }

    let body = { ...payload, title, listingKind };

    if (listingKind === "drinks") {
      const rows = Array.isArray(payload.drinkVariants)
        ? payload.drinkVariants
        : [];
      if (rows.length === 0) {
        Alert.alert("Add a drink variant", "Choose a volume and pack size.");
        return;
      }
      const variants = rows.map((row) => ({
        variantType: "drink",
        volume: row.volume,
        flavor: row.flavor || "",
        sugarProfile: payload.sugarProfile || "Original",
        sweetener: payload.sweetener || "",
        packSize: Number(row.packSize) || 1,
        price: cleanNumber(row.price),
        stockQuantity: cleanNumber(row.stock),
        weightGrams: cleanNumber(row.weightGrams),
        label: drinkTitle(title, row),
      }));
      if (variants.some((row) => !row.volume || !row.price || row.price <= 0)) {
        Alert.alert(
          "Finish the drink variants",
          "Each variant needs a volume and a price."
        );
        return;
      }
      if (variants.some((row) => !row.weightGrams || row.weightGrams <= 0)) {
        Alert.alert(
          "Add pack weight",
          "Each drink variant needs a shipping weight in grams."
        );
        return;
      }
      body = {
        ...body,
        productType: "food_beverage",
        foodHubType: "drinks",
        price: variants[0].price,
        stockQuantity: variants[0].stockQuantity,
        variants,
        sizingCategory: null,
        selectedSizes: [],
      };
    } else if (listingKind === "food") {
      const rows = Array.isArray(payload.foodVariants)
        ? payload.foodVariants
        : [];
      if (rows.length === 0) {
        Alert.alert("Add a food variant", "Choose a serving size and pack.");
        return;
      }
      const variants = rows.map((row) => ({
        variantType: "food",
        servingSize: row.servingSize || "Regular",
        weightLabel: row.weightLabel || "",
        preparation: row.preparation || "Standard",
        packSize: Number(row.packSize) || 1,
        price: cleanNumber(row.price),
        stockQuantity: cleanNumber(row.stock),
        label: foodTitle(title, row),
      }));
      if (variants.some((row) => !row.price || row.price <= 0)) {
        Alert.alert("Finish the food variants", "Each variant needs a price.");
        return;
      }
      body = {
        ...body,
        productType: "food_beverage",
        foodHubType: "food",
        price: variants[0].price,
        stockQuantity: variants[0].stockQuantity,
        variants,
        sizingCategory: null,
        selectedSizes: [],
      };
    } else {
      const price = cleanNumber(payload.price);
      if (!price || price <= 0) {
        Alert.alert("Add a price", "Enter how much this costs.");
        return;
      }
      body = {
        ...body,
        listingKind: "general",
        productType: payload.productType || "general",
        price,
        foodHubType: null,
        drinkVariants: undefined,
        foodVariants: undefined,
      };
    }

    setSubmitting(true);
    try {
      const response = await authenticatedFetch("/api/listings/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create listing");
      }
      Alert.alert(
        "Listing Published",
        "Your listing is now live and ready for customers",
        [{ text: "Done", onPress: onSuccess }]
      );
    } catch (error) {
      console.error("Create listing error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to create listing. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return { createListing, submitting };
}