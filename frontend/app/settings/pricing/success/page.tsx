"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/app/features/auth/hooks/use-auth";
import { LogoLoader } from "@/app/components/logo-loader";

const AnimatedCheckmark = () => (
  <div className="relative w-[112px] h-[112px] flex items-center justify-center">
    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="50"
        cy="50"
        r="44"
        stroke="var(--accent-text)"
        strokeWidth="3.5"
        strokeLinecap="round"
        style={{
          strokeDasharray: 277,
          strokeDashoffset: 277,
          animation: "drawCircle 0.7s cubic-bezier(0.65, 0, 0.45, 1) forwards"
        }}
      />
      <path
        d="M32 50L45 63L68 38"
        stroke="var(--accent-text)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 60,
          strokeDashoffset: 60,
          animation: "drawCheck 0.5s cubic-bezier(0.65, 0, 0.45, 1) 0.4s forwards"
        }}
      />
    </svg>
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes drawCircle {
        0% { stroke-dashoffset: 277; transform: scale(0.85); transform-origin: center; opacity: 0; }
        50% { opacity: 1; }
        100% { stroke-dashoffset: 0; transform: scale(1); transform-origin: center; opacity: 1; }
      }
      @keyframes drawCheck {
        0% { stroke-dashoffset: 60; }
        100% { stroke-dashoffset: 0; }
      }
    `}} />
  </div>
);

const MAX_POLLS = 12;   // 12 × 2.5 s = 30 s max wait
const POLL_MS  = 2500;

export default function PricingSuccessPage() {
  const searchParams   = useSearchParams();
  const router         = useRouter();
  const { user, refreshSession } = useAuth();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [timedOut,  setTimedOut]  = useState(false);
  const pollCount = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Step 1: validate session param ──────────────────────────────────────
  useEffect(() => {
    const id = searchParams.get("session_id");
    if (id) {
      setSessionId(id);
    } else {
      router.push("/settings/pricing");
    }
  }, [searchParams, router]);

  // ── Step 2: poll /me until subscriptionTier flips to PRO ────────────────
  useEffect(() => {
    if (!sessionId) return;

    const poll = async () => {
      pollCount.current += 1;
      await refreshSession();

      // refreshSession updates the `user` object in context; we need to
      // re-read from localStorage because the closure captures the old value.
      try {
        const stored = localStorage.getItem("nib_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.subscriptionTier === "PRO") {
            clearInterval(intervalRef.current!);
            setConfirmed(true);
            return;
          }
        }
      } catch (_) {}

      if (pollCount.current >= MAX_POLLS) {
        clearInterval(intervalRef.current!);
        setTimedOut(true);
      }
    };

    // Kick off first poll immediately, then repeat
    poll();
    intervalRef.current = setInterval(poll, POLL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sessionId]);

  if (!sessionId) return null;

  // ── Waiting for webhook to be processed ─────────────────────────────────
  if (!confirmed && !timedOut) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[60vh] text-center gap-5">
      <LogoLoader size={72} color="#a5b4fc" />
      <p className="text-[15px]" style={{ color: "var(--text-dim)" }}>
        Confirming your subscription…
      </p>
    </div>
    );
  }

  // ── Timed out — webhook too slow ─────────────────────────────────────────
  if (timedOut) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <p className="text-[17px] font-semibold" style={{ color: "var(--text)" }}>
          Payment received!
        </p>
        <p className="text-[14px] max-w-sm" style={{ color: "var(--text-dim)" }}>
          Your account is being upgraded — it may take a moment to reflect.
          Try refreshing the page in a few seconds.
        </p>
        <Link
          href="/home"
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-[9px] px-8 py-3 text-[14.5px] font-medium transition-colors"
          style={{ background: "var(--text)", color: "var(--bg-base)" }}
        >
          Go to Home
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 relative flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="mb-8 flex justify-center">
        <AnimatedCheckmark />
      </div>

      <div className="max-w-[720px] mx-auto mb-10 text-center">
        <div className="text-[12.5px] font-medium tracking-[0.06em] uppercase mb-4" style={{ color: "var(--accent-text)" }}>
          Success
        </div>
        <h1
          className="font-medium tracking-[-0.02em] m-0 mb-[18px]"
          style={{ fontFamily: "var(--font-doc)", fontSize: "clamp(30px,4vw,48px)", lineHeight: 1.1, textWrap: "balance" } as React.CSSProperties}
        >
          Payment Successful
        </h1>
        <p
          className="m-0 text-[17px] leading-[1.6]"
          style={{ color: "var(--text-dim)", textWrap: "balance" } as React.CSSProperties}
        >
          Welcome to Nib Pro. Your account has been upgraded and you now have access to premium features and extended limits.
        </p>
      </div>

      <Link
        href="/home"
        className="inline-flex items-center justify-center gap-2 rounded-[9px] px-8 py-3 text-[14.5px] font-medium transition-colors"
        style={{ background: "var(--text)", color: "var(--bg-base)" }}
      >
        Start Indexing
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
