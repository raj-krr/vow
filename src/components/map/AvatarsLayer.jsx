import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Avatar from './map assets/avtar';
import { useMembers } from '../useMembers';

const SPEED_PER_SEC = 10;
const SNAP_DIST = 8;

const AvatarsLayer = () => {
  const { avatars, selfId } = useSelector(state => state.presence);
  const workspaceId = useSelector(state => state.user?.workspaceId || state.presence?.workspaceId);
  const { members } = useMembers(workspaceId);
  const [renderVersion, setRenderVersion] = useState(0);
  const interpRef = useRef({});
  const domRefs = useRef({});
  const lastFrameRef = useRef(performance.now());
  const rafRef = useRef();

  useEffect(() => {
    const ids = Object.keys(avatars || {});
    console.log('[avatars] remote list update (excluding self)', ids, 'selfId=', selfId);

    // remove stale
    Object.keys(interpRef.current).forEach(id => {
      if (!avatars[id]) delete interpRef.current[id];
    });

    // add new
    Object.values(avatars || {}).forEach(a => {
      if (a && a.userId && !interpRef.current[a.userId]) {
        const startX = typeof a.x === 'number' && !isNaN(a.x) ? a.x : 60;
        const startY = typeof a.y === 'number' && !isNaN(a.y) ? a.y : 60;
        interpRef.current[a.userId] = { x: startX, y: startY };
      }
    });

    setRenderVersion(v => v + 1);
  }, [avatars, selfId]);

  useEffect(() => {
    function step(now) {
      const dt = Math.max(0, now - lastFrameRef.current);
      const alpha = 1 - Math.exp(-SPEED_PER_SEC * (dt / 1000));

      Object.values(avatars || {}).forEach(a => {
        if (!a || !a.userId || String(a.userId) === String(selfId)) return;

        let interp = interpRef.current[a.userId];
        if (!interp || isNaN(interp.x) || isNaN(interp.y)) {
          const initX = typeof a.x === 'number' && !isNaN(a.x) ? a.x : 60;
          const initY = typeof a.y === 'number' && !isNaN(a.y) ? a.y : 60;
          interp = { x: initX, y: initY };
          interpRef.current[a.userId] = interp;
        }

        const targetX = typeof a.targetX === 'number' && !isNaN(a.targetX) ? a.targetX : (a.x ?? 60);
        const targetY = typeof a.targetY === 'number' && !isNaN(a.targetY) ? a.targetY : (a.y ?? 60);

        const dx = targetX - interp.x;
        const dy = targetY - interp.y;
        const dist = Math.hypot(dx, dy);

        if (dist > SNAP_DIST) {
          interp.x = targetX;
          interp.y = targetY;
        } else {
          interp.x += dx * alpha;
          interp.y += dy * alpha;
        }

        const el = domRefs.current[a.userId];
        if (el) {
          el.style.transform = 'translate(-50%, -50%)';
          el.style.top = interp.y + '%';
          el.style.left = interp.x + '%';
        }
      });

      lastFrameRef.current = now;
      rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [avatars, selfId]);

  const remoteUsers = Object.values(avatars || {}).filter(
    a => a && a.userId && String(a.userId) !== String(selfId)
  );

  return (
    <>
      {remoteUsers.map(a => {
        const posX = interpRef.current[a.userId]?.x ?? a.x ?? 60;
        const posY = interpRef.current[a.userId]?.y ?? a.y ?? 60;
        const member = (members || []).find(
          m => String(m._id || m.id || m.userId) === String(a.userId)
        );
        const avatarImage = a.avatar || member?.avatar || "";
        const username = a.displayName || member?.fullName || member?.username || "User";

        return (
          <div
            key={a.userId}
            ref={el => { if (el) domRefs.current[a.userId] = el; }}
            className="flex flex-col items-center justify-center pointer-events-none"
            style={{
              position: 'absolute',
              top: `${posY}%`,
              left: `${posX}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 35,
            }}
          >
            {/* Remote Avatar */}
            <div className="relative group cursor-pointer pointer-events-auto flex flex-col items-center">
              <Avatar size={60} image={avatarImage} name={username} />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#200539] rounded-full shadow-md z-10" />
            </div>

            {/* Distinct Username Badge */}
            <div className="mt-1 px-3 py-0.5 bg-[#200539] text-white font-bold text-xs rounded-full border border-[#AC92CB] shadow-xl whitespace-nowrap pointer-events-auto">
              {username}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default AvatarsLayer;
