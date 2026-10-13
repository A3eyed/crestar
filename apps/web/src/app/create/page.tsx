// @ts-nocheck
'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useUser from '@/utils/useUser';
import { enqueueVideoPost } from '@/utils/postVideoQueue';
import CurrencyPrice from '@/components/CurrencyPrice';
import {
  X,
  Upload,
  Camera,
  Play,
  Pause,
  ShoppingBag,
  Plus,
  Search,
  SwitchCamera,
  Square,
} from 'lucide-react';

const MAX_RECORDING_SECONDS = 60;
// Lower bitrate + resolution = much faster uploads without looking bad on phone
const COMPRESS_BITRATE = 1_200_000;

function productImage(p) {
  let media = p.media;
  if (typeof media === 'string') {
    try {
      media = JSON.parse(media);
    } catch {
      media = [media];
    }
  }
  if (Array.isArray(media) && media.length) {
    const first = media[0];
    return typeof first === 'string' ? first : first?.url || null;
  }
  return null;
}

export default function CreatePage() {
  const router = useRouter();
  const { data: user, loading: userLoading } = useUser();

  const [selectedFile, setSelectedFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [taggedProducts, setTaggedProducts] = useState([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [myProducts, setMyProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const [cameraError, setCameraError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facingMode, setFacingMode] = useState('user');

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const liveVideoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedCameraRef = useRef(false);

  useEffect(() => {
    if (!userLoading && !user) {
      window.location.href = '/account/signin?callbackUrl=/create';
    }
  }, [user, userLoading]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(
    async (mode) => {
      setCameraError('');
      stopStream();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode || facingMode,
            width: { ideal: 540 },
            height: { ideal: 960 },
          },
          audio: true,
        });
        streamRef.current = stream;
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
          liveVideoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.error('Camera error:', err);
        setCameraError('Camera unavailable. Allow camera and mic, or use Upload.');
      }
    },
    [facingMode, stopStream],
  );

  useEffect(() => {
    if (userLoading || !user || videoPreview || startedCameraRef.current) return;
    startedCameraRef.current = true;
    const t = setTimeout(() => startCamera(), 40);
    return () => clearTimeout(t);
  }, [user, userLoading, videoPreview, startCamera]);

  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stopStream]);

  const flipCamera = async () => {
    if (isRecording) return;
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    await startCamera(next);
  };

  const stopRecording = (discard = false) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (discard) {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
      }
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    let mimeType = '';
    for (const c of [
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ]) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(c)) {
        mimeType = c;
        break;
      }
    }
    try {
      const recorder = new MediaRecorder(streamRef.current, {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: COMPRESS_BITRATE,
      });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data?.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const type = mimeType || 'video/webm';
        const ext = type.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunksRef.current, { type });
        if (!blob.size) return;
        const file = new File([blob], `recording_${Date.now()}.${ext}`, { type });
        setSelectedFile(file);
        setVideoPreview(URL.createObjectURL(blob));
        stopStream();
        setRecordingTime(0);
      };
      recorder.start(200);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev + 1 >= MAX_RECORDING_SECONDS) {
            stopRecording();
            return prev + 1;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      setCameraError('Recording is not supported here. Use Upload instead.');
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m + ':' + String(s).padStart(2, '0');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      alert('Please choose a video file');
      return;
    }
    stopStream();
    setSelectedFile(file);
    setVideoPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleDiscard = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setSelectedFile(null);
    setVideoPreview(null);
    setCaption('');
    setTaggedProducts([]);
    setIsPlaying(false);
    startedCameraRef.current = false;
    setTimeout(() => startCamera(), 40);
  };

  const loadMyProducts = useCallback(async () => {
    if (!user?.id && !user?.userId) return;
    setLoadingProducts(true);
    try {
      const sellerId = user.id || user.userId;
      const res = await fetch(
        '/api/listings/products?sellerId=' + encodeURIComponent(sellerId),
      );
      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data.products) ? data.products : [];
      setMyProducts(list.filter((p) => !p.status || p.status === 'active'));
    } catch {
      setMyProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [user]);

  const openProductPicker = () => {
    setShowProductSearch(true);
    setSearchQuery('');
    loadMyProducts();
  };

  const filteredProducts = myProducts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.title || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  });

  const handleAddProduct = (product) => {
    if (taggedProducts.find((p) => p.id === product.id)) return;
    setTaggedProducts([...taggedProducts, product]);
    setShowProductSearch(false);
    setSearchQuery('');
  };

  const handlePost = () => {
    if (!selectedFile || isPosting) return;
    if (taggedProducts.length === 0) {
      alert('Tag at least one of your products before posting.');
      openProductPicker();
      return;
    }
    setIsPosting(true);
    enqueueVideoPost({
      file: selectedFile,
      caption,
      taggedProducts,
    });
    router.replace('/');
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/20 border-t-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  if (!videoPreview) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="relative flex-1 flex items-center justify-center overflow-hidden">
          <video
            ref={liveVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
            <button
              type="button"
              onClick={() => router.replace('/')}
              className="w-11 h-11 glass rounded-full flex items-center justify-center"
            >
              <X size={22} color="white" />
            </button>
            {isRecording && (
              <div className="flex items-center gap-2 glass px-4 py-2 rounded-full">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white font-semibold text-sm">
                  {formatTime(recordingTime)} / {formatTime(MAX_RECORDING_SECONDS)}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={flipCamera}
              disabled={isRecording}
              className="w-11 h-11 glass rounded-full flex items-center justify-center disabled:opacity-40"
            >
              <SwitchCamera size={22} color="white" />
            </button>
          </div>
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-8 text-center">
              <Camera size={48} color="rgba(255,255,255,0.4)" />
              <p className="text-white/80 mt-4 mb-6 max-w-sm">{cameraError}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#D4AF37] text-black px-6 py-3 rounded-xl font-semibold"
              >
                Upload a video
              </button>
            </div>
          )}
          {!cameraError && (
            <div className="absolute bottom-0 left-0 right-0 pb-10 flex items-center justify-center gap-10">
              <button
                type="button"
                onClick={() => {
                  if (!isRecording) fileInputRef.current?.click();
                }}
                disabled={isRecording}
                className="flex flex-col items-center gap-1.5 disabled:opacity-40"
              >
                <span className="w-12 h-12 rounded-xl glass flex items-center justify-center">
                  <Upload size={22} color="white" />
                </span>
                <span className="text-white text-xs font-semibold">Upload</span>
              </button>
              <button
                type="button"
                onClick={isRecording ? () => stopRecording() : startRecording}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center"
              >
                {isRecording ? (
                  <span className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <Square size={16} color="white" fill="white" />
                  </span>
                ) : (
                  <span className="w-16 h-16 bg-red-500 rounded-full" />
                )}
              </button>
              <span className="w-12 opacity-0 pointer-events-none" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-50 glass-strong">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handleDiscard}
            disabled={isPosting}
            className="text-white text-base disabled:opacity-40"
          >
            Discard
          </button>
          <h1 className="text-white text-lg font-semibold">New Video</h1>
          <button
            type="button"
            onClick={handlePost}
            disabled={isPosting}
            className="text-[#D4AF37] text-base font-semibold disabled:opacity-50"
          >
            {isPosting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pb-24">
        <div className="relative bg-black aspect-[9/16] max-h-[55vh] mx-auto">
          <video
            ref={videoRef}
            src={videoPreview}
            className="w-full h-full object-contain"
            loop
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          <button
            type="button"
            onClick={() => {
              if (!videoRef.current) return;
              if (isPlaying) videoRef.current.pause();
              else videoRef.current.play();
            }}
            className="absolute inset-0 flex items-center justify-center bg-black/20"
          >
            {isPlaying ? (
              <Pause size={48} color="white" fill="white" opacity={0.7} />
            ) : (
              <Play size={48} color="white" fill="white" opacity={0.7} />
            )}
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption…"
            rows={3}
            className="w-full glass rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:border-[#D4AF37] resize-none"
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold flex items-center gap-2">
                <ShoppingBag size={18} color="#D4AF37" /> Tag products
              </p>
              <button
                type="button"
                onClick={openProductPicker}
                className="text-[#D4AF37] text-sm font-semibold flex items-center gap-1"
              >
                <Plus size={16} /> Add
              </button>
            </div>
            {taggedProducts.length === 0 ? (
              <button
                type="button"
                onClick={openProductPicker}
                className="w-full border border-dashed border-white/20 rounded-xl py-4 text-white/50 text-sm"
              >
                Tag products from your shop
              </button>
            ) : (
              <div className="space-y-2">
                {taggedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 glass rounded-xl"
                  >
                    {productImage(product) ? (
                      <img
                        src={productImage(product)}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/10" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.title}</p>
                      <CurrencyPrice
                        price={parseFloat(product.price) || 0}
                        originalCurrency="GHS"
                        showOriginal={false}
                        size="small"
                        textStyle={{ color: '#D4AF37', fontSize: '0.875rem', fontWeight: 'bold' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setTaggedProducts(taggedProducts.filter((p) => p.id !== product.id))
                      }
                      className="text-white/50"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showProductSearch && (
        <div className="fixed inset-0 z-50 bg-black">
          <div className="sticky top-0 z-50 glass-strong">
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
              <button type="button" onClick={() => setShowProductSearch(false)} className="text-white">
                <X size={24} />
              </button>
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your products…"
                  autoFocus
                  className="w-full glass text-white text-base pl-10 pr-4 py-2 rounded-lg outline-none placeholder:text-white/40"
                />
              </div>
            </div>
          </div>
          <div className="max-w-2xl mx-auto px-4 py-4">
            {loadingProducts ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/60 mb-4">
                  {myProducts.length === 0
                    ? 'No products in your shop yet.'
                    : 'No matching products.'}
                </p>
                {myProducts.length === 0 && (
                  <a
                    href="/create-listing"
                    className="inline-block bg-[#D4AF37] text-black px-6 py-3 rounded-xl font-semibold"
                  >
                    Create a listing
                  </a>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleAddProduct(product)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl glass text-left"
                  >
                    {productImage(product) ? (
                      <img
                        src={productImage(product)}
                        alt=""
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-white/10" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{product.title}</p>
                      <p className="text-[#D4AF37] text-sm font-bold">
                        GHS {parseFloat(product.price || 0).toFixed(2)}
                      </p>
                    </div>
                    <Plus size={20} className="text-white/50" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
