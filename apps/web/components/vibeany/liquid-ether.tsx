"use client";

import React, { useEffect, useRef, useState } from 'react';

export interface LiquidEtherProps {
  autoSpeed?: number;
  autoIntensity?: number;
  resolution?: number;
  mouseForce?: number;
}

export const LiquidEther: React.FC<LiquidEtherProps> = ({
  autoSpeed = 0.3,
  autoIntensity = 1.5,
  resolution = 0.6,
  mouseForce = 15,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef({ x: 0.5, y: 0.4 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    let frame = 0;
    let rafId = 0;

    const update = () => {
      frame += autoSpeed * 0.6;
      const angle = frame % 360;
      container.style.setProperty('--gradient-angle', `${angle}deg`);
      container.style.setProperty('--pointer-x', pointer.current.x.toString());
      container.style.setProperty('--pointer-y', pointer.current.y.toString());
      rafId = window.requestAnimationFrame(update);
    };

    const handlePointerMove = (event: MouseEvent | TouchEvent) => {
      const rect = container.getBoundingClientRect();
      const source = 'touches' in event ? event.touches[0] : event;
      const x = (source.clientX - rect.left) / rect.width;
      const y = (source.clientY - rect.top) / rect.height;
      const eased = 1 / Math.max(mouseForce, 1);
      pointer.current.x = pointer.current.x + (x - pointer.current.x) * eased;
      pointer.current.y = pointer.current.y + (y - pointer.current.y) * eased;
    };

    rafId = window.requestAnimationFrame(update);
    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
    };
  }, [autoSpeed, mouseForce, mounted]);

  const blurAmount = Math.max(20, autoIntensity * 35);
  const pulse = Math.max(8, 18 - autoSpeed * 10);

  if (!mounted) {
    return (
      <div ref={containerRef} className="liquid-ether" aria-hidden="true" suppressHydrationWarning />
    );
  }

  return (
    <div ref={containerRef} className="liquid-ether" aria-hidden="true" suppressHydrationWarning>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .liquid-ether {
          position: absolute;
          inset: -10%;
          overflow: hidden;
          pointer-events: none;
          filter: blur(${blurAmount}px);
          opacity: 0.75;
        }

        .liquid-ether::before,
        .liquid-ether::after {
          content: '';
          position: absolute;
          inset: -20%;
          background: radial-gradient(
              circle at calc(var(--pointer-x, 0.5) * 100%) calc(var(--pointer-y, 0.4) * 100%),
              rgba(132, 78, 255, 0.9),
              transparent 55%
            ),
            conic-gradient(
              from var(--gradient-angle, 0deg),
              rgba(63, 176, 255, 0.8),
              rgba(255, 116, 208, 0.6),
              rgba(90, 255, 196, 0.2),
              rgba(63, 176, 255, 0.8)
            );
          mix-blend-mode: screen;
          animation: ether-float ${pulse}s ease-in-out infinite alternate;
          transform-origin: center;
        }

        .liquid-ether::after {
          animation-duration: ${pulse * 1.25}s;
          opacity: 0.5;
        }

        @keyframes ether-float {
          0% {
            transform: scale(${1 + resolution * 0.3}) translate3d(-4%, -2%, 0);
          }
          100% {
            transform: scale(${1.2 + resolution * 0.4}) translate3d(4%, 3%, 0);
          }
        }
      `,
        }}
      />
    </div>
  );
};
