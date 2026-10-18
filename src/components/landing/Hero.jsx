import React, { useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import {
  ArrowRight,
  Play,
  Sparkles,
  Video,
  Building2,
  Users,
  Radio,
  ChevronRight,
} from 'lucide-react';

import defaultAvatar from '../map/map assets/avatar1.jpg';
import OfficePreview2D from './OfficePreview2D';
import MeshGradient from './MeshGradient';

gsap.registerPlugin(ScrollTrigger);

export const Hero = ({ onWatchDemo, onGetStarted }) => {
  const navigate = useNavigate();
  const heroRef = useRef(null);

  // Animation Refs
  const eyebrowRef = useRef(null);
  const headlineWordsRef = useRef([]);
  const headlineSubRef = useRef(null);
  const subtextRef = useRef(null);
  const buttonsRef = useRef(null);
  const trustRef = useRef(null);
  const chipsRef = useRef(null);
  const cardWrapperRef = useRef(null);

  // Mouse Parallax state (desktop only for floating HUD widgets)
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e) => {
    if (typeof window !== 'undefined') {
      if (
        window.innerWidth < 1024 ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMouseOffset({ x, y });
    }
  }, []);

  const handleStart = () => {
    if (onGetStarted) {
      onGetStarted();
    } else {
      navigate('/signup');
    }
  };

  // Entrance animation on load (under 1.4s total)
  useGSAP(
    () => {
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReduced) return;

      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

      // 1. Badge fades in
      tl.fromTo(
        eyebrowRef.current,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.3 }
      );

      // 2. Headline elements rise cleanly in sequence
      tl.fromTo(
        headlineWordsRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.38, stagger: 0.08 },
        '-=0.15'
      );

      tl.fromTo(
        headlineSubRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.32 },
        '-=0.2'
      );

      // 3. Subtext
      tl.fromTo(
        subtextRef.current,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.28 },
        '-=0.15'
      );

      // 4. Buttons
      tl.fromTo(
        buttonsRef.current,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.28 },
        '-=0.15'
      );

      // 5. Trust Proof
      tl.fromTo(
        trustRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.25 },
        '-=0.15'
      );

      // 6. Feature Chips
      tl.fromTo(
        chipsRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.25 },
        '-=0.15'
      );

      // 7. Card slides up with blur-to-sharp
      tl.fromTo(
        cardWrapperRef.current,
        { opacity: 0, y: 40, filter: 'blur(8px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.52, ease: 'power2.out' },
        '-=0.2'
      );
    },
    { scope: heroRef }
  );

  return (
    <section
      id="home"
      ref={heroRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen pt-24 sm:pt-28 md:pt-32 pb-16 px-4 sm:px-6 md:px-12 lg:px-20 bg-[#F9F6FC] overflow-hidden"
    >
      {/* 1. ATMOSPHERIC SAAS BACKGROUND: CONE LIGHT + MESH GRADIENT + ARCH HORIZON */}
      <MeshGradient variant="light" />

      {/* Top Conical Radial Light Source */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-[#5C0EA4]/20 via-[#5E9BFF]/12 to-transparent blur-[140px] -z-10"
      />

      {/* Luminous Arched Horizon Line */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[480px] rounded-[100%] border-t border-[rgba(204,180,233,0.45)] shadow-[0_-15px_40px_rgba(92,14,164,0.12)] -z-10 opacity-70"
      />

      {/* Faint Architectural Dot Grid Fading Out Radially */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: 'radial-gradient(rgba(92, 14, 164, 0.16) 1.2px, transparent 1.2px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 75% 60% at 50% 30%, black 25%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 60% at 50% 30%, black 25%, transparent 78%)',
        }}
      />

      {/* Subtle Noise Texture Overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 right-0 h-full vow-noise-overlay opacity-35 -z-10"
      />

      {/* HERO MAIN COMPOSITION CONTAINER */}
      <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
        {/* 2. SAAS ANNOUNCEMENT PILL */}
        <div
          ref={eyebrowRef}
          className="mb-5 sm:mb-6 inline-flex items-center gap-2.5 px-3.5 sm:px-4 py-1.5 rounded-full bg-white/90 hover:bg-white backdrop-blur-md border border-[rgba(204,180,233,0.7)] shadow-[0_2px_15px_-3px_rgba(92,14,164,0.12)] hover:border-[#5C0EA4]/40 hover:shadow-md transition-all duration-300 group cursor-default"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34C759] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#34C759]" />
          </span>
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#5C0EA4] font-display">
            Virtual Organised World — Where Remote Teams Connect
          </span>
          <ChevronRight className="w-3 h-3 text-[#5C0EA4]/80 group-hover:translate-x-0.5 transition-transform" />
        </div>

        {/* 3. TIGHT ICONIC SAAS HEADLINE — ONE SINGLE LINE */}
        <h1 className="max-w-5xl text-[#0B0E13] mb-3">
          <div className="flex items-center justify-center gap-2.5 sm:gap-4 md:gap-6 whitespace-nowrap leading-none">
            <span
              ref={(el) => (headlineWordsRef.current[0] = el)}
              className="font-display font-black text-[#0B0E13] text-[clamp(1.75rem,5.2vw,5.25rem)] tracking-tight"
            >
              Meet.
            </span>

            <span
              ref={(el) => (headlineWordsRef.current[1] = el)}
              className="font-display font-black text-[#5C0EA4] text-[clamp(1.75rem,5.2vw,5.25rem)] tracking-tight"
            >
              Collaborate.
            </span>

            <span
              ref={(el) => (headlineWordsRef.current[2] = el)}
              className="font-display font-black text-[#0B0E13] text-[clamp(1.75rem,5.2vw,5.25rem)] tracking-tight"
            >
              Create.
            </span>
          </div>

          <span
            ref={headlineSubRef}
            className="block font-display font-black text-[clamp(1.25rem,3.4vw,3.35rem)] bg-gradient-to-r from-[#5C0EA4] via-[#7B2CBF] to-[#5E9BFF] bg-clip-text text-transparent mt-3 sm:mt-4 tracking-tight"
          >
            All In One Virtual Space.
          </span>
        </h1>

        {/* 4. COMPACT 2-3 LINE SUBTEXT */}
        <p
          ref={subtextRef}
          className="max-w-[640px] mx-auto text-base sm:text-[1.125rem] leading-[1.65] font-normal text-[#4B5563] mb-7 sm:mb-8 font-body px-4"
        >
          Experience the most natural way to collaborate remotely. Recreate real presence and team connection online with instant video, voice, chat, and effortless room navigation.
        </p>

        {/* 5. HIGH-CONVERTING SAAS CTA BUTTONS */}
        <div
          ref={buttonsRef}
          className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-4 mb-4 w-full sm:w-auto"
        >
          {/* Primary High-Gloss Button with Shimmer Sweep & Sliding Arrow */}
          <button
            onClick={handleStart}
            className="group relative overflow-hidden w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 min-h-[50px] rounded-xl bg-gradient-to-r from-[#5C0EA4] via-[#6B18B5] to-[#5E9BFF] text-white font-semibold text-base shadow-[0_12px_32px_-8px_rgba(92,14,164,0.45)] hover:shadow-[0_16px_40px_-6px_rgba(92,14,164,0.6)] hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer border-t border-white/30 focus-visible:ring-2 focus-visible:ring-[#5C0EA4] focus-visible:outline-none"
          >
            {/* Shimmer sweep */}
            <span
              aria-hidden="true"
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
            />
            <span className="relative z-10 tracking-tight">Get Started Free</span>
            <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
          </button>

          {/* Secondary Glassmorphic Button with Pulsing Play Icon */}
          <button
            onClick={onWatchDemo}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 min-h-[50px] rounded-xl bg-white/90 hover:bg-white text-[#1B0837] font-semibold text-base border border-[rgba(204,180,233,0.7)] backdrop-blur-md shadow-xs hover:border-[#5C0EA4]/60 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#5C0EA4] focus-visible:outline-none"
          >
            <span className="w-6 h-6 rounded-full bg-[#5C0EA4]/10 flex items-center justify-center text-[#5C0EA4]">
              <Play className="w-3.5 h-3.5 fill-[#5C0EA4] translate-x-0.5" />
            </span>
            Watch 2-Min Demo
          </button>
        </div>

        {/* 6. SAAS SOCIAL PROOF & TRUST STRIP */}
        <div
          ref={trustRef}
          className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-6 text-xs text-[#707070] font-medium"
        >
          <div className="flex items-center -space-x-2">
            <img
              src={defaultAvatar}
              alt=""
              className="w-6 h-6 rounded-full border-2 border-white object-cover shadow-2xs"
            />
            <div className="w-6 h-6 rounded-full border-2 border-white bg-gradient-to-tr from-[#5C0EA4] to-purple-500 flex items-center justify-center text-[9px] text-white font-bold shadow-2xs">
              S
            </div>
            <div className="w-6 h-6 rounded-full border-2 border-white bg-gradient-to-tr from-[#5E9BFF] to-cyan-400 flex items-center justify-center text-[9px] text-white font-bold shadow-2xs">
              A
            </div>
            <div className="w-6 h-6 rounded-full border-2 border-white bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-[9px] text-white font-bold shadow-2xs">
              M
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex text-amber-400">
              {'★★★★★'.split('').map((star, idx) => (
                <span key={idx} className="text-xs">
                  {star}
                </span>
              ))}
            </div>
            <span className="text-[#0B0E13] font-semibold">1,200+</span>
            <span>teams in office</span>
          </div>

          <span className="hidden sm:inline text-gray-300">•</span>
          <span className="hidden sm:inline text-[#707070]">No credit card required</span>
          <span className="hidden sm:inline text-gray-300">•</span>
          <span className="hidden sm:inline text-[#707070]">Instant browser launch</span>
        </div>

        {/* 7. TELEMETRY FEATURE CHIPS */}
        <div
          ref={chipsRef}
          className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10 text-xs font-medium text-[#4B5563]"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-[rgba(204,180,233,0.55)] shadow-2xs hover:border-[#5C0EA4]/40 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5C0EA4]" />
            <Video className="w-3.5 h-3.5 text-[#5C0EA4]" />
            <span>Video, voice & chat</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-[rgba(204,180,233,0.55)] shadow-2xs hover:border-[#5E9BFF]/60 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5E9BFF]" />
            <Building2 className="w-3.5 h-3.5 text-[#5E9BFF]" />
            <span>Rooms you can walk between</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-[rgba(204,180,233,0.55)] shadow-2xs hover:border-[#5C0EA4]/40 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9835D4]" />
            <Sparkles className="w-3.5 h-3.5 text-[#9835D4]" />
            <span>Gemini AI Copilot</span>
          </div>
        </div>

        {/* 8. PRODUCT SHOWCASE WRAPPER WITH FLOATING SAAS HUD TELEMETRY CARDS */}
        <div ref={cardWrapperRef} className="relative w-full max-w-6xl mx-auto">
          {/* Ethereal Spotlight Glow directly behind card */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] h-[380px] rounded-full bg-gradient-to-r from-[#5C0EA4]/25 via-[#5E9BFF]/30 to-[#CCB4E9]/20 blur-[120px] -z-10"
          />

          {/* FLOATING SAAS HUD CARD 1: Spatial Proximity Audio (Top-Left Flank) */}
          <div
            className="hidden xl:flex absolute -left-12 -top-6 z-30 select-none pointer-events-none items-center gap-3 p-3.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-[rgba(204,180,233,0.7)] shadow-xl shadow-purple-950/10 vow-float"
            style={{
              transform: `translate3d(${mouseOffset.x * 16}px, ${mouseOffset.y * 14}px, 0)`,
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5C0EA4] to-[#7B2CBF] text-white flex items-center justify-center shadow-md">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#0B0E13]">Spatial Audio Active</span>
                <span className="w-2 h-2 rounded-full bg-[#34C759] animate-ping" />
              </div>
              <p className="text-[11px] text-[#707070] font-mono mt-0.5">80px Radius • 12ms latency</p>
            </div>
          </div>

          {/* FLOATING SAAS HUD CARD 2: Gemini Copilot Note (Top-Right Flank) */}
          <div
            className="hidden xl:flex absolute -right-12 -top-6 z-30 select-none pointer-events-none items-center gap-3 p-3.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-[rgba(204,180,233,0.7)] shadow-xl shadow-purple-950/10 vow-float-delayed"
            style={{
              transform: `translate3d(${mouseOffset.x * -18}px, ${mouseOffset.y * -16}px, 0)`,
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5E9BFF] to-[#5C0EA4] text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#0B0E13]">Gemini AI Assistant</span>
                <span className="text-[9px] bg-purple-100 text-[#5C0EA4] font-bold px-1.5 py-0.5 rounded">
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-[#707070] mt-0.5">Meeting action items auto-synced</p>
            </div>
          </div>

          {/* FLOATING SAAS HUD CARD 3: Live Proximity Huddle Alert (Bottom-Right Flank) */}
          <div
            className="hidden lg:flex absolute -right-4 -bottom-5 z-30 select-none pointer-events-none items-center gap-2.5 px-4 py-2 rounded-full bg-[#1B0837]/90 text-white backdrop-blur-md border border-white/20 shadow-2xl vow-float"
            style={{
              transform: `translate3d(${mouseOffset.x * -12}px, ${mouseOffset.y * -10}px, 0)`,
            }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34C759] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34C759]" />
            </span>
            <span className="text-xs font-medium">Sarah & Leo started a huddle</span>
            <span className="text-[10px] text-white/50 font-mono">Just now</span>
          </div>

          {/* Thin gradient border wrapper with deep soft shadow & subtle float */}
          <div className="p-[1.5px] rounded-[30px] bg-gradient-to-b from-white via-[#CCB4E9]/80 to-[#5C0EA4]/45 shadow-[0_32px_90px_-20px_rgba(92,14,164,0.26)] vow-float">
            <OfficePreview2D />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
