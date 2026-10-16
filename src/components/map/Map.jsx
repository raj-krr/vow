import React, { useState, useEffect, useRef, useCallback } from "react";
import Avatar from "../map/map assets/avtar";
import playerImg from "../map/map assets/avatar1.jpg";

import MapContainer from "./map-components/mapcontainer.jsx";
import MapObjects from "./map-components/mapcollisionobj.jsx";
import ClickMarker from "./map-components/clickmarker.jsx";

import { createCollisionChecker } from "./map-components/collisionlogic.jsx";
import { findNearestFreePointFactory } from "./map-components/findnearestfreepoint.jsx";
import { useMovementKeys } from "./map-components/usemovementkeys.jsx";
import { useCameraPanning } from "./map-components/usecamerapaning.jsx";
import { updateCursorBlocked } from "./map-components/useCursorBlockDetection.js";
import { usePlayerMovementCamera } from "./map-components/usePlayerMovementCamera.jsx";
import { useClickToMove } from "./map-components/useClickToMove.js";

import { useDispatch, useSelector } from "react-redux";
import {
  setIdentity,
  replaceAvatars,
  upsertAvatar,
  updateAvatarPosition,
  removeAvatar,
} from "./presenceSlice";

import mapSocket, {
  connectMapSocket,
  joinMapPresence,
  leaveMapPresence,
  updateMapPosition,
  setupMapListeners,
  removeMapListeners,
  getMapSocketStatus,
} from "./mapSocket.jsx";

import AvatarsLayer from "./AvatarsLayer.jsx";
import { useMembers } from "../useMembers";

