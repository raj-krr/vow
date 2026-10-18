import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

/**
 * <Reveal>
 * Smoothly animates elements into view as they enter the viewport.
 * Uses IntersectionObserver for 100% reliability with Lenis + React 19.
 * Animates transform, opacity, and subtle blur.
 */
export const Reveal = ({
  children,
  className = '',
  delay = 0,
  duration = 0.75,
  y = 20,
  stagger = 0.08,
  blur = true,
  threshold = 0.1,
}) => {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Safety fallback: after 1.5s, always reveal so content is never stuck hidden
    const fallbackTimer = setTimeout(() => {
      setIsVisible(true);
    }, 1200);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
          clearTimeout(fallbackTimer);
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, [threshold]);

  useGSAP(
    () => {
      if (!isVisible) return;

      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

      const elements = containerRef.current.querySelectorAll('.reveal-child');
      const targets = elements.length > 0 ? elements : containerRef.current;

      if (prefersReduced) {
        gsap.set(targets, { opacity: 1, y: 0, filter: 'none' });
        return;
      }

      const shouldBlur = blur && !isMobile;
      const yDistance = isMobile ? Math.min(y, 10) : y;

      gsap.fromTo(
        targets,
        {
          opacity: 0,
          y: yDistance,
          filter: shouldBlur ? 'blur(6px)' : 'none',
        },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: isMobile ? 0.5 : duration,
          delay,
          stagger: targets.length > 1 ? stagger : 0,
          ease: 'power2.out',
          clearProps: 'filter,transform',
        }
      );
    },
    { dependencies: [isVisible], scope: containerRef }
  );

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};

/**
 * <WordReveal>
 * Splits a text string manually into words and animates them sequentially.
 */
export const WordReveal = ({
  text,
  className = '',
  wordClassName = '',
  delay = 0.1,
  stagger = 0.045,
}) => {
  const containerRef = useRef(null);
  const words = text ? text.split(' ') : [];

  useGSAP(
    () => {
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReduced) {
        gsap.set('.word-inner', { opacity: 1, yPercent: 0 });
        return;
      }

      gsap.fromTo(
        '.word-inner',
        {
          opacity: 0,
          yPercent: 80,
        },
        {
          opacity: 1,
          yPercent: 0,
          duration: 0.65,
          delay,
          stagger,
          ease: 'power3.out',
        }
      );
    },
    { scope: containerRef }
  );

  return (
    <span ref={containerRef} className={`inline-block ${className}`}>
      {words.map((word, index) => (
        <span
          key={index}
          className="inline-block overflow-hidden pb-1 align-baseline mr-[0.25em] last:mr-0"
        >
          <span className={`word-inner inline-block will-change-transform ${wordClassName}`}>
            {word}
          </span>
        </span>
      ))}
    </span>
  );
};

export default Reveal;
