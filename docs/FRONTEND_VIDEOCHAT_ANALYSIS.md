# VOW Frontend - Audio & Video Call Subsystem Audit & Fixes Guide

## 1. Executive Summary

This document provides a technical audit of the **Audio & Video Calling architecture** inside the `VOW` frontend repository (`VOW/src/components/chat/` and `VOW/src/components/voice/`).

The application currently contains two competing voice/video call implementations:
1. **Primary Video Conference Subsystem (`src/components/chat/`)**: Uses `VideoConference.jsx`, `useSfuVideoCall.js`, and `sfuSignaling.js` connecting over WebSocket to `/signaling`.
2. **Legacy Voice Hook (`src/components/voice/useVoiceCall.js`)**: Uses Socket.IO events (`"offer"`, `"answer"`, `"ice-candidate"`) connected to main chat socket.

---

## 2. Root Cause Analysis Matrix (Frontend Flaws)

| # | Flaw / Issue | Location | Impact | Severity |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Hardcoded Backend URL in `VideoConference.jsx`** | `src/components/chat/VideoConference.jsx#L67,L96` | Hardcodes `https://vow-org.me/videochat/start`. Fails on localhost / dev environments with CORS/Network error. | **CRITICAL** |
| **2** | **Abandoned Socket.IO Voice Signaling (`useVoiceCall.js`)** | `src/components/voice/useVoiceCall.js#L32-34` | Emits `"offer"`, `"answer"`, `"ice-candidate"` to main Socket.IO server, which lacks backend handlers. Calls fail silently. | **CRITICAL** |
| **3** | **Missing `participant-joined` Event Handler** | `src/components/chat/useSfuVideoCall.js` | Existing participants in a call room are never notified when new members join, breaking group call mesh creation. | **CRITICAL** |
| **4** | **React Closure Stale State Bug** | `src/components/chat/useSfuVideoCall.js#L167` | `participantId` is `null` when `sendAnswer` is called, sending invalid SDP answer payloads to signaling server. | **HIGH** |
| **5** | **ICE Candidate Race Condition** | `src/components/chat/useSfuVideoCall.js#L191` | ICE candidates arriving before `setRemoteDescription()` complete throw `InvalidStateError` and get dropped. | **HIGH** |
| **6** | **STUN-Only Configuration (No TURN Relays)** | `src/components/chat/useSfuVideoCall.js#L43-46` | Uses STUN servers only; fails for users on symmetric NATs, cellular data, or corporate firewalls. | **MEDIUM** |

---

## 3. Detailed Breakdown of Frontend Issues

### 3.1 Issue 1: Hardcoded Host URL in `VideoConference.jsx`
- **File**: `src/components/chat/VideoConference.jsx`
- **Lines 67 & 96**:
  ```javascript
  // Line 67
  const res = await fetch("https://vow-org.me/videochat/start", { ... });

  // Line 96
  const res = await fetch("https://vow-org.me/videochat/join", { ... });
  ```
- **Why it breaks**: When running the application locally (`http://localhost:5173`) or on preview environments (`https://vow-pink.vercel.app`), clicking "Start Call" or "Join Now" sends HTTP requests directly to `https://vow-org.me` instead of using configured Axios environment URL (`import.meta.env.VITE_API_URL`). The request fails due to CORS or DNS errors, triggering `alert("Unable to create meeting")`.
- **Fix**: Replace `fetch("https://vow-org.me/videochat/...")` with `api.post("/videochat/start", ...)` using the central Axios client `src/api/axiosConfig.js`.

---

### 3.2 Issue 2: Broken Socket.IO Voice Hook (`useVoiceCall.js`)
- **File**: `src/components/voice/useVoiceCall.js`
- **Why it breaks**: `useVoiceCall.js` attempts to handle P2P voice calls by listening to and emitting Socket.IO events (`"offer"`, `"answer"`, `"ice-candidate"`). However, the backend (`VOW_backend/src/sockets/`) **contains no handlers for these events**. All events emitted by `useVoiceCall.js` are dropped by the server.
- **Fix**: Standardize all audio and video calling on the WebSockets SFU signaling subsystem (`sfuSignaling.js` & `useSfuVideoCall.js`) and deprecate `useVoiceCall.js`.

