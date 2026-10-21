// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import useUser from '@/utils/useUser';
import { ArrowLeft } from 'lucide-react';

export default function EditVideoPage() {
  const { data: user, loading: userLoading } = useUser();
  const [videoId, setVideoId] = useState(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const id = window.location.pathname.split('/').filter(Boolean).pop();
    setVideoId(id);
  }, []);

  useEffect(() => {
    if (!videoId || userLoading) return;
    if (!user) {
      window.location.href = '/account/signin?callbackUrl=/edit-video/' + videoId;
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/videos/' + encodeURIComponent(videoId));
        if (!res.ok) {
          setError('Video not found');
          return;
        }
        const data = await res.json();
        const v = data.video;
        if (!v) {
          setError('Video not found');
          return;
        }
        if (String(v.creator_user_id) !== String(user.id)) {
          setError('You can only edit your own videos');
          return;
        }
        setCaption(v.caption || '');
        setVisibility(v.visibility || v.status === 'private' ? 'private' : 'public');
      } catch {
        setError('Could not load video');
      } finally {
        setLoading(false);
      }
    })();
  }, [videoId, user, userLoading]);

  const save = async () => {
    if (!videoId || saving) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/videos/' + encodeURIComponent(videoId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ caption: caption.trim(), visibility }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Fallback: try upload-style update endpoint if PATCH not supported yet
        if (res.status === 405 || res.status === 404) {
          const res2 = await fetch('/api/videos/upload', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ videoId, caption: caption.trim(), visibility }),
          });
          if (!res2.ok) throw new Error(data.error || 'Update failed');
        } else {
          throw new Error(data.error || 'Update failed');
        }
      }
      setSaved(true);
    } catch (e) {
      setError(e.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/20 border-t-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <div className="sticky top-0 z-20 bg-black/90 border-b border-white/10 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href={videoId ? '/video/' + videoId : '/profile'} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <ArrowLeft size={20} />
          </a>
          <h1 className="font-bold">Edit post</h1>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="text-[#D4AF37] font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
        )}
        {saved && (
          <p className="text-[#D4AF37] text-sm bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl px-4 py-3">Saved</p>
        )}

        <div>
          <label className="block text-sm text-white/60 mb-2">Caption</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Describe the video. Use #topics so shoppers can find it."
            className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:border-[#D4AF37] resize-none"
          />
          <p className="text-white/35 text-xs mt-1">{caption.length}/500</p>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-2">Who can see this</label>
          <div className="flex gap-2">
            {[
              { id: 'public', label: 'Everyone' },
              { id: 'private', label: 'Only you' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setVisibility(opt.id)}
                className={
                  'flex-1 py-3 rounded-xl text-sm font-semibold border ' +
                  (visibility === opt.id
                    ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                    : 'bg-white/5 text-white border-white/15')
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-white/40 text-xs leading-relaxed">
          Crestar posts stay shoppable when products stay tagged. Change the caption anytime;
          product tags are managed from Seller Center when you update listings.
        </p>
      </div>
    </div>
  );
}
