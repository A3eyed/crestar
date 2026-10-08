// @ts-nocheck
import { useState, useEffect } from "react";

export function useLiveSessions() {
  const [liveSessions, setLiveSessions] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLiveSessions = async () => {
      try {
        const res = await fetch("/api/live/sessions");

        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Server returned unexpected response format");
        }

        const data = await res.json();
        setLiveSessions(data.sessions || []);
        setError(null);
      } catch (err) {
        setError(err.message);
        setLiveSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveSessions();
    const interval = setInterval(fetchLiveSessions, 60000);
    return () => clearInterval(interval);
  }, []);

  return { liveSessions, loading, error };
}
