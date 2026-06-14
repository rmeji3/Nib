"use client";

import { useState } from "react";
import { ArrowLeft, AlertTriangle, RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../features/auth/hooks/use-auth";
import { fetchWithAuth } from "@/app/lib/fetch-with-auth";

// ---------------------------------------------------------------------------
// Downgrade confirmation modal
// ---------------------------------------------------------------------------
function DowngradeModal({
  periodEnd,
  onConfirm,
  onCancel,
  isLoading,
}: {
  periodEnd: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const formattedDate = periodEnd
    ? new Date(periodEnd).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Icon */}
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "rgba(234, 179, 8, 0.12)" }}
        >
          <AlertTriangle
            className="h-6 w-6"
            style={{ color: "rgb(234, 179, 8)" }}
          />
        </div>

        <h2
          className="mb-2 text-center text-[18px] font-semibold tracking-[-0.01em]"
          style={{ color: "var(--text)" }}
        >
          Switch to Free?
        </h2>

        <p
          className="mb-1 text-center text-[14px] leading-relaxed"
          style={{ color: "var(--text-dim)" }}
        >
          You'll keep all your Pro features until your billing period ends.
        </p>

        {formattedDate && (
          <p
            className="mb-5 text-center text-[13px] font-medium"
            style={{ color: "var(--accent-text)" }}
          >
            Pro access active until {formattedDate}
          </p>
        )}

        {!formattedDate && (
          <p
            className="mb-5 text-center text-[13px]"
            style={{ color: "var(--text-faint)" }}
          >
            After that, your account reverts to the Free tier automatically.
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-[9px] py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "var(--text)",
            }}
          >
            Keep Pro
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 rounded-[9px] py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-wait"
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              color: "rgb(248, 113, 113)",
            }}
          >
            {isLoading ? "Switching…" : "Switch to Free"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Renew (resume) confirmation modal
// ---------------------------------------------------------------------------
function RenewModal({
  periodEnd,
  onConfirm,
  onCancel,
  isLoading,
}: {
  periodEnd: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const formattedDate = periodEnd
    ? new Date(periodEnd).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      <div
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "var(--accent-soft)" }}
        >
          <RefreshCwIcon className="h-6 w-6" style={{ color: "var(--accent-text)" }} />
        </div>

        <h2
          className="mb-2 text-center text-[18px] font-semibold tracking-[-0.01em]"
          style={{ color: "var(--text)" }}
        >
          Renew Nib Pro?
        </h2>

        <p
          className="mb-5 text-center text-[14px] leading-relaxed"
          style={{ color: "var(--text-dim)" }}
        >
          Your subscription will keep renewing and you&apos;ll stay on Pro
          {formattedDate ? (
            <>
              {" "}— next renewal on{" "}
              <span className="font-medium" style={{ color: "var(--accent-text)" }}>
                {formattedDate}
              </span>
              .
            </>
          ) : (
            "."
          )}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-[9px] py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "var(--text)",
            }}
          >
            Not now
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 rounded-[9px] py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-wait"
            style={{ background: "var(--accent-text)", color: "var(--bg-base)" }}
          >
            {isLoading ? "Renewing…" : "Renew Pro"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main pricing page
// ---------------------------------------------------------------------------
export default function PricingPage() {
  const [isUpgradeLoading, setIsUpgradeLoading] = useState(false);
  const [isDowngradeLoading, setIsDowngradeLoading] = useState(false);
  const [isResumeLoading, setIsResumeLoading] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [pendingPeriodEnd, setPendingPeriodEnd] = useState<string | null>(null);
  const router = useRouter();
  const { user, refreshSession } = useAuth();

  const isPro = user?.subscriptionTier === "PRO";
  // Canceled but still within the paid period: keeps PRO until periodEnd, then reverts to Free.
  const isCanceled = isPro && Boolean(user?.subscriptionCancelAtPeriodEnd);
  const proEndsDate = user?.subscriptionPeriodEnd
    ? new Date(user.subscriptionPeriodEnd).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  // ── Upgrade ─────────────────────────────────────────────────────────────
  const handleUpgrade = async () => {
    setIsUpgradeLoading(true);
    try {
      // No price id is sent — the server decides what the Pro plan costs.
      const res = await fetchWithAuth('/api/stripe/create-checkout-session', {
        method: 'POST',
      });

      if (!res.ok) {
        let errMessage = "Failed to create checkout session";
        try {
          const errorData = await res.json();
          if (errorData.error) errMessage = errorData.error;
        } catch (e) {}
        throw new Error(errMessage);
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsUpgradeLoading(false);
    }
  };

  // ── Downgrade — step 1: open modal ──────────────────────────────────────
  const handleDowngradeClick = () => {
    // Prefill with the existing period end if we already know it, otherwise null
    setPendingPeriodEnd(user?.subscriptionPeriodEnd ?? null);
    setShowDowngradeModal(true);
  };

  // ── Downgrade — step 2: confirmed ───────────────────────────────────────
  const handleDowngradeConfirm = async () => {
    setIsDowngradeLoading(true);
    try {
      const res = await fetchWithAuth('/api/stripe/cancel-subscription', {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to cancel subscription");
      }

      const data = await res.json();

      // data.periodEnd is Unix epoch seconds from Stripe
      if (data.periodEnd) {
        const isoDate = new Date(data.periodEnd * 1000).toISOString();
        setPendingPeriodEnd(isoDate);
      }

      // Refresh session so the rest of the UI reflects the schedule
      await refreshSession();
      setShowDowngradeModal(false);
    } catch (error: unknown) {
      console.error(error);
      const msg = error instanceof Error ? error.message : "Something went wrong.";
      alert(msg);
      setShowDowngradeModal(false);
    } finally {
      setIsDowngradeLoading(false);
    }
  };

  // ── Resume (undo a scheduled cancellation) ──────────────────────────────
  const handleResume = async () => {
    setIsResumeLoading(true);
    try {
      const res = await fetchWithAuth('/api/stripe/resume-subscription', {
        method: 'POST',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to resume subscription");
      }
      await refreshSession();
      setShowRenewModal(false);
    } catch (error: unknown) {
      console.error(error);
      const msg = error instanceof Error ? error.message : "Something went wrong.";
      alert(msg);
      setShowRenewModal(false);
    } finally {
      setIsResumeLoading(false);
    }
  };

  // ── Feature lists ────────────────────────────────────────────────────────
  const freeFeatures = [
    "10 Documents / month",
    "150 Pages total / month",
    "Standard AI Query Model",
    "Community Support",
  ];

  const proFeatures = [
    "500 Documents / month",
    "10,000 Pages total / month",
    "Premium AI Query Model",
    "250 Premium Queries / month",
    "Priority Email Support",
  ];

  return (
    <>
      {showDowngradeModal && (
        <DowngradeModal
          periodEnd={pendingPeriodEnd}
          onConfirm={handleDowngradeConfirm}
          onCancel={() => setShowDowngradeModal(false)}
          isLoading={isDowngradeLoading}
        />
      )}

      {showRenewModal && (
        <RenewModal
          periodEnd={user?.subscriptionPeriodEnd ?? null}
          onConfirm={handleResume}
          onCancel={() => setShowRenewModal(false)}
          isLoading={isResumeLoading}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-12 relative">
        <button
          onClick={() => router.back()}
          className="absolute top-12 left-4 md:left-8 flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="max-w-[720px] mx-auto mb-14 text-center mt-12 md:mt-0">
          <div
            className="text-[12.5px] font-medium tracking-[0.06em] uppercase mb-4"
            style={{ color: "var(--accent-text)" }}
          >
            {isPro ? "Manage Plan" : "Upgrade"}
          </div>
          <h1
            className="font-medium tracking-[-0.02em] m-0 mb-[18px]"
            style={{
              fontFamily: "var(--font-doc)",
              fontSize: "clamp(30px,4vw,48px)",
              lineHeight: 1.1,
              textWrap: "balance",
            } as React.CSSProperties}
          >
            {isPro ? "Your Nib Pro Plan" : "Upgrade to Nib Pro"}
          </h1>
          <p
            className="text-[17px] leading-[1.55] m-0"
            style={{ color: "var(--text-dim)" }}
          >
            {isCanceled
              ? "Your subscription is scheduled to cancel. You keep Pro access until it ends."
              : isPro
              ? "You have full Pro access. Manage your subscription below."
              : "Unlock maximum indexing power and premium AI models for your most demanding projects."}
          </p>
        </div>

        {/* Scheduled-cancellation notice */}
        {isCanceled && (
          <div
            className="max-w-[750px] mx-auto mb-8 flex flex-col sm:flex-row sm:items-center gap-3 rounded-[12px] px-5 py-4"
            style={{
              background: "rgba(234, 179, 8, 0.08)",
            }}
          >
            <AlertTriangle
              className="h-5 w-5 shrink-0"
              style={{ color: "rgb(234, 179, 8)" }}
            />
            <div className="flex-1 text-[13.5px]" style={{ color: "var(--text-dim)" }}>
              {proEndsDate ? (
                <>
                  Your Pro features end on{" "}
                  <span className="font-semibold" style={{ color: "var(--text)" }}>
                    {proEndsDate}
                  </span>
                  . Renew to keep uninterrupted access.
                </>
              ) : (
                <>Your Pro features will end at the close of the current billing period. Renew to keep access.</>
              )}
            </div>
            <button
              onClick={() => setShowRenewModal(true)}
              disabled={isResumeLoading}
              className="shrink-0 inline-flex items-center justify-center rounded-[9px] px-4 py-2 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
              style={{ background: "var(--accent-text)", color: "var(--bg-base)" }}
            >
              {isResumeLoading ? "Renewing…" : "Renew Pro"}
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 justify-center items-stretch max-w-[750px] mx-auto w-full">
          {/* ── Free Tier ── */}
          <div
            className="flex flex-col gap-2 rounded-[14px] px-[26px] pb-6 pt-7 relative flex-1 w-full"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-faint)",
            }}
          >
            <div
              className="text-[20px] font-semibold tracking-[-0.01em]"
              style={{ fontFamily: "var(--font-doc)" }}
            >
              Free
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className="font-medium tracking-[-0.025em]"
                style={{ fontFamily: "var(--font-doc)", fontSize: 44 }}
              >
                $0
              </span>
              <small className="text-[13px]" style={{ color: "var(--text-faint)" }}>
                /month
              </small>
            </div>
            <div className="text-[13.5px] mb-3.5" style={{ color: "var(--text-dim)" }}>
              Perfect for trying out basic features on small assignments.
            </div>
            <ul className="list-none p-0 m-0 mb-[22px] flex flex-col gap-2.5 flex-1">
              {freeFeatures.map((f) => (
                <li
                  key={f}
                  className="text-sm pl-[22px] relative"
                  style={{ color: "var(--text-dim)" }}
                >
                  <svg
                    className="absolute left-0 top-[3px]"
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="#86b8d0"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 7.2 5.8 10 11 4.2" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA for Free tier */}
            {isCanceled ? (
              <button
                disabled
                className="inline-flex w-full items-center justify-center gap-2 rounded-[9px] py-2.5 text-sm font-medium transition-colors mt-auto cursor-not-allowed opacity-60"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                }}
              >
                {proEndsDate ? `Starts ${proEndsDate}` : "Downgrade scheduled"}
              </button>
            ) : isPro ? (
              <button
                id="downgrade-to-free-btn"
                onClick={handleDowngradeClick}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[9px] py-2.5 text-sm font-semibold transition-all mt-auto hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: "#6366f1",
                  color: "#fff",
                  border: "1px solid rgba(99,102,241,0.5)",
                  boxShadow: "0 0 16px rgba(99,102,241,0.35)",
                }}
              >
                Switch to Free
              </button>
            ) : (
              <button
                disabled
                className="inline-flex w-full items-center justify-center gap-2 rounded-[9px] py-2.5 text-sm font-medium transition-colors mt-auto cursor-not-allowed opacity-50"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                }}
              >
                Current Plan
              </button>
            )}
          </div>

          {/* ── Pro Tier ── */}
          <div
            className="flex flex-col gap-2 rounded-[14px] px-[26px] pb-6 pt-7 relative flex-1 w-full"
            style={{
              background:
                "linear-gradient(180deg,var(--accent-soft),transparent 40%),var(--bg-surface)",
              border: "1px solid var(--accent-line)",
              boxShadow: "0 20px 50px -20px oklch(0.55 0.1 240/0.3)",
            }}
          >
            <span
              className="absolute -top-[10px] right-[22px] text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: "var(--accent-text)",
                color: "var(--bg-base)",
              }}
            >
              Most popular
            </span>
            <div
              className="text-[20px] font-semibold tracking-[-0.01em]"
              style={{ fontFamily: "var(--font-doc)" }}
            >
              Pro
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className="font-medium tracking-[-0.025em]"
                style={{ fontFamily: "var(--font-doc)", fontSize: 44 }}
              >
                $12
              </span>
              <small className="text-[13px]" style={{ color: "var(--text-faint)" }}>
                /month
              </small>
            </div>
            <div className="text-[13.5px] mb-3.5" style={{ color: "var(--text-dim)" }}>
              For serious students who need deep research without limits.
            </div>
            <ul className="list-none p-0 m-0 mb-[22px] flex flex-col gap-2.5 flex-1">
              {proFeatures.map((f) => (
                <li
                  key={f}
                  className="text-sm pl-[22px] relative"
                  style={{ color: "var(--text-dim)" }}
                >
                  <svg
                    className="absolute left-0 top-[3px]"
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="#86b8d0"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 7.2 5.8 10 11 4.2" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA for Pro tier */}
            {isCanceled ? (
              <button
                onClick={() => setShowRenewModal(true)}
                disabled={isResumeLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[9px] py-2.5 text-sm font-semibold transition-all mt-auto hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
                style={{ background: "var(--accent-text)", color: "var(--bg-base)" }}
              >
                {isResumeLoading ? "Renewing…" : "Renew Pro"}
              </button>
            ) : isPro ? (
              <button
                disabled
                className="inline-flex w-full items-center justify-center gap-2 rounded-[9px] py-2.5 text-sm font-medium transition-colors mt-auto cursor-not-allowed opacity-50"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                }}
              >
                Current Plan
              </button>
            ) : (
              <button
                id="upgrade-to-pro-btn"
                onClick={() => handleUpgrade()}
                disabled={isUpgradeLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[9px] py-2.5 text-sm font-medium transition-colors mt-auto disabled:opacity-50 disabled:cursor-wait hover:opacity-90"
                style={{ background: "var(--text)", color: "var(--bg-base)" }}
              >
                {isUpgradeLoading ? "Redirecting…" : "Upgrade to Pro"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
