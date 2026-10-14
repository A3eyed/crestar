// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import useUser from "@/utils/useUser";
import useLocalization from "@/utils/useLocalization";

const BRAND = "#D4AF37";
const INACTIVE = "#9CA3AF";

export default function BottomNav() {
  const [currentPath, setCurrentPath] = useState("");
  const { data: user } = useUser();
  const { t } = useLocalization();

  useEffect(() => {
    setCurrentPath(window.location.pathname || "/");
  }, []);

  const profilePath = user ? "/profile" : "/account/signin";
  const profileLabel = user ? t("profile") : t("signIn");

  const isActive = (path) => {
    if (!currentPath) return false;
    if (path === "/") return currentPath === "/";
    return currentPath === path || currentPath.startsWith(`${path}/`);
  };

  const items = [
    { id: "feed", label: t("home"), path: "/", icon: HomeIcon },
    { id: "shop", label: t("shop"), path: "/shop", icon: ShopIcon },
    { id: "create", label: t("create"), path: "/create", isCenter: true },
    { id: "foodhub", label: t("foodhub"), path: "/foodhub", icon: FoodIcon },
    {
      id: "profile",
      label: profileLabel,
      path: profilePath,
      icon: ProfileIcon,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-16 max-w-2xl items-end justify-around px-1">
        {items.map((item) => {
          const active = isActive(item.path);
          const color = active ? BRAND : INACTIVE;

          if (item.isCenter) {
            return (
              <a
                key={item.id}
                href={item.path}
                aria-label={item.label}
                className="flex flex-1 flex-col items-center justify-end pb-1"
              >
                <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-full border-4 border-black bg-[#D4AF37] shadow-lg">
                  <svg
                    className="h-7 w-7 text-black"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
              </a>
            );
          }

          const Icon = item.icon;
          return (
            <a
              key={item.id}
              href={item.path}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2"
            >
              <Icon color={color} />
              <span className="text-[11px] font-semibold" style={{ color }}>
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon({ color }) {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke={color}
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}

function ShopIcon({ color }) {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke={color}
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
      />
    </svg>
  );
}

function FoodIcon({ color }) {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke={color}
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
      />
    </svg>
  );
}

function ProfileIcon({ color }) {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke={color}
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}