const Map = ({ onAvatarCollision, lastCallEndTime = 0, lastCallPartnerId = null }) => {
  const dispatch = useDispatch();
  const userState = useSelector((s) => s.user || {});
  const workspaceId = userState.workspaceId;
  const { members } = useMembers(workspaceId);
  const currentUserId = userState.userId || userState.profile?._id || userState.profile?.id || localStorage.getItem("userId");
  const myMember = (members || []).find(m => String(m._id || m.id || m.userId) === String(currentUserId));
  const username =
    userState.fullName ||
    userState.username ||
    userState.profile?.fullName ||
    userState.profile?.username ||
    myMember?.fullName ||
    myMember?.username ||
    "User";
  const avatar =
    userState.avatar ||
    userState.profile?.avatar ||
    localStorage.getItem("avatar") ||
    myMember?.avatar ||
    "";
  const { selfId } = useSelector((s) => s.presence || {});
  const getInitialSpawn = (id) => {
    if (!id) return { x: 60, y: 60 };
    let hash = 0;
    const str = String(id);
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const offsetX = ((Math.abs(hash) % 7) - 3) * 2.5; // -7.5% to +7.5%
    const offsetY = ((Math.abs(hash >> 3) % 5) - 2) * 2.5; // -5% to +5%
    return { x: 60 + offsetX, y: 60 + offsetY };
  };

  const getInitialPos = () => {
    try {
      const saved = sessionStorage.getItem(`vow_map_pos_${workspaceId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          return parsed;
        }
      }
    } catch (_) {}
    return getInitialSpawn(currentUserId || localStorage.getItem("userId"));
  };

  const spawnPoint = useRef(getInitialPos()).current;
  const userPanningRef = useRef(false);

  // Local avatar state
  const [position, setPosition] = useState(spawnPoint);
  const [clickMarker, setClickMarker] = useState(null);
  const [cursorBlocked, setCursorBlocked] = useState(false);

  // Refs
  const positionRef = useRef(spawnPoint);

  const saveLocalPosition = useCallback((pos) => {
    if (pos && typeof pos.x === "number" && typeof pos.y === "number") {
      try {
        sessionStorage.setItem(`vow_map_pos_${workspaceId}`, JSON.stringify(pos));
      } catch (_) {}
    }
  }, [workspaceId]);
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const obstaclesRef = useRef([]);

  const containerRef = useRef(null);
  const viewportRef = useRef(null);

  const cameraPosRef = useRef({ left: 0, top: 0 });
  const cameraTargetRef = useRef({ left: 0, top: 0 });
  const followCameraRef = useRef(true);
  const keysPressed = useRef({});
  const moveToTargetRef = useRef(null);
  const avatarSize = 65;

  // ----------------------------------------------
  // Obstacle collector
  // ----------------------------------------------
  const handleObstaclesFromChild = useCallback((id, newObs) => {
    obstaclesRef.current = Object.values({
      ...obstaclesRef.current,
      [id]: newObs,
    }).flat();
  }, []);

  // ----------------------------------------------
  // Collision utilities
  // ----------------------------------------------
  const isColliding = createCollisionChecker({
    containerRef,
    obstaclesRef,
    avatarSize,
    COLLISION_EPS: 0,
  });

  const findNearestFreePoint = findNearestFreePointFactory(isColliding);

  // ----------------------------------------------
  // Hooks for movement, camera, keys
  // ----------------------------------------------
  useMovementKeys({ keysPressedRef: keysPressed, followCameraRef });
  useCameraPanning({
    viewportRef,
    followCameraRef,
    cameraPosRef,
    cameraTargetRef,
    userPanningRef,
  });

  usePlayerMovementCamera({
    positionRef,
    velocityRef,
    setPosition,
    setClickMarker,
    keysPressed,
    moveToTargetRef,
    containerRef,
    viewportRef,
    cameraPosRef,
    cameraTargetRef,
    followCameraRef,
    avatarConfig: {
      accel: 0.03,
      maxSpeed: 0.5,
      friction: 0.12,
      DEADZONE_RATIO: 0.3,
      CAMERA_SMOOTH: 0.18,
    },
    isColliding,
  });

  const handleMapClick = useClickToMove({
    containerRef,
    isColliding,
    findNearestFreePoint,
    setClickMarker,
    moveToTargetRef,
    followCameraRef,
  });

  const handlePointerMove = (e) =>
    updateCursorBlocked({
      clientX: e.clientX,
      clientY: e.clientY,
      containerRef,
      isColliding,
      setCursorBlocked,
    });

  // ----------------------------------------------
  // INITIAL MOUNT — Connect Socket + Join
  // ----------------------------------------------
  const selfIdRef = useRef(currentUserId);

  useEffect(() => {
    if (currentUserId) {
      selfIdRef.current = String(currentUserId);
      dispatch(setIdentity({ selfId: String(currentUserId), workspaceId }));
    }
  }, [currentUserId, workspaceId, dispatch]);

useEffect(() => {
  console.log("🌍 MAP MOUNT — Initializing socket & presence");

  let cleanedUp = false;

  connectMapSocket();

  const onConnected = () => {
    if (cleanedUp) return;

    joinMapPresence({
      workspaceId,
      name: username || "Anonymous",
      avatar,
      x: positionRef.current.x,
      y: positionRef.current.y,
    });
  };

  if (mapSocket.connected) onConnected();
  else mapSocket.once("connect", onConnected);

  removeMapListeners();

  setupMapListeners({
    onJoinAck: (data) => {
      if (data?.userId) {
        selfIdRef.current = data.userId;
        dispatch(setIdentity({ selfId: data.userId }));
      }
    },

    onState: (data) => {
      if (!data?.avatars?.length) return;
      dispatch(replaceAvatars(data.avatars));
    },

    onJoined: (avatar) => {
      if (avatar.userId !== selfIdRef.current) {
        dispatch(upsertAvatar(avatar));
      }
    },

    onUpdated: (data) => {
      if (data.userId !== selfIdRef.current) {
        dispatch(updateAvatarPosition(data));
      }
    },

    onLeft: ({ userId }) => {
      dispatch(removeAvatar(userId));
    },
  });

  return () => {
    cleanedUp = true;
    removeMapListeners();
    mapSocket.off("connect", onConnected);
  };
}, [workspaceId, username, avatar]);


  // ----------------------------------------------
  // SEND POSITION UPDATES (~16Hz)
  // ----------------------------------------------
  useEffect(() => {
    const lastSent = { x: null, y: null };

    const interval = setInterval(() => {
      const { x, y } = positionRef.current;

      if (!mapSocket.connected) return;

      const dx = lastSent.x == null ? 999 : Math.abs(x - lastSent.x);
      const dy = lastSent.y == null ? 999 : Math.abs(y - lastSent.y);

      if (dx > 0.05 || dy > 0.05) {
        lastSent.x = x;
        lastSent.y = y;
        updateMapPosition({ workspaceId, x, y, displayName: username, avatar });
      }
    }, 60);

    return () => clearInterval(interval);
  }, [workspaceId, username, avatar]);

  // ----------------------------------------------
  // AVATAR COLLISION DETECTION WITH REMOTE PLAYERS
  // ----------------------------------------------
  const { avatars } = useSelector((s) => s.presence || {});
  const mountTimeRef = useRef(Date.now());
  const lastCollisionTimeRef = useRef(0);

  useEffect(() => {
    mountTimeRef.current = Date.now();
  }, []);

  const lastSeparationHandledRef = useRef(0);

  // When a call ends, push the avatar backward away from the call partner
  // to separate them safely beyond the proximity zone
  useEffect(() => {
    if (!lastCallEndTime) return;
    if (lastCallEndTime === lastSeparationHandledRef.current) return;
    lastSeparationHandledRef.current = lastCallEndTime;

    const myCurrentPos = positionRef.current;
    if (!myCurrentPos) return;

    // Identify partner avatar (either by ID or closest remote avatar)
    const myIdList = [
      String(selfIdRef.current || ""),
      String(currentUserId || ""),
      String(selfId || ""),
      String(localStorage.getItem("userId") || ""),
    ].filter(Boolean);

    let partner = null;
    if (lastCallPartnerId && avatars?.[String(lastCallPartnerId)]) {
      partner = avatars[String(lastCallPartnerId)];
    } else {
      let minD = Infinity;
      Object.values(avatars || {}).forEach((a) => {
        if (!a || !a.userId || myIdList.includes(String(a.userId))) return;
        const rx = typeof a.targetX === 'number' ? a.targetX : (typeof a.x === 'number' ? a.x : 60);
        const ry = typeof a.targetY === 'number' ? a.targetY : (typeof a.y === 'number' ? a.y : 60);
        const d = Math.hypot(myCurrentPos.x - rx, myCurrentPos.y - ry);
        if (d < minD) {
          minD = d;
          partner = { ...a, x: rx, y: ry };
        }
      });
    }

    if (!partner) return;

    const container = containerRef.current;
    const mapW = container?.offsetWidth || 3100;
    const mapH = container?.offsetHeight || 2380;

    const pxPx = (myCurrentPos.x / 100) * mapW;
    const pyPx = (myCurrentPos.y / 100) * mapH;

    const rx = typeof partner.targetX === 'number' ? partner.targetX : (typeof partner.x === 'number' ? partner.x : 60);
    const ry = typeof partner.targetY === 'number' ? partner.targetY : (typeof partner.y === 'number' ? partner.y : 60);

    const rxPx = (rx / 100) * mapW;
    const ryPx = (ry / 100) * mapH;

    const dxPx = pxPx - rxPx;
    const dyPx = pyPx - ryPx;
    const distPx = Math.hypot(dxPx, dyPx);

    // Only separate if within touching/proximity range (<= 120px)
    if (distPx > 120) return;

    // Step back away from partner by 55 pixels (outside collision threshold)
    const TARGET_SEPARATION_PUSH = 55;

    let dirX = 0;
    let dirY = 0;

    if (distPx > 1) {
      dirX = dxPx / distPx;
      dirY = dyPx / distPx;
    } else {
      const myIdStr = String(selfIdRef.current || currentUserId || selfId || "");
      const partnerIdStr = String(partner.userId || "");
      dirX = myIdStr < partnerIdStr ? -1 : 1;
      dirY = 0;
    }

    let targetPx = pxPx + dirX * TARGET_SEPARATION_PUSH;
    let targetPy = pyPx + dirY * TARGET_SEPARATION_PUSH;

    let targetPercentX = Math.max(2, Math.min(98, (targetPx / mapW) * 100));
    let targetPercentY = Math.max(2, Math.min(98, (targetPy / mapH) * 100));

    // If colliding with an obstacle when stepping back, find nearest free point
    if (isColliding(targetPercentX, targetPercentY)) {
      const freePt = findNearestFreePoint(targetPercentX, targetPercentY, 40);
      if (freePt) {
        targetPercentX = freePt.x;
        targetPercentY = freePt.y;
      }
    }

    console.log(`[Map] 🧲 Separating from partner ${partner.displayName || partner.userId} after call cut:`, {
      from: myCurrentPos,
      to: { x: targetPercentX, y: targetPercentY },
      distBeforePx: distPx,
    });

    positionRef.current = { x: targetPercentX, y: targetPercentY };
    velocityRef.current = { vx: 0, vy: 0 };
    moveToTargetRef.current = null;
    setPosition({ x: targetPercentX, y: targetPercentY });
    saveLocalPosition({ x: targetPercentX, y: targetPercentY });

    if (typeof setClickMarker === "function") {
      try { setClickMarker(null); } catch (_) {}
    }

    // Broadcast new separated position immediately to all workspace peers
    updateMapPosition({
      workspaceId,
      x: targetPercentX,
      y: targetPercentY,
      displayName: username,
      avatar,
    });
  }, [lastCallEndTime, lastCallPartnerId, avatars, workspaceId, username, avatar, isColliding, findNearestFreePoint, saveLocalPosition]);

  const lastCollidedUserIdRef = useRef(null);

  useEffect(() => {
    if (!positionRef.current || !avatars) return;

    const checkCollision = () => {
      const now = Date.now();

      // Convert percentage positions to pixel space for physical circle collision
      const container = containerRef.current;
      const mapW = container?.offsetWidth || 3100;
      const mapH = container?.offsetHeight || 2380;

      const pxPx = (positionRef.current.x / 100) * mapW;
      const pyPx = (positionRef.current.y / 100) * mapH;

      // Avatar diameter is 65px (radius 32.5px).
      // Center-to-center distance when touching is ~65px-75px.
      // 100px ensures instant, reliable collision detection as soon as avatars approach.
      const COLLISION_PIXEL_RADIUS = 100;

      const myIdList = [
        String(selfIdRef.current || ""),
        String(selfId || ""),
        String(currentUserId || ""),
        ...(selfIdRef.current ? [] : [String(localStorage.getItem("userId") || "")]),
      ].filter(Boolean);

      const isSelf = (a) => {
        if (!a || !a.userId) return true;
        return myIdList.includes(String(a.userId));
      };

      const collidedUser = Object.values(avatars).find((a) => {
        if (isSelf(a)) return false;

        const rx = typeof a.targetX === 'number' ? a.targetX : (typeof a.x === 'number' ? a.x : 60);
        const ry = typeof a.targetY === 'number' ? a.targetY : (typeof a.y === 'number' ? a.y : 60);

        const rxPx = (rx / 100) * mapW;
        const ryPx = (ry / 100) * mapH;

        const distPx = Math.hypot(pxPx - rxPx, pyPx - ryPx);
        return distPx <= COLLISION_PIXEL_RADIUS;
      });

      if (!collidedUser) {
        lastCollidedUserIdRef.current = null;
        return;
      }

      const collidedUserId = String(collidedUser.userId);
      const isSamePartner = lastCallPartnerId && String(lastCallPartnerId) === collidedUserId;

      // 2-second cooldown ONLY applies if colliding with the exact same user you just hung up with
      if (isSamePartner && lastCallEndTime && (now - lastCallEndTime < 2000)) {
        return;
      }

      // 1.5-second cooldown if repeatedly colliding with the exact same user
      if (collidedUserId === lastCollidedUserIdRef.current && (now - lastCollisionTimeRef.current < 1500)) {
        return;
      }

      lastCollidedUserIdRef.current = collidedUserId;
      lastCollisionTimeRef.current = now;
      console.log(`[Map] 🤝 Direct avatar collision with ${collidedUser.displayName} (${collidedUser.userId})! Starting Call...`);

      // Flush position immediately to server so remote peers have exact touching coordinates
      if (positionRef.current) {
        updateMapPosition({
          workspaceId,
          x: positionRef.current.x,
          y: positionRef.current.y,
          displayName: username,
          avatar,
        });
      }

      onAvatarCollision?.(collidedUser.userId, collidedUser.displayName, collidedUser.avatar);
    };

    checkCollision();
    const interval = setInterval(checkCollision, 100);
    return () => clearInterval(interval);
  }, [position, avatars, onAvatarCollision, currentUserId, selfId, lastCallEndTime, lastCallPartnerId, workspaceId, username, avatar]);

  // ----------------------------------------------
  // RENDER
  // ----------------------------------------------
  return (
    <MapContainer
      viewportRef={viewportRef}
      containerRef={containerRef}
      cursorBlocked={cursorBlocked}
      handleMapClick={handleMapClick}
      handlePointerMove={handlePointerMove}
      handlePointerLeave={() => setCursorBlocked(false)}
    >
      <MapObjects
        containerRef={containerRef}
        handleObstaclesFromChild={handleObstaclesFromChild}
      />

      {/* LOCAL PLAYER */}
      <Avatar
        image={avatar || playerImg}
        size={avatarSize}
        name="You"
        style={{
          position: "absolute",
          top: `${position.y}%`,
          left: `${position.x}%`,
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* REMOTE PLAYERS */}
      <AvatarsLayer />

      <ClickMarker clickMarker={clickMarker} />
    </MapContainer>
  );
};

export default Map;
