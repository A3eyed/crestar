// @ts-nocheck
'use client';

import { useCallback, useEffect, useState } from 'react';
import { MapPin, Plus, Trash2, Truck } from 'lucide-react';

const emptyZoneForm = () => ({
  country: 'GH',
  regionName: '',
  cityName: '',
  deliveryFee: '',
  isFreeDelivery: false,
  estimatedTime: '',
  currency: 'GHS',
});

export default function SellerDeliverySettings() {
  const [loading, setLoading] = useState(true);
  const [savingMethods, setSavingMethods] = useState(false);
  const [savingZone, setSavingZone] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [enableStorePickup, setEnableStorePickup] = useState(false);
  const [pickupInstructions, setPickupInstructions] = useState('');
  const [pickupHours, setPickupHours] = useState('');
  const [enableOwnDeliveryZones, setEnableOwnDeliveryZones] = useState(true);
  const [allowOnDemandDeliverers, setAllowOnDemandDeliverers] = useState(false);

  const [storeLocation, setStoreLocation] = useState(null);
  const [zones, setZones] = useState([]);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [zoneForm, setZoneForm] = useState(emptyZoneForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsRes, zonesRes, locationRes] = await Promise.all([
        fetch('/api/sellers/fulfillment-settings'),
        fetch('/api/sellers/delivery-zones'),
        fetch('/api/sellers/store-location'),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        const s = data.settings || {};
        setEnableStorePickup(Boolean(s.enable_store_pickup));
        setPickupInstructions(s.pickup_instructions || '');
        setPickupHours(s.pickup_hours || '');
        setEnableOwnDeliveryZones(
          s.enable_own_delivery_zones !== undefined
            ? Boolean(s.enable_own_delivery_zones)
            : true,
        );
        setAllowOnDemandDeliverers(Boolean(s.allow_on_demand_deliverers));
      }

      if (zonesRes.ok) {
        const data = await zonesRes.json();
        setZones(Array.isArray(data.zones) ? data.zones : []);
      }

      if (locationRes.ok) {
        const data = await locationRes.json();
        setStoreLocation(data.location || null);
      }
    } catch (e) {
      console.error(e);
      setError('Could not load delivery settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3500);
  };

  const saveMethods = async () => {
    setSavingMethods(true);
    setError(null);
    try {
      const res = await fetch('/api/sellers/fulfillment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enableStorePickup,
          pickupInstructions: pickupInstructions.trim() || null,
          pickupHours: pickupHours.trim() || null,
          enableOwnDeliveryZones,
          allowOnDemandDeliverers,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to save delivery methods');
        return;
      }
      flash('Delivery methods saved');
    } catch (e) {
      console.error(e);
      setError('Failed to save delivery methods');
    } finally {
      setSavingMethods(false);
    }
  };

  const addZone = async () => {
    const regionName = zoneForm.regionName.trim();
    const cityName = zoneForm.cityName.trim();
    if (!regionName && !cityName) {
      setError('Add at least a region or a town/city for this zone');
      return;
    }

    const fee = zoneForm.isFreeDelivery ? 0 : parseFloat(zoneForm.deliveryFee);
    if (!zoneForm.isFreeDelivery && (!Number.isFinite(fee) || fee < 0)) {
      setError('Enter a valid delivery fee');
      return;
    }

    setSavingZone(true);
    setError(null);
    try {
      // API replaces the full zone list on POST — merge existing + new
      const nextZones = [
        ...zones.map((z) => ({
          country: z.country || 'GH',
          regionName: z.region_name || '',
          cityName: z.city_name || '',
          deliveryFee: z.is_free_delivery ? 0 : Number(z.delivery_fee) || 0,
          isFreeDelivery: Boolean(z.is_free_delivery),
          estimatedTime: z.estimated_time || null,
          currency: z.currency || 'GHS',
        })),
        {
          country: (zoneForm.country || 'GH').trim() || 'GH',
          regionName,
          cityName,
          deliveryFee: zoneForm.isFreeDelivery ? 0 : fee,
          isFreeDelivery: Boolean(zoneForm.isFreeDelivery),
          estimatedTime: zoneForm.estimatedTime.trim() || null,
          currency: zoneForm.currency || 'GHS',
        },
      ];

      const res = await fetch('/api/sellers/delivery-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zones: nextZones }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to save delivery zone');
        return;
      }
      setZones(Array.isArray(data.zones) ? data.zones : []);
      setZoneForm(emptyZoneForm());
      setShowZoneForm(false);
      if (!enableOwnDeliveryZones) {
        setEnableOwnDeliveryZones(true);
      }
      flash('Delivery zone saved');
    } catch (e) {
      console.error(e);
      setError('Failed to save delivery zone');
    } finally {
      setSavingZone(false);
    }
  };

  const removeZone = async (zoneId) => {
    if (!window.confirm('Remove this delivery zone?')) return;
    setError(null);
    try {
      const res = await fetch('/api/sellers/delivery-zones', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to remove zone');
        return;
      }
      setZones((prev) => prev.filter((z) => z.id !== zoneId));
      flash('Zone removed');
    } catch (e) {
      console.error(e);
      setError('Failed to remove zone');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 border-4 border-white/20 border-t-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }

  const storeLabel = storeLocation
    ? [storeLocation.city, storeLocation.region, storeLocation.country]
        .filter(Boolean)
        .join(', ')
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1">Delivery</h2>
        <p className="text-white/50 text-sm">
          Choose how buyers receive orders and set your own delivery fees by town or region.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-3 text-sm text-[#D4AF37]">
          {success}
        </div>
      )}

      {/* Methods */}
      <section className="glass border border-white/10 rounded-2xl p-4 space-y-4">
        <h3 className="font-bold text-sm text-white/80 uppercase tracking-wide">
          Delivery methods
        </h3>

        <label className="flex items-start justify-between gap-4 cursor-pointer">
          <div>
            <p className="font-semibold text-sm">Store pickup</p>
            <p className="text-white/45 text-xs mt-0.5">
              Buyers collect from your shop. Always free.
            </p>
          </div>
          <input
            type="checkbox"
            checked={enableStorePickup}
            onChange={(e) => setEnableStorePickup(e.target.checked)}
            className="mt-1 w-5 h-5 accent-[#D4AF37]"
          />
        </label>

        {enableStorePickup && (
          <div className="space-y-3 pl-0 sm:pl-1 border-t border-white/10 pt-3">
            <div className="flex items-start gap-2 text-xs text-white/50">
              <MapPin size={14} className="mt-0.5 shrink-0 text-[#D4AF37]" />
              <div>
                {storeLabel ? (
                  <p>
                    Store location: <span className="text-white/80">{storeLabel}</span>
                    {storeLocation?.store_landmark
                      ? ` · ${storeLocation.store_landmark}`
                      : ''}
                  </p>
                ) : (
                  <p className="text-amber-300/90">
                    Add your store town/city first — required for pickup.{' '}
                    <a href="/edit-profile" className="underline text-[#D4AF37]">
                      Edit profile
                    </a>
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">Pickup hours</label>
              <input
                type="text"
                value={pickupHours}
                onChange={(e) => setPickupHours(e.target.value)}
                placeholder="e.g. Mon–Sat 9am–6pm"
                className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]/50"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">Pickup instructions</label>
              <textarea
                value={pickupInstructions}
                onChange={(e) => setPickupInstructions(e.target.value)}
                placeholder="e.g. Ask for the Crestar counter at the main gate"
                rows={2}
                className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]/50 resize-none"
              />
            </div>
          </div>
        )}

        <label className="flex items-start justify-between gap-4 cursor-pointer border-t border-white/10 pt-4">
          <div>
            <p className="font-semibold text-sm">Your own delivery</p>
            <p className="text-white/45 text-xs mt-0.5">
              You deliver and set fees by town or region below.
            </p>
          </div>
          <input
            type="checkbox"
            checked={enableOwnDeliveryZones}
            onChange={(e) => setEnableOwnDeliveryZones(e.target.checked)}
            className="mt-1 w-5 h-5 accent-[#D4AF37]"
          />
        </label>

        <label className="flex items-start justify-between gap-4 cursor-pointer border-t border-white/10 pt-4">
          <div>
            <p className="font-semibold text-sm">On-demand Crestar deliverers</p>
            <p className="text-white/45 text-xs mt-0.5">
              Let approved riders you accepted set their own delivery price.
            </p>
          </div>
          <input
            type="checkbox"
            checked={allowOnDemandDeliverers}
            onChange={(e) => setAllowOnDemandDeliverers(e.target.checked)}
            className="mt-1 w-5 h-5 accent-[#D4AF37]"
          />
        </label>

        <button
          type="button"
          disabled={savingMethods}
          onClick={saveMethods}
          className="w-full mt-2 bg-[#D4AF37] text-black font-bold py-3 rounded-full disabled:opacity-50"
        >
          {savingMethods ? 'Saving…' : 'Save methods'}
        </button>
      </section>

      {/* Zones & fees */}
      <section className="glass border border-white/10 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-white/80 uppercase tracking-wide">
              Delivery zones & fees
            </h3>
            <p className="text-white/45 text-xs mt-1">
              Buyers in these places will see your fee at checkout.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowZoneForm((v) => !v);
              setError(null);
            }}
            className="flex items-center gap-1.5 shrink-0 bg-white/10 hover:bg-white/15 px-3 py-2 rounded-full text-xs font-bold"
          >
            <Plus size={14} /> Add zone
          </button>
        </div>

        {showZoneForm && (
          <div className="rounded-xl border border-white/15 bg-white/5 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 block mb-1">Country code</label>
                <input
                  type="text"
                  value={zoneForm.country}
                  onChange={(e) =>
                    setZoneForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))
                  }
                  placeholder="GH"
                  className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">Region</label>
                <input
                  type="text"
                  value={zoneForm.regionName}
                  onChange={(e) => setZoneForm((f) => ({ ...f, regionName: e.target.value }))}
                  placeholder="e.g. Northern"
                  className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">Town / city</label>
                <input
                  type="text"
                  value={zoneForm.cityName}
                  onChange={(e) => setZoneForm((f) => ({ ...f, cityName: e.target.value }))}
                  placeholder="e.g. Tamale (optional for whole region)"
                  className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">Estimated time</label>
                <input
                  type="text"
                  value={zoneForm.estimatedTime}
                  onChange={(e) =>
                    setZoneForm((f) => ({ ...f, estimatedTime: e.target.value }))
                  }
                  placeholder="e.g. Same day · 1–2 days"
                  className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]/50"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={zoneForm.isFreeDelivery}
                onChange={(e) =>
                  setZoneForm((f) => ({
                    ...f,
                    isFreeDelivery: e.target.checked,
                    deliveryFee: e.target.checked ? '0' : f.deliveryFee,
                  }))
                }
                className="w-4 h-4 accent-[#D4AF37]"
              />
              Free delivery for this zone
            </label>

            {!zoneForm.isFreeDelivery && (
              <div>
                <label className="text-xs text-white/50 block mb-1">Delivery fee (GHS)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={zoneForm.deliveryFee}
                  onChange={(e) => setZoneForm((f) => ({ ...f, deliveryFee: e.target.value }))}
                  placeholder="0.00"
                  className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]/50"
                />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={savingZone}
                onClick={addZone}
                className="flex-1 bg-[#D4AF37] text-black font-bold py-2.5 rounded-full text-sm disabled:opacity-50"
              >
                {savingZone ? 'Saving…' : 'Save zone'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowZoneForm(false);
                  setZoneForm(emptyZoneForm());
                }}
                className="px-4 py-2.5 rounded-full text-sm font-semibold glass"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {zones.length === 0 ? (
          <div className="text-center py-10">
            <Truck size={40} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/50 text-sm mb-1">No delivery zones yet</p>
            <p className="text-white/35 text-xs">
              Add towns or regions and set a fee for each.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {zones.map((z) => {
              const place = [z.city_name, z.region_name, z.country].filter(Boolean).join(', ');
              const feeLabel = z.is_free_delivery
                ? 'Free'
                : `GH₵${Number(z.delivery_fee || 0).toFixed(2)}`;
              return (
                <li
                  key={z.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{place || 'Zone'}</p>
                    <p className="text-xs text-white/45 mt-0.5">
                      <span className="text-[#D4AF37] font-semibold">{feeLabel}</span>
                      {z.estimated_time ? ` · ${z.estimated_time}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeZone(z.id)}
                    className="w-9 h-9 rounded-full border border-red-500/30 flex items-center justify-center shrink-0 hover:bg-red-500/10"
                    aria-label="Remove zone"
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
