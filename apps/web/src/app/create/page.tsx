// @ts-nocheck
'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import useUser from '@/utils/useUser';
import useUpload from '@/utils/useUpload';
import CurrencyPrice from '@/components/CurrencyPrice';
import {
  X,
  Upload,
  Video,
  Camera,
  Play,
  Pause,
  RotateCcw,
  ShoppingBag,
  Plus,
  Search,
  SwitchCamera,
  Square,
} from 'lucide-react';

const MAX_RECORDING_SECONDS = 60;

export default function CreatePage() {
  const { data: user, loading: userLoading } = useUser();
  const [upload, { loading: uploading }] = useUpload();

  const [selectedFile, setSelectedFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [taggedProducts, setTaggedProducts] = useState([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  // ── Camera recording state ──
  const [showCamera, setShowCamera] = useState(false);
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
  const hasAutoOpenedCameraRef = useRef(false);

  useEffect(() => {
    if (!userLoading && !user) {
      window.location.href = '/account/signin?callbackUrl=/create';
    }
  }, [user, userLoading]);

  // ── Camera helpers ──
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
            width: { ideal: 1080 },
            height: { ideal: 1920 },
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
        setCameraError(
          'Could not access your camera. Please allow camera and microphone permissions, or upload a video instead.'
        );
      }
    },
    [facingMode, stopStream]
  );

  const openCamera = async () => {
    setShowCamera(true);
    // Start after the modal mounts so the video element exists
    setTimeout(() => startCamera(), 50);
  };

  // ── Camera-first flow (matches the mobile app): open the camera
  // immediately when the page loads, with record + upload options ──
  useEffect(() => {
    if (userLoading || !user) return;
    if (videoPreview || hasAutoOpenedCameraRef.current) return;
    hasAutoOpenedCameraRef.current = true;
    openCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading, videoPreview]);

  const closeCamera = () => {
    if (isRecording) stopRecording(true);
    stopStream();
    setShowCamera(false);
    setRecordingTime(0);
  };

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

    // Pick a supported mime type (Safari uses mp4, Chrome/Firefox webm)
    let mimeType = '';
    const candidates = [
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    for (const c of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(c)) {
        mimeType = c;
        break;
      }
    }

    try {
      const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const type = mimeType || 'video/webm';
        const ext = type.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size === 0) return;
        const file = new File([blob], `recording_${blob.size}.${ext}`, { type });
        setSelectedFile(file);
        setVideoPreview(URL.createObjectURL(blob));
        stopStream();
        setShowCamera(false);
        setRecordingTime(0);
      };

      recorder.start(250);
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
      console.error('Recorder error:', err);
      setCameraError('Recording is not supported in this browser. Please upload a video instead.');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stopStream]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('Please select a video file');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
  };

  const handleDiscard = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setSelectedFile(null);
    setVideoPreview(null);
    setCaption('');
    setTaggedProducts([]);
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProductSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=products&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.products || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddProduct = (product) => {
    if (taggedProducts.find((p) => p.id === product.id)) {
      alert('Product already tagged');
      return;
    }
    setTaggedProducts([...taggedProducts, product]);
    setShowProductSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveProduct = (productId) => {
    setTaggedProducts(taggedProducts.filter((p) => p.id !== productId));
  };

  const handlePost = async () => {
    if (!selectedFile) return;

    // ── REQUIRED: at least one product must be tagged before posting ──
    if (taggedProducts.length === 0) {
      alert(
        'Every video must showcase at least one product. Tap "Add Product" to tag one before posting.'
      );
      return;
    }

    setIsPosting(true);
    try {
      // Upload video
      const { url: videoUrl, error: uploadError } = await upload({
        file: selectedFile,
      });

      if (uploadError) {
        alert('Video upload failed: ' + uploadError);
        setIsPosting(false);
        return;
      }

      // Create video post — same payload shape as the mobile app
      const response = await fetch('/api/videos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl,
          thumbnailUrl: null,
          caption,
          durationSeconds: null,
          taggedProducts: taggedProducts.map((p) => ({
            productId: p.id,
            serviceId: null,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to post video');
      }

      alert('Video posted successfully!');
      window.location.href = '/profile';
    } catch (error) {
      console.error('Post error:', error);
      alert(error.message);
    } finally {
      setIsPosting(false);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!videoPreview) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-black border-b border-white/10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => window.history.back()}
              className="hover:opacity-70 transition-opacity"
            >
              <X size={24} color="white" />
            </button>
            <h1 className="text-white text-lg font-semibold">Create Video</h1>
            <div className="w-6"></div>
          </div>
        </div>

        {/* Upload Options */}
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Video size={80} color="rgba(255,255,255,0.2)" />
            <h2 className="text-white text-2xl font-bold mt-6 mb-2">Create a video</h2>
            <p className="text-white/60 text-base text-center mb-8 max-w-md">
              Record with your camera or upload a video to share with the Crestar community
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={openCamera}
                className="flex items-center justify-center gap-3 bg-[#D4AF37] text-black px-8 py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity"
              >
                <Camera size={24} />
                Record Video
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-3 bg-white/10 border border-white/20 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-colors"
              >
                <Upload size={24} />
                Upload Video
              </button>
            </div>

            <div className="mt-12 w-full max-w-md space-y-4">
              <div className="flex items-start gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                <Video size={20} color="#D4AF37" className="mt-0.5" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Shoppable Videos</h3>
                  <p className="text-white/60 text-sm">
                    Tag products in your videos to drive sales
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                <ShoppingBag size={20} color="#D4AF37" className="mt-0.5" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Earn Commissions</h3>
                  <p className="text-white/60 text-sm">
                    Earn the seller-set commission on every sale driven by your videos
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════ CAMERA RECORDING MODAL (TikTok-style) ══════ */}
        {showCamera && (
          <div className="fixed inset-0 z-[60] bg-black flex flex-col">
            {/* Live preview */}
            <div className="relative flex-1 flex items-center justify-center overflow-hidden">
              <video
                ref={liveVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                }}
              />

              {/* Top bar */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
                <button
                  onClick={closeCamera}
                  className="w-11 h-11 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70"
                >
                  <X size={22} color="white" />
                </button>

                {isRecording && (
                  <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full">
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-red-500"
                      style={{ animation: 'rec-blink 1s infinite' }}
                    />
                    <span className="text-white font-semibold text-sm">
                      {formatTime(recordingTime)} / {formatTime(MAX_RECORDING_SECONDS)}
                    </span>
                  </div>
                )}

                <button
                  onClick={flipCamera}
                  disabled={isRecording}
                  className="w-11 h-11 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 disabled:opacity-40"
                >
                  <SwitchCamera size={22} color="white" />
                </button>
              </div>

              {/* Camera error */}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-8 text-center">
                  <Camera size={48} color="rgba(255,255,255,0.4)" />
                  <p className="text-white/80 mt-4 mb-6 max-w-sm">{cameraError}</p>
                  <button
                    onClick={() => {
                      closeCamera();
                      fileInputRef.current?.click();
                    }}
                    className="bg-[#D4AF37] text-black px-6 py-3 rounded-xl font-semibold"
                  >
                    Upload a video instead
                  </button>
                </div>
              )}

              {/* Bottom controls — record OR upload, like the mobile app */}
              {!cameraError && (
                <div className="absolute bottom-0 left-0 right-0 pb-10 flex items-center justify-center gap-10">
                  {/* Upload option */}
                  <button
                    onClick={() => {
                      if (isRecording) return;
                      fileInputRef.current?.click();
                    }}
                    disabled={isRecording}
                    className="flex flex-col items-center gap-1.5 disabled:opacity-40"
                  >
                    <span className="w-12 h-12 rounded-xl bg-white/15 border border-white/30 flex items-center justify-center backdrop-blur-sm">
                      <Upload size={22} color="white" />
                    </span>
                    <span className="text-white text-xs font-semibold">Upload</span>
                  </button>

                  {/* Record button */}
                  <button
                    onClick={isRecording ? () => stopRecording() : startRecording}
                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    {isRecording ? (
                      <span className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                        <Square size={16} color="white" fill="white" />
                      </span>
                    ) : (
                      <span className="w-16 h-16 bg-red-500 rounded-full" />
                    )}
                  </button>

                  {/* Spacer to keep record button centered */}
                  <span className="w-12 flex flex-col items-center gap-1.5 opacity-0 pointer-events-none">
                    <span className="w-12 h-12" />
                    <span className="text-xs">Upload</span>
                  </span>
                </div>
              )}
            </div>

            <style jsx global>{`
              @keyframes rec-blink {
                0%,
                100% {
                  opacity: 1;
                }
                50% {
                  opacity: 0.3;
                }
              }
            `}</style>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleDiscard}
            className="text-white text-base hover:opacity-70 transition-opacity"
          >
            Discard
          </button>
          <h1 className="text-white text-lg font-semibold">New Video</h1>
          <button
            onClick={handlePost}
            disabled={isPosting}
            className="text-[#D4AF37] text-base font-semibold hover:opacity-70 transition-opacity disabled:opacity-50"
          >
            {isPosting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pb-24">
        {/* Video Preview */}
        <div className="relative bg-black aspect-[9/16] max-h-[70vh] mx-auto">
          <video
            ref={videoRef}
            src={videoPreview}
            className="w-full h-full object-contain"
            loop
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Play/Pause Overlay */}
          <button
            onClick={togglePlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
          >
            {isPlaying ? (
              <Pause size={64} color="white" fill="white" opacity={0.8} />
            ) : (
              <Play size={64} color="white" fill="white" opacity={0.8} />
            )}
          </button>

          {/* Retake Button */}
          <button
            onClick={handleDiscard}
            className="absolute top-4 right-4 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            <RotateCcw size={20} color="white" />
          </button>
        </div>

        {/* Caption */}
        <div className="px-4 py-4 border-b border-white/10">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            maxLength={200}
            rows={3}
            className="w-full bg-transparent text-white text-base outline-none resize-none placeholder:text-white/40"
          />
          <p className="text-white/40 text-xs text-right mt-1">{caption.length}/200</p>
        </div>

        {/* Tagged Products */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-base">Tagged Products</h3>
            <button
              onClick={() => setShowProductSearch(true)}
              className="flex items-center gap-2 text-[#D4AF37] text-sm font-semibold hover:opacity-70 transition-opacity"
            >
              <Plus size={18} />
              Add Product
            </button>
          </div>

          {taggedProducts.length === 0 ? (
            <p className="text-white/40 text-sm">
              Tagging at least one product is required to post. Add a product to make your video
              shoppable!
            </p>
          ) : (
            <div className="space-y-2">
              {taggedProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  {product.media?.[0] && (
                    <img
                      src={product.media[0]}
                      alt=""
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{product.title}</p>
                    <CurrencyPrice
                      price={parseFloat(product.price)}
                      originalCurrency={product.seller_currency || 'GHS'}
                      showOriginal={false}
                      size="small"
                      textStyle={{
                        color: '#D4AF37',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                      }}
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveProduct(product.id)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Search Modal */}
      {showProductSearch && (
        <div className="fixed inset-0 z-50 bg-black">
          <div className="sticky top-0 z-50 bg-black border-b border-white/10">
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => {
                  setShowProductSearch(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="hover:opacity-70 transition-opacity"
              >
                <X size={24} color="white" />
              </button>
              <div className="flex-1 relative">
                <Search
                  size={18}
                  color="rgba(255,255,255,0.4)"
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleProductSearch(e.target.value)}
                  placeholder="Search your products..."
                  autoFocus
                  className="w-full bg-white/10 text-white text-base pl-10 pr-4 py-2 rounded-lg outline-none placeholder:text-white/40"
                />
              </div>
            </div>
          </div>

          <div className="max-w-2xl mx-auto px-4 py-4">
            {searching && (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
            )}

            {!searching && searchResults.length === 0 && searchQuery && (
              <p className="text-white/60 text-center py-8">No products found</p>
            )}

            <div className="space-y-2">
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleAddProduct(product)}
                  className="w-full flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                >
                  {product.media?.[0] && (
                    <img
                      src={product.media[0]}
                      alt=""
                      className="w-14 h-14 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-white text-sm font-medium truncate">{product.title}</p>
                    <CurrencyPrice
                      price={parseFloat(product.price)}
                      originalCurrency={product.seller_currency || 'GHS'}
                      showOriginal={false}
                      size="small"
                      textStyle={{
                        color: '#D4AF37',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                      }}
                    />
                  </div>
                  <Plus size={20} color="white" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
