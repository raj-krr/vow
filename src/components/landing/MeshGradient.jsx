import React, { useEffect, useRef } from 'react';

/**
 * Cinematic Mesh Gradient Background
 * - Lightweight canvas rendering with GPU-accelerated blur for organic liquid mesh feel
 * - Palette strictly adheres to:
 *     Light (Hero): #5C0EA4, #5E9BFF, #CCB4E9, #EFE7F6 against #F9F6FC
 *     Dark (CTA):   #1B0837, #5C0EA4, #5E9BFF, #450B7B against #1B0837
 * - Pauses via IntersectionObserver when off-screen
 * - Caps devicePixelRatio to 1.5
 * - Fallback static gradient on prefers-reduced-motion and mobile
 * - Preserves high text contrast
 */
export const MeshGradient = ({ variant = 'light', className = '' }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile =
      typeof window !== 'undefined' &&
      (window.innerWidth < 768 || 'ontouchstart' in window);

    // Orbs definition based on variant and approved palette
    const isLight = variant === 'light';

    const orbs = isLight
      ? [
          { x: 0.25, y: 0.3, r: 0.45, vx: 0.00045, vy: 0.00035, phX: 0, phY: 1.2, color: 'rgba(92, 14, 164, 0.16)' }, // #5C0EA4
          { x: 0.75, y: 0.25, r: 0.5, vx: 0.00038, vy: 0.00042, phX: 2.1, phY: 0.5, color: 'rgba(94, 155, 255, 0.20)' }, // #5E9BFF
          { x: 0.45, y: 0.7, r: 0.55, vx: 0.00032, vy: 0.00048, phX: 1.4, phY: 2.8, color: 'rgba(204, 180, 233, 0.28)' }, // #CCB4E9
          { x: 0.85, y: 0.8, r: 0.4, vx: 0.0004, vy: 0.0003, phX: 3.2, phY: 1.9, color: 'rgba(239, 231, 246, 0.35)' }, // #EFE7F6
        ]
      : [
          { x: 0.3, y: 0.4, r: 0.5, vx: 0.00045, vy: 0.00035, phX: 0, phY: 1.2, color: 'rgba(92, 14, 164, 0.45)' }, // #5C0EA4
          { x: 0.7, y: 0.35, r: 0.55, vx: 0.00038, vy: 0.00042, phX: 2.1, phY: 0.5, color: 'rgba(94, 155, 255, 0.32)' }, // #5E9BFF
          { x: 0.5, y: 0.75, r: 0.6, vx: 0.00032, vy: 0.00048, phX: 1.4, phY: 2.8, color: 'rgba(69, 11, 123, 0.55)' }, // #450B7B
          { x: 0.85, y: 0.85, r: 0.45, vx: 0.0004, vy: 0.0003, phX: 3.2, phY: 1.9, color: 'rgba(27, 8, 55, 0.7)' }, // #1B0837
        ];

    let width = 0;
    let height = 0;
    let animId = null;
    let isVisible = true;
    let lastTime = performance.now();

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      // Fixed internal resolution for fast rendering
      width = Math.max(300, Math.floor(rect.width * 0.5));
      height = Math.max(200, Math.floor(rect.height * 0.5));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    };

    const draw = (time) => {
      ctx.clearRect(0, 0, width, height);

      // Base background color
      ctx.fillStyle = isLight ? '#F9F6FC' : '#1B0837';
      ctx.fillRect(0, 0, width, height);

      // Render drifting soft radial orbs
      orbs.forEach((orb) => {
        const ox =
          prefersReduced || isMobile
            ? orb.x * width
            : (orb.x + Math.sin(time * orb.vx + orb.phX) * 0.18) * width;
        const oy =
          prefersReduced || isMobile
            ? orb.y * height
            : (orb.y + Math.cos(time * orb.vy + orb.phY) * 0.18) * height;
        const radius = orb.r * Math.min(width, height);

        const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, Math.max(1, radius));
        grad.addColorStop(0, orb.color);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ox, oy, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const loop = (time) => {
      if (!isVisible) return;
      draw(time);
      animId = requestAnimationFrame(loop);
    };

    // Pause when off-screen
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        isVisible = entry.isIntersecting;
        if (isVisible && !prefersReduced && !isMobile) {
          cancelAnimationFrame(animId);
          animId = requestAnimationFrame(loop);
        } else {
          cancelAnimationFrame(animId);
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(container);
    resize();

    window.addEventListener('resize', resize, { passive: true });

    if (!prefersReduced && !isMobile) {
      animId = requestAnimationFrame(loop);
    } else {
      draw(0);
    }

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [variant]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden -z-10 ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover scale-110 filter blur-[60px] sm:blur-[90px] md:blur-[110px] transform-gpu opacity-90"
      />
    </div>
  );
};

export default MeshGradient;
