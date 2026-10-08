// @ts-nocheck
import { useState, useRef } from "react";

export function useSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({
    products: [],
    services: [],
    users: [],
    videos: [], // NEW: Add videos array
  });
  const [searching, setSearching] = useState(false);
  const [searchTab, setSearchTab] = useState("all");
  const searchTimeoutRef = useRef(null);

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!text.trim()) {
      setSearchResults({ products: [], services: [], users: [], videos: [] });
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(text.trim())}&type=${searchTab}`,
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (e) {
        console.error("Search error:", e);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults({ products: [], services: [], users: [], videos: [] });
  };

  return {
    searchQuery,
    searchResults,
    searching,
    searchTab,
    setSearchTab,
    handleSearch,
    clearSearch,
  };
}
