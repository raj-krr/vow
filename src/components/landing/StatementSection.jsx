import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

const statementText =
  'Experience the most natural way to collaborate remotely. Recreate real presence and team connection online.';

export const StatementSection = () => {
  const containerRef = useRef(null);
  const words = statementText.split(' ');

  useGSAP(
    () => {
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReduced) {
        gsap.set('.scrub-word', { opacity: 1 });
        return;
      }

      const wordElements = containerRef.current.querySelectorAll('.scrub-word');

      gsap.fromTo(
        wordElements,
        {
          opacity: 0.2,
          color: '#9CA3AF',
        },
        {
          opacity: 1,
          color: '#0B0E13',
          stagger: 0.08,
          ease: 'none',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 75%',
            end: 'bottom 45%',
            scrub: 0.8,
          },
        }
      );
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      className="py-24 sm:py-32 md:py-40 px-4 sm:px-6 md:px-12 lg:px-20 bg-[#F9F6FC] relative overflow-hidden flex items-center justify-center text-center"
    >
      {/* Background radial accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-[#5C0EA4]/8 via-[#5E9BFF]/8 to-transparent rounded-full blur-3xl -z-10"
      />

      <div className="max-w-4xl mx-auto">
        <p className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-[52px] font-bold leading-[1.25] tracking-tight">
          {words.map((word, index) => (
            <span
              key={index}
              className="scrub-word inline-block mr-[0.28em] last:mr-0 transition-opacity will-change-transform"
              style={{ opacity: 0.2 }}
            >
              {word}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
};

export default StatementSection;
