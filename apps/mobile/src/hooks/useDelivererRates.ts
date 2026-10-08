// @ts-nocheck
import { useCallback, useEffect, useState } from 'react';
import { authenticatedFetch } from '../utils/authenticatedFetch';

/** A deliverer's own price list — they decide what every trip costs. */
export default function useDelivererRates() {
  const [rateCards, setRateCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch('/api/deliverers/rates');
      if (!response.ok) {
        throw new Error(
          `When loading your rates the response was [${response.status}] ${response.statusText}`
        );
      }
      const data = await response.json();
      setRateCards(data.rateCards || []);
    } catch (err) {
      console.error('Failed to load deliverer rates:', err);
      setError('Could not load your rates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createRate = useCallback(
    async (payload) => {
      setSaving(true);
      try {
        const response = await authenticatedFetch('/api/deliverers/rates', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return { ok: false, error: data?.error || 'Could not save this rate' };
        }
        await load();
        return { ok: true, rateCard: data.rateCard };
      } catch (err) {
        console.error('Failed to create rate:', err);
        return { ok: false, error: 'Could not save this rate' };
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  const updateRate = useCallback(
    async (id, patch) => {
      setSaving(true);
      try {
        const response = await authenticatedFetch(`/api/deliverers/rates/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return { ok: false, error: data?.error || 'Could not update this rate' };
        }
        await load();
        return { ok: true, rateCard: data.rateCard };
      } catch (err) {
        console.error('Failed to update rate:', err);
        return { ok: false, error: 'Could not update this rate' };
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  const deleteRate = useCallback(
    async (id) => {
      setSaving(true);
      try {
        const response = await authenticatedFetch(`/api/deliverers/rates/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          return { ok: false, error: 'Could not delete this rate' };
        }
        await load();
        return { ok: true };
      } catch (err) {
        console.error('Failed to delete rate:', err);
        return { ok: false, error: 'Could not delete this rate' };
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  return {
    rateCards,
    loading,
    saving,
    error,
    createRate,
    updateRate,
    deleteRate,
    refetch: load,
  };
}
