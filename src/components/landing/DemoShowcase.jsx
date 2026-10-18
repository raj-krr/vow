import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Play, ArrowRight } from 'lucide-react';
import demoVideo from '../../assets/demovideo.mp4';

gsap.registerPlugin(ScrollTrigger);

export const DemoShowcase = ({ onWatchDemo, onGetStarted }) => {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const videoCardRef = useRef(null);
  const headerRef = useRef(null);
  const actionsRef = useRef(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);

  // Lazy-load the 5.4MB video only when the section approaches viewport (400px margin)
  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadVideo(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useGSAP(
    () => {
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

      if (prefersReduced || isMobile) {
        // Mobile & reduced motion: Simple scale-in only
        if (videoCardRef.current) {
          gsap.fromTo(
            videoCardRef.current,
            { scale: 0.9, opacity: 0.85, borderRadius: '1.5rem' },
            {
              scale: 1,
              opacity: 1,
              borderRadius: '1.5rem',
              ease: 'power2.out',
              scrollTrigger: {
                trigger: sectionRef.current,
                start: 'top 85%',
                end: 'top 30%',
                scrub: 1,
              },
            }
          );
        }
        return;
      }

      // Desktop: Zoom Reveal (Pin section, scale from ~60% to full viewport width with corner radius shrinking, then unpin)
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=100%',
          pin: true,
          scrub: 1.2,
          anticipatePin: 1,
        },
      });

      tl.fromTo(
        videoCardRef.current,
        {
          scale: 0.6,
          borderRadius: '40px',
        },
        {
          scale: 1.15,
          borderRadius: '4px',
          ease: 'power1.inOut',
        }
      );

      // Subtle fade of header to focus on full-viewport video
      if (headerRef.current) {
        tl.fromTo(
          headerRef.current,
          { opacity: 1, y: 0 },
          { opacity: 0.3, y: -20, ease: 'power1.inOut' },
          0
        );
      }
    },
    { scope: sectionRef }
  );

  const handleStart = () => {
    if (onGetStarted) {
      onGetStarted();
    } else {
      navigate('/signup');
    }
  };

  const handleVideoKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onWatchDemo();
    }
  };

  return (
    <section
      id="demo"
      ref={sectionRef}
      className="min-h-screen flex flex-col justify-center py-20 sm:py-28 px-4 sm:px-6 md:px-12 lg:px-20 bg-[#F9F6FC] relative overflow-hidden"
    >
      <div className="max-w-6xl mx-auto w-full text-center flex flex-col items-center">
        {/* Header (Eyebrow + Heading + Subtitle) */}
        <div ref={headerRef} className="w-full max-w-4xl mx-auto transition-opacity duration-300">
          <span className="vow-eyebrow mb-4">PRODUCT SHOWCASE</span>
          <h2 className="vow-headline-section text-[#0B0E13] tracking-tight mb-4">
            See How VOW Transforms Your Workday
          </h2>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#707070] font-body mb-8 sm:mb-12">
            Take a quick tour of how teams connect, collaborate, and create inside their virtual office.
          </p>
        </div>

        {/* Video Thumbnail Container with scrubbed Zoom Reveal */}
        <div
          ref={videoCardRef}
          onClick={onWatchDemo}
          onKeyDown={handleVideoKeyDown}
          role="button"
          tabIndex={0}
          aria-label="Play product demo video walkthrough"
          className="relative w-full max-w-5xl mx-auto aspect-video overflow-hidden shadow-2xl shadow-[#5C0EA4]/20 border border-[rgba(204,180,233,0.5)] group cursor-pointer bg-[#1B0837] focus-visible:ring-4 focus-visible:ring-[#5C0EA4] focus-visible:outline-none transform-gpu origin-center"
          style={{ willChange: 'transform, border-radius' }}
        >
          {/* Lazy-loaded looping video preview (only loads when near viewport) */}
          {shouldLoadVideo ? (
            <video
              src={demoVideo}
              muted
              autoPlay
              loop
              playsInline
              preload="metadata"
              className="w-full h-full object-cover opacity-90 group-hover:scale-105 group-hover:opacity-100 transition-all duration-700 pointer-events-none"
            />
          ) : (
            <div className="w-full h-full bg-[#1B0837] flex items-center justify-center">
              <div className="w-full h-full vow-noise-overlay-dark opacity-60" />
            </div>
          )}

          {/* Dark Glass Overlay with Centered Play Button */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#5C0EA4] transition-all duration-300 shadow-2xl">
              <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white ml-1" />
            </div>
          </div>

          {/* Top & Bottom Badges */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-medium flex items-center gap-2 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
            Live Platform Tour
          </div>

          <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-mono pointer-events-none">
            Click to watch video
          </div>
        </div>

        {/* Action Buttons Below Video */}
        <div ref={actionsRef} className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 sm:mt-12 w-full sm:w-auto z-10">
          <button
            onClick={onWatchDemo}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 min-h-[44px] rounded-xl bg-white text-[#450B7B] font-medium text-base border border-[rgba(204,180,233,0.6)] shadow-xs hover:border-[#5C0EA4] hover:shadow-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#5C0EA4] focus-visible:outline-none"
          >
            <Play className="w-4 h-4 text-[#5C0EA4] fill-[#5C0EA4]" />
            Watch Demo
          </button>

          <button
            onClick={handleStart}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 min-h-[44px] rounded-xl bg-gradient-to-r from-[#5C0EA4] to-[#5E9BFF] text-white font-medium text-base shadow-lg shadow-[#5C0EA4]/25 hover:brightness-105 active:scale-98 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#5C0EA4] focus-visible:outline-none"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default DemoShowcase;
