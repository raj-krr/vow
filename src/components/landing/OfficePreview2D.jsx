import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Mic, Video, Monitor, PhoneOff, Sparkles, Volume2 } from 'lucide-react';
import defaultAvatar from '../map/map assets/avatar1.jpg';

gsap.registerPlugin(ScrollTrigger);

export const OfficePreview2D = ({ className = '' }) => {
  const containerRef = useRef(null);
  const cardRef = useRef(null);

  useGSAP(
    () => {
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

      if (prefersReduced || isMobile) {
        gsap.set(cardRef.current, { rotateX: 0, scale: 1 });
        return;
      }

      gsap.fromTo(
        cardRef.current,
        {
          rotateX: 20,
          scale: 0.92,
          transformPerspective: 1200,
        },
        {
          rotateX: 0,
          scale: 1,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 85%',
            end: 'top 25%',
            scrub: 1.2,
          },
        }
      );
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className={`w-full max-w-6xl mx-auto ${className}`}>
      {/* 3D Perspective Card Container */}
      <div
        ref={cardRef}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative w-full rounded-3xl bg-white/95 border border-[rgba(204,180,233,0.45)] shadow-[0_24px_60px_-15px_rgba(92,14,164,0.14)] overflow-hidden transition-shadow duration-500 hover:shadow-[0_30px_70px_-15px_rgba(92,14,164,0.22)]"
      >
        {/* Top Control Bar of the Digital Office */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(204,180,233,0.3)] bg-gradient-to-r from-purple-50/80 via-white to-purple-50/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
              <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
            </div>
            <span className="text-xs font-semibold text-[#0B0E13] tracking-wide ml-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
              HQ Main Campus — Virtual Floor 01
            </span>
          </div>

          {/* Centered SaaS URL & Command Bar Pill */}
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/90 border border-[rgba(204,180,233,0.5)] text-[11px] text-[#707070] font-mono shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5C0EA4]" />
            <span className="text-[#0B0E13] font-medium font-sans">vow.app/hq-campus</span>
            <span className="text-[9px] text-gray-500 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded font-mono">
              ⌘K
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#707070]">
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[rgba(204,180,233,0.4)] text-[11px] font-medium text-[#5C0EA4]">
              <Sparkles className="w-3 h-3 text-[#5E9BFF]" />
              Gemini AI Active
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white border border-[rgba(204,180,233,0.4)] text-[11px] font-medium text-[#0B0E13]">
              4 Teammates Online
            </span>
          </div>
        </div>

        {/* 2D Office Architectural Floor Plan */}
        <div className="relative w-full h-[400px] sm:h-[480px] md:h-[540px] vow-noise-overlay bg-[#FAF8FD] overflow-hidden select-none">
          {/* Subtle architectural grid lines */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(204, 180, 233, 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(204, 180, 233, 0.25) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* ROOM 1: BOARDROOM (Top-Left) */}
          <div className="absolute top-4 left-4 w-[46%] sm:w-[44%] h-[46%] rounded-2xl border-2 border-dashed border-[rgba(204,180,233,0.7)] bg-white/70 backdrop-blur-sm p-3.5 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[rgba(204,180,233,0.25)]">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#5C0EA4] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5C0EA4]" />
                Executive Boardroom
              </span>
              <span className="text-[10px] text-gray-500 font-medium bg-[#EFE7F6] px-1.5 py-0.5 rounded">
                Room A
              </span>
            </div>

            {/* Conference Table & Chairs */}
            <div className="relative w-full h-[78%] flex items-center justify-center">
              {/* Presentation Screen on Wall */}
              <div className="absolute top-0 w-28 sm:w-36 h-3 bg-gradient-to-r from-[#450B7B] to-[#5E9BFF] rounded-b-md shadow-sm flex items-center justify-center">
                <span className="text-[7px] text-white tracking-widest font-mono uppercase">
                  Sprint Planning Display
                </span>
              </div>

              {/* Table */}
              <div className="w-28 sm:w-40 h-14 sm:h-18 rounded-xl bg-gradient-to-br from-[#EDE4F8] to-[#DFD0F2] border border-[rgba(204,180,233,0.8)] shadow-inner flex items-center justify-center">
                <span className="text-[9px] text-[#5C0EA4] font-semibold tracking-wide">
                  Conference Table
                </span>
              </div>

              {/* Chairs around table */}
              <div className="absolute top-2 w-5 h-5 rounded-full bg-white border border-[rgba(204,180,233,0.8)] shadow-xs" />
              <div className="absolute bottom-2 w-5 h-5 rounded-full bg-white border border-[rgba(204,180,233,0.8)] shadow-xs" />
              <div className="absolute left-6 w-5 h-5 rounded-full bg-white border border-[rgba(204,180,233,0.8)] shadow-xs" />
              <div className="absolute right-6 w-5 h-5 rounded-full bg-white border border-[rgba(204,180,233,0.8)] shadow-xs" />

              {/* Avatar: Sarah (Manager) */}
              <div className="absolute left-10 sm:left-14 top-4 flex flex-col items-center z-20">
                <div className="relative">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#5C0EA4] border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-xs">
                    S
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#34C759] border-2 border-white" />
                </div>
                <div className="mt-1 px-1.5 py-0.5 rounded-full bg-[#450B7B] text-white text-[9px] font-semibold tracking-tight whitespace-nowrap shadow-xs">
                  Sarah (Manager)
                </div>
              </div>
            </div>
          </div>

          {/* ROOM 2: FOCUS POD (Top-Right) */}
          <div className="absolute top-4 right-4 w-[28%] sm:w-[24%] h-[46%] rounded-2xl border-2 border-dashed border-[rgba(204,180,233,0.7)] bg-white/70 backdrop-blur-sm p-3.5 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[rgba(204,180,233,0.25)]">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#5C0EA4]">
                Focus Pod
              </span>
              <span className="text-[9px] text-[#34C759] font-medium bg-green-50 px-1 rounded">
                Quiet
              </span>
            </div>

            <div className="relative w-full h-[78%] flex flex-col items-center justify-center gap-2">
              <div className="w-16 h-8 rounded-lg bg-[#EFE7F6] border border-[rgba(204,180,233,0.6)] flex items-center justify-center">
                <div className="w-6 h-3 rounded bg-[#5C0EA4]/20" />
              </div>
              <span className="text-[8px] text-gray-400 font-mono">Soundproof 01</span>
            </div>
          </div>

          {/* ROOM 3: BREAKOUT LOUNGE (Bottom-Left) */}
          <div className="absolute bottom-4 left-4 w-[38%] sm:w-[35%] h-[44%] rounded-2xl border-2 border-dashed border-[rgba(204,180,233,0.7)] bg-white/70 backdrop-blur-sm p-3.5 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[rgba(204,180,233,0.25)]">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#5C0EA4]">
                Breakout Lounge
              </span>
              <span className="text-[9px] text-gray-500 font-medium">Coffee & Chill</span>
            </div>

            <div className="relative w-full h-[78%] flex items-center justify-center">
              {/* L-Sofa */}
              <div className="w-20 sm:w-28 h-12 rounded-xl bg-gradient-to-r from-[#DFD0F2] to-[#EAE0F7] border border-[rgba(204,180,233,0.8)] shadow-inner flex items-center justify-center">
                <div className="w-8 h-6 rounded-full bg-white/60 border border-[rgba(204,180,233,0.5)] flex items-center justify-center text-[7px] text-gray-600">
                  Coffee
                </div>
              </div>
            </div>
          </div>

          {/* ROOM 4: OPEN WORKSPACE (Bottom-Right) */}
          <div className="absolute bottom-4 right-4 w-[54%] sm:w-[57%] h-[44%] rounded-2xl border-2 border-dashed border-[rgba(204,180,233,0.7)] bg-white/70 backdrop-blur-sm p-3.5 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[rgba(204,180,233,0.25)]">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#5C0EA4]">
                Open Workspace
              </span>
              <span className="text-[10px] text-[#5E9BFF] font-medium bg-blue-50 px-1.5 py-0.5 rounded">
                Desk Cluster
              </span>
            </div>

            {/* Desks setup */}
            <div className="relative w-full h-[78%] flex items-center justify-around px-2">
              <div className="w-20 sm:w-24 h-12 rounded-lg bg-[#EFE7F6] border border-[rgba(204,180,233,0.7)] flex flex-col items-center justify-center shadow-xs">
                <div className="w-8 h-2 rounded bg-[#5C0EA4]/30 mb-1" />
                <span className="text-[8px] text-gray-500 font-mono">Desk A1</span>
              </div>

              {/* Avatar: Alex (Supervisor) */}
              <div className="flex flex-col items-center z-10 vow-avatar-walk-1">
                <div className="relative">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#5E9BFF] border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-xs">
                    A
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#34C759] border border-white" />
                </div>
                <div className="mt-1 px-1.5 py-0.5 rounded-full bg-[#0B0E13] text-white text-[8px] font-semibold whitespace-nowrap shadow-xs">
                  Alex (Supervisor)
                </div>
              </div>

              <div className="w-20 sm:w-24 h-12 rounded-lg bg-[#EFE7F6] border border-[rgba(204,180,233,0.7)] flex flex-col items-center justify-center shadow-xs">
                <div className="w-8 h-2 rounded bg-[#5C0EA4]/30 mb-1" />
                <span className="text-[8px] text-gray-500 font-mono">Desk A2</span>
              </div>
            </div>
          </div>

          {/* CENTRAL COLLABORATION CROSSING — WHERE LEO & MAYA MEET */}
          <div className="absolute top-[48%] left-[45%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-30">
            {/* The Proximity Ring that pulses when avatars meet */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-[#5E9BFF]/15 border border-[#5E9BFF]/40 vow-pulse-ring" />
              <div className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#5C0EA4]/10 border border-[#5C0EA4]/30 animate-ping opacity-25" />

              {/* Interaction zone label */}
              <div className="absolute -top-7 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#5C0EA4] to-[#5E9BFF] text-white text-[8px] sm:text-[9px] font-semibold tracking-wide whitespace-nowrap shadow-sm flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                Proximity Huddle Triggered
              </div>

              {/* Avatar: Maya */}
              <div className="relative flex flex-col items-center -mr-2 z-20">
                <div className="relative">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-xs">
                    M
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#34C759] border border-white" />
                </div>
                <div className="mt-1 px-1.5 py-0.5 rounded-full bg-white/90 border border-purple-200 text-[#0B0E13] text-[8px] sm:text-[9px] font-medium shadow-xs">
                  Maya
                </div>
              </div>

              {/* Avatar: Leo (Approaches slowly) */}
              <div className="relative flex flex-col items-center -ml-2 z-20 vow-avatar-walk-2">
                <div className="relative">
                  <img
                    src={defaultAvatar}
                    alt="Leo"
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-white shadow-md"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#34C759] border border-white" />
                </div>
                <div className="mt-1 px-1.5 py-0.5 rounded-full bg-white/90 border border-purple-200 text-[#0B0E13] text-[8px] sm:text-[9px] font-medium shadow-xs">
                  Leo
                </div>
              </div>
            </div>
          </div>

          {/* FLOATING MINI VIDEO-CALL TILE (Top-Right or Bottom-Right) */}
          <div className="absolute bottom-5 left-5 z-40 max-w-[240px] sm:max-w-[270px] rounded-2xl bg-[#1B0837]/90 backdrop-blur-md border border-white/20 p-2.5 sm:p-3 text-white shadow-2xl vow-float">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
                <span className="text-[10px] font-semibold tracking-wide text-white/90">
                  Direct 1-on-1 Huddle
                </span>
              </div>
              <span className="text-[9px] font-mono text-[#5E9BFF] bg-white/10 px-1.5 py-0.5 rounded">
                02:14
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Mini video tile Leo */}
              <div className="relative w-14 h-12 rounded-lg bg-[#240A44] border border-white/10 overflow-hidden flex items-center justify-center">
                <img src={defaultAvatar} alt="" className="w-full h-full object-cover opacity-90" />
                <span className="absolute bottom-0.5 left-1 text-[7px] font-medium bg-black/60 px-1 rounded text-white">
                  Leo
                </span>
              </div>

              {/* Mini video tile Maya */}
              <div className="relative w-14 h-12 rounded-lg bg-gradient-to-tr from-pink-900 to-purple-900 border border-white/10 overflow-hidden flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-pink-500 text-white font-bold text-[10px] flex items-center justify-center">
                  M
                </div>
                <span className="absolute bottom-0.5 left-1 text-[7px] font-medium bg-black/60 px-1 rounded text-white">
                  Maya
                </span>
              </div>

              {/* Controls */}
              <div className="flex flex-col gap-1 ml-auto">
                <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-white/90">
                  <Mic className="w-2.5 h-2.5" />
                </div>
                <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-white/90">
                  <Video className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="px-5 py-2.5 border-t border-[rgba(204,180,233,0.3)] bg-white/90 flex flex-wrap items-center justify-between text-xs text-[#707070]">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#5C0EA4]" />
            <span className="text-[11px] font-medium text-[#0B0E13]">
              Proximity threshold: 80px triggers automatic direct video/voice
            </span>
          </div>
          <span className="text-[11px] text-[#5C0EA4] font-medium">
            Drag to pan • Click to walk
          </span>
        </div>
      </div>
    </div>
  );
};

export default OfficePreview2D;