---

### 3.3 Issue 3: Missing `participant-joined` Handler in `useSfuVideoCall.js`
- **File**: `src/components/chat/useSfuVideoCall.js`
- **Why it breaks**: When User A is in a room and User B joins, backend SFU emits `participant-joined` (`SignalingMessageType.PARTICIPANT_JOINED`). However, `useSfuVideoCall.js` **does not register a listener for `participant-joined`**. User A is never notified of User B's entrance, so User A never sends an offer to User B.
- **Fix**: Add `s.on("participant-joined", ...)` in `useSfuVideoCall.js` to trigger peer connection creation and SDP offer generation when new members enter the room.

---

### 3.4 Issue 4: Closure Stale State Bug in `useSfuVideoCall.js`
- **File**: `src/components/chat/useSfuVideoCall.js`
- **Why it breaks**: Line 167 executes `signalingRef.current.sendAnswer(msg.roomId, participantId, from, ans)`. Because `registerHandlers` is called before `setParticipantId()` updates state, `participantId` evaluates to `null`.
- **Fix**: Use a `useRef` (`participantIdRef.current`) to store `participantId` immediately upon receiving `room-state`.

---

### 3.5 Issue 5: ICE Candidate Race Condition
- **File**: `src/components/chat/useSfuVideoCall.js`
- **Why it breaks**: When `ice-candidate` arrives over WebSockets before `pc.setRemoteDescription()` finishes, `pc.addIceCandidate()` throws `DOMException: Remote description is null`.
- **Fix**: Buffer candidates in a `candidateQueuesRef` map until `setRemoteDescription()` resolves, then flush queued candidates.

---

## 4. Complete Corrected Frontend Implementation

### 4.1 Corrected `VideoConference.jsx` (Using Axios API)

```javascript
// src/components/chat/VideoConference.jsx (Updated fetch logic)
import api from "../../api/axiosConfig";
import useSfuVideoCall from "./useSfuVideoCall.js";

// Inside VideoConference component:
const startCall = async () => {
  try {
    const res = await api.post("/videochat/start", { name: callTitle });
    const data = res.data;
    if (!data.roomId) return alert("Failed to create call");

    setGeneratedRoomId(data.roomId);
    await join(data.roomId, profile?.username || "Me");
    setIsCallActive(true);
  } catch (err) {
    console.error("Create call error:", err);
    alert("Unable to create meeting.");
  }
};

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
    alert("Error joining room.");
  }
};
```

---

### 4.2 Corrected `useSfuVideoCall.js` (With Ref Tracking & Candidate Queue)

