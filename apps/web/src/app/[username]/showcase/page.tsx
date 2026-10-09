// @ts-nocheck
"use client";
import { useState, useEffect } from "react";

export default function CreatorShowcasePage({ params }) {
  const rawUsername = params?.username || "";
  const username = rawUsername.replace("@", "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showcaseUrl, setShowcaseUrl] = useState(
    `https://crestarhq.com/@${username}/showcase`,
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShowcaseUrl(window.location.href);
    }
    if (username) fetchShowcase();
  }, [username]);

  const fetchShowcase = async () => {
    try {
      const res = await fetch(
        `/api/creator/showcase?username=${encodeURIComponent(username)}`,
      );
      if (!res.ok) throw new Error("Not found");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError("This showcase couldn't be found.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(showcaseUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    }
  };

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: `@${username}'s Showcase`,
        text: `Shop picks curated by @${username} on Crestar! 🛍️`,
        url: showcaseUrl,
      });
    } else {
      handleCopyLink();
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: "2px solid #FF3B5C",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
            Loading showcase...
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🛍️</div>
          <h1
            style={{
              color: "#fff",
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Showcase not found
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
            {error || "This creator doesn't exist"}
          </p>
        </div>
      </div>
    );
  }

  const { creator, products } = data;
  const avatarLetter = (creator.display_name ||
    creator.username ||
    "C")[0].toUpperCase();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        fontFamily: "-apple-system, sans-serif",
      }}
    >
      {/* Hero */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(255,59,92,0.3) 0%, rgba(212, 175, 55,0.2) 60%, transparent 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: "64px 20px 40px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #FF3B5C, #D4AF37)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
              fontWeight: 800,
              marginBottom: 16,
              border: "3px solid rgba(255,255,255,0.2)",
            }}
          >
            {creator.profile_image ? (
              <img
                src={creator.profile_image}
                alt={creator.username}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              avatarLetter
            )}
          </div>

          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              margin: 0,
              marginBottom: 4,
            }}
          >
            {creator.display_name || `@${creator.username}`}
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 13,
              margin: "0 0 8px",
            }}
          >
            @{creator.username}
          </p>
          {creator.bio && (
            <p
              style={{
                color: "rgba(255,255,255,0.65)",
                fontSize: 13,
                textAlign: "center",
                maxWidth: 280,
                margin: "0 0 20px",
                lineHeight: 1.5,
              }}
            >
              {creator.bio}
            </p>
          )}

          {/* Creator badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,59,92,0.15)",
              border: "1px solid rgba(255,59,92,0.3)",
              borderRadius: 100,
              padding: "8px 18px",
              marginBottom: 24,
            }}
          >
            <span>🎬</span>
            <span style={{ color: "#FF3B5C", fontSize: 13, fontWeight: 600 }}>
              Creator Showcase
            </span>
          </div>

          {/* Action buttons */}
          <div
            style={{ display: "flex", gap: 10, width: "100%", maxWidth: 360 }}
          >
            <button
              onClick={handleCopyLink}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 14,
                padding: "13px 0",
                cursor: "pointer",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                transition: "all 0.2s",
              }}
            >
              {copiedLink ? "✅ Copied!" : "🔗 Copy Link"}
            </button>
            <button
              onClick={handleShare}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "#FF3B5C",
                border: "none",
                borderRadius: 14,
                padding: "13px 0",
                cursor: "pointer",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                transition: "all 0.2s",
              }}
            >
              📤 Share
            </button>
          </div>
        </div>
      </div>

      {/* Products */}
      <div style={{ padding: "0 16px 80px", maxWidth: 680, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
            {products.length > 0 ? `${products.length} Products` : "Products"}
          </h2>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
            Tap to shop
          </span>
        </div>

        {products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>📦</div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
              No products tagged yet
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            {products.map((product) => {
              const media = Array.isArray(product.media)
                ? product.media
                : (() => {
                    try {
                      return JSON.parse(product.media || "[]");
                    } catch {
                      return [];
                    }
                  })();
              const image = media[0];
              const price = parseFloat(product.price || 0).toFixed(2);
              const currency = product.seller_currency || "GHS";

              return (
                <a
                  key={product.id}
                  href={`/product/${product.id}`}
                  style={{
                    display: "block",
                    textDecoration: "none",
                    color: "inherit",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: 16,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.1)",
                    transition: "border-color 0.2s, transform 0.2s",
                  }}
                >
                  {/* Image */}
                  <div
                    style={{
                      aspectRatio: "1",
                      background: "rgba(255,255,255,0.08)",
                      overflow: "hidden",
                    }}
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={product.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 40,
                        }}
                      >
                        🛍️
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: "12px" }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        margin: "0 0 8px",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {product.title}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 800 }}>
                        {currency} {price}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          background: "#FF3B5C",
                          color: "#fff",
                          borderRadius: 100,
                          padding: "3px 10px",
                          fontWeight: 700,
                        }}
                      >
                        Buy
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* Branding footer */}
        <div
          style={{
            marginTop: 64,
            textAlign: "center",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 32,
          }}
        >
          <p
            style={{
              color: "rgba(255,255,255,0.25)",
              fontSize: 12,
              marginBottom: 6,
            }}
          >
            Powered by
          </p>
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 2,
              margin: 0,
            }}
          >
            CRESTAR
          </p>
          <p
            style={{
              color: "rgba(255,255,255,0.25)",
              fontSize: 11,
              marginTop: 4,
            }}
          >
            Shop. Create. Earn.
          </p>
        </div>
      </div>
    </div>
  );
}
