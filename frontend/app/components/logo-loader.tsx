'use client';

import { useMemo } from 'react';
import Lottie from 'lottie-react';
import rawLogoLoader from '../../public/logo-loader.json';

type Rgba = [number, number, number, number];

interface LottieFill {
  ty?: string;
  nm?: string;
  c?: {
    k?: Rgba;
  };
  it?: LottieShape[];
}

type LottieShape = LottieFill;

interface LottieLayer {
  shapes?: LottieShape[];
}

interface LogoLoaderData {
  layers?: LottieLayer[];
}

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

function recolor(data: LogoLoaderData, color: string): LogoLoaderData {
  const clone = structuredClone(data);
  const nextColor = hexToRgba(color);

  const walk = (items?: LottieShape[]) => {
    items?.forEach((item) => {
      if (item.ty === 'fl' && item.nm === 'petal-fill' && item.c) {
        item.c.k = nextColor;
      }
      if (item.it) walk(item.it);
    });
  };

  clone.layers?.forEach((layer) => walk(layer.shapes));
  return clone;
}

export function LogoLoader({ size = 18, color = '#FFFFFF', className = '' }: LogoLoaderProps) {
  const data = useMemo(
    () => recolor(rawLogoLoader as LogoLoaderData, color),
    [color],
  );

  return (
    <Lottie
      key={color}
      animationData={data}
      loop
      autoplay
      className={className}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
