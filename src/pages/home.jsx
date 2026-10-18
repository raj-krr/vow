import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { X } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import SmoothScroll from '../components/landing/SmoothScroll';
import Navbar from '../components/navbar';
import Hero from '../components/landing/Hero';
import CapabilitiesStrip from '../components/landing/CapabilitiesStrip';
import StatementSection from '../components/landing/StatementSection';
import FeaturesDark from '../components/landing/FeaturesDark';
import HowItWorks from '../components/landing/HowItWorks';
import RolesSection from '../components/landing/RolesSection';
import DemoShowcase from '../components/landing/DemoShowcase';
import FAQ from '../components/landing/FAQ';
import FinalCTA from '../components/landing/FinalCTA';
import Footer from '../components/footer';
import AvatarCursor from '../components/landing/AvatarCursor';

import api from '../api/axiosConfig';
import { setUserProfile } from '../components/userslice';
import demoVideo from '../assets/demovideo.mp4';

gsap.registerPlugin(ScrollTrigger);

const Home = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayOpaque, setOverlayOpaque] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const getCurrentUser = await api.get('me/info');
        if (getCurrentUser.data && getCurrentUser.data.success) {
          dispatch(setUserProfile(getCurrentUser.data.data));
          navigate('/dashboard');
        }
      } catch (error) {
        // Not logged in, stay on landing page
      }
    };

    fetchCurrentUser();
  }, [dispatch, navigate]);

  // Ensure ScrollTrigger refreshes accurately after fonts & assets load
  useEffect(() => {
    const handleRefresh = () => {
      ScrollTrigger.refresh();
    };

    if (document.fonts) {
      document.fonts.ready.then(handleRefresh);
    }
    window.addEventListener('load', handleRefresh);
    const timer = setTimeout(handleRefresh, 600);

    return () => {
      window.removeEventListener('load', handleRefresh);
      clearTimeout(timer);
    };
  }, []);

  const goToSignupWithOverlay = () => {
    setShowOverlay(true);
    requestAnimationFrame(() => setOverlayOpaque(true));
    setTimeout(() => {
      navigate('/signup', { state: { entryOverlay: true } });
    }, 450);
  };

  return (
    <SmoothScroll>
      <div className="min-h-screen bg-[#F9F6FC] text-[#0B0E13] font-body selection:bg-[#5C0EA4] selection:text-white">
        {/* DESKTOP INTERACTIVE AVATAR CURSOR */}
        <AvatarCursor hide={showDemoModal} />

        {/* FLOATING GLASS NAVBAR */}
        <Navbar />

        {/* HERO SECTION */}
        <Hero
          onWatchDemo={() => setShowDemoModal(true)}
          onGetStarted={goToSignupWithOverlay}
        />

        {/* 1. CAPABILITIES STRIP (LIGHT) */}
        <CapabilitiesStrip />

        {/* 2. STATEMENT SECTION (LIGHT) */}
        <StatementSection />

        {/* 3. FEATURES (DARK #1B0837, id="features") */}
        <FeaturesDark />

        {/* 4. HOW IT WORKS (LIGHT #F9F6FC, id="how-it-works") */}
        <HowItWorks />

        {/* 5. ROLES (LIGHT, id="roles") */}
        <RolesSection />

        {/* 6. DEMO SHOWCASE (LIGHT #F9F6FC, id="demo") */}
        <DemoShowcase
          onWatchDemo={() => setShowDemoModal(true)}
          onGetStarted={goToSignupWithOverlay}
        />

        {/* 7. FAQ (LIGHT, id="faq") */}
        <FAQ />

        {/* 8. FINAL CTA (DARK #1B0837) */}
        <FinalCTA onGetStarted={goToSignupWithOverlay} />

        {/* 9. FOOTER (DARK, CONTINUING SEAMLESSLY FROM CTA) */}
        <Footer onWatchDemo={() => setShowDemoModal(true)} />

        {/* FULLSCREEN DEMO VIDEO MODAL (TRIGGERED BY ANY "WATCH DEMO" ACTION) */}
        {showDemoModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Product demo video"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn"
          >
            <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden bg-black border border-white/20 shadow-2xl">
              <button
                onClick={() => setShowDemoModal(false)}
                className="absolute top-3 right-3 z-10 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                aria-label="Close demo modal"
              >
                <X className="w-5 h-5" />
              </button>
              <video
                src={demoVideo}
                controls
                autoPlay
                className="w-full max-h-[80vh] object-contain"
              />
            </div>
          </div>
        )}

        {/* PAGE TRANSITION OVERLAY */}
        <div
          aria-hidden="true"
          className={`fixed inset-0 z-60 bg-[#450B7B] transition-opacity duration-500 ${
            overlayOpaque ? 'opacity-100' : 'opacity-0'
          } ${showOverlay ? '' : 'pointer-events-none'}`}
        />
      </div>
    </SmoothScroll>
  );
};

export default Home;
