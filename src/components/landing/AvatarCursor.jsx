import React, { useEffect, useRef, useState } from 'react';
import defaultAvatar from '../map/map assets/avatar1.jpg';

/**
 * Avatar Cursor (Desktop Only)
 * - Small avatar dot with a "You" name tag follows pointer with slight lag
 * - Grows a pulse ring over buttons, links, and interactive elements
 * - Automatically hidden on touch devices, form inputs, and when demo modal is open
 * - 100% pointer-events: none, ensuring zero interference with clicking/tapping
 */
export const AvatarCursor = ({ hide = false }) => {
  const cursorRef = useRef(null);
  const posRef = useRef({ x: -100, y: -100 });
  const targetRef = useRef({ x: -100, y: -100 });
  const [isInteractive, setIsInteractive] = useState(false);
  const [isOverInput, setIsOverInput] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Detect touch / mobile devices
    const checkTouch = () => {
      return (
        typeof window !== 'undefined' &&
        ('ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          window.matchMedia('(pointer: coarse)').matches ||
          window.innerWidth < 1024)
      );
    };

    if (checkTouch()) {
      setIsTouchDevice(true);
      return;
    }

    const handlePointerMove = (e) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);

      const target = e.target;
      if (!target) return;

      // Check if cursor is over form inputs
      const isInput = Boolean(
        target.closest('input, textarea, select, [contenteditable="true"]')
      );
      setIsOverInput(isInput);

      // Check if cursor is over buttons, links, or interactive controls
      const isClickable = Boolean(
        target.closest('button, a, [role="button"], input[type="submit"], [data-cursor-hover]')
      );
      setIsInteractive(isClickable);
    };

    const handlePointerLeave = () => {
      setIsVisible(false);
    };

    // Smooth lerp animation loop
    let animId;
    const updatePosition = () => {
      const cursor = cursorRef.current;
      if (cursor) {
        // Slight lag factor
        posRef.current.x += (targetRef.current.x - posRef.current.x) * 0.2;
        posRef.current.y += (targetRef.current.y - posRef.current.y) * 0.2;

        cursor.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`;
      }
      animId = requestAnimationFrame(updatePosition);
    };

    animId = requestAnimationFrame(updatePosition);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', handlePointerLeave);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener('mouseleave', handlePointerLeave);
    };
  }, [isVisible]);

  if (isTouchDevice) return null;

  const shouldShow = isVisible && !isOverInput && !hide;

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      className={`fixed top-0 left-0 pointer-events-none z-50 will-change-transform transition-opacity duration-200 ${
        shouldShow ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        transform: 'translate3d(-100px, -100px, 0)',
        marginTop: '-12px',
        marginLeft: '-12px',
      }}
    >
      <div className="relative flex items-center gap-1.5 select-none">
        {/* Pulse Ring (Blooms over clickable elements) */}
        <div
          className={`absolute -inset-2 rounded-full border transition-all duration-300 pointer-events-none ${
            isInteractive
              ? 'scale-150 border-[#5E9BFF] bg-[#5E9BFF]/20 animate-pulse'
              : 'scale-100 border-transparent bg-transparent'
          }`}
        />

        {/* Small Avatar Dot */}
        <div className="relative w-6 h-6 rounded-full border-2 border-white shadow-md overflow-hidden bg-[#5C0EA4] shrink-0">
          <img
            src={defaultAvatar}
            alt=""
            className="w-full h-full object-cover select-none pointer-events-none"
          />
          <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-[#34C759] border border-white" />
        </div>

        {/* "You" Name Tag */}
        <span
          className={`px-1.5 py-0.5 rounded-full bg-[#5C0EA4] text-white text-[9px] font-semibold tracking-tight shadow-md whitespace-nowrap transition-transform duration-200 ${
            isInteractive ? 'scale-105' : 'scale-100'
          }`}
        >
          You
        </span>
      </div>
    </div>
  );
};

export default AvatarCursor;
