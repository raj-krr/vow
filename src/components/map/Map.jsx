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

const Map = ({ onAvatarCollision }) => {
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
  const userPanningRef = useRef(false);
  // Local avatar state
  const [position, setPosition] = useState({ x: 60, y: 60 });
  const [clickMarker, setClickMarker] = useState(null);
  const [cursorBlocked, setCursorBlocked] = useState(false);

  // Refs
  const positionRef = useRef({ x: 60, y: 60 });
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

  useEffect(() => {
    if (!positionRef.current || !avatars) return;

    const now = Date.now();

    // 3-second grace period after map mounts to prevent instant collision on load
    if (now - mountTimeRef.current < 3000) return;

    // 5-second cooldown to prevent spamming DM open on continuous collision
    if (now - lastCollisionTimeRef.current < 5000) return;

    const px = positionRef.current.x;
    const py = positionRef.current.y;
    const COLLISION_DISTANCE = 3.0; // percentage distance threshold

    const collidedUser = Object.values(avatars).find((a) => {
      if (!a || !a.userId || String(a.userId) === String(selfIdRef.current)) return false;
      const rx = a.x ?? a.targetX ?? 60;
      const ry = a.y ?? a.targetY ?? 60;
      const dist = Math.hypot(px - rx, py - ry);
      return dist < COLLISION_DISTANCE;
    });

    if (collidedUser) {
      lastCollisionTimeRef.current = now;
      console.log(`[Map] 🤝 Collision with ${collidedUser.displayName} (${collidedUser.userId})! Opening DM...`);
      onAvatarCollision?.(collidedUser.userId, collidedUser.displayName);
    }
  }, [position, avatars, onAvatarCollision]);

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
