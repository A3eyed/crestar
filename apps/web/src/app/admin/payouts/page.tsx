'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Store,
  Truck,
  Video,
} from 'lucide-react';

/**
 * Admin → Payouts
 *
 * Per-order, per-leg payout register with one-click retry.
 *
 * Built on react-query with `placeholderData` kept between fetches, so the
 * table never unmounts back to a skeleton while refreshing. That — plus
 * refetchOnWindowFocus being off globally — is what stops the blinking the old
 * dashboard suffered from.
 */

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'failed', label: 'Needs attention' },
  { id: 'pending', label: 'In flight' },
  { id: 'paid', label: 'Settled' },
];

const LEG_META = {
  seller: { label: 'Seller', prefix: 'PO-S', Icon: Store },
  creator: { label: 'Creator', prefix: 'PO-C', Icon: Video },
  deliverer: { label: 'Deliverer', prefix: 'PO-D', Icon: Truck },
};

function money(value: unknown, currency = 'GHS') {
  const amount = Number.parseFloat(String(value ?? 0)) || 0;
  return `${currency} ${amount.toFixed(2)}`;
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/40',
    failed: 'bg-white/10 text-white border-[#D4AF37] font-semibold',
    retained: 'bg-white/[0.06] text-[#D4AF37] border-[#D4AF37]/30',
    processing: 'bg-white/[0.06] text-[#B8B8B8] border-white/15',
    pending: 'bg-white/[0.04] text-[#8A8A8A] border-white/10',
    partial: 'bg-white/[0.06] text-[#D4AF37] border-[#D4AF37]/30',
    not_applicable: 'bg-white/[0.03] text-[#6E6E6E] border-white/10',
  };
  const label = status === 'not_applicable' ? 'none' : status;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-wide ${map[status] || map.pending}`}
    >
      {label}
    </span>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#141414] p-4">
      <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#6E6E6E]">{hint}</p> : null}
    </div>
  );
}

export default function AdminPayoutsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [retrying, setRetrying] = useState<string | null>(null);

  const payoutsQuery = useQuery({
    queryKey: ['admin', 'payouts', status, search],
    queryFn: async () => {
      const params = new URLSearchParams({ status, limit: '50' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/payouts?${params.toString()}`);
      if (!res.ok) {
        throw new Error(
          `When fetching /api/admin/payouts, the response was [${res.status}] ${res.statusText}`
        );
      }
      return res.json();
    },
    // Keeps the previous table on screen while the next one loads.
    placeholderData: (previous) => previous,
  });

  const reconcileMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/orders/reconcile', { method: 'POST' });
      if (!res.ok) {
        throw new Error(
          `When fetching /api/orders/reconcile, the response was [${res.status}] ${res.statusText}`
        );
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(
        data.recovered > 0
          ? `Recovered ${data.recovered} paid order${data.recovered === 1 ? '' : 's'} for sellers`
          : `Scanned ${data.scanned} order${data.scanned === 1 ? '' : 's'} — nothing stuck`
      );
      queryClient.invalidateQueries({ queryKey: ['admin', 'payouts'] });
    },
    onError: (err: Error) => {
      console.error(err);
      toast.error('Could not run the reconciliation sweep');
    },
  });

  const retryMutation = useMutation({
    mutationFn: async ({ orderId, leg }: { orderId: string; leg: string }) => {
      const res = await fetch('/api/admin/payouts/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, leg }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.error || `Retry failed [${res.status}]`);
      }
      return res.json();
    },
    onMutate: ({ orderId, leg }) => setRetrying(`${orderId}:${leg}`),
    onSettled: () => setRetrying(null),
    onSuccess: (data) => {
      const outcome = data.results?.[0]?.status;
      if (outcome === 'paid') toast.success('Transfer sent');
      else if (outcome === 'retained') toast.message('Kept in wallet — no payout method on file');
      else toast.error(data.results?.[0]?.error || 'Transfer did not go through');
      queryClient.invalidateQueries({ queryKey: ['admin', 'payouts'] });
    },
    onError: (err: Error) => {
      console.error(err);
      toast.error(err.message);
    },
  });

  const data = payoutsQuery.data;
  const orders = data?.orders ?? [];
  const stats = data?.stats;
  const isRefreshing = payoutsQuery.isFetching && !payoutsQuery.isLoading;

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 text-sm text-[#8A8A8A] transition hover:text-[#D4AF37]"
            >
              <ArrowLeft size={16} />
              Back to dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Payouts</h1>
            <p className="mt-1 text-sm text-[#8A8A8A]">
              Every delivery-confirmed order, broken down by leg. Retry any failed transfer.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => reconcileMutation.mutate()}
              disabled={reconcileMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-2 text-sm font-medium text-[#D4AF37] transition hover:bg-[#D4AF37]/20 disabled:opacity-50"
            >
              <ShieldAlert size={16} />
              {reconcileMutation.isPending ? 'Scanning…' : 'Recover stuck orders'}
            </button>
            <button
              type="button"
              onClick={() => payoutsQuery.refetch()}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#141414] px-3 py-2 text-sm text-[#B8B8B8] transition hover:border-white/20 hover:text-white"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : undefined} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Failed legs"
            value={String(stats?.failed_legs ?? '—')}
            hint="Retryable"
          />
          <StatCard
            label="Held in wallet"
            value={String(stats?.retained_legs ?? '—')}
            hint="No payout method"
          />
          <StatCard label="Settled legs" value={String(stats?.paid_legs ?? '—')} />
          <StatCard
            label="Unsettled orders"
            value={String(stats?.unsettledOrders?.count ?? '—')}
            hint="Paid but not visible to sellers"
          />
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => {
              const active = filter.id === status;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setStatus(filter.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    active
                      ? 'bg-[#D4AF37] font-medium text-black'
                      : 'border border-white/10 bg-[#141414] text-[#B8B8B8] hover:text-white'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={submitSearch} className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6E6E]"
            />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Order number, item or seller handle"
              className="w-full rounded-lg border border-white/10 bg-[#141414] py-2 pl-9 pr-3 text-sm text-white placeholder:text-[#6E6E6E] focus:border-[#D4AF37]/50 focus:outline-none md:w-80"
            />
          </form>
        </div>

        {/* Table */}
        <div className="mt-5 space-y-3">
          {payoutsQuery.isLoading ? (
            <div className="rounded-xl border border-white/10 bg-[#141414] p-10 text-center text-sm text-[#8A8A8A]">
              Loading payouts…
            </div>
          ) : null}

          {payoutsQuery.isError ? (
            <div className="rounded-xl border border-[#D4AF37]/40 bg-[#141414] p-6 text-sm text-white">
              Could not load payouts. Try refreshing.
            </div>
          ) : null}

          {!payoutsQuery.isLoading && orders.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[#141414] p-10 text-center text-sm text-[#8A8A8A]">
              Nothing here yet.
            </div>
          ) : null}

          {orders.map((order: any) => (
            <div
              key={order.id}
              className="overflow-hidden rounded-xl border border-white/10 bg-[#141414]"
            >
              <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-white">{order.order_number}</span>
                    <StatusChip status={order.payout_status || 'pending'} />
                  </div>
                  <p className="mt-1 truncate text-sm text-[#8A8A8A]">
                    {order.seller_name || 'Unknown seller'}
                    {order.seller_handle ? (
                      <span className="text-[#6E6E6E]"> · @{order.seller_handle}</span>
                    ) : null}
                  </p>
                </div>

                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#6E6E6E]">Order</p>
                    <p className="text-sm text-white">
                      {money(order.total_amount, order.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#6E6E6E]">
                      Platform fee
                    </p>
                    <p className="text-sm text-[#D4AF37]">
                      {money(order.platform_fee, order.currency)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-white/[0.06]">
                {order.legs?.length ? (
                  order.legs.map((leg: any) => {
                    const meta = LEG_META[leg.leg as keyof typeof LEG_META] ?? LEG_META.seller;
                    const LegIcon = meta.Icon;
                    const canRetry = leg.status === 'failed' || leg.status === 'retained';
                    const busy = retrying === `${order.id}:${leg.leg}`;

                    return (
                      <div
                        key={leg.id}
                        className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-[#D4AF37]">
                            <LegIcon size={15} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm text-white">
                              {meta.label}
                              <span className="text-[#6E6E6E]">
                                {' '}
                                · {leg.recipient_name || 'Unknown'}
                              </span>
                            </p>
                            <p className="truncate font-mono text-[11px] text-[#6E6E6E]">
                              {leg.reference}
                              {leg.attempts > 1 ? ` · ${leg.attempts} attempts` : ''}
                            </p>
                            {leg.last_error ? (
                              <p className="mt-0.5 truncate text-[11px] text-[#B8B8B8]">
                                {leg.last_error}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end md:self-auto">
                          <span className="text-sm text-white">
                            {money(leg.amount, leg.currency)}
                          </span>
                          <StatusChip status={leg.status} />
                          {canRetry ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                retryMutation.mutate({ orderId: order.id, leg: leg.leg })
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/40 px-3 py-1.5 text-xs font-medium text-[#D4AF37] transition hover:bg-[#D4AF37]/10 disabled:opacity-50"
                            >
                              <RotateCcw size={13} className={busy ? 'animate-spin' : undefined} />
                              {busy ? 'Retrying' : 'Retry'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="px-4 py-3 text-sm text-[#6E6E6E]">
                    No payout legs — nothing was owed on this order.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
