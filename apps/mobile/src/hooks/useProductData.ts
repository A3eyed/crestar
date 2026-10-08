// @ts-nocheck
import { useState, useEffect } from "react";

const MOCK_PRODUCTS_MAP = {
  "mock-1": {
    id: "mock-1",
    name: "Premium Wireless Headphones",
    description:
      "High quality wireless headphones with active noise cancellation. Up to 30 hours battery life. Foldable design for portability.",
    price: 89.99,
    originalPrice: 129.99,
    images: [
      "https://picsum.photos/600/720?random=11",
      "https://picsum.photos/600/720?random=12",
      "https://picsum.photos/600/720?random=13",
    ],
    seller: "TechHub GH",
    sellerId: "mock-seller-1",
    inStock: true,
    stockQuantity: 25,
    rating: 4.8,
    reviews: 124,
    category: "tech",
    features: [
      "Active Noise Cancellation",
      "30-Hour Battery",
      "Bluetooth 5.2",
      "USB-C Fast Charging",
    ],
  },
  "mock-2": {
    id: "mock-2",
    name: "Ankara Print Dress",
    description:
      "Beautiful Ankara print dress handcrafted in Ghana by local artisans. Machine washable. Available in multiple sizes.",
    price: 45.0,
    images: [
      "https://picsum.photos/600/720?random=21",
      "https://picsum.photos/600/720?random=22",
    ],
    seller: "Afro Fashion",
    sellerId: "mock-seller-2",
    inStock: true,
    stockQuantity: 15,
    rating: 4.6,
    reviews: 89,
    category: "fashion",
    features: ["100% Cotton", "Handcrafted in Ghana", "Machine Washable"],
  },
};

const MOCK_VARIANTS_MAP = {
  "mock-1": [
    {
      id: "v1",
      variant_type: "color",
      variant_value: "Black",
      stock_quantity: 25,
      price_adjustment: 0,
      variant_image: "https://picsum.photos/600/720?random=14",
      sizes: '["S","M","L","XL"]',
    },
    {
      id: "v2",
      variant_type: "color",
      variant_value: "White",
      stock_quantity: 7,
      price_adjustment: 5,
      variant_image: "https://picsum.photos/600/720?random=15",
      sizes: '["S","M","L"]',
    },
    {
      id: "v3",
      variant_type: "color",
      variant_value: "Rose Gold",
      stock_quantity: 0,
      price_adjustment: 10,
      variant_image: "https://picsum.photos/600/720?random=16",
      sizes: '["S","M"]',
    },
  ],
  "mock-2": [
    {
      id: "v4",
      variant_type: "color",
      variant_value: "Blue & Gold",
      stock_quantity: 15,
      price_adjustment: 0,
      sizes: '["XS","S","M","L","XL","XXL"]',
    },
    {
      id: "v5",
      variant_type: "color",
      variant_value: "Red & Black",
      stock_quantity: 8,
      price_adjustment: 0,
      sizes: '["S","M","L","XL"]',
    },
    {
      id: "v6",
      variant_type: "color",
      variant_value: "Green & White",
      stock_quantity: 0,
      price_adjustment: 0,
      sizes: '["M","L"]',
    },
  ],
};

const DEFAULT_MOCK_PRODUCT = {
  id: "demo",
  name: "Demo Product",
  description:
    "This is a demo product for testing. All features including color/size variant selection, size guide, stock indicators and add to cart are fully functional in demo mode.",
  price: 49.99,
  images: [
    "https://picsum.photos/600/720?random=31",
    "https://picsum.photos/600/720?random=32",
    "https://picsum.photos/600/720?random=33",
  ],
  seller: "Demo Seller",
  sellerId: "demo-seller",
  inStock: true,
  stockQuantity: 20,
  rating: 4.5,
  reviews: 50,
  category: "all",
  features: [
    "High Quality Materials",
    "Fast Shipping",
    "30-Day Returns",
    "24/7 Support",
  ],
};

