// @ts-nocheck
import { useCallback, useEffect, useState } from 'react';
import { authenticatedFetch } from '../utils/authenticatedFetch';

const DEFAULTS = {
  enable_store_pickup: false,
  pickup_instructions: '',
  pickup_hours: '',
  enable_own_delivery_zones: true,
  allow_on_demand_deliverers: false,
};

/** Loads and saves which ways a seller hands orders over to buyers. */
export default function useFulfillmentSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch('/api/sellers/fulfillment-settings');
      if (!response.ok) {
        throw new Error(
          `When loading fulfillment settings the response was [${response.status}] ${response.statusText}`
        );
      }
      const data = await response.json();
      setSettings({ ...DEFAULTS, ...(data.settings || {}) });
    } catch (err) {
      console.error('Failed to load fulfillment settings:', err);
      setError('Could not load your delivery setup');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await authenticatedFetch('/api/sellers/fulfillment-settings', {
        method: 'POST',
        body: JSON.stringify({
          enableStorePickup: settings.enable_store_pickup,
          pickupInstructions: settings.pickup_instructions,
          pickupHours: settings.pickup_hours,
          enableOwnDeliveryZones: settings.enable_own_delivery_zones,
          allowOnDemandDeliverers: settings.allow_on_demand_deliverers,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = data?.error || 'Could not save your delivery setup';
        setError(message);
        return { ok: false, error: message, code: data?.code };
      }

      setSettings({ ...DEFAULTS, ...(data.settings || {}) });
      return { ok: true };
    } catch (err) {
      console.error('Failed to save fulfillment settings:', err);
      const message = 'Could not save your delivery setup';
      setError(message);
      return { ok: false, error: message };
    } finally {
      setSaving(false);
    }
  }, [settings]);

  return { settings, loading, saving, error, update, save, refetch: load };
}
