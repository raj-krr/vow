import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Play from '../../assets/Play.svg';
import Link from '../../assets/Link.svg';
import textFields from '../../assets/text_fields.svg';
import KeyIcon from '../../assets/Key.svg';
import mic from '../../assets/mic.svg';
import videocam from '../../assets/videocam.svg';
import leaveMeet from '../../assets/leavemeet.svg';
import EmojiSelector from './emojipicker.jsx';
import useSfuVideoCall from './useSfuVideoCall.js';
import api from '../../api/axiosConfig';

/* ──────────────────────────────────────────────────────────
   Helper: Responsive tile layout calculator (Google Meet-like)
   Given total tile count and container size, returns optimal
   columns, rows, and tile dimensions that maximize tile area.
   ────────────────────────────────────────────────────────── */
function calcGridLayout(count, containerW, containerH, gap = 8) {
  if (count <= 0 || containerW <= 0 || containerH <= 0) {
    return { cols: 1, rows: 1, tileW: containerW, tileH: containerH };
  }

  let bestCols = 1;
  let bestArea = 0;
  const aspect = 16 / 9;

  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const tileW = (containerW - gap * (cols - 1)) / cols;
    const tileH = (containerH - gap * (rows - 1)) / rows;

    // Constrain to 16:9 aspect ratio
    let w = tileW;
    let h = w / aspect;
    if (h > tileH) {
      h = tileH;
      w = h * aspect;
    }

    const area = w * h;
    if (area > bestArea) {
      bestArea = area;
      bestCols = cols;
    }
  }

  const rows = Math.ceil(count / bestCols);
  const tileW = Math.floor((containerW - gap * (bestCols - 1)) / bestCols);
  const tileH = Math.floor((containerH - gap * (rows - 1)) / rows);

  return { cols: bestCols, rows, tileW, tileH };
}

/* ──────────────────────────────────────────────────────────
   Video Tile Component (memoized)
   ────────────────────────────────────────────────────────── */
const VideoTile = React.memo(function VideoTile({
  stream,
  label,
  isSelf,
  isMuted,
  isVideoOff,
  isPinned,
  onPin,
  tileStyle,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream || null;
      if (stream) {
        el.play().catch(() => {});
      }
    }
  }, [stream]);

  const hasVideo = stream && stream.getVideoTracks().some(t => t.enabled && t.readyState === 'live');

  return (
    <div
      className="video-tile"
      style={tileStyle}
      onClick={onPin}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: isSelf ? 'scaleX(-1)' : 'none',
          display: hasVideo && !isVideoOff ? 'block' : 'none',
        }}
      />

      {/* Avatar placeholder when video is off */}
      {(!hasVideo || isVideoOff) && (
        <div className="video-tile-avatar">
          <div className="video-tile-avatar-circle">
            {label.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Bottom label bar */}
      <div className="video-tile-label">
        <span className="video-tile-status-dot" style={{
          backgroundColor: isMuted ? '#FF3B30' : '#34C759'
        }} />
        <span className="video-tile-name">{label}{isSelf ? ' (You)' : ''}</span>
        {isMuted && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 4, flexShrink: 0 }}>
            <path d="M1 1l22 22M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" stroke="#FF3B30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M17 16.95A7 7 0 015 12m14 0a7 7 0 01-.11 1.23M12 19v4m-4 0h8" stroke="#FF3B30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Pin indicator */}
      {isPinned && (
        <div className="video-tile-pinned">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
          </svg>
        </div>
      )}
    </div>
  );
});

/* ──────────────────────────────────────────────────────────
   Main VideoConference Component
   ────────────────────────────────────────────────────────── */