```javascript
// src/components/chat/useSfuVideoCall.js
import { useCallback, useEffect, useRef, useState } from "react";
import SfuSignalingClient from "./sfuSignaling.js";

export const useSfuVideoCall = () => {
  const signalingRef = useRef(null);
  const peersRef = useRef(new Map());
  const candidateQueuesRef = useRef(new Map());
  const participantIdRef = useRef(null);

  const [roomId, setRoomId] = useState(null);
  const [participantId, setParticipantId] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());

  const ensureSignaling = useCallback(async () => {
    if (signalingRef.current) return signalingRef.current;
    const s = new SfuSignalingClient();
    await s.connect();
    signalingRef.current = s;
    return s;
  }, []);

  const ensureLocalMedia = useCallback(async () => {
    if (localStream) return localStream;
    const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    setLocalStream(s);
    return s;
  }, [localStream]);

  const processCandidateQueue = async (peerId, pc) => {
    const queue = candidateQueuesRef.current.get(peerId) || [];
    while (queue.length > 0) {
      const candidate = queue.shift();
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error("[SFU] Error processing queued ICE candidate:", err);
      }
    }
  };

  const createPeer = useCallback((peerId, currentRoomId) => {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId);

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" }
      ],
    });

    pc.onicecandidate = (e) => {
      if (e.candidate && signalingRef.current) {
        signalingRef.current.sendIceCandidate(
          currentRoomId || roomId,
          participantIdRef.current,
          peerId,
          e.candidate
        );
      }
    };

    pc.ontrack = (e) => {
      const stream = e.streams?.[0] || new MediaStream([e.track]);
      setRemoteStreams((prev) => {
        const m = new Map(prev);
        m.set(peerId, stream);
        return m;
      });
    };

    peersRef.current.set(peerId, pc);
    return pc;
  }, [roomId]);

  const registerHandlers = useCallback((s, currentRoomId) => {
    s.on("room-state", async (msg) => {
      setParticipantId(msg.participantId);
      participantIdRef.current = msg.participantId;
      s.participantId = msg.participantId;

      const media = await ensureLocalMedia();

      for (const p of msg.data.participants) {
        if (p.id === msg.participantId) continue;

        const pc = createPeer(p.id, currentRoomId);
        media.getTracks().forEach((track) => pc.addTrack(track, media));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        signalingRef.current.sendOffer(currentRoomId, msg.participantId, p.id, offer);
      }
    });

    s.on("participant-joined", async (msg) => {
      const newPeerId = msg.data?.participant?.id;
      if (!newPeerId || newPeerId === participantIdRef.current) return;

      const media = await ensureLocalMedia();
      const pc = createPeer(newPeerId, currentRoomId);
      media.getTracks().forEach((track) => pc.addTrack(track, media));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      signalingRef.current.sendOffer(currentRoomId, participantIdRef.current, newPeerId, offer);
    });

    s.on("offer", async (msg) => {
      const from = msg.participantId;
      const pc = createPeer(from, currentRoomId);
      const media = await ensureLocalMedia();

      media.getTracks().forEach((track) => pc.addTrack(track, media));

      await pc.setRemoteDescription({ type: msg.data.type, sdp: msg.data.sdp });
      await processCandidateQueue(from, pc);

      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);

      signalingRef.current.sendAnswer(currentRoomId, participantIdRef.current, from, ans);
    });

    s.on("answer", async (msg) => {
      const pc = peersRef.current.get(msg.participantId);
      if (!pc) return;

      await pc.setRemoteDescription({ type: msg.data.type, sdp: msg.data.sdp });
      await processCandidateQueue(msg.participantId, pc);
    });

    s.on("ice-candidate", async (msg) => {
      const pc = peersRef.current.get(msg.participantId);
      const candidateInit = {
        candidate: msg.data.candidate,
        sdpMid: msg.data.sdpMid,
        sdpMLineIndex: msg.data.sdpMLineIndex,
      };

      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(candidateInit);
        } catch (err) {
          console.error("[SFU] Error adding ICE candidate:", err);
        }
      } else {
        if (!candidateQueuesRef.current.has(msg.participantId)) {
          candidateQueuesRef.current.set(msg.participantId, []);
        }
        candidateQueuesRef.current.get(msg.participantId).push(candidateInit);
      }
    });
  }, [createPeer, ensureLocalMedia]);

  const join = useCallback(async (rid, name) => {
    setRoomId(rid);
    const s = await ensureSignaling();
    registerHandlers(s, rid);
    await ensureLocalMedia();
    s.join(rid, name);
  }, [ensureSignaling, registerHandlers, ensureLocalMedia]);

  const leave = () => {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    candidateQueuesRef.current.clear();
    setRemoteStreams(new Map());

    if (localStream) localStream.getTracks().forEach((t) => t.stop());

    setLocalStream(null);
    setRoomId(null);
    setParticipantId(null);
    participantIdRef.current = null;
  };

  return { roomId, participantId, localStream, remoteStreams, join, leave };
};

export default useSfuVideoCall;
```
