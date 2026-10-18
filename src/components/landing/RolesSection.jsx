import React, { useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Briefcase, Eye, Users } from 'lucide-react';

import one from '../../assets/01.svg';
import two from '../../assets/02.svg';
import three from '../../assets/03.svg';
import { Reveal } from './Reveal';

gsap.registerPlugin(ScrollTrigger);

const rolesData = [
  {
    number: '01',
    role: 'Managers',
    tagline: 'Lead with visibility',
    icon: Briefcase,
    description:
      'Create and manage digital offices, assign roles, and customize rooms to fit your organization’s structure. Monitor performance, schedule meetings, and track every project — all from one dashboard.',
    illustration: one,
    gradient: 'from-[#5C0EA4] to-[#450B7B]',
  },
  {
    number: '02',
    role: 'Supervisor',
    tagline: 'Guide with Insight',
    icon: Eye,
    description:
      'Stay on top of your team’s activity and progress with real-time insights. Assign individual tasks, monitor workspace attendance, and give feedback instantly — all while keeping communication open.',
    illustration: two,
    gradient: 'from-[#5C0EA4] to-[#5E9BFF]',
  },
  {
    number: '03',
    role: 'Team Member',
    tagline: 'Collaborate with Freedom',
    icon: Users,
    description:
      'Join your virtual office from anywhere and connect with your team through real-time chat, video calls, or collaborative rooms. Share ideas, track progress, and contribute without missing the energy of a real workspace.',
    illustration: three,
    gradient: 'from-[#5E9BFF] to-[#34C759]',
  },
];

/**
 * Role Card with spotlight hover glow
 */
const RoleCard = ({ role, isMobile = false }) => {
  const cardRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const Icon = role.icon;

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative rounded-3xl bg-white/95 backdrop-blur-xl border border-[rgba(204,180,233,0.5)] shadow-xl shadow-[#5C0EA4]/10 p-7 sm:p-9 md:p-10 flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-[#5C0EA4]/20 w-full h-full"
    >
      {/* Cursor-Following Spotlight Glow Border on Hover */}
      {isHovered && !isMobile && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(92, 14, 164, 0.12), transparent 80%)`,
          }}
        />
      )}

      {/* Top Header of Card */}
      <div className="relative z-10 flex items-center justify-between pb-5 sm:pb-6 border-b border-[rgba(204,180,233,0.3)]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5C0EA4]/10 to-[#5E9BFF]/20 border border-[rgba(204,180,233,0.6)] flex items-center justify-center text-[#5C0EA4] shadow-xs">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-bold text-[#0B0E13] tracking-tight">
              {role.role}
            </h3>
            <span className="text-sm font-medium text-[#5C0EA4]">
              {role.tagline}
            </span>
          </div>
        </div>

        <span className="font-display text-3xl font-extrabold text-[rgba(204,180,233,0.6)]">
          {role.number}
        </span>
      </div>

      {/* Body Description */}
      <div className="relative z-10 py-5 sm:py-6 my-auto">
        <p className="text-base sm:text-lg text-[#4B5563] leading-relaxed font-body">
          {role.description}
        </p>
      </div>

      {/* Illustration Base */}
      <div className="relative z-10 pt-4 border-t border-[rgba(204,180,233,0.25)] flex items-center justify-between">
        <span className="text-xs font-mono font-medium text-[#707070] uppercase tracking-wider">
          Dedicated Workspace Controls
        </span>

        <div className="w-16 h-16 sm:w-20 sm:h-20 relative overflow-hidden flex items-center justify-center">
          <img
            src={role.illustration}
            alt=""
            className="w-full h-auto object-contain drop-shadow-sm select-none pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
};

export const RolesSection = () => {
  const sectionRef = useRef(null);
  const cardRefs = useRef([]);

  useGSAP(
    () => {
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

      if (prefersReduced || isMobile) return;

      const card1 = cardRefs.current[0];
      const card2 = cardRefs.current[1];
      const card3 = cardRefs.current[2];

      if (!card1 || !card2 || !card3) return;

      // Pin section and scrub sticky card stack
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=180%',
          pin: true,
          scrub: 1.2,
          anticipatePin: 1,
        },
      });

      // Step 1: Card 2 slides in over Card 1; Card 1 scales down
      tl.fromTo(
        card2,
        { yPercent: 120, opacity: 0.8 },
        { yPercent: 0, opacity: 1, ease: 'none' },
        0
      );
      tl.to(
        card1,
        { scale: 0.94, opacity: 0.85, y: -16, ease: 'none' },
        0
      );

      // Step 2: Card 3 slides in over Card 2; Card 2 and Card 1 scale down further
      tl.fromTo(
        card3,
        { yPercent: 120, opacity: 0.8 },
        { yPercent: 0, opacity: 1, ease: 'none' },
        1
      );
      tl.to(
        card2,
        { scale: 0.94, opacity: 0.85, y: -16, ease: 'none' },
        1
      );
      tl.to(
        card1,
        { scale: 0.88, opacity: 0.65, y: -32, ease: 'none' },
        1
      );
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="roles"
      ref={sectionRef}
      className="relative bg-[#F9F6FC] overflow-hidden"
    >
      {/* DESKTOP PINNED STICKY STACK (>= 1024px) */}
      <div className="hidden lg:flex flex-col justify-center min-h-screen px-8 xl:px-20 py-12 max-w-6xl mx-auto w-full">
        {/* Section Header */}
        <div className="w-full text-center mb-10">
          <span className="vow-eyebrow mb-3">BUILT FOR YOUR TEAM</span>
          <h2 className="vow-headline-section text-[#0B0E13] tracking-tight">
            Built For Every Team Member
          </h2>
          <p className="text-base sm:text-lg text-[#707070] max-w-2xl font-body mt-2 mx-auto">
            Designed to give managers visibility, supervisors insight, and members freedom.
          </p>
        </div>

        {/* Sticky Card Stack Stage */}
        <div className="relative w-full max-w-3xl mx-auto h-[480px]">
          {rolesData.map((role, idx) => (
            <div
              key={role.number}
              ref={(el) => (cardRefs.current[idx] = el)}
              className="absolute inset-0 w-full h-full transform-gpu origin-top"
              style={{
                zIndex: idx + 1,
                top: `${idx * 24}px`,
              }}
            >
              <RoleCard role={role} isMobile={false} />
            </div>
          ))}
        </div>
      </div>

      {/* MOBILE STACKED LIST (< 1024px) */}
      <div className="lg:hidden py-20 px-4 sm:px-6 max-w-xl mx-auto">
        <div className="text-center mb-12">
          <span className="vow-eyebrow mb-3">BUILT FOR YOUR TEAM</span>
          <h2 className="vow-headline-section text-[#0B0E13] tracking-tight mt-2">
            Built For Every Team Member
          </h2>
          <p className="text-sm sm:text-base text-[#707070] font-body mt-3">
            Designed to give managers visibility, supervisors insight, and members freedom.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {rolesData.map((role) => (
            <Reveal key={role.number} y={24}>
              <RoleCard role={role} isMobile={true} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RolesSection;
