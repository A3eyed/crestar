// @ts-nocheck
"use client";
/**
 * Viewer player: try WHEP (sub-second), fall back to HLS (stream_url).
 */
import { useEffect, useRef, useState } from "react";

export default function StreamPlayer({ whepUrl, hlsUrl, poster }) {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const [mode, setMode] = useState("loading"); // loading | whep | hls | idle
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const video = videoRef.current;

    async function tryWhep() {
      if (!whepUrl || !video) return false;
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
          bundlePolicy: "max-bundle",
        });
        pcRef.current = pc;
        pc.addTransceiver("video", { direction: "recvonly" });
        pc.addTransceiver("audio", { direction: "recvonly" });
        pc.ontrack = (ev) => {
          if (video.srcObject !== ev.streams[0]) {
            video.srcObject = ev.streams[0];
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await new Promise((r) => setTimeout(r, 400));

        const res = await fetch(whepUrl, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: pc.localDescription.sdp,
        });
        if (!res.ok) throw new Error(`WHEP ${res.status}`);
        const answer = await res.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answer });
        if (!cancelled) setMode("whep");
        return true;
      } catch (err) {
        console.warn("[WHEP] fallback to HLS:", err.message);
        pcRef.current?.close();
        pcRef.current = null;
        return false;
      }
    }

    async function tryHls() {
      if (!hlsUrl || !video) return false;
      try {
        // Native HLS (Safari / iOS)
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.srcObject = null;
          video.src = hlsUrl;
          await video.play().catch(() => {});
          if (!cancelled) setMode("hls");
          return true;
        }
        // hls.js if present on window (optional)
        if (typeof window !== "undefined" && window.Hls?.isSupported?.()) {
          const hls = new window.Hls({ enableWorker: true, lowLatencyMode: true });
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
          if (!cancelled) setMode("hls");
          return true;
        }
        // Last resort: set src anyway
        video.src = hlsUrl;
        if (!cancelled) setMode("hls");
        return true;
      } catch (err) {
        console.warn("[HLS]", err.message);
        return false;
      }
    }

    (async () => {
      const okWhep = await tryWhep();
      if (cancelled) return;
      if (okWhep) return;
      const okHls = await tryHls();
      if (cancelled) return;
      if (!okHls) {
        setMode("idle");
        setError("Waiting for host to start broadcasting…");
      }
    })();

    return () => {
      cancelled = true;
      pcRef.current?.close();
      pcRef.current = null;
      if (video) {
        video.srcObject = null;
        video.removeAttribute("src");
      }
    };
  }, [whepUrl, hlsUrl]);

  return (
    <div className="absolute inset-0 bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        poster={poster || undefined}
        className="w-full h-full object-cover"
      />
      {(mode === "loading" || mode === "idle") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/40 pointer-events-none">
          <div className="w-16 h-16 border-2 border-white/20 border-t-white/80 rounded-full animate-spin mb-4" />
          <p className="text-sm text-white/70">{error || "Connecting to live…"}</p>
        </div>
      )}
      {mode === "whep" && (
        <div className="absolute bottom-32 left-3 text-[10px] text-white/40">Low-latency</div>
      )}
    </div>
  );
}