const DEFAULT_MOCK_VARIANTS = [
  {
    id: "dv1",
    variant_type: "color",
    variant_value: "Red",
    stock_quantity: 20,
    price_adjustment: 0,
    variant_image: "https://picsum.photos/600/720?random=34",
    sizes: '["S","M","L","XL"]',
  },
  {
    id: "dv2",
    variant_type: "color",
    variant_value: "Blue",
    stock_quantity: 5,
    price_adjustment: 5,
    variant_image: "https://picsum.photos/600/720?random=35",
    sizes: '["S","M","L"]',
  },
  {
    id: "dv3",
    variant_type: "color",
    variant_value: "White",
    stock_quantity: 0,
    price_adjustment: 0,
    variant_image: "https://picsum.photos/600/720?random=36",
    sizes: '["M","L"]',
  },
];

function parseMaybeJson(value, fallback) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

// null = not tracked (still buyable). 0 = sold out.
function readStock(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function useProductData(productId) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [variants, setVariants] = useState([]);
  const [variantStock, setVariantStock] = useState({});
  const [variantImages, setVariantImages] = useState({});
  const [isMockData, setIsMockData] = useState(false);

  useEffect(() => {
    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const applyVariants = (productVariants) => {
    setVariants(productVariants);
    const stockMap = {};
    const imagesMap = {};
    productVariants
      .filter((v) => v.variant_type === "color")
      .forEach((variant) => {
        stockMap[variant.variant_value] = readStock(variant.stock_quantity);
        let imgs = parseMaybeJson(variant.variant_images, []);
        if (imgs.length === 0 && variant.variant_image) {
          imgs = [variant.variant_image];
        }
        if (imgs.length > 0) {
          imagesMap[variant.variant_value] = imgs;
        }
      });
    setVariantStock(stockMap);
    setVariantImages(imagesMap);
  };

  const loadMockData = () => {
    const mockProduct = MOCK_PRODUCTS_MAP[productId] || DEFAULT_MOCK_PRODUCT;
    const mockVariants = MOCK_VARIANTS_MAP[productId] || DEFAULT_MOCK_VARIANTS;
    setProduct(mockProduct);
    setIsMockData(true);
    applyVariants(mockVariants);
    setError(null);
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const cacheBust = Date.now();
      const response = await fetch(
        `/api/products/${productId}?_t=${cacheBust}`
      );
      if (!response.ok) throw new Error("Product not found");
      const data = await response.json();
      const media = parseMaybeJson(data.product.media, []);
      const features = parseMaybeJson(data.product.features, []);
      const s = data.product.seller || {};
      const sellerName =
        s.businessName ||
        s.displayName ||
        (s.username ? `@${s.username}` : "Seller");
      const parsedPrice = parseFloat(data.product.price) || 0;
      const stockQuantity = readStock(
        data.product.stockQuantity ?? data.product.stock_quantity
      );

      setProduct({
        id: data.product.id,
        name: data.product.title,
        description: data.product.description,
        price: parsedPrice,
        seller_currency: data.product.seller_currency || "GHS",
        images: media,
        seller: sellerName,
        sellerId: s.id || data.product.seller_id,
        sellerDisplayName: s.displayName,
        sellerBusinessName: s.businessName,
        sellerAvatar: s.profileImage,
        inStock: stockQuantity === null ? true : stockQuantity > 0,
        stockQuantity,
        category: data.product.category,
        rating: 0.0,
        reviews: 0,
        features,
        minOrderQuantity:
          data.product.minOrderQuantity || data.product.min_order_quantity || 1,
      });
      setIsMockData(false);
      applyVariants(data.variants || []);
      setError(null);
    } catch (err) {
      console.error("Product fetch error — loading mock data:", err);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  return {
    product,
    loading,
    error,
    variants,
    variantStock,
    variantImages,
    isMockData,
    refetch: fetchProduct,
  };
}