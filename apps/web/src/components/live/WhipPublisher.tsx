// @ts-nocheck
"use client";
/**
 * Browser camera → Cloudflare Stream via WHIP (no extra SDK).
 * https://developers.cloudflare.com/stream/examples/browser-based-webrtc/
 */
import { useEffect, useRef, useState } from "react";

export default function WhipPublisher({
  whipUrl,
  micEnabled = true,
  videoEnabled = true,
  onStatus,
}) {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!whipUrl) {
      setError("No WHIP publish URL — set CLOUDFLARE_API_TOKEN with Stream Write");
      onStatus?.("missing_url");
      return;
    }

    let cancelled = false;

    async function start() {
      try {
        onStatus?.("requesting_media");
        const media = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true,
        });
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = media;
        if (videoRef.current) {
          videoRef.current.srcObject = media;
        }

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
          bundlePolicy: "max-bundle",
        });
        pcRef.current = pc;

        media.getTracks().forEach((track) => {
          pc.addTrack(track, media);
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Wait briefly for ICE candidates (non-trickle WHIP)
        await new Promise((r) => setTimeout(r, 500));

        onStatus?.("connecting");
        const res = await fetch(whipUrl, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: pc.localDescription.sdp,
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`WHIP ${res.status}: ${text.slice(0, 120)}`);
        }
        const answerSdp = await res.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

        if (!cancelled) {
          setLive(true);
          setError("");
          onStatus?.("live");
        }
      } catch (err) {
        console.error("[WHIP]", err);
        if (!cancelled) {
          setError(err.message || "Camera / stream failed");
          onStatus?.("error");
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      pcRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current = null;
      streamRef.current = null;
    };
  }, [whipUrl]);

  useEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = micEnabled;
    });
    stream.getVideoTracks().forEach((t) => {
      t.enabled = videoEnabled;
    });
  }, [micEnabled, videoEnabled]);

  return (
    <div className="absolute inset-0 bg-black">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover mirror"
        style={{ transform: "scaleX(-1)" }}
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6">
          <p className="text-center text-sm text-red-300 max-w-sm">{error}</p>
        </div>
      )}
      {live && !error && (
        <div className="absolute top-16 left-4 text-[10px] uppercase tracking-wider text-white/50">
          Broadcasting via Cloudflare Stream
        </div>
      )}
    </div>
  );
}
