'use client';

import { useEffect, useMemo, useState } from 'react';
import Lottie from 'lottie-react';
import rawLogoLoader from '../../public/logo-loader.json';

type Rgba = [number, number, number, number];

interface LottieFill {
  ty?: string;
  nm?: string;
  c?: {
    k?: Rgba;
  };
  o?: {
    k?: number;
  };
  it?: LottieShape[];
}

type LottieShape = LottieFill;

interface LottieLayer {
  shapes?: LottieShape[];
  ks?: {
    p?: { a?: number; k?: number[] };
  };
}

interface LogoLoaderData {
  w?: number;
  h?: number;
  layers?: LottieLayer[];
}

/** Breathing room (px) added around the 512×512 composition so the pulsing
 *  petals (which scale to ~120%) never get clipped at the canvas edges. */
const CANVAS_PAD = 120;

interface LogoLoaderProps {
  size?: number;
  color?: string;
  className?: string;
}

function hexToRgba(hex: string): Rgba {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
    1,
  ];
}

/** Tracks whether the app is currently in light mode (html.light). */
function useIsLightTheme(): boolean {
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsLight(root.classList.contains('light'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isLight;
}

function recolor(data: LogoLoaderData, color: string): LogoLoaderData {
  const clone = structuredClone(data);
  const nextColor = hexToRgba(color);

  const walk = (items?: LottieShape[]) => {
    items?.forEach((item) => {
      if (item.ty === 'fl' && item.nm === 'petal-fill' && item.c) {
        item.c.k = nextColor;
      }
      // Hide the opaque background square so the loader is transparent.
      if (item.ty === 'fl' && item.nm === 'bg-fill' && item.o) {
        item.o.k = 0;
      }
      if (item.it) walk(item.it);
    });
  };

  clone.layers?.forEach((layer) => walk(layer.shapes));

  // Enlarge the canvas and re-center every layer so the pulsing petals have
  // padding and aren't clipped by the SVG viewport.
  if (typeof clone.w === 'number' && typeof clone.h === 'number') {
    clone.w += CANVAS_PAD * 2;
    clone.h += CANVAS_PAD * 2;
    clone.layers?.forEach((layer) => {
      const p = layer.ks?.p;
      if (p && p.a === 0 && Array.isArray(p.k)) {
        p.k = [p.k[0] + CANVAS_PAD, p.k[1] + CANVAS_PAD, p.k[2] ?? 0];
      }
    });
  }

  return clone;
}

export function LogoLoader({ size = 18, color = '#FFFFFF', className = '' }: LogoLoaderProps) {
  const isLight = useIsLightTheme();
  // White petals are invisible on a light background — use a dark ink color instead.
  const effectiveColor = isLight ? '#111827' : color;
  const data = useMemo(
    () => recolor(rawLogoLoader as LogoLoaderData, effectiveColor),
    [effectiveColor],
  );

  return (
    <Lottie
      key={effectiveColor}
      animationData={data}
      loop
      autoplay
      className={className}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
