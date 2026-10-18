import React, { useState } from "react";
import { X, Zap, Users, MapPin } from "lucide-react";

/**
 * All Predefined Teleport Places (matching office map layout)
 */
export const TELEPORT_PLACES = [
  { name: "Manager Cabin", color: "#9835D4", x: 84.5, y: 15 },
  { name: "Supervisor Cabin", color: "#FF5F56", x: 84.5, y: 74 },
  { name: "Gaming Room", color: "#DEA123", x: 84.5, y: 88 },
  { name: "Private Room", color: "#34C759", x: 35, y: 85 },
  { name: "Welcome Zone", color: "#1877F2", x: 35, y: 68 },
  { name: "Main Cabin", color: "#5C0EA4", x: 75, y: 20 },
  { name: "Meeting Table A", color: "#00B894", x: 12.5, y: 22 },
  { name: "Meeting Table B", color: "#00CEC9", x: 11, y: 76 },
  { name: "Discussion Room", color: "#6C5CE7", x: 12.5, y: 22 },
];

/**
 * TeleportPanel Component (Top-Right)
 * Allows instant teleportation to any room/place or directly to a teammate.
 */
export const TeleportPanel = ({
  avatars = {},
  selfId,
  currentUserId,
  onTeleport,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("places"); // "people" | "places"

  const myIdList = [
    String(selfId || ""),
    String(currentUserId || ""),
    String(localStorage.getItem("userId") || ""),
  ].filter(Boolean);

  const otherPeople = Object.values(avatars || {}).filter(
    (a) => a && a.userId && !myIdList.includes(String(a.userId))
  );

  if (!isOpen) {
    return (
      <button
        data-map-no-move
        onClick={() => setIsOpen(true)}
        className="absolute top-4 right-4 z-40 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-[rgba(204,180,233,0.7)] shadow-xl text-xs font-bold text-[#5C0EA4] hover:bg-purple-50 transition-all cursor-pointer group"
        title="Open Teleport Menu"
      >
        <Zap className="w-4 h-4 text-[#5C0EA4] group-hover:scale-110 transition-transform" />
        <span>Teleport</span>
      </button>
    );
  }

  return (
    <div
      data-map-no-move
      className="absolute top-4 right-4 z-40 w-72 sm:w-80 rounded-2xl bg-white/95 backdrop-blur-md border border-[rgba(204,180,233,0.7)] shadow-2xl p-4 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-[#5C0EA4]" />
          <span className="text-sm font-bold text-[#0B0E13]">Teleport</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="w-6 h-6 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          title="Close Teleport"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100/80 rounded-xl my-3">
        <button
          onClick={() => setActiveTab("people")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "people"
              ? "bg-[#5C0EA4] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          People ({otherPeople.length})
        </button>
        <button
          onClick={() => setActiveTab("places")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "places"
              ? "bg-[#5C0EA4] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Places
        </button>
      </div>

      {/* Places Tab Content */}
      {activeTab === "places" && (
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
          {TELEPORT_PLACES.map((place) => (
            <div
              key={place.name}
              className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: place.color }}
                />
                <span className="text-xs font-medium text-[#0B0E13]">{place.name}</span>
              </div>
              <button
                onClick={() => onTeleport?.(place.x, place.y)}
                className="text-xs font-bold text-[#5C0EA4] hover:bg-purple-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
              >
                Go
              </button>
            </div>
          ))}
        </div>
      )}

      {/* People Tab Content */}
      {activeTab === "people" && (
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {otherPeople.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              No other teammates in the workspace right now.
            </div>
          ) : (
            otherPeople.map((person) => (
              <div
                key={person.userId}
                className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative flex-shrink-0">
                    {person.avatar ? (
                      <img
                        src={person.avatar}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover border border-purple-200"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-[#5C0EA4] font-bold text-[10px] flex items-center justify-center">
                        {(person.displayName || "U")[0].toUpperCase()}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#34C759] border border-white" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-medium text-[#0B0E13] truncate">
                      {person.displayName || "Teammate"}
                    </p>
                    <p className="text-[10px] text-gray-400">Online</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const tx = typeof person.x === "number" ? person.x : 50;
                    const ty = typeof person.y === "number" ? person.y : 50;
                    onTeleport?.(tx + 2, ty);
                  }}
                  className="text-xs font-bold text-[#5C0EA4] hover:bg-purple-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer flex-shrink-0"
                >
                  Go
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TeleportPanel;
