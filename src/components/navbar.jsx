import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useLenis } from './landing/SmoothScroll';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { name: 'Features', target: 'features' },
  { name: 'How It Works', target: 'how-it-works' },
  { name: 'Roles', target: 'roles' },
  { name: 'Showcase', target: 'demo' },
  { name: 'FAQ', target: 'faq' },
];

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lenis = useLenis();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (targetId) => {
    const element = document.getElementById(targetId);
    if (lenis && element) {
      lenis.scrollTo(element, { offset: -90, duration: 1.2 });
    } else if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 sm:px-6 pt-3 sm:pt-4 pointer-events-none">
      <div
        className={`pointer-events-auto w-full max-w-5xl rounded-full transition-all duration-300 ${
          scrolled
            ? 'bg-white/85 backdrop-blur-md border border-[rgba(204,180,233,0.5)] shadow-lg shadow-[#5C0EA4]/5 py-2 px-4 sm:px-6'
            : 'bg-transparent border border-transparent py-2.5 px-4 sm:px-6'
        }`}
      >
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            onClick={() => {
              if (lenis) lenis.scrollTo(0);
              else window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 group cursor-pointer"
          >
            <img
              src={logo}
              alt="VOW"
              className="h-7 sm:h-8 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <span className="text-[#5C0EA4] text-xl sm:text-2xl font-bold tracking-tight font-display">
              VOW
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <ul className="hidden md:flex items-center gap-6 lg:gap-8 list-none m-0 p-0">
            {navLinks.map((link) => (
              <li key={link.target}>
                <button
                  onClick={() => handleNavClick(link.target)}
                  className="text-sm font-medium text-[#707070] hover:text-[#5C0EA4] transition-colors cursor-pointer tracking-tight py-2 px-1 focus-visible:ring-2 focus-visible:ring-[#5C0EA4] focus-visible:outline-none rounded-md"
                >
                  {link.name}
                </button>
              </li>
            ))}
          </ul>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-2.5">
            <Link
              to="/login"
              className="px-4 py-2 min-h-[40px] flex items-center justify-center rounded-full border border-[#5C0EA4]/40 text-[#5C0EA4] text-sm font-medium hover:bg-[#5C0EA4] hover:text-white transition-all cursor-pointer whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#5C0EA4] focus-visible:outline-none"
            >
              Log in
            </Link>

            <Link
              to="/signup"
              className="px-5 py-2 min-h-[40px] flex items-center justify-center rounded-full bg-gradient-to-r from-[#5C0EA4] to-[#5E9BFF] text-white text-sm font-medium shadow-md shadow-[#5C0EA4]/20 hover:brightness-105 active:scale-98 transition-all cursor-pointer whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#5C0EA4] focus-visible:outline-none"
            >
              Sign up
            </Link>
          </div>

          {/* Mobile Hamburger Toggle (44px min tap target) */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#0B0E13] hover:bg-black/5 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#5C0EA4] focus-visible:outline-none"
            aria-label="Toggle navigation"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="w-6 h-6 text-[#5C0EA4]" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {/* Slide-Down Mobile Menu Dropdown */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? 'max-h-96 opacity-100 pt-4 pb-2' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="rounded-2xl bg-white/95 backdrop-blur-md border border-[rgba(204,180,233,0.5)] p-4 shadow-xl flex flex-col gap-3">
            <ul className="flex flex-col gap-1 list-none m-0 p-0">
              {navLinks.map((link) => (
                <li key={link.target}>
                  <button
                    onClick={() => handleNavClick(link.target)}
                    className="w-full text-left py-3 px-3 min-h-[44px] flex items-center rounded-lg text-sm font-medium text-[#707070] hover:text-[#5C0EA4] hover:bg-[#EFE7F6]/50 transition-colors focus-visible:ring-2 focus-visible:ring-[#5C0EA4] focus-visible:outline-none"
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2 pt-2 border-t border-[rgba(204,180,233,0.3)]">
              <Link
                to="/login"
                className="w-full min-h-[44px] flex items-center justify-center rounded-xl border border-[#5C0EA4]/40 text-[#5C0EA4] text-center text-sm font-medium hover:bg-[#5C0EA4] hover:text-white transition-all focus-visible:ring-2 focus-visible:ring-[#5C0EA4] focus-visible:outline-none"
                onClick={() => setIsMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="w-full min-h-[44px] flex items-center justify-center rounded-xl bg-gradient-to-r from-[#5C0EA4] to-[#5E9BFF] text-white text-center text-sm font-medium shadow-md transition-all focus-visible:ring-2 focus-visible:ring-[#5C0EA4] focus-visible:outline-none"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;