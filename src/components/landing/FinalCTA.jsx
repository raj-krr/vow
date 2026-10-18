import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ArrowRight, Mail } from 'lucide-react';
import { WordReveal } from './Reveal';
import MeshGradient from './MeshGradient';

gsap.registerPlugin(ScrollTrigger);

export const FinalCTA = ({ onGetStarted }) => {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const buttonRef = useRef(null);
  const [btnOffset, setBtnOffset] = useState({ x: 0, y: 0 });

  // Desktop magnetic hover for "Get Started" button
  const handleMouseMove = useCallback((e) => {
    if (typeof window !== 'undefined') {
      if (
        window.innerWidth < 1024 ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }
    }
    const btn = buttonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    setBtnOffset({
      x: dx * 0.25,
      y: dy * 0.25,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setBtnOffset({ x: 0, y: 0 });
  }, []);

  const handleStart = () => {
    if (onGetStarted) {
      onGetStarted();
    } else {
      navigate('/signup');
    }
  };

  return (
    <section
      ref={sectionRef}
      className="relative pt-28 sm:pt-36 pb-20 sm:pb-28 px-4 sm:px-6 md:px-12 lg:px-20 bg-[#1B0837] text-white overflow-hidden"
    >
      {/* Cinematic Animated Dark Mesh Gradient Background */}
      <MeshGradient variant="dark" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 vow-noise-overlay-dark opacity-60 -z-10"
      />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Eyebrow */}
        <span className="vow-eyebrow-dark mb-6">START COLLABORATING</span>

        {/* Word-by-Word Headline Reveal */}
        <h2 className="vow-headline-section text-white mb-6">
          <WordReveal
            text="Ready to Transform Your Remote Team's Workday?"
            wordClassName="text-white"
            delay={0.15}
          />
        </h2>

        {/* Subheadline */}
        <p className="max-w-2xl mx-auto text-base sm:text-xl text-[#CCB4E9] font-body mb-12 sm:mb-16 leading-relaxed">
          Experience the most natural way to collaborate remotely.
        </p>

        {/* Action Buttons with Desktop Magnetic Hover */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="w-full sm:w-auto p-2"
          >
            <button
              ref={buttonRef}
              onClick={handleStart}
              style={{
                transform: `translate3d(${btnOffset.x}px, ${btnOffset.y}px, 0)`,
                transition: btnOffset.x === 0 ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 min-h-[48px] rounded-xl bg-gradient-to-r from-[#5C0EA4] to-[#5E9BFF] text-white font-medium text-lg shadow-xl shadow-[#5C0EA4]/40 hover:brightness-110 active:scale-98 transition-shadow cursor-pointer focus-visible:ring-4 focus-visible:ring-[#5E9BFF] focus-visible:outline-none"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <a
            href="mailto:vow.org8000@gmail.com?subject=Inquiry%20about%20VOW%20Platform"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 min-h-[48px] rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-lg border border-white/20 backdrop-blur-md transition-all cursor-pointer focus-visible:ring-4 focus-visible:ring-[#5E9BFF] focus-visible:outline-none"
          >
            <Mail className="w-5 h-5 text-[#5E9BFF]" />
            Contact Us
          </a>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
