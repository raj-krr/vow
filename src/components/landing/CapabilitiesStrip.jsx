import React, { useState } from 'react';
import { Video, Users, Building2, Sparkles, Activity, ShieldCheck } from 'lucide-react';
import { Reveal } from './Reveal';

/**
 * Bento Grid Capabilities Section
 * - Bento layout with 1 prominent large card + varied sizes
 * - Staggered entrance animation via Reveal
 * - Dynamic cursor-tracked subtle hover glow on each card
 * - Strictly maintains approved copy and palette
 */
const BentoCard = ({ children, className = '', glowColor = 'rgba(92, 14, 164, 0.15)' }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative reveal-child group overflow-hidden rounded-3xl bg-white/85 backdrop-blur-md border border-[rgba(204,180,233,0.45)] shadow-sm hover:shadow-[0_16px_40px_-12px_rgba(92,14,164,0.18)] hover:border-[#5C0EA4]/40 hover:-translate-y-1 transition-all duration-300 ${className}`}
    >
      {/* Dynamic Radial Glow following cursor */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px rounded-3xl transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, ${glowColor}, transparent 60%)`,
        }}
      />
      <div className="relative z-10 h-full flex flex-col justify-between p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
};

export const CapabilitiesStrip = () => {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 md:px-12 lg:px-20 bg-[#F9F6FC] border-y border-[rgba(204,180,233,0.3)] relative z-10">
      <div className="max-w-7xl mx-auto">
        {/* Bento Grid */}
        <Reveal stagger={0.12} y={28} className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {/* 1. LARGE HERO CARD (2 Columns): Real-Time Video, Voice & Chat */}
          <BentoCard
            className="md:col-span-2 min-h-[220px] sm:min-h-[260px] bg-gradient-to-br from-white via-white/90 to-purple-50/40"
            glowColor="rgba(92, 14, 164, 0.22)"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5C0EA4]/12 to-[#5E9BFF]/20 border border-[rgba(204,180,233,0.6)] flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <Video className="w-6 h-6 text-[#5C0EA4]" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFE7F6] border border-[rgba(204,180,233,0.5)] text-[11px] font-semibold text-[#5C0EA4] tracking-wide">
                  <Activity className="w-3 h-3 text-[#34C759] animate-pulse" />
                  Spatial Proximity
                </span>
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-[#0B0E13] mb-2 tracking-tight">
                Real-Time Video, Voice & Chat
              </h3>
              <p className="text-sm sm:text-base text-[#707070] font-body leading-relaxed max-w-xl">
                Proximity huddles and video calls
              </p>
            </div>

            {/* Subtle bottom audio waves / visual accent */}
            <div className="mt-6 pt-4 border-t border-[rgba(204,180,233,0.25)] flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase text-[#707070] tracking-wider">
                Instant Video & Voice Mesh
              </span>
              <div className="flex items-center gap-1 ml-auto">
                <span className="w-1 h-3 rounded-full bg-[#5C0EA4]/40 animate-pulse" />
                <span className="w-1 h-5 rounded-full bg-[#5C0EA4]/70 animate-pulse delay-75" />
                <span className="w-1 h-2 rounded-full bg-[#5E9BFF] animate-pulse delay-150" />
                <span className="w-1 h-4 rounded-full bg-[#5C0EA4] animate-pulse" />
              </div>
            </div>
          </BentoCard>

          {/* 2. CARD (1 Column): Integrated Gemini AI Copilot */}
          <BentoCard
            className="md:col-span-1 min-h-[220px] sm:min-h-[260px] bg-gradient-to-br from-white via-white/90 to-blue-50/30"
            glowColor="rgba(94, 155, 255, 0.25)"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5E9BFF]/20 to-[#5C0EA4]/10 border border-[rgba(204,180,233,0.6)] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
                <Sparkles className="w-6 h-6 text-[#5E9BFF]" />
              </div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-[#0B0E13] mb-2 tracking-tight">
                Integrated Gemini AI Copilot
              </h3>
              <p className="text-sm text-[#707070] font-body leading-relaxed">
                In-app AI assistant for workspace help
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[rgba(204,180,233,0.25)] flex items-center justify-between text-[11px] font-medium text-[#5C0EA4]">
              <span>Intelligent Assistance</span>
              <span className="w-2 h-2 rounded-full bg-[#34C759]" />
            </div>
          </BentoCard>

          {/* 3. CARD (1 Column): Multi-Room Spatial Workspaces */}
          <BentoCard
            className="md:col-span-1 min-h-[220px] sm:min-h-[260px] bg-gradient-to-br from-white via-white/90 to-purple-50/30"
            glowColor="rgba(92, 14, 164, 0.18)"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5C0EA4]/10 to-[#5E9BFF]/15 border border-[rgba(204,180,233,0.6)] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
                <Building2 className="w-6 h-6 text-[#5C0EA4]" />
              </div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-[#0B0E13] mb-2 tracking-tight">
                Multi-Room Spatial Workspaces
              </h3>
              <p className="text-sm text-[#707070] font-body leading-relaxed">
                Meeting rooms, open desks, and lounges
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[rgba(204,180,233,0.25)] flex items-center gap-1.5 text-[11px] text-[#707070]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5E9BFF]" />
              <span>Boardrooms & Cabins</span>
            </div>
          </BentoCard>

          {/* 4. CARD (2 Columns): 3 Structured Roles */}
          <BentoCard
            className="md:col-span-2 min-h-[220px] sm:min-h-[260px] bg-gradient-to-br from-white via-white/90 to-purple-50/40"
            glowColor="rgba(92, 14, 164, 0.2)"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5C0EA4]/12 to-[#5E9BFF]/15 border border-[rgba(204,180,233,0.6)] flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <Users className="w-6 h-6 text-[#5C0EA4]" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs font-medium px-2.5 py-0.5 rounded-md bg-[#EFE7F6] text-[#5C0EA4] border border-[rgba(204,180,233,0.5)]">
                    Manager
                  </span>
                  <span className="text-[10px] sm:text-xs font-medium px-2.5 py-0.5 rounded-md bg-blue-50 text-[#5E9BFF] border border-blue-200">
                    Supervisor
                  </span>
                  <span className="text-[10px] sm:text-xs font-medium px-2.5 py-0.5 rounded-md bg-gray-50 text-gray-700 border border-gray-200">
                    Member
                  </span>
                </div>
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-[#0B0E13] mb-2 tracking-tight">
                3 Structured Roles
              </h3>
              <p className="text-sm sm:text-base text-[#707070] font-body leading-relaxed max-w-xl">
                Manager, Supervisor, and Team Member roles
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[rgba(204,180,233,0.25)] flex items-center gap-2 text-[11px] font-mono text-[#707070]">
              <ShieldCheck className="w-4 h-4 text-[#34C759]" />
              <span>Granular Workspace Permissions & Room Access</span>
            </div>
          </BentoCard>
        </Reveal>
      </div>
    </section>
  );
};

export default CapabilitiesStrip;
