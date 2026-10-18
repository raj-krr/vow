import React, { useState, useEffect, useRef, useCallback } from "react";
import logo from "../assets/logo.png";
import { Link } from "react-router-dom";
import { useLenis } from "./landing/SmoothScroll";
import { Reveal } from "./landing/Reveal";
import { Send } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export const Footer = ({ onWatchDemo }) => {
  const footerRef = useRef(null);
  const wordmarkRef = useRef(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef(null);
  const lastMouseMoveRef = useRef(0);
  const lenis = useLenis();

  // Smooth scroll navigation function with Lenis integration
  const handleNavigation = (targetId) => {
    if (targetId === "home") {
      if (lenis) lenis.scrollTo(0, { duration: 1.2 });
      else window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const element = document.getElementById(targetId);
    if (lenis && element) {
      lenis.scrollTo(element, { offset: -80, duration: 1.2 });
    } else if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Email submission handler (mailto)
  const handleEmailSubmit = (e) => {
    e.preventDefault();
    const email = e.target.email.value;

    const subject = encodeURIComponent("VOW Newsletter Subscription");
    const body = encodeURIComponent(
      `Hello,\n\nI would like to subscribe to VOW updates with this email: ${email}\n\nThank you!`
    );
    const mailtoLink = `mailto:vow.org8000@gmail.com?subject=${subject}&body=${body}`;

    window.location.href = mailtoLink;
    e.target.reset();
  };

  // Throttled mouse move handler
  const handleMouseMove = useCallback((e) => {
    const now = Date.now();
    if (now - lastMouseMoveRef.current < 16) return;
    lastMouseMoveRef.current = now;

    const rect = e.currentTarget.getBoundingClientRect();
    setMouse({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  // Smooth lerp glow
  useEffect(() => {
    if (!hovered) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const lerp = (start, end, amt) => start + (end - start) * amt;

    const animate = () => {
      setGlowPos((prev) => ({
        x: lerp(prev.x, mouse.x, 0.1),
        y: lerp(prev.y, mouse.y, 0.1),
      }));
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [hovered, mouse]);

  // Wordmark slide-up scrub animation
  useGSAP(
    () => {
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReduced || !wordmarkRef.current || !footerRef.current) return;

      gsap.fromTo(
        wordmarkRef.current,
        { yPercent: 45, opacity: 0.05 },
        {
          yPercent: 28,
          opacity: 0.16,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: footerRef.current,
            start: 'top 85%',
            end: 'bottom bottom',
            scrub: 1.2,
          },
        }
      );
    },
    { scope: footerRef }
  );

  return (
    <footer
      ref={footerRef}
      className="relative text-[#EFEFEF] bg-gradient-to-b from-[#1B0837] via-[#16062d] to-[#0e041d] px-4 sm:px-6 md:px-12 lg:px-20 pt-8 sm:pt-12 pb-0 overflow-hidden border-none"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Background Interactive Ambient Glow */}
      {hovered && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 280px at ${glowPos.x}px ${glowPos.y}px, rgba(94, 155, 255, 0.08), transparent 80%)`,
          }}
        />
      )}

      {/* Footer Main Content with Reveal Fade-Up */}
      <Reveal y={24} className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-16 relative z-10">
          {/* Column 1: Brand Info & CTA */}
          <div className="md:col-span-5 flex flex-col items-start space-y-4 text-left">
            <div className="flex items-center gap-3 mb-2">
              <img
                src={logo}
                alt="VOW Logo"
                className="h-10 w-auto object-contain select-none"
              />
              <div>
                <h3 className="font-display text-2xl font-bold text-white tracking-tight leading-none">
                  VOW
                </h3>
                <p className="text-sm font-medium text-[#CCB4E9]">
                  Virtual Organised World
                </p>
              </div>
            </div>

            <p className="text-[#969696] text-sm sm:text-base leading-relaxed max-w-sm font-body">
              Experience the most natural way to collaborate remotely.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/signup"
                className="px-5 py-2.5 min-h-[44px] flex items-center justify-center rounded-xl text-sm font-medium bg-[#5E9BFF] text-[#0B0E13] hover:brightness-110 active:scale-98 transition shadow-sm focus-visible:ring-2 focus-visible:ring-[#5E9BFF] focus-visible:outline-none"
              >
                Get Started
              </Link>

              <button
                onClick={() => {
                  if (onWatchDemo) onWatchDemo();
                  else handleNavigation("demo");
                }}
                className="px-5 py-2.5 min-h-[44px] flex items-center justify-center rounded-xl text-sm font-medium border border-white/20 text-white hover:bg-white/10 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#5E9BFF] focus-visible:outline-none"
              >
                Watch Demo
              </button>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="md:col-span-3 text-left">
            <h4 className="font-display text-lg font-bold text-white mb-5 tracking-tight">
              Quick Links
            </h4>
            <ul className="space-y-1 list-none p-0 m-0 text-sm font-body">
              {[
                { name: "Home", target: "home" },
                { name: "Features", target: "features" },
                { name: "How It Works", target: "how-it-works" },
                { name: "Roles", target: "roles" },
                { name: "Showcase", target: "demo" },
                { name: "FAQ", target: "faq" },
                { name: "Contact Us", target: "subscribe" },
              ].map((link, idx) => (
                <li key={idx}>
                  <button
                    onClick={() => handleNavigation(link.target)}
                    className="text-[#969696] hover:text-[#5E9BFF] transition-colors cursor-pointer bg-transparent border-none py-1.5 px-1 min-h-[44px] flex items-center focus-visible:ring-2 focus-visible:ring-[#5E9BFF] focus-visible:outline-none rounded"
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Newsletter Subscribe */}
          <div id="subscribe" className="md:col-span-4 text-left">
            <h4 className="font-display text-lg font-bold text-white mb-2 tracking-tight">
              Subscribe
            </h4>
            <p className="text-[#969696] text-sm mb-5 font-body leading-relaxed">
              If you would like to receive daily updates, please write your email.
            </p>

            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <div className="relative">
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Enter your email"
                  aria-label="Email address"
                  className="w-full h-11 min-h-[44px] px-4 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-gray-500 outline-none focus:border-[#5E9BFF] focus-visible:ring-2 focus-visible:ring-[#5E9BFF] transition"
                />
              </div>
              <button
                type="submit"
                className="w-full h-11 min-h-[44px] px-6 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#5C0EA4] to-[#5E9BFF] text-white hover:brightness-110 active:scale-98 transition shadow-md flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#5E9BFF] focus-visible:outline-none"
              >
                <span>Subscribe</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Terms */}
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-[#969696] gap-4 relative z-10">
          <p>© 2026 VOW. All rights reserved.</p>
          <p>Virtual Organised World - Where Remote Teams Connect.</p>
          <div>
            <Link
              to="/terms"
              className="text-gray-400 hover:text-white transition-colors underline underline-offset-4 py-2 px-1 min-h-[44px] inline-flex items-center focus-visible:ring-2 focus-visible:ring-[#5E9BFF] focus-visible:outline-none rounded"
            >
              Terms & Conditions
            </Link>
          </div>
        </div>
      </Reveal>

      {/* Huge Bleeding VOW Wordmark at Footer Bottom */}
      <div
        ref={wordmarkRef}
        aria-hidden="true"
        className="pointer-events-none select-none w-full text-center overflow-hidden z-0 mt-4 sm:mt-6"
        style={{ transform: 'translateY(28%)' }}
      >
        <span className="block font-display font-black text-[22vw] leading-[0.72] tracking-tighter bg-gradient-to-r from-[#5C0EA4] via-[#5E9BFF] to-[#CCB4E9] bg-clip-text text-transparent opacity-20">
          VOW
        </span>
      </div>
    </footer>
  );
};

export default Footer;