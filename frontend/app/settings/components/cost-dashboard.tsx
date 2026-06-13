'use client';

import type React from 'react';
import {
  ActivityIcon,
  BotIcon,
  CoinsIcon,
  FileTextIcon,
  MessageSquareIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  SparklesIcon,
} from 'lucide-react';
import { useCostDashboard } from '../hooks/use-cost-dashboard';
import type { CostTotals, DailyUsage } from '../../../lib/api/cost';

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 4,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function MetricCard({
  label,
  value,
  icon,
  subtext,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  subtext?: string;
}) {
  return (
    <div className="rounded-lg border border-white/8 bg-[var(--bg-elevated)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-faint)]">{label}</span>
        <span className="text-[var(--text-faint)]">{icon}</span>
      </div>
      <p className="text-xl font-semibold text-[var(--text)]">{value}</p>
      {subtext && <p className="mt-1 text-xs text-[var(--text-faint)]">{subtext}</p>}
    </div>
  );
}

function TotalsGrid({ totals }: { totals: CostTotals }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Estimated spend"
        value={formatUsd(totals.estimatedCostUsd)}
        icon={<CoinsIcon size={15} />}
        subtext="Configurable estimate"
      />
      <MetricCard
        label="Pages ingested"
        value={formatNumber(totals.pagesIngested)}
        icon={<FileTextIcon size={15} />}
        subtext={`${formatNumber(totals.visionCalls)} vision calls`}
      />
      <MetricCard
        label="Chat calls"
        value={formatNumber(totals.chatCalls)}
        icon={<MessageSquareIcon size={15} />}
        subtext={`${formatNumber(totals.totalTokens)} tokens`}
      />
      <MetricCard
        label="Rate-limit hits"
        value={formatNumber(totals.rateLimitHits)}
        icon={<ShieldAlertIcon size={15} />}
        subtext={`${formatNumber(totals.embeddingBatches)} embedding batches`}
      />
    </div>
  );
}

function UsageBars({ days }: { days: DailyUsage[] }) {
  const visibleDays = days.slice(-14);
  const max = Math.max(
    1,
    ...visibleDays.map(day => day.pagesIngested + day.visionCalls + day.embeddingBatches + day.chatCalls)
  );

  return (
    <div className="rounded-lg border border-white/8 bg-[var(--bg-elevated)] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text)]">30-day activity</p>
          <p className="text-xs text-[var(--text-faint)]">Workload events by day</p>
        </div>
        <ActivityIcon size={15} className="text-[var(--text-faint)]" />
      </div>

      {visibleDays.length === 0 ? (
        <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-white/10 text-xs text-[var(--text-faint)]">
          No metered activity yet
        </div>
      ) : (
        <div className="flex h-32 items-end gap-2">
          {visibleDays.map(day => {
            const total = day.pagesIngested + day.visionCalls + day.embeddingBatches + day.chatCalls;
            const height = Math.max(6, Math.round((total / max) * 112));
            return (
              <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md bg-[var(--text)]/80 transition hover:bg-[var(--text)]"
                  style={{ height }}
                  title={`${day.date}: ${formatNumber(total)} events`}
                />
                <span className="max-w-full truncate text-[10px] text-[var(--text-faint)]">
                  {new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TokenBreakdown({ totals }: { totals: CostTotals }) {
  return (
    <div className="rounded-lg border border-white/8 bg-[var(--bg-elevated)] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text)]">Token usage</p>
          <p className="text-xs text-[var(--text-faint)]">From answer audit records</p>
        </div>
        <BotIcon size={15} className="text-[var(--text-faint)]" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md bg-[var(--bg-surface)] p-3">
          <p className="text-[11px] text-[var(--text-faint)]">Prompt</p>
          <p className="mt-1 font-mono text-sm text-[var(--text)]">{formatNumber(totals.promptTokens)}</p>
        </div>
        <div className="rounded-md bg-[var(--bg-surface)] p-3">
          <p className="text-[11px] text-[var(--text-faint)]">Output</p>
          <p className="mt-1 font-mono text-sm text-[var(--text)]">{formatNumber(totals.completionTokens)}</p>
        </div>
        <div className="rounded-md bg-[var(--bg-surface)] p-3">
          <p className="text-[11px] text-[var(--text-faint)]">Total</p>
          <p className="mt-1 font-mono text-sm text-[var(--text)]">{formatNumber(totals.totalTokens)}</p>
        </div>
      </div>
    </div>
  );
}

export function CostDashboard() {
  const { data, isError, isLoading, refetch, isFetching } = useCostDashboard();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/8 bg-[var(--bg-elevated)] p-5">
        <div className="mb-4 h-4 w-32 animate-pulse rounded bg-white/10" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-300">Cost dashboard unavailable</p>
            <p className="mt-1 text-xs text-[var(--text-faint)]">Telemetry could not be loaded right now.</p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/30"
          >
            <RefreshCwIcon size={13} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="mt-7">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">Cost dashboard</h3>
          <p className="mt-1 text-xs text-[var(--text-faint)]">Usage and estimated spend for this account</p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-dim)] transition hover:border-white/20 hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          <RefreshCwIcon size={13} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <TotalsGrid totals={data.totals} />

      <div className="mt-3">
        <UsageBars days={data.dailyUsage} />
      </div>

      <div className="mt-3">
        <TokenBreakdown totals={data.totals} />
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/8 bg-[var(--bg-elevated)] p-3">
        <SparklesIcon size={14} className="mt-0.5 shrink-0 text-[var(--text-faint)]" />
        <p className="text-xs leading-relaxed text-[var(--text-faint)]">
          Estimates use backend-configured unit costs. Token counts come from answer audit metadata when the model provider returns usage.
        </p>
      </div>
    </section>
  );
}
