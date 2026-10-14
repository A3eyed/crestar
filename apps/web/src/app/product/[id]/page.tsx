// @ts-nocheck
'use client';
import { useState, useEffect, useMemo } from 'react';
import useUser from '@/utils/useUser';
import CurrencyPrice from '@/components/CurrencyPrice';
import {
  ArrowLeft,
  ShoppingCart,
  Heart,
  Share2,
  Star,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Package,
} from 'lucide-react';

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const p = JSON.parse(value);
      return Array.isArray(p) ? p : [];
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
}

function sizeStock(entry) {
  if (entry == null) return null;
  if (typeof entry === 'string' || typeof entry === 'number') {
    return { label: String(entry), stock: null, soldOut: false };
  }
  const label = entry.size || entry.label || entry.name || entry.value || entry.pack || '';
  const stock =
    entry.stock != null
      ? Number(entry.stock)
      : entry.quantity != null
        ? Number(entry.quantity)
        : entry.stock_quantity != null
          ? Number(entry.stock_quantity)
          : null;
  const soldOut =
    entry.sold_out === true ||
    entry.soldOut === true ||
    (stock != null && stock <= 0);
  return { label: String(label), stock, soldOut };
}

export default function ProductDetailPage() {
  const { data: user } = useUser();
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addedFlash, setAddedFlash] = useState(false);

  useEffect(() => {
    const id = window.location.pathname.split('/').filter(Boolean).pop();
    if (id) fetchProduct(id);
  }, []);

  const fetchProduct = async (id) => {
    try {
      const res = await fetch('/api/products/' + id);
      if (!res.ok) {
        setProduct(null);
        return;
      }
      const data = await res.json();
      setProduct(data.product);
      const productVariants = data.variants || [];
      setVariants(productVariants);
      const colorVariants = productVariants.filter((v) => v.variant_type === 'color');
      if (colorVariants.length > 0) setSelectedColor(colorVariants[0].variant_value);
      const sizeVariants = productVariants.filter(
        (v) => v.variant_type === 'size' || v.variant_type === 'pack',
      );
      if (sizeVariants.length > 0 && !selectedSize) {
        setSelectedSize(sizeVariants[0].variant_value);
      }
    } catch (err) {
      console.error(err);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPrice = () => {
    const basePrice = parseFloat(product?.price) || 0;
    let price = basePrice;
    if (selectedColor) {
      const colorVariant = variants.find(
        (v) => v.variant_type === 'color' && v.variant_value === selectedColor,
      );
      if (colorVariant) price += parseFloat(colorVariant.price_adjustment) || 0;
    }
    if (selectedSize) {
      const sizeVariant = variants.find(
        (v) =>
          (v.variant_type === 'size' || v.variant_type === 'pack') &&
          v.variant_value === selectedSize,
      );
      if (sizeVariant) price += parseFloat(sizeVariant.price_adjustment) || 0;
    }
    return price;
  };

  const colorVariants = variants.filter((v) => v.variant_type === 'color');
  const sizeOrPackVariants = variants.filter(
    (v) => v.variant_type === 'size' || v.variant_type === 'pack',
  );
  const selectedVariant = colorVariants.find((v) => v.variant_value === selectedColor);

  const sizeOptions = useMemo(() => {
    let raw = [];
    if (selectedVariant?.sizes) raw = parseJsonArray(selectedVariant.sizes);
    if (!raw.length && sizeOrPackVariants.length) {
      raw = sizeOrPackVariants.map((v) => ({
        label: v.variant_value,
        stock: v.stock_quantity != null ? Number(v.stock_quantity) : null,
        sold_out:
          v.stock_quantity != null ? Number(v.stock_quantity) <= 0 : false,
      }));
    }
    return raw.map(sizeStock).filter((s) => s.label);
  }, [selectedVariant, sizeOrPackVariants]);

  const parseVariantImages = (variant) => {
    if (!variant) return [];
    let imgs = variant.variant_images;
    if (typeof imgs === 'string') {
      try {
        imgs = JSON.parse(imgs);
      } catch {
        imgs = [];
      }
    }
    if (Array.isArray(imgs) && imgs.length) return imgs;
    if (variant.variant_image) return [variant.variant_image];
    return [];
  };

  const images = (() => {
    const fromVariant = parseVariantImages(selectedVariant);
    if (fromVariant.length) return fromVariant;
    return parseJsonArray(product?.media);
  })();

  useEffect(() => {
    setSelectedImage(0);
    setSelectedSize(null);
  }, [selectedColor]);

  useEffect(() => {
    if (!sizeOptions.length) return;
    const available = sizeOptions.find((s) => !s.soldOut);
    if (available && !selectedSize) setSelectedSize(available.label);
  }, [sizeOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  const stockQty =
    product?.stockQuantity ??
    product?.stock_quantity ??
    product?.stock ??
    null;
  const soldCount =
    product?.soldCount ?? product?.sold_count ?? product?.units_sold ?? 0;
  const rating = product?.rating ?? product?.avg_rating ?? null;
  const reviewCount = product?.reviewCount ?? product?.review_count ?? 0;

  const selectedSizeMeta = sizeOptions.find((s) => s.label === selectedSize);
  const sizeBlocksBuy = selectedSizeMeta?.soldOut === true;
  const outOfStock =
    sizeBlocksBuy || (stockQty != null && Number(stockQty) <= 0);

  // Cap quantity by available stock (size-level or product-level)
  const maxQty = (() => {
    if (selectedSizeMeta?.stock != null && selectedSizeMeta.stock >= 0) {
      return Math.max(0, Number(selectedSizeMeta.stock));
    }
    if (stockQty != null && Number(stockQty) >= 0) {
      return Math.max(0, Number(stockQty));
    }
    return 99;
  })();

  useEffect(() => {
    if (quantity > maxQty) setQuantity(Math.max(1, maxQty) || 1);
  }, [maxQty, selectedSize, selectedColor]); // eslint-disable-line react-hooks/exhaustive-deps

  const pushCartItem = (goTo) => {
    if (!user) {
      window.location.href = '/account/signin?callbackUrl=' + encodeURIComponent(window.location.pathname);
      return;
    }
    if (sizeOptions.length && !selectedSize) {
      alert('Choose a size or pack');
      return;
    }
    if (outOfStock || maxQty <= 0) {
      alert('This option is sold out');
      return;
    }
    if (quantity > maxQty) {
      alert('Only ' + maxQty + ' available in stock');
      return;
    }

    const item = {
      id: product.id,
      name: product.title || product.name,
      price: getCurrentPrice(),
      image: images[0] || null,
      quantity: Math.min(quantity, maxQty),
      maxStock: maxQty,
      selectedColor: selectedColor || null,
      selectedSize: selectedSize || null,
      sellerId: product.seller_id || product.seller?.id,
      seller: product.seller?.businessName || product.seller?.displayName,
      seller_currency: product.seller_currency || 'GHS',
      cartKey: [product.id, selectedColor && 'c:' + selectedColor, selectedSize && 's:' + selectedSize]
        .filter(Boolean)
        .join('_'),
    };

    if (goTo === 'buynow') {
      sessionStorage.setItem('buy_now_item', JSON.stringify(item));
      window.location.href = '/checkout?mode=buynow';
      return;
    }

    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const idx = cart.findIndex((c) => c.cartKey === item.cartKey);
      if (idx >= 0) {
        const existingQty = cart[idx].quantity || 1;
        const nextQty = Math.min(existingQty + quantity, maxQty);
        if (nextQty <= existingQty && existingQty >= maxQty) {
          alert('Only ' + maxQty + ' available in stock');
          return;
        }
        cart[idx].quantity = nextQty;
        cart[idx].maxStock = maxQty;
      } else {
        cart.push(item);
      }
      localStorage.setItem('cart', JSON.stringify(cart));
      setAddedFlash(true);
      setTimeout(() => setAddedFlash(false), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="aspect-[3/4] bg-white/5 animate-pulse" />
        <div className="p-4 space-y-3">
          <div className="h-6 w-2/3 bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-1/3 bg-white/10 rounded animate-pulse" />
          <div className="h-20 bg-white/5 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-6">
        <Package size={40} className="text-white/30" />
        <p className="text-white text-lg font-semibold">Product not found</p>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="glass-chip text-white px-5 py-2.5 rounded-full text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="relative aspect-[3/4] bg-black max-h-[70vh]">
        {images.length > 0 ? (
          <img
            src={typeof images[selectedImage] === 'string' ? images[selectedImage] : images[selectedImage]?.url}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/5">
            <Package size={48} className="text-white/20" />
          </div>
        )}

        <button
          type="button"
          onClick={() => window.history.back()}
          className="absolute top-4 left-4 w-10 h-10 rounded-full glass flex items-center justify-center"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="absolute top-4 right-4 flex gap-2">
          <button type="button" className="w-10 h-10 rounded-full glass flex items-center justify-center">
            <Share2 size={18} />
          </button>
          <button type="button" className="w-10 h-10 rounded-full glass flex items-center justify-center">
            <Heart size={18} />
          </button>
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setSelectedImage((i) => (i - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full glass flex items-center justify-center"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => setSelectedImage((i) => (i + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full glass flex items-center justify-center"
            >
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={
                    'h-1.5 rounded-full transition-all ' +
                    (i === selectedImage ? 'w-4 bg-[#D4AF37]' : 'w-1.5 bg-white/40')
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="relative -mt-6 rounded-t-3xl glass-strong px-4 pt-5 pb-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold leading-snug">{product.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/55">
              {soldCount > 0 && <span>{soldCount} sold</span>}
              {stockQty != null && (
                <span className={Number(stockQty) <= 0 ? 'text-red-400' : ''}>
                  {Number(stockQty) <= 0 ? 'Sold out' : stockQty + ' in stock'}
                </span>
              )}
              {(rating != null || reviewCount > 0) && (
                <span className="inline-flex items-center gap-1">
                  <Star size={13} className="text-[#D4AF37]" fill="#D4AF37" />
                  {rating != null ? Number(rating).toFixed(1) : '—'}
                  {reviewCount > 0 ? ` (${reviewCount})` : ''}
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <CurrencyPrice
              price={getCurrentPrice()}
              originalCurrency={product.seller_currency || 'GHS'}
              showOriginal={false}
              size="large"
              textStyle={{ color: '#D4AF37', fontSize: '1.35rem', fontWeight: 700 }}
            />
          </div>
        </div>

        {product.seller && (
          <a
            href={product.seller.username ? '/@' + product.seller.username : '#'}
            className="flex items-center gap-3 glass rounded-2xl p-3"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
              {product.seller.profileImage ? (
                <img src={product.seller.profileImage} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">
                {product.seller.businessName || product.seller.displayName}
              </p>
              {product.seller.username && (
                <p className="text-white/45 text-xs">@{product.seller.username}</p>
              )}
            </div>
            {product.seller.isVerified && (
              <span className="text-[10px] uppercase tracking-wide text-[#D4AF37] font-bold">
                Verified
              </span>
            )}
          </a>
        )}

        {colorVariants.length > 0 && (
          <div>
            <p className="text-sm text-white/60 mb-2">Color</p>
            <div className="flex flex-wrap gap-2">
              {colorVariants.map((v) => {
                const active = selectedColor === v.variant_value;
                return (
                  <button
                    key={v.id || v.variant_value}
                    type="button"
                    onClick={() => setSelectedColor(v.variant_value)}
                    className={
                      'px-3.5 py-2 rounded-full text-sm font-medium transition ' +
                      (active ? 'glass-chip-active' : 'glass-chip text-white/80')
                    }
                  >
                    {v.variant_value}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {sizeOptions.length > 0 && (
          <div>
            <p className="text-sm text-white/60 mb-2">
              {sizeOrPackVariants.some((v) => v.variant_type === 'pack') ? 'Pack / quantity' : 'Size'}
            </p>
            <div className="flex flex-wrap gap-2">
              {sizeOptions.map((s) => {
                const active = selectedSize === s.label;
                return (
                  <button
                    key={s.label}
                    type="button"
                    disabled={s.soldOut}
                    onClick={() => !s.soldOut && setSelectedSize(s.label)}
                    className={
                      'relative px-3.5 py-2 rounded-full text-sm font-medium transition ' +
                      (s.soldOut
                        ? 'bg-white/5 text-white/30 border border-white/10 line-through'
                        : active
                          ? 'glass-chip-active'
                          : 'glass-chip text-white/80')
                    }
                  >
                    {s.label}
                    {s.soldOut && (
                      <span className="block text-[10px] no-underline font-normal">Sold out</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/60">Quantity</p>
            {maxQty < 99 && (
              <p className="text-xs text-white/40">{maxQty} available</p>
            )}
          </div>
          <div className="flex items-center gap-3 glass rounded-full px-2 py-1">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-full flex items-center justify-center"
            >
              <Minus size={16} />
            </button>
            <span className="w-6 text-center font-semibold">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQty || 1, q + 1))}
              disabled={quantity >= maxQty}
              className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {product.description && (
          <div>
            <p className="text-sm font-semibold mb-1.5">Description</p>
            <p className="text-white/65 text-sm leading-relaxed whitespace-pre-wrap">
              {product.description}
            </p>
          </div>
        )}

        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold">Reviews</p>
            {reviewCount > 0 && (
              <span className="text-white/45 text-sm">{reviewCount} reviews</span>
            )}
          </div>
          {reviewCount > 0 || rating != null ? (
            <div className="flex items-center gap-2 text-[#D4AF37]">
              <Star size={16} fill="#D4AF37" />
              <span className="font-semibold text-white">
                {rating != null ? Number(rating).toFixed(1) : '—'}
              </span>
              <span className="text-white/45 text-sm">average</span>
            </div>
          ) : (
            <p className="text-white/45 text-sm">No reviews yet — be the first after your order.</p>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 glass-bar px-4 py-3 z-50">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => pushCartItem('cart')}
            disabled={outOfStock || maxQty <= 0}
            className="flex-1 h-12 rounded-full glass-chip text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <ShoppingCart size={18} />
            {addedFlash ? 'Added' : 'Add to cart'}
          </button>
          <button
            type="button"
            onClick={() => pushCartItem('buynow')}
            disabled={outOfStock || maxQty <= 0}
            className="flex-[1.2] h-12 rounded-full bg-[#D4AF37] text-black font-bold disabled:opacity-40"
          >
            {outOfStock || maxQty <= 0 ? 'Sold out' : 'Buy now'}
          </button>
        </div>
      </div>
    </div>
  );
}