const VideoConference = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [stream, setStream] = useState(null);
  const [lastEmoji, setLastEmoji] = useState(null);
  const reactionTimeoutRef = useRef(null);
  const callContainerRef = useRef(null);
  const gridContainerRef = useRef(null);

  //  real roomId returned by SFU backend
  const [generatedRoomId, setGeneratedRoomId] = useState("");

  // user's text input (title before room is created)
  const [callTitle, setCallTitle] = useState("");

  const [joinInput, setJoinInput] = useState("");
  const [copied, setCopied] = useState(false);
  const localVideoRef = useRef(null);
  const profile = useSelector((state) => state.user.profile);

  // Pinned participant (spotlight mode)
  const [pinnedPeerId, setPinnedPeerId] = useState(null);

  // Container dimensions for responsive layout
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const {
    roomId,
    participantId,
    localStream,
    remoteStreams,
    join,
    leave,
    toggleMute: toggleMuteHook,
    toggleVideo: toggleVideoHook,
  } = useSfuVideoCall();

  const activeMeetingId = roomId || generatedRoomId || joinInput;

  // sync stream with UI
  useEffect(() => {
    if (localStream !== stream) setStream(localStream || null);
  }, [localStream]);

  useEffect(() => {
    if (!localVideoRef.current) return;
    if (localVideoRef.current.srcObject !== stream) {
      localVideoRef.current.srcObject = stream || null;
      if (stream) {
        console.log("[VideoConference] Local stream set, tracks:", 
          stream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));
        localVideoRef.current.play?.().catch((err) => {
          console.error("[VideoConference] Error playing local video:", err);
        });
      }
    }
  }, [stream]);

  // Observe container size changes for responsive grid
  useEffect(() => {
    if (!gridContainerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          w: entry.contentRect.width,
          h: entry.contentRect.height,
        });
      }
    });
    ro.observe(gridContainerRef.current);
    return () => ro.disconnect();
  }, [isCallActive]);

  // Build tiles array
  const allTiles = useMemo(() => {
    const tiles = [];
    // Add self
    tiles.push({
      id: 'self',
      stream: stream,
      label: profile?.fullName || profile?.username || 'You',
      isSelf: true,
    });

    // Add remotes
    for (const [peerId, mediaStream] of remoteStreams.entries()) {
      tiles.push({
        id: peerId,
        stream: mediaStream,
        label: `Peer ${peerId.slice(0, 6)}`,
        isSelf: false,
      });
    }

    return tiles;
  }, [stream, remoteStreams, profile]);

  // Calculate grid layout
  const totalTiles = pinnedPeerId
    ? allTiles.length // pinned: 1 spotlight + sidebar strip
    : allTiles.length;

  const gridLayout = useMemo(() => {
    if (!pinnedPeerId) {
      return calcGridLayout(totalTiles, containerSize.w, containerSize.h, 8);
    }
    return null; // pinned mode uses flex layout
  }, [totalTiles, containerSize.w, containerSize.h, pinnedPeerId]);

  // CREATE NEW CALL (REAL ROOM ID)
  const startCall = async () => {
    try {
      const res = await api.post("/videochat/start", { name: callTitle });
      const data = res.data;
      if (!data.roomId) return alert("Failed to create call");

      // Saving the real room ID for sharing
      setGeneratedRoomId(data.roomId);

      // Join the Call
      await join(data.roomId, profile?.username || "Me");
      setIsCallActive(true);

    } catch (err) {
      console.error("Create call error:", err);
      const msg = err?.response?.data?.error || err?.response?.data?.msg || err?.message || "Unable to create meeting.";
      alert(`Create call failed: ${msg}`);
    }
  };

  // JOIN EXISTING CALL (needs real ID)
  const joinCall = async () => {
    if (!joinInput.trim()) return alert("Enter meeting ID");

    try {
      const res = await api.post("/videochat/join", { roomId: joinInput.trim() });
      const data = res.data;
      if (!data.roomId) return alert("Invalid room ID");

      await join(data.roomId, profile?.username || "Me");
      setIsCallActive(true);

    } catch (e) {
      console.error("Join call error:", e);
      const msg = e?.response?.data?.error || e?.response?.data?.msg || e?.message || "Error joining room.";
      alert(`Join call failed: ${msg}`);
    }
  };

  const endCall = () => {
    leave();
    setIsCallActive(false);
    setGeneratedRoomId("");
    setCallTitle("");
    setJoinInput("");
    setPinnedPeerId(null);
  };

  const handlePin = useCallback((id) => {
    setPinnedPeerId(prev => prev === id ? null : id);
  }, []);

  /* ──────── RENDER ──────── */
  return (
    <div className="vc-root">
      <style>{`
        /* ═══════════════════════════════════════════════
           VideoConference — Google Meet-inspired styles
           ═══════════════════════════════════════════════ */

        .vc-root {
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          background: #fff;
          color: #000;
          font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        /* ──── Pre-call screen ──── */
        .vc-precall {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .vc-precall-scroll {
          flex: 1;
          width: 100%;
          overflow-y: auto;
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }
        .vc-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: #EFE7F6;
          padding: 24px 18px;
          gap: 20px;
          width: 100%;
          max-width: 944px;
          box-shadow:
            0 -23px 25px 0 rgba(191, 162, 225, 0.17) inset,
            0 -36px 30px 0 rgba(204, 180, 227, 0.15) inset,
            0 -79px 40px 0 rgba(204, 180, 227, 0.10) inset,
            0 2px 1px 0 rgba(204, 180, 227, 0.06),
            0 4px 2px 0 rgba(204, 180, 227, 0.09),
            0 8px 4px 0 rgba(204, 180, 227, 0.09),
            0 16px 8px 0 rgba(204, 180, 227, 0.09),
            0 32px 16px 0 rgba(204, 180, 227, 0.09);
        }
        .vc-card-icon {
          width: 64px;
          height: 64px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .vc-card-icon img { width: 32px; height: 32px; }
        .vc-card-title {
          font-size: 22px;
          font-weight: 700;
          text-align: center;
        }
        .vc-card-subtitle {
          font-size: 16px;
          text-align: center;
          margin-top: 4px;
          color: #333;
        }
        .vc-card-input-wrap {
          position: relative;
          width: 100%;
          max-width: 360px;
        }
        .vc-card-input-wrap img {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          opacity: 0.7;
        }
        .vc-card-input-wrap img.left { left: 12px; }
        .vc-card-input-wrap img.right { right: 12px; }
        .vc-card-input {
          width: 100%;
          padding: 8px 40px 8px 36px;
          border-radius: 6px;
          border: 1px solid #D6DAE1;
          background: #fff;
          font-size: 14px;
          color: #0E1219;
          outline: none;
          transition: border-color 0.2s;
        }
        .vc-card-input:focus {
          border-color: #5E9BFF;
          box-shadow: 0 0 0 2px rgba(94,155,255,0.15);
        }
        .vc-card-btn {
          background: #5E9BFF;
          color: #fff;
          font-weight: 600;
          padding: 10px 32px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s, transform 0.1s;
        }
        .vc-card-btn:hover { background: #4A8CE0; }
        .vc-card-btn:active { transform: scale(0.97); }

        /* ──── In-call screen ──── */
        .vc-incall {
          height: 100%;
          width: 100%;
          background: #12111A;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* ──── Grid container ──── */
        .vc-grid-container {
          flex: 1;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          overflow: hidden;
        }
        @media (min-width: 640px) {
          .vc-grid-container { padding: 12px; }
        }
        @media (min-width: 1024px) {
          .vc-grid-container { padding: 16px; }
        }

        .vc-grid {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          height: 100%;
        }

        /* ──── Pinned (spotlight) layout ──── */
        .vc-pinned-layout {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          gap: 8px;
        }
        @media (min-width: 768px) {
          .vc-pinned-layout {
            flex-direction: row;
          }
        }
        .vc-pinned-main {
          flex: 1;
          min-height: 0;
          min-width: 0;
        }
        .vc-pinned-sidebar {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          overflow-y: hidden;
          flex-shrink: 0;
          padding-bottom: 4px;
        }
        @media (max-width: 767px) {
          .vc-pinned-sidebar {
            flex-direction: row;
            height: 120px;
            min-height: 120px;
          }
          .vc-pinned-sidebar .video-tile {
            width: 160px !important;
            height: 100% !important;
            flex-shrink: 0;
          }
        }
        @media (min-width: 768px) {
          .vc-pinned-sidebar {
            flex-direction: column;
            width: 220px;
            min-width: 220px;
            overflow-x: hidden;
            overflow-y: auto;
          }
          .vc-pinned-sidebar .video-tile {
            width: 100% !important;
            height: 140px !important;
            flex-shrink: 0;
          }
        }

        /* ──── Video tile ──── */
        .video-tile {
          position: relative;
          background: #1E1E2E;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer;
          transition: box-shadow 0.2s, border-color 0.2s;
        }
        .video-tile:hover {
          border-color: rgba(255,255,255,0.2);
          box-shadow: 0 0 0 2px rgba(94,155,255,0.25);
        }

        .video-tile-avatar {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #2D2B3D 0%, #1a1825 100%);
        }
        .video-tile-avatar-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7C3AED, #5B21B6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: 700;
          color: #fff;
          text-transform: uppercase;
        }
        @media (max-width: 640px) {
          .video-tile-avatar-circle {
            width: 48px;
            height: 48px;
            font-size: 20px;
          }
        }

        .video-tile-label {
          position: absolute;
          bottom: 8px;
          left: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding: 4px 10px;
          border-radius: 6px;
          max-width: calc(100% - 16px);
          z-index: 2;
        }
        .video-tile-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .video-tile-name {
          color: #fff;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .video-tile-pinned {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(94,155,255,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }

        /* ──── Waiting placeholder ──── */
        .vc-waiting {
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px dashed rgba(255,255,255,0.15);
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
        }
        .vc-waiting-inner {
          text-align: center;
          padding: 16px;
          color: rgba(255,255,255,0.5);
        }
        .vc-waiting-emoji { font-size: 28px; margin-bottom: 6px; }
        .vc-waiting-text { font-size: 14px; font-weight: 500; }
        .vc-waiting-sub { font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 4px; }

        /* ──── Bottom controls bar ──── */
        .vc-controls {
          background: #200539;
          border-top: 1px solid #3D1B5F;
          padding: 10px 16px;
          flex-shrink: 0;
        }
        @media (min-width: 640px) {
          .vc-controls { padding: 12px 24px; }
        }

        .vc-controls-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .vc-ctrl-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, transform 0.1s;
        }
        @media (max-width: 400px) {
          .vc-ctrl-btn { width: 42px; height: 42px; }
        }
        .vc-ctrl-btn:active { transform: scale(0.92); }
        .vc-ctrl-btn img { width: 24px; height: 24px; }

        .vc-ctrl-btn--default { background: #35115A; }
        .vc-ctrl-btn--default:hover { background: #451975; }
        .vc-ctrl-btn--active { background: #FF3B30; }
        .vc-ctrl-btn--active:hover { background: #e0352b; }

        .vc-leave-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #FF3B30;
          color: #fff;
          font-weight: 600;
          font-size: 14px;
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          margin-left: 8px;
          transition: background 0.2s, transform 0.1s;
        }
        .vc-leave-btn:hover { background: #e0352b; }
        .vc-leave-btn:active { transform: scale(0.95); }

        .vc-meeting-info {
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: rgba(255,255,255,0.85);
          font-size: 13px;
          flex-wrap: wrap;
        }
        .vc-meeting-id {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          background: #35115A;
          padding: 4px 10px;
          border-radius: 4px;
          color: #fff;
          letter-spacing: 0.5px;
          user-select: all;
          font-size: 12px;
        }
        .vc-copy-btn {
          padding: 4px 10px;
          border-radius: 4px;
          background: #5E9BFF;
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }
        .vc-copy-btn:hover { background: #4A8CE0; }

        /* ──── Participant count badge ──── */
        .vc-participant-count {
          position: absolute;
          top: 12px;
          left: 12px;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding: 6px 12px;
          border-radius: 8px;
          color: #fff;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          z-index: 10;
        }
        .vc-participant-count svg { opacity: 0.8; }
      `}</style>

      {/* BEFORE CALL */}
      {!isCallActive ? (
        <div className="vc-precall">
          <div className="vc-precall-scroll">

            {/* START A NEW CALL */}
            <div className="vc-card">
              <div className="vc-card-icon">
                <img src={Play} alt="Start Call" />
              </div>
              <div>
                <h3 className="vc-card-title">Start a New Call</h3>
                <p className="vc-card-subtitle">Instantly create a video conference.</p>
              </div>
              <div className="vc-card-input-wrap">
                <img src={KeyIcon} className="left" alt="" />
                <input
                  value={generatedRoomId ? generatedRoomId : callTitle}
                  onChange={(e) => setCallTitle(e.target.value)}
                  type="text"
                  placeholder="Enter title of the call"
                  className="vc-card-input"
                />
                <img src={textFields} className="right" alt="" />
              </div>
              <button onClick={startCall} className="vc-card-btn">
                Start Call
              </button>
            </div>

            {/* JOIN EXISTING CALL */}
            <div className="vc-card">
              <div className="vc-card-icon">
                <img src={Link} alt="Join Call" />
              </div>
              <div>
                <h3 className="vc-card-title">Join a Call</h3>
                <p className="vc-card-subtitle">Enter a meeting ID or paste a link.</p>
              </div>
              <div className="vc-card-input-wrap">
                <img src={textFields} className="left" alt="" />
                <input
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  type="text"
                  placeholder="Enter meeting ID"
                  className="vc-card-input"
                />
              </div>
              <button onClick={joinCall} className="vc-card-btn">
                Join Now
              </button>
            </div>
          </div>
        </div>
      ) : (

        /* ──── IN-CALL VIEW ──── */
        <div ref={callContainerRef} className="vc-incall">

          {/* Participant count badge */}
          <div className="vc-participant-count">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            {allTiles.length} participant{allTiles.length !== 1 ? 's' : ''}
          </div>

          {/* Video grid */}
          <div ref={gridContainerRef} className="vc-grid-container">

            {/* ─── PINNED / SPOTLIGHT MODE ─── */}
            {pinnedPeerId ? (
              <div className="vc-pinned-layout">
                {/* Spotlight */}
                <div className="vc-pinned-main">
                  {(() => {
                    const pinned = allTiles.find(t => t.id === pinnedPeerId) || allTiles[0];
                    return (
                      <VideoTile
                        key={pinned.id}
                        stream={pinned.stream}
                        label={pinned.label}
                        isSelf={pinned.isSelf}
                        isMuted={pinned.isSelf ? isMuted : false}
                        isVideoOff={pinned.isSelf ? isVideoOff : false}
                        isPinned={true}
                        onPin={() => handlePin(pinned.id)}
                        tileStyle={{ width: '100%', height: '100%' }}
                      />
                    );
                  })()}
                </div>
                {/* Sidebar strip */}
                <div className="vc-pinned-sidebar">
                  {allTiles.filter(t => t.id !== pinnedPeerId).map(tile => (
                    <VideoTile
                      key={tile.id}
                      stream={tile.stream}
                      label={tile.label}
                      isSelf={tile.isSelf}
                      isMuted={tile.isSelf ? isMuted : false}
                      isVideoOff={tile.isSelf ? isVideoOff : false}
                      isPinned={false}
                      onPin={() => handlePin(tile.id)}
                      tileStyle={{}}
                    />
                  ))}
                </div>
              </div>
            ) : (

              /* ─── GRID MODE (Google Meet-style) ─── */
              <div className="vc-grid" style={gridLayout ? {
                display: 'grid',
                gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
                gridAutoRows: `minmax(0, 1fr)`,
                maxWidth: '100%',
                maxHeight: '100%',
              } : {}}>
                {allTiles.map(tile => (
                  <VideoTile
                    key={tile.id}
                    stream={tile.stream}
                    label={tile.label}
                    isSelf={tile.isSelf}
                    isMuted={tile.isSelf ? isMuted : false}
                    isVideoOff={tile.isSelf ? isVideoOff : false}
                    isPinned={false}
                    onPin={() => handlePin(tile.id)}
                    tileStyle={{
                      width: '100%',
                      aspectRatio: '16/9',
                      maxHeight: '100%',
                    }}
                  />
                ))}

                {/* Waiting for peers placeholder */}
                {remoteStreams.size === 0 && (
                  <div className="vc-waiting" style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    maxHeight: '100%',
                  }}>
                    <div className="vc-waiting-inner">
                      <div className="vc-waiting-emoji">👥</div>
                      <div className="vc-waiting-text">Waiting for others to join...</div>
                      <div className="vc-waiting-sub">Share the Meeting ID below</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom controls */}
          <div className="vc-controls">
            <div className="vc-controls-row">
              <button
                onClick={() => {
                  toggleMuteHook();
                  setIsMuted((v) => !v);
                }}
                className={`vc-ctrl-btn ${isMuted ? 'vc-ctrl-btn--active' : 'vc-ctrl-btn--default'}`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                <img src={mic} style={{ filter: isMuted ? 'brightness(2)' : 'none' }} alt="mic" />
              </button>

              <button
                onClick={() => {
                  toggleVideoHook();
                  setIsVideoOff((v) => !v);
                }}
                className={`vc-ctrl-btn ${isVideoOff ? 'vc-ctrl-btn--active' : 'vc-ctrl-btn--default'}`}
                title={isVideoOff ? 'Turn on video' : 'Turn off video'}
              >
                <img src={videocam} style={{ filter: isVideoOff ? 'brightness(2)' : 'none' }} alt="video" />
              </button>

              <button onClick={endCall} className="vc-leave-btn">
                Leave Meet
              </button>
            </div>

            {activeMeetingId && (
              <div className="vc-meeting-info">
                <span>Meeting ID: <b className="vc-meeting-id">{activeMeetingId}</b></span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(activeMeetingId);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="vc-copy-btn"
                >
                  {copied ? "Copied!" : "Copy ID"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoConference;
