import React, { useState, useEffect } from "react";
import { MapPin, Eye, EyeOff } from "lucide-react";

/**
 * OfficeMiniMap Component (Bottom-Left)
 * Displays miniature floor plan with live positions of You, Others, and Viewport Box.
 * Allows direct click-to-move across the office.
 */
export const OfficeMiniMap = ({
  position,
  avatars = {},
  selfId,
  currentUserId,
  viewportRef,
  containerRef,
  onNavigate,
  onTeleport,
}) => {
  const [isHidden, setIsHidden] = useState(false);
  const [viewportBox, setViewportBox] = useState({ x: 0, y: 0, w: 25, h: 25 });

  // Update viewport bounding box on scroll & resize
  useEffect(() => {
    const vp = viewportRef?.current;
    if (!vp) return;

    const updateViewportBounds = () => {
      const world = containerRef?.current;
      const mapW = world?.offsetWidth || 3100;
      const mapH = world?.offsetHeight || 2380;

      const scrollL = vp.scrollLeft || 0;
      const scrollT = vp.scrollTop || 0;
      const clientW = vp.clientWidth || 1000;
      const clientH = vp.clientHeight || 800;

      const vx = Math.max(0, Math.min(100, (scrollL / mapW) * 100));
      const vy = Math.max(0, Math.min(100, (scrollT / mapH) * 100));
      const vw = Math.max(5, Math.min(100, (clientW / mapW) * 100));
      const vh = Math.max(5, Math.min(100, (clientH / mapH) * 100));

      setViewportBox({ x: vx, y: vy, w: vw, h: vh });
    };

    updateViewportBounds();
    vp.addEventListener("scroll", updateViewportBounds, { passive: true });
    window.addEventListener("resize", updateViewportBounds);
    const interval = setInterval(updateViewportBounds, 200);

    return () => {
      vp.removeEventListener("scroll", updateViewportBounds);
      window.removeEventListener("resize", updateViewportBounds);
      clearInterval(interval);
    };
  }, [viewportRef, containerRef]);

  // Click on minimap to navigate directly
  const handleMinimapClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
    const clickY = Math.max(2, Math.min(98, ((e.clientY - rect.top) / rect.height) * 100));

    // Shift-click or Alt-click teleports immediately, regular click walks
    if (e.shiftKey || e.altKey) {
      onTeleport?.(clickX, clickY);
    } else {
      onNavigate?.(clickX, clickY);
    }
  };

  const myIdList = [
    String(selfId || ""),
    String(currentUserId || ""),
    String(localStorage.getItem("userId") || ""),
  ].filter(Boolean);

  const otherAvatars = Object.values(avatars || {}).filter(
    (a) => a && a.userId && !myIdList.includes(String(a.userId))
  );

  if (isHidden) {
    return (
      <button
        data-map-no-move
        onClick={() => setIsHidden(false)}
        className="absolute bottom-6 left-6 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-[rgba(204,180,233,0.7)] shadow-lg text-xs font-semibold text-[#5C0EA4] hover:bg-purple-50 transition-all cursor-pointer"
        title="Show Office Map"
      >
        <MapPin className="w-3.5 h-3.5 text-[#5C0EA4]" />
        <span>Office map</span>
      </button>
    );
  }

  return (
    <div
      data-map-no-move
      className="absolute bottom-6 left-6 z-40 w-64 rounded-2xl bg-white/95 backdrop-blur-md border border-[rgba(204,180,233,0.7)] shadow-xl p-3 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-[#0B0E13]">Office map</span>
        <button
          onClick={() => setIsHidden(true)}
          className="text-[11px] font-semibold text-[#5C0EA4] hover:underline cursor-pointer"
        >
          Hide
        </button>
      </div>

      {/* Blueprint Floor Plan Container */}
      <div
        onClick={handleMinimapClick}
        className="relative w-full h-44 bg-[#F9F7FD] border border-[rgba(204,180,233,0.5)] rounded-xl overflow-hidden cursor-crosshair"
        title="Click anywhere to move avatar here"
      >
        {/* ROOM 1: Discussion Room (Top-Left) */}
        <div
          className="absolute rounded border-2 border-[#5C0EA4]/45 bg-[#EFE7F6]/70 flex items-center justify-center"
          style={{ left: "4%", top: "6%", width: "22%", height: "38%" }}
        >
          <div className="w-8 h-4 rounded bg-[#DFD0F2] border border-[#5C0EA4]/30" />
        </div>

        {/* ROOM 2: Meeting Table B / Big Table (Bottom-Left) */}
        <div
          className="absolute rounded border-2 border-[#5E9BFF]/50 bg-[#E8F1FF]/70 flex items-center justify-center"
          style={{ left: "4%", top: "58%", width: "20%", height: "36%" }}
        >
          <div className="w-7 h-5 rounded bg-[#D3E3FD] border border-[#5E9BFF]/40" />
        </div>

        {/* ROOM 3: Desks Grid Area (Center) */}
        <div
          className="absolute rounded border border-[rgba(204,180,233,0.6)] bg-white/70 p-1 flex flex-col justify-around"
          style={{ left: "31%", top: "10%", width: "38%", height: "46%" }}
        >
          <div className="grid grid-cols-4 gap-1 w-full h-full p-0.5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xs bg-[#EFE7F6] border border-purple-200" />
            ))}
          </div>
        </div>

        {/* ROOM 4: Welcome Zone (Bottom-Center) */}
        <div
          className="absolute rounded border border-[#5E9BFF]/60 bg-[#E8F1FF]/80 flex items-center justify-center text-[7px] text-[#1877F2] font-semibold"
          style={{ left: "31%", top: "64%", width: "38%", height: "12%" }}
        >
          Welcome
        </div>

        {/* ROOM 5: Private Room (Bottom-Center-Lower) */}
        <div
          className="absolute rounded border border-[#34C759]/60 bg-[#EAF9EE]/80 flex items-center justify-center text-[7px] text-[#34C759] font-semibold"
          style={{ left: "31%", top: "80%", width: "38%", height: "12%" }}
        >
          Private
        </div>

        {/* ROOM 6: Manager Cabin (Top-Right) */}
        <div
          className="absolute rounded border border-[#9835D4]/60 bg-[#F5EDFD]/80 flex items-center justify-center text-[7px] text-[#9835D4] font-semibold"
          style={{ left: "79%", top: "8%", width: "16%", height: "16%" }}
        >
          Manager
        </div>

        {/* ROOM 7: Supervisor Cabin (Mid-Right) */}
        <div
          className="absolute rounded border border-[#FF5F56]/60 bg-[#FFF0F0]/80 flex items-center justify-center text-[7px] text-[#FF5F56] font-semibold"
          style={{ left: "79%", top: "64%", width: "16%", height: "14%" }}
        >
          Supervisor
        </div>

        {/* ROOM 8: Gaming Room (Bottom-Right) */}
        <div
          className="absolute rounded border border-[#DEA123]/60 bg-[#FFF7E8]/80 flex items-center justify-center text-[7px] text-[#DEA123] font-semibold"
          style={{ left: "79%", top: "80%", width: "16%", height: "14%" }}
        >
          Gaming
        </div>

        {/* LIVE VIEWPORT BOX (Purple Outline) */}
        <div
          className="absolute pointer-events-none border-2 border-[#5C0EA4] bg-[#5C0EA4]/10 rounded shadow-xs transition-all duration-75"
          style={{
            left: `${viewportBox.x}%`,
            top: `${viewportBox.y}%`,
            width: `${viewportBox.w}%`,
            height: `${viewportBox.h}%`,
          }}
        />

        {/* REMOTE TEAMMATES DOTS (Green) */}
        {otherAvatars.map((other) => {
          const ox = typeof other.x === "number" ? other.x : 50;
          const oy = typeof other.y === "number" ? other.y : 50;
          return (
            <div
              key={other.userId}
              className="absolute w-2.5 h-2.5 rounded-full bg-[#34C759] border border-white shadow-sm -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
              style={{ left: `${ox}%`, top: `${oy}%` }}
              title={other.displayName || "Teammate"}
            />
          );
        })}

        {/* LOCAL PLAYER (Blue Dot) */}
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-[#1877F2] border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
          style={{ left: `${position.x}%`, top: `${position.y}%` }}
        >
          <span className="animate-ping absolute inset-0 rounded-full bg-[#1877F2] opacity-75" />
        </div>
      </div>

      {/* Legend & Instructions */}
      <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100 text-[10px] text-gray-500 font-medium">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#1877F2]" />
          <span>You</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#34C759]" />
          <span>Others</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2 border border-[#5C0EA4] bg-[#5C0EA4]/20 rounded-xs" />
          <span>View</span>
        </div>
      </div>
    </div>
  );
};

export default OfficeMiniMap;
