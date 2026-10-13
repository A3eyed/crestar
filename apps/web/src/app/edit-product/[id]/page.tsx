// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import useUser from '@/utils/useUser';
import { ArrowLeft, Save } from 'lucide-react';

export default function EditProductPage() {
  const { data: user, loading: userLoading } = useUser();
  const [productId, setProductId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [category, setCategory] = useState('');
  const [media, setMedia] = useState([]);

  useEffect(() => {
    const id = window.location.pathname.split('/').filter(Boolean).pop();
    setProductId(id || '');
    if (!id) {
      setLoading(false);
      setError('Missing product');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/products/${id}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.product) {
          setError('We could not load this listing. It may have been removed.');
          return;
        }
        const p = data.product;
        setTitle(p.title || '');
        setDescription(p.description || '');
        setPrice(String(p.price ?? ''));
        setStockQuantity(
          p.stockQuantity != null ? String(p.stockQuantity) : '',
        );
        setCategory(p.category || '');
        setMedia(Array.isArray(p.media) ? p.media : []);
      } catch {
        setError('Something went wrong loading this listing.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!userLoading && !user) {
      window.location.href = `/account/signin?callbackUrl=/edit-product/${productId}`;
    }
  }, [user, userLoading, productId]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please add a title.');
      return;
    }
    const parsedPrice = parseFloat(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('Please enter a valid price.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/listings/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: productId,
          title: title.trim(),
          description: description.trim(),
          price: parsedPrice,
          stockQuantity: stockQuantity === '' ? null : parseInt(stockQuantity, 10),
          category: category.trim() || null,
          media,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not save changes. Please try again.');
        return;
      }
      window.location.href = '/seller/dashboard';
    } catch {
      setError('Could not save changes. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-full max-w-md px-4 space-y-3">
          <div className="h-8 w-40 bg-white/10 rounded animate-pulse" />
          <div className="h-12 bg-white/10 rounded-xl animate-pulse" />
          <div className="h-28 bg-white/10 rounded-xl animate-pulse" />
          <div className="h-12 bg-white/10 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-20 bg-black border-b border-white/10">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => (window.location.href = '/seller/dashboard')}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold">Edit listing</h1>
            <p className="text-white/50 text-xs">Update details buyers see</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {media[0] && (
          <div className="w-full aspect-square max-h-56 rounded-2xl overflow-hidden bg-white/5">
            <img src={media[0]} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div>
          <label className="block font-bold mb-2">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3.5 text-white focus:border-[#D4AF37] focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-bold mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3.5 text-white focus:border-[#D4AF37] focus:outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold mb-2">Price (GHS)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-bold mb-2">Stock</label>
            <input
              type="number"
              min="0"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold mb-2">Category</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3.5 text-white focus:border-[#D4AF37] focus:outline-none"
          />
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] text-black py-4 rounded-xl font-bold disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Saving…' : 'Save changes'}
        </button>

        <a
          href={`/product/${productId}`}
          className="block text-center text-white/50 text-sm hover:text-white"
        >
          View public listing
        </a>
      </div>
    </div>
  );
}
