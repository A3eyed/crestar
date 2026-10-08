// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import useUser from '@/utils/useUser';
import CurrencyPrice from '@/components/CurrencyPrice';
import BottomNav from '@/components/BottomNav';
import {
  ArrowLeft,
  ShoppingCart,
  Heart,
  Share2,
  MessageCircle,
  Truck,
  Shield,
  RotateCcw,
  Star,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
} from 'lucide-react';

export default function ProductDetailPage() {
  const { data: user } = useUser();
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    if (id) fetchProduct(id);
  }, []);

  const fetchProduct = async (id) => {
    try {
      const res = await fetch(`/api/products/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data.product);
        // Variants come separately from the API — not on the product object
        const productVariants = data.variants || [];
        setVariants(productVariants);
        const colorVariants = productVariants.filter((v) => v.variant_type === 'color');
        if (colorVariants.length > 0) {
          setSelectedColor(colorVariants[0].variant_value);
        }
      }
    } catch (err) {
      console.error('Failed to fetch product:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Price with variant adjustment ──
  // price_adjustment arrives as a STRING from the database ("0.00"),
  // so it MUST be parsed — otherwise 50 + "0.00" string-concatenates
  // into "500.00" (the 50→500 bug).
  const getCurrentPrice = () => {
    const basePrice = parseFloat(product?.price) || 0;
    if (!selectedColor) return basePrice;
    const colorVariant = variants.find(
      (v) => v.variant_type === 'color' && v.variant_value === selectedColor
    );
    if (!colorVariant) return basePrice;
    const adjustment = parseFloat(colorVariant.price_adjustment) || 0;
    return basePrice + adjustment;
  };

  const currentPrice = getCurrentPrice();

  const parseVariantSizes = (variant) => {
    if (!variant?.sizes) return [];
    if (Array.isArray(variant.sizes)) return variant.sizes;
    try {
      const parsed = JSON.parse(variant.sizes);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  const colorVariants = variants.filter((v) => v.variant_type === 'color');
  const selectedVariant = colorVariants.find((v) => v.variant_value === selectedColor);
  const selectedVariantSizes = parseVariantSizes(selectedVariant);

  // ── Per-color gallery: show ONLY the selected color's photos ──
  const parseVariantImages = (variant) => {
    if (!variant) return [];
    let imgs = variant.variant_images;
    if (typeof imgs === 'string') {
      try {
        imgs = JSON.parse(imgs);
      } catch (e) {
        imgs = [];
      }
    }
    if (Array.isArray(imgs) && imgs.length > 0) return imgs;
    if (variant.variant_image) return [variant.variant_image];
    return [];
  };

  const variantGallery = parseVariantImages(selectedVariant);
  const images = variantGallery.length > 0 ? variantGallery : product?.media || [];

  // Reset the visible image when the color changes
  useEffect(() => {
    setSelectedImage(0);
  }, [selectedColor]);

  const handleAddToCart = () => {
    if (!user) {
      window.location.href = '/account/signin';
      return;
    }
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      cart.push({
        id: product.id,
        name: product.title,
        price: currentPrice,
        image: images[0] || product.media?.[0],
        quantity,
        selectedColor,
        selectedSize,
        sellerId: product.seller?.id,
        seller: product.seller?.businessName || product.seller?.displayName,
        seller_currency: product.seller_currency || 'GHS',
      });
      localStorage.setItem('cart', JSON.stringify(cart));
      window.location.href = '/cart';
    } catch (err) {
      console.error('Cart error:', err);
    }
  };

  const handleBuyNow = () => {
    if (!user) {
      window.location.href = '/account/signin';
      return;
    }

    // TikTok-style express lane: bypass the shared cart entirely.
    const expressItem = {
      id: product.id,
      name: product.title || product.name,
      price: currentPrice,
      image: images[0] || null,
      sellerId: product.seller_id || product.sellerId,
      selectedColor: selectedColor || null,
      selectedSize: selectedSize || null,
      quantity,
      cartKey: [
        product.id,
        selectedColor ? `c:${selectedColor}` : null,
        selectedSize ? `s:${selectedSize}` : null,
      ]
        .filter(Boolean)
        .join('_'),
    };
    sessionStorage.setItem('buy_now_item', JSON.stringify(expressItem));
    window.location.href = '/checkout?mode=buynow';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-white/20 border-t-[#D4AF37] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl font-bold mb-4">Product not found</p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-[#D4AF37] text-black rounded-xl font-semibold hover:opacity-90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <Share2 size={20} />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <Heart size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square bg-white/5 rounded-2xl overflow-hidden">
            {images.length > 0 ? (
              <img
                src={images[selectedImage]}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/40">
                No image
              </div>
            )}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImage(Math.max(0, selectedImage - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
                  disabled={selectedImage === 0}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setSelectedImage(Math.min(images.length - 1, selectedImage + 1))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
                  disabled={selectedImage === images.length - 1}
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === idx ? 'border-[#D4AF37]' : 'border-white/10'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
            <div className="flex items-center gap-4 text-white/60">
              <a
                href={`/seller/${product.seller?.id || ''}`}
                className="hover:text-[#D4AF37] transition-colors"
              >
                {product.seller?.businessName || product.seller?.displayName || 'Seller'}
              </a>
            </div>
          </div>

          <div>
            <CurrencyPrice
              price={currentPrice}
              originalCurrency={product.seller_currency || 'GHS'}
              showOriginal={true}
              size="xlarge"
              textStyle={{
                color: '#D4AF37',
                fontSize: '2.25rem',
                fontWeight: 'bold',
              }}
            />
          </div>

          {/* Color Selection */}
          {colorVariants.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Color: {selectedColor}</p>
              <div className="flex gap-2 flex-wrap">
                {colorVariants.map((v, idx) => {
                  const isOut = v.stock_quantity != null && v.stock_quantity <= 0;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (isOut) return;
                        setSelectedColor(v.variant_value);
                        setSelectedSize(null);
                      }}
                      disabled={isOut}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                        selectedColor === v.variant_value
                          ? 'border-[#D4AF37] bg-[#D4AF37]/15'
                          : isOut
                            ? 'border-white/10 bg-white/5 opacity-40 line-through'
                            : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {v.variant_value}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selection */}
          {selectedVariantSizes.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Size</p>
              <div className="flex gap-2 flex-wrap">
                {selectedVariantSizes.map((size, idx) => {
                  const sizeValue = typeof size === 'string' ? size : size?.size || String(size);
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedSize(sizeValue)}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                        selectedSize === sizeValue
                          ? 'border-[#D4AF37] bg-[#D4AF37]/15'
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {sizeValue}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">Quantity</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="text-xl font-bold w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleAddToCart}
              className="flex-1 py-4 bg-white/10 rounded-xl font-bold hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingCart size={20} />
              Add to Cart
            </button>
            <button
              onClick={handleBuyNow}
              className="flex-1 py-4 bg-[#D4AF37] text-black rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Buy Now
            </button>
          </div>

          {/* Contact Seller */}
          <a
            href={`/inbox`}
            className="block w-full py-4 border-2 border-[#D4AF37] rounded-xl font-bold hover:bg-[#D4AF37]/10 transition-colors text-center"
          >
            <div className="flex items-center justify-center gap-2">
              <MessageCircle size={20} />
              Message Seller
            </div>
          </a>

          {/* Features */}
          <div className="space-y-4 pt-6 border-t border-white/10">
            <div className="flex items-center gap-3 text-white/80">
              <Truck size={20} />
              <span>Free delivery on orders above GH₵100</span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <Shield size={20} />
              <span>Buyer protection included</span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <RotateCcw size={20} />
              <span>7-day return policy</span>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="space-y-3 pt-6 border-t border-white/10">
              <h3 className="text-xl font-bold">Description</h3>
              <p className="text-white/70 leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation — keeps site-wide navigation visible on product pages */}
      <BottomNav />
    </div>
  );
}
