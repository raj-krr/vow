import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Building2, Navigation, Share2 } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: '01',
    icon: Building2,
    title: 'Create or Join Your Workspace',
    description:
      'Set up a custom digital office for fresh projects or enter a Workspace ID to join your team immediately.',
    detail: 'Dashboard • Quick Workspace Setup',
  },
  {
    number: '02',
    icon: Navigation,
    title: 'Navigate Rooms & Spark Conversations',
    description:
      'Move your avatar freely between desks, lounges, and meeting halls to initiate spontaneous video, voice, or text huddles.',
    detail: 'Spatial 2D Movement • Proximity Huddles',
  },
  {
    number: '03',
    icon: Share2,
    title: 'Collaborate, Share Files & Meet',
    description:
      'Share project files, launch conference meetings, and maintain team momentum with full visibility across your workspace.',
    detail: 'WebRTC SFU Calls • Integrated File Sharing',
  },
];

export const HowItWorks = () => {
  const sectionRef = useRef(null);
  const lineRef = useRef(null);
  const [activeSteps, setActiveSteps] = useState([false, false, false]);

  useGSAP(
    () => {
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReduced) {
        if (lineRef.current) gsap.set(lineRef.current, { scaleY: 1 });
        setActiveSteps([true, true, true]);
        return;
      }

      // Vertical line drawing animation scrubbed to scroll
      if (lineRef.current) {
        gsap.fromTo(
          lineRef.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 70%',
              end: 'bottom 65%',
              scrub: 0.6,
            },
          }
        );
      }

      // Track individual steps lighting up as scroll progresses
      steps.forEach((_, index) => {
        ScrollTrigger.create({
          trigger: `#how-step-${index}`,
          start: 'top 72%',
          onEnter: () => {
            setActiveSteps((prev) => {
              const updated = [...prev];
              updated[index] = true;
              return updated;
            });
          },
          onLeaveBack: () => {
            setActiveSteps((prev) => {
              const updated = [...prev];
              updated[index] = false;
              return updated;
            });
          },
        });
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="py-24 sm:py-32 px-4 sm:px-6 md:px-12 lg:px-20 bg-[#F9F6FC] relative overflow-hidden"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16 sm:mb-24">
          <span className="vow-eyebrow mb-4">SIMPLE ONBOARDING</span>
          <h2 className="vow-headline-section text-[#0B0E13] tracking-tight">
            How VOW Works
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#707070] max-w-2xl mx-auto font-body">
            Get your digital office up and running in three simple steps.
          </p>
        </div>

        {/* Steps Timeline Container */}
        <div className="relative">
          {/* Vertical Background Line */}
          <div
            aria-hidden="true"
            className="absolute left-6 md:left-1/2 top-4 bottom-8 w-[3px] -translate-x-1/2 bg-[rgba(204,180,233,0.35)] rounded-full"
          >
            {/* Animated Progress Line */}
            <div
              ref={lineRef}
              className="w-full h-full bg-gradient-to-b from-[#5C0EA4] via-[#5E9BFF] to-[#5C0EA4] origin-top rounded-full"
              style={{ transform: 'scaleY(0)' }}
            />
          </div>

          <div className="space-y-12 sm:space-y-20 relative">
            {steps.map((step, index) => {
              const isActive = activeSteps[index];
              const isEven = index % 2 === 1; // Step 2 (index 1) goes right on desktop
              const Icon = step.icon;

              return (
                <div
                  id={`how-step-${index}`}
                  key={step.number}
                  className={`relative flex items-center md:justify-between flex-col md:flex-row ${
                    isEven ? 'md:flex-row-reverse' : ''
                  }`}
                >
                  {/* Step Card */}
                  <div
                    className={`ml-14 md:ml-0 w-[calc(100%-4rem)] md:w-[44%] p-6 sm:p-8 rounded-3xl transition-all duration-500 border ${
                      isActive
                        ? 'bg-white/95 border-[rgba(204,180,233,0.7)] shadow-xl shadow-[#5C0EA4]/10 translate-y-0 opacity-100'
                        : 'bg-white/50 border-transparent opacity-40 translate-y-3'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                          isActive
                            ? 'bg-gradient-to-r from-[#5C0EA4] to-[#5E9BFF] text-white shadow-md'
                            : 'bg-purple-100 text-[#5C0EA4]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-mono font-medium text-[#707070] px-2.5 py-1 rounded-full bg-purple-50 border border-purple-100">
                        {step.detail}
                      </span>
                    </div>

                    <h3
                      className={`font-display text-xl sm:text-2xl font-bold mb-3 tracking-tight transition-colors ${
                        isActive ? 'text-[#0B0E13]' : 'text-[#707070]'
                      }`}
                    >
                      {step.title}
                    </h3>

                    <p className="text-sm sm:text-base text-[#707070] leading-relaxed font-body">
                      {step.description}
                    </p>
                  </div>

                  {/* Center Node Badge (Desktop Center, Mobile Left) */}
                  <div className="absolute left-6 md:left-1/2 -translate-x-1/2 top-6 md:top-1/2 md:-translate-y-1/2 z-20">
                    <div
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center font-display font-bold text-sm sm:text-base transition-all duration-500 shadow-md ${
                        isActive
                          ? 'bg-gradient-to-tr from-[#5C0EA4] to-[#5E9BFF] text-white border-white scale-110 shadow-lg shadow-[#5C0EA4]/30'
                          : 'bg-white text-[#707070] border-[rgba(204,180,233,0.6)] scale-95'
                      }`}
                    >
                      {step.number}
                    </div>
                  </div>

                  {/* Empty Spacer on opposite side for desktop alternation */}
                  <div className="hidden md:block w-[44%]" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
