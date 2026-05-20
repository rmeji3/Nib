'use client';

import { useId } from 'react';

interface NibLogoProps {
  size?: number;
  className?: string;
}

export function NibLogo({ size = 18, className = '' }: NibLogoProps) {
  const id = useId();
  const maskId = `logo_part_${id.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 491 491"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <path
          id={maskId}
          d="M283.694 8.06805C283.998 8.17895 285.232 12.6728 285.453 13.3853C287.184 19.0558 288.871 24.7393 290.514 30.4356C294.034 42.2664 297.851 53.9572 301.322 65.8344L305.703 80.6279C306.143 82.1265 307.207 86.2996 307.811 87.4435L247.621 183.872H243.136L182.995 87.4965C184.028 84.6653 184.696 81.4096 185.688 78.5006C190.384 64.7297 194.272 50.5668 198.366 36.599C199.788 31.7631 201.276 26.947 202.83 22.152C204.267 17.7479 206.029 12.6182 207.106 8.10556L256.027 8.12334C265.001 8.12383 274.772 8.31774 283.694 8.06805Z"
          fill="currentColor"
        />
      </defs>
      <use href={`#${maskId}`} />
      <use href={`#${maskId}`} transform="translate(245.403 -101.649) rotate(45)" />
      <use href={`#${maskId}`} transform="translate(490.806 1.89238e-05) rotate(90)" />
      <use href={`#${maskId}`} transform="translate(592.455 245.403) rotate(135)" />
      <use href={`#${maskId}`} transform="translate(490.806 490.806) rotate(-180)" />
      <use href={`#${maskId}`} transform="translate(245.403 592.455) rotate(-135)" />
      <use href={`#${maskId}`} transform="translate(-1.11233e-05 490.806) rotate(-90)" />
      <use href={`#${maskId}`} transform="translate(-101.649 245.403) rotate(-45)" />
    </svg>
  );
}
