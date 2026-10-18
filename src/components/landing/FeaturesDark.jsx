import React, { useState, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import {
  LayoutGrid,
  Navigation,
  Video,
  BarChart3,
  Sparkles,
  ChevronRight,
  Mic,
  Camera,
} from 'lucide-react';
import { Reveal } from './Reveal';

import defaultAvatar from '../map/map assets/avatar1.jpg';
import deskSvg from '../map/map assets/desk.svg';
import desk2Svg from '../map/map assets/desk2.svg';
import smallRoomSvg from '../map/map assets/small room.svg';
import bigTableSvg from '../map/map assets/big table.svg';
import helpDeskSvg from '../map/map assets/HelpDesk.svg';
import receptionSvg from '../map/map assets/Reception.svg';
import privateRoomDeskSvg from '../map/map assets/privateroomdesk.svg';
import teleportSvg from '../map/map assets/Teleport.svg';
import tableSvg from '../map/map assets/table.svg';
import joystickSvg from '../map/map assets/joystickleft.svg';

gsap.registerPlugin(ScrollTrigger);

const featuresData = [
  {
    id: 'workspaces',
    icon: LayoutGrid,
    title: 'Custom Workspaces',
    description:
      "Create rooms, meeting halls, and collaboration zones designed for your team's workflow.",
    tag: 'Architectural Layouts',
    tourLabel: 'Full Campus Overview',
  },
  {
    id: 'navigation',
    icon: Navigation,
    title: 'Room Navigation',
    description:
      'Move freely between rooms just like in a physical office — stay connected and engaged.',
    tag: 'Spatial Presence',
    tourLabel: 'Boardroom Navigation',
  },
  {
    id: 'communication',
    icon: Video,
    title: 'Real-Time Communication',
    description: 'Connect via video, voice, and chat in one seamless experience.',
    tag: 'Instant Huddles',
    tourLabel: 'Proximity Video & Audio',
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Analytics and Insights',
    description: 'View engagement and activity metrics to guide smarter decisions.',
    tag: 'Team Intelligence',
    tourLabel: 'Workstation Activity',
  },
];

/**
 * Reusable Zone Badge matching in-game button
 */
const ZoneBadge = ({ label }) => (
  <div className="absolute bottom-1 left-1 z-10 flex items-center gap-1 border border-[#385D99] bg-[#E7F0FF] py-0.5 px-1.5 rounded shadow-xs pointer-events-none select-none">
    <span className="font-semibold text-[#385D99] text-[8px] sm:text-[9px] leading-tight">
      {label}
    </span>
    <ChevronRight className="w-2.5 h-2.5 text-[#385D99]" />
  </div>
);

/**
 * Interactive Floor Plan Scene with Camera Pan & Zoom
 */
const OfficeTourStage = ({ activeIndex = 0, isStatic = false }) => {
  // Camera transform based on activeIndex
  // Step 0: Overview (1, 0, 0)
  // Step 1: Discussion/Boardroom (1.9, 26, 20)
  // Step 2: Proximity Corridor / Welcome (1.95, -6, -16)
  // Step 3: Cabins Open Workspace (1.75, 2, 16)
  const cameraTransforms = [
    { scale: 1, x: 0, y: 0, label: 'Overview — 8 Architectural Zones' },
    { scale: 1.9, x: 26, y: 20, label: 'Boardroom — Meeting Hall in Focus' },
    { scale: 1.95, x: -6, y: -16, label: 'Proximity Huddle — Direct Video & Audio Triggered' },
    { scale: 1.75, x: 2, y: 16, label: 'Cabins — 20 Workstation Cluster' },
  ];

  const currentCam = isStatic ? cameraTransforms[0] : cameraTransforms[activeIndex] || cameraTransforms[0];

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl bg-white select-none">
      {/* Top Scene HUD Header */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2.5 bg-white/90 backdrop-blur-md border-b border-[rgba(204,180,233,0.3)] text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
          <span className="font-semibold text-[#0B0E13] text-[11px] font-display">
            {currentCam.label}
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EFE7F6] text-[#5C0EA4] font-medium border border-[rgba(204,180,233,0.5)]">
          Stage 0{activeIndex + 1}/04
        </span>
      </div>

      {/* Camera Viewport Stage */}
      <div
        className="w-full h-full transform-gpu origin-center transition-transform duration-700 ease-out pt-10"
        style={{
          transform: isStatic
            ? 'none'
            : `scale(${currentCam.scale}) translate(${currentCam.x}%, ${currentCam.y}%)`,
        }}
      >
        <div className="relative w-full h-full">
          {/* Subtle architectural grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(204, 180, 233, 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(204, 180, 233, 0.3) 1px, transparent 1px)',
              backgroundSize: '30px 30px',
            }}
          />

          {/* 1. TOP-LEFT: DISCUSSION ROOM */}
          <div
            className={`absolute border-2 border-dashed rounded-lg bg-white/80 flex items-center justify-center p-1.5 transition-all duration-500 ${
              activeIndex === 1 ? 'border-[#5C0EA4] shadow-lg ring-2 ring-[#5C0EA4]/20' : 'border-[#385D99]'
            }`}
            style={{ left: '3%', top: '4%', width: '15%', height: '38%' }}
          >
            <img src={smallRoomSvg} alt="" className="w-full h-full object-contain pointer-events-none" />
            <ZoneBadge label="Discussion Room" />
          </div>

          {/* Teleport Spot Left */}
          <div className="absolute z-10" style={{ left: '8.5%', top: '46%' }}>
            <img src={teleportSvg} alt="" className="w-6 h-6" />
          </div>

          {/* 2. BOTTOM-LEFT: CONFERENCE HALL */}
          <div
            className="absolute border-2 border-dashed border-[#385D99] rounded-lg bg-white/80 flex items-center justify-center p-1.5"
            style={{ left: '3%', top: '56%', width: '15%', height: '40%' }}
          >
            <img src={bigTableSvg} alt="" className="w-full h-full object-contain pointer-events-none" />
            <ZoneBadge label="Conference Hall" />
          </div>

          {/* 3. CENTER-TOP: CABINS */}
          <div
            className={`absolute border-2 border-dashed rounded-lg bg-white/80 p-2 transition-all duration-500 ${
              activeIndex === 3 ? 'border-[#5C0EA4] shadow-lg ring-2 ring-[#5C0EA4]/20' : 'border-[#385D99]'
            }`}
            style={{ left: '21%', top: '4%', width: '48%', height: '52%' }}
          >
            <div className="w-full h-full grid grid-cols-4 grid-rows-5 gap-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="flex items-center justify-center w-full h-full relative">
                  <img src={deskSvg} alt="" className="w-full h-full object-contain max-h-[30px]" />
                  {activeIndex === 3 && i % 3 === 0 && (
                    <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
                  )}
                </div>
              ))}
            </div>
            <ZoneBadge label="Cabins" />
          </div>

          {/* 4. AVATAR & PROXIMITY HUD IN CORRIDOR */}
          <div
            className="absolute z-20 flex items-center justify-center pointer-events-none transition-all duration-700 ease-out"
            style={{
              left: activeIndex === 1 ? '16%' : activeIndex === 3 ? '42%' : '56%',
              top: activeIndex === 1 ? '24%' : activeIndex === 3 ? '25%' : '59%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="relative flex items-center justify-center">
              {/* Proximity Ring activates strongly in Stage 2 */}
              <div
                className={`absolute rounded-full transition-all duration-500 ${
                  activeIndex === 2
                    ? 'w-24 h-24 bg-[#5E9BFF]/25 border-2 border-[#5E9BFF] animate-ping opacity-75'
                    : 'w-16 h-16 bg-[#5E9BFF]/10 border border-[#5E9BFF]/30 opacity-40'
                }`}
              />

              {activeIndex === 2 && (
                <div className="absolute -top-6 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#5C0EA4] to-[#5E9BFF] text-white text-[8px] font-semibold whitespace-nowrap shadow-md flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Proximity Huddle Triggered
                </div>
              )}

              {/* Main Avatar: Leo */}
              <div className="relative flex flex-col items-center">
                <div className="relative">
                  <img
                    src={defaultAvatar}
                    alt="Leo"
                    className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-md"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#34C759] border border-white" />
                </div>
                <span className="mt-0.5 px-1 rounded bg-white/90 text-[#0B0E13] text-[7px] font-semibold shadow-xs">
                  Leo
                </span>
              </div>

              {/* Second Avatar in Proximity (Maya) */}
              {activeIndex === 2 && (
                <div className="relative flex flex-col items-center ml-2">
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 border-2 border-white shadow-md flex items-center justify-center text-white text-[9px] font-bold">
                      M
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#34C759] border border-white" />
                  </div>
                  <span className="mt-0.5 px-1 rounded bg-white/90 text-[#0B0E13] text-[7px] font-semibold shadow-xs">
                    Maya
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 5. CENTER-MIDDLE: WELCOME ZONE */}
          <div
            className={`absolute border-2 border-dashed rounded-lg bg-white/80 flex items-center justify-around px-2 transition-all duration-500 ${
              activeIndex === 2 ? 'border-[#5C0EA4] shadow-lg ring-2 ring-[#5C0EA4]/20' : 'border-[#A8C2ED]'
            }`}
            style={{ left: '23%', top: '64%', width: '44%', height: '14%' }}
          >
            <div className="flex flex-col items-center">
              <span className="font-semibold text-[#385D99] text-[7px] mb-0.5">Helpdesk</span>
              <img src={helpDeskSvg} alt="" className="h-6 w-auto object-contain" />
            </div>
            <div className="border border-[#A8C2ED] border-dashed bg-white px-2 py-0.5 rounded">
              <span className="font-semibold text-[#385D99] text-[8px]">Lobby</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-semibold text-[#385D99] text-[7px] mb-0.5">Reception</span>
              <img src={receptionSvg} alt="" className="h-6 w-auto object-contain" />
            </div>
            <ZoneBadge label="Welcome Zone" />
          </div>

          {/* 6. CENTER-BOTTOM: PRIVATE ROOMS */}
          <div
            className="absolute border-2 border-dashed border-[#385D99] rounded-lg bg-white/80 flex items-center justify-around px-2"
            style={{ left: '23%', top: '81%', width: '44%', height: '15%' }}
          >
            {Array.from({ length: 4 }).map((_, idx) => (
              <img key={idx} src={privateRoomDeskSvg} alt="" className="h-9 w-auto object-contain" />
            ))}
            <ZoneBadge label="Private Rooms" />
          </div>

          {/* 7. TOP-RIGHT: MANAGER CABIN */}
          <div
            className="absolute border-2 border-dashed border-[#385D99] rounded-lg bg-white/80 flex items-center justify-center p-1.5"
            style={{ left: '81%', top: '4%', width: '16%', height: '16%' }}
          >
            <img src={desk2Svg} alt="" className="h-9 w-auto object-contain" />
            <ZoneBadge label="Manager Cabin" />
          </div>

          {/* Teleport Spot Top Right */}
          <div className="absolute z-10" style={{ left: '73%', top: '8%' }}>
            <img src={teleportSvg} alt="" className="w-6 h-6" />
          </div>

          {/* 8. MIDDLE-RIGHT: DISCUSSION ROOM */}
          <div
            className="absolute border-2 border-dashed border-[#385D99] rounded-lg bg-white/80 flex items-center justify-center p-1.5"
            style={{ left: '76%', top: '24%', width: '16%', height: '38%' }}
          >
            <img src={smallRoomSvg} alt="" className="w-full h-full object-contain pointer-events-none" />
            <ZoneBadge label="Discussion Room" />
          </div>

          {/* Teleport Spot Lower Right */}
          <div className="absolute z-10" style={{ left: '69%', top: '68%' }}>
            <img src={teleportSvg} alt="" className="w-6 h-6" />
          </div>

          {/* 9. BOTTOM-RIGHT UPPER: SUPERVISOR CABIN */}
          <div
            className="absolute border-2 border-dashed border-[#385D99] rounded-lg bg-white/80 flex items-center justify-center p-1.5"
            style={{ left: '81%', top: '65%', width: '16%', height: '15%' }}
          >
            <img src={desk2Svg} alt="" className="h-9 w-auto object-contain" />
            <ZoneBadge label="Supervisor Cabin" />
          </div>

          {/* 10. BOTTOM-RIGHT LOWER: GAMING SECTION */}
          <div
            className="absolute border-2 border-dashed border-[#385D99] rounded-lg bg-white/80 flex items-center justify-center p-1.5"
            style={{ left: '81%', top: '82%', width: '16%', height: '14%' }}
          >
            <div className="relative flex items-center justify-center">
              <img src={tableSvg} alt="" className="w-16 h-auto object-contain" />
              <div className="absolute w-4 h-4 right-1 top-0">
                <img src={joystickSvg} alt="" className="w-full h-full object-contain" />
              </div>
              <div className="absolute w-4 h-4 left-1 top-0">
                <img src={joystickSvg} alt="" className="w-full h-full object-contain rotate-180" />
              </div>
            </div>
            <ZoneBadge label="Gaming Section" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const FeaturesDark = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef(null);

  useGSAP(
    () => {
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

      if (prefersReduced || isMobile) return;

      const trigger = ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: () => '+=' + Math.round(window.innerHeight * 2),
        pin: true,
        scrub: 1.2,
        anticipatePin: 1,
        onUpdate: (self) => {
          const step = Math.min(3, Math.floor(self.progress * 4));
          setActiveIndex(step);
        },
      });

      if (document.fonts) {
        document.fonts.ready.then(() => {
          ScrollTrigger.refresh();
        });
      }

      return () => {
        trigger.kill();
      };
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative bg-[#1B0837] text-white overflow-hidden vow-noise-overlay-dark"
    >
      {/* Background ambient lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-0 w-[600px] h-[600px] bg-[#5C0EA4]/20 rounded-full blur-[140px] -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#5E9BFF]/10 rounded-full blur-[140px] -z-10"
      />

      {/* DESKTOP PINNED SCROLL-DRIVEN OFFICE TOUR (>= 1024px) */}
      <div className="hidden lg:flex min-h-screen flex-col justify-center px-8 lg:px-16 xl:px-24 max-w-7xl mx-auto py-10">
        {/* Section Header */}
        <div className="mb-8">
          <span className="vow-eyebrow-dark mb-3">POWERFUL COLLABORATION</span>
          <h2 className="vow-headline-section text-white tracking-tight">
            All Your Work — In One Virtual Space
          </h2>
        </div>

        {/* 2-Column Split: Features List Left, Scroll-Driven Office Tour Right */}
        <div className="grid grid-cols-12 gap-8 xl:gap-12 items-center">
          {/* Left Column: 4 Feature items synced with scroll */}
          <div className="col-span-5 flex flex-col gap-3.5">
            {featuresData.map((feature, index) => {
              const isActive = activeIndex === index;
              const Icon = feature.icon;

              return (
                <button
                  key={feature.id}
                  onClick={() => setActiveIndex(index)}
                  className={`text-left p-4.5 rounded-2xl transition-all duration-300 cursor-pointer border ${
                    isActive
                      ? 'bg-white/10 border-[rgba(204,180,233,0.35)] shadow-xl shadow-black/40 scale-[1.02]'
                      : 'bg-transparent border-transparent opacity-40 hover:opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-1.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-gradient-to-r from-[#5C0EA4] to-[#5E9BFF] text-white shadow-md'
                          : 'bg-white/10 text-gray-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-[#5E9BFF] uppercase tracking-wider block">
                        {feature.tourLabel}
                      </span>
                      <h3
                        className={`font-display text-base xl:text-lg font-bold tracking-tight transition-colors ${
                          isActive ? 'text-white' : 'text-gray-300'
                        }`}
                      >
                        {feature.title}
                      </h3>
                    </div>
                  </div>

                  <p
                    className={`text-xs xl:text-sm leading-relaxed transition-colors font-body pl-12 ${
                      isActive ? 'text-purple-100' : 'text-gray-400'
                    }`}
                  >
                    {feature.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right Column: Scroll-Driven Office Floor Plan Stage */}
          <div className="col-span-7">
            <div className="relative w-full h-[480px] xl:h-[520px] rounded-3xl bg-white/95 border border-[rgba(204,180,233,0.3)] shadow-2xl overflow-hidden backdrop-blur-xl">
              <OfficeTourStage activeIndex={activeIndex} isStatic={false} />
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE STACKED LAYOUT (< 1024px) - STATIC VERSION */}
      <div className="lg:hidden py-20 px-4 sm:px-6 max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <span className="vow-eyebrow-dark mb-3">POWERFUL COLLABORATION</span>
          <h2 className="vow-headline-section text-white tracking-tight mt-1">
            All Your Work — In One Virtual Space
          </h2>
        </div>

        {/* Mobile Floor Plan Overview */}
        <div className="w-full h-[360px] sm:h-[420px] rounded-2xl overflow-hidden mb-10 border border-white/20 shadow-xl">
          <OfficeTourStage activeIndex={0} isStatic={true} />
        </div>

        <div className="flex flex-col gap-6">
          {featuresData.map((feature) => {
            const Icon = feature.icon;
            return (
              <Reveal key={feature.id} y={20}>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 shadow-md">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#5C0EA4] to-[#5E9BFF] text-white flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-[#5E9BFF] uppercase tracking-wider block">
                        {feature.tag}
                      </span>
                      <h3 className="font-display text-lg font-bold text-white">
                        {feature.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-purple-100 font-body leading-relaxed pl-12">
                    {feature.description}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesDark;
