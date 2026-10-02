// useSfuVideoCall.js
import { useCallback, useEffect, useRef, useState } from "react";
import SfuSignalingClient from "./sfuSignaling.js";

// ICE/TURN configuration matching backend — TURN servers are critical for 4+ participants
const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: "all",
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

// Max number of ICE restarts before giving up on a peer
const MAX_ICE_RESTARTS = 3;

export const useSfuVideoCall = () => {
  const signalingRef = useRef(null);
  const handlersRegisteredRef = useRef(false);
  const peersRef = useRef(new Map());
  const candidateQueuesRef = useRef(new Map());
  const participantIdRef = useRef(null);
  const roomIdRef = useRef(null);
  const localStreamRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const iceRestartCountRef = useRef(new Map()); // peerId -> restart count

  const [roomId, setRoomId] = useState(null);
  const [participantId, setParticipantId] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());

  const updateLocalStream = useCallback((stream) => {
    localStreamRef.current = stream;
    setLocalStream(stream);
  }, []);

  const ensureSignaling = useCallback(async () => {
    if (signalingRef.current && signalingRef.current.ws?.readyState === WebSocket.OPEN) {
      return signalingRef.current;
    }

    if (signalingRef.current) {
      try {
        signalingRef.current.disconnect?.();
      } catch (_) {}
      signalingRef.current = null;
    }
    handlersRegisteredRef.current = false;

    const s = new SfuSignalingClient();
    await s.connect();
    signalingRef.current = s;
    return s;
  }, []);

  const ensureLocalMedia = useCallback(async () => {
    const current = localStreamRef.current;
    if (current && current.active && current.getTracks().some(t => t.readyState === "live")) {
      return current;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      updateLocalStream(s);
      return s;
    } catch (err) {
      console.warn("[SFU] Could not get audio+video, trying audio only:", err);
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        updateLocalStream(audioOnly);
        return audioOnly;
      } catch (audioErr) {
        console.warn("[SFU] Could not access camera or microphone, using fallback stream:", audioErr);
        const emptyStream = new MediaStream();
        updateLocalStream(emptyStream);
        return emptyStream;
      }
    }
  }, [updateLocalStream]);

  const processCandidateQueue = async (peerId, pc) => {
    const queue = candidateQueuesRef.current.get(peerId) || [];
    while (queue.length > 0) {
      const candidate = queue.shift();
      try {
        await pc.addIceCandidate(candidate);
        console.log("[SFU] Processed queued ICE candidate for peer:", peerId);
      } catch (err) {
        console.error("[SFU] Error processing queued candidate:", err);
      }
    }
  };

  // Attempt ICE restart for a given peer
  const attemptIceRestart = useCallback(async (peerId) => {
    const restarts = iceRestartCountRef.current.get(peerId) || 0;
    if (restarts >= MAX_ICE_RESTARTS) {
      console.warn(`[SFU] Max ICE restarts (${MAX_ICE_RESTARTS}) reached for peer: ${peerId}, giving up`);
      return;
    }

    const pc = peersRef.current.get(peerId);
    if (!pc || pc.signalingState === "closed") {
      console.warn("[SFU] Cannot ICE restart — peer connection closed for:", peerId);
      return;
    }

    iceRestartCountRef.current.set(peerId, restarts + 1);
    console.log(`[SFU] Attempting ICE restart #${restarts + 1} for peer: ${peerId}`);

    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);

      if (signalingRef.current) {
        signalingRef.current.sendOffer(
          roomIdRef.current,
          participantIdRef.current,
          peerId,
          offer
        );
      }
    } catch (err) {
      console.error("[SFU] ICE restart failed for peer:", peerId, err);
    }
  }, []);

  const createPeer = useCallback((peerId, currentRoomId) => {
    const existing = peersRef.current.get(peerId);
    if (existing) {
      if (existing.connectionState !== "failed" && existing.connectionState !== "closed") {
        console.log("[SFU] Active peer connection already exists for:", peerId);
        return existing;
      }
      console.log("[SFU] Evicting stale/failed peer connection for:", peerId);
      try { existing.close(); } catch (_) {}
      peersRef.current.delete(peerId);
    }

    console.log("[SFU] Creating new peer connection for:", peerId);

    const pc = new RTCPeerConnection(ICE_CONFIG);

    pc.onicecandidate = (e) => {
      if (e.candidate && signalingRef.current) {
        console.log("[SFU] Sending ICE candidate to peer:", peerId);
        signalingRef.current.sendIceCandidate(
          currentRoomId || roomIdRef.current,
          participantIdRef.current,
          peerId,
          e.candidate
        );
      }
    };

    pc.ontrack = (e) => {
      console.log("[SFU] Remote track received from peer:", peerId, "kind:", e.track.kind);
      setRemoteStreams((prev) => {
        const m = new Map(prev);
        let stream = m.get(peerId);
        if (!stream) {
          stream = e.streams?.[0] ? e.streams[0] : new MediaStream();
          m.set(peerId, stream);
        }
        if (!stream.getTracks().some((t) => t.id === e.track.id)) {
          stream.addTrack(e.track);
        }
        console.log("[SFU] Remote streams updated, total peers:", m.size, "tracks:", stream.getTracks().map(t => `${t.kind}:${t.enabled}`));
        return new Map(m);
      });
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[SFU] ICE connection state:", peerId, pc.iceConnectionState);

      // Attempt ICE restart on disconnection before it fails
      if (pc.iceConnectionState === "disconnected") {
        console.log("[SFU] ICE disconnected, scheduling ICE restart for:", peerId);
        // Wait a moment for possible recovery before triggering restart
        setTimeout(() => {
          if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
            attemptIceRestart(peerId);
          }
        }, 3000);
      }

      // Reset restart counter when connection is healthy
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        iceRestartCountRef.current.set(peerId, 0);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[SFU] Connection state:", peerId, pc.connectionState);
      if (pc.connectionState === "failed") {
        // Attempt ICE restart before cleaning up
        const restarts = iceRestartCountRef.current.get(peerId) || 0;
        if (restarts < MAX_ICE_RESTARTS) {
          console.log("[SFU] Connection failed, attempting ICE restart for:", peerId);
          attemptIceRestart(peerId);
        } else {
          console.warn("[SFU] Peer connection failed after max retries, cleaning up:", peerId);
          try { pc.close(); } catch (_) {}
          peersRef.current.delete(peerId);
          candidateQueuesRef.current.delete(peerId);
          iceRestartCountRef.current.delete(peerId);
          setRemoteStreams((prev) => {
            const m = new Map(prev);
            m.delete(peerId);
            return m;
          });
        }
      }
    };

    peersRef.current.set(peerId, pc);
    return pc;
  }, [attemptIceRestart]);

  const attachLocalTracks = (pc, media) => {
    if (!pc || !media) return;
    const senders = pc.getSenders();
    media.getTracks().forEach((track) => {
      const alreadyAdded = senders.some((s) => s.track === track || (s.track && s.track.kind === track.kind));
      if (!alreadyAdded) {
        pc.addTrack(track, media);
      }
    });
  };

  // Start heartbeat to keep the connection alive
  const startHeartbeat = useCallback(() => {
    // Clear any existing heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // Send heartbeat every 20 seconds to prevent server-side timeout
    heartbeatIntervalRef.current = setInterval(() => {
      if (signalingRef.current && roomIdRef.current && participantIdRef.current) {
        signalingRef.current.send({
          type: "heartbeat",
          roomId: roomIdRef.current,
          participantId: participantIdRef.current,
        });
      }
    }, 20000);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const registerHandlers = useCallback((s, currentRoomId) => {
    if (handlersRegisteredRef.current) return;
    handlersRegisteredRef.current = true;

    s.on("room-state", async (msg) => {
      console.log("[HOOK] room-state received:", msg);

      setParticipantId(msg.participantId);
      participantIdRef.current = msg.participantId;
      s.participantId = msg.participantId;

      s.send({
        type: "start-publish",
        roomId: msg.roomId,
        participantId: msg.participantId,
      });

      // Start heartbeat after joining
      startHeartbeat();

      const media = await ensureLocalMedia();

      // The newly joining peer initiates offers to all existing participants
      for (const p of msg.data.participants) {
        if (p.id === msg.participantId) continue;

        console.log("[SFU] Creating offer for existing participant:", p.id);
        const pc = createPeer(p.id, currentRoomId);
        attachLocalTracks(pc, media);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        signalingRef.current.sendOffer(currentRoomId, msg.participantId, p.id, offer);
      }
    });

    s.on("participant-joined", async (msg) => {
      const newPeerId = msg.data?.participant?.id || msg.participantId;
      console.log("[SFU] New participant joined room:", newPeerId);
      if (!newPeerId || newPeerId === participantIdRef.current) return;

      const media = await ensureLocalMedia();
      const pc = createPeer(newPeerId, currentRoomId);
      attachLocalTracks(pc, media);

      // Existing participants do NOT initiate an offer here to prevent simultaneous offer glare.
      // They wait for the new joiner's offer to arrive via s.on("offer").
    });

    s.on("offer", async (msg) => {
      const from = msg.participantId;
      console.log("[SFU] Received offer from peer:", from);

      const pc = createPeer(from, currentRoomId);
      const media = await ensureLocalMedia();
      attachLocalTracks(pc, media);

      // Glare protection: handle simultaneous offer collision
      if (pc.signalingState !== "stable") {
        const isPolite = (participantIdRef.current || "") > from;
        if (!isPolite) {
          console.warn(`[SFU] Glare detected: impolite peer ignoring colliding offer from ${from}`);
          return;
        }
        console.log(`[SFU] Glare detected: polite peer rolling back local offer for ${from}`);
        await pc.setLocalDescription({ type: "rollback" });
      }

      await pc.setRemoteDescription(new RTCSessionDescription({
        type: msg.data.type,
        sdp: msg.data.sdp
      }));
      await processCandidateQueue(from, pc);

      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);

      signalingRef.current.sendAnswer(currentRoomId, participantIdRef.current, from, ans);
      console.log("[SFU] Answer sent to peer:", from);
    });

    s.on("answer", async (msg) => {
      const pc = peersRef.current.get(msg.participantId);
      if (!pc) {
        console.warn("[SFU] No peer connection found for answer from:", msg.participantId);
        return;
      }

      console.log("[SFU] Received answer from peer:", msg.participantId, "current state:", pc.signalingState);

      // Only apply answer if we are expecting one
      if (pc.signalingState !== "have-local-offer") {
        console.warn(`[SFU] Ignoring answer from ${msg.participantId} because signalingState is '${pc.signalingState}' (expected 'have-local-offer')`);
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription({
          type: msg.data.type,
          sdp: msg.data.sdp,
        }));
        await processCandidateQueue(msg.participantId, pc);
        console.log("[SFU] Answer applied successfully for peer:", msg.participantId);
      } catch (err) {
        console.error("[SFU] Error setting remote description (answer):", err);
      }
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
          console.log("[SFU] ICE candidate added directly for peer:", msg.participantId);
        } catch (err) {
          console.error("[SFU] Error adding ICE candidate directly:", err);
        }
      } else {
        console.log("[SFU] Queueing ICE candidate for peer:", msg.participantId);
        if (!candidateQueuesRef.current.has(msg.participantId)) {
          candidateQueuesRef.current.set(msg.participantId, []);
        }
        candidateQueuesRef.current.get(msg.participantId).push(candidateInit);
      }
    });

    s.on("participant-left", (msg) => {
      const leftPeerId = msg.participantId;
      console.log("[SFU] Participant left:", leftPeerId);

      const pc = peersRef.current.get(leftPeerId);
      if (pc) {
        pc.close();
        peersRef.current.delete(leftPeerId);
      }

      candidateQueuesRef.current.delete(leftPeerId);
      iceRestartCountRef.current.delete(leftPeerId);

      setRemoteStreams((prev) => {
        const m = new Map(prev);
        m.delete(leftPeerId);
        return m;
      });
    });
  }, [createPeer, ensureLocalMedia, startHeartbeat, attemptIceRestart]);

  const join = useCallback(async (rid, name) => {
    setRoomId(rid);
    roomIdRef.current = rid;

    const s = await ensureSignaling();
    registerHandlers(s, rid);

    await ensureLocalMedia();
    s.join(rid, name);
  }, [ensureSignaling, registerHandlers, ensureLocalMedia]);

  const leave = useCallback(() => {
    // Stop heartbeat
    stopHeartbeat();

    try {
      if (signalingRef.current) {
        if (roomIdRef.current && participantIdRef.current) {
          signalingRef.current.leave(roomIdRef.current, participantIdRef.current);
        }
        signalingRef.current.disconnect?.();
        signalingRef.current = null;
      }
    } catch (e) {
      console.warn("[SFU] Error during leave signaling:", e);
    }
    handlersRegisteredRef.current = false;

    peersRef.current.forEach((pc) => {
      try { pc.close(); } catch (_) {}
    });
    peersRef.current.clear();
    candidateQueuesRef.current.clear();
    iceRestartCountRef.current.clear();
    setRemoteStreams(new Map());

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch (_) {}
      });
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setRoomId(null);
    setParticipantId(null);
    participantIdRef.current = null;
    roomIdRef.current = null;
  }, [stopHeartbeat]);

  const leaveRef = useRef(leave);
  useEffect(() => {
    leaveRef.current = leave;
  });

  // Clean up ONLY when the component actually unmounts
  useEffect(() => {
    return () => {
      leaveRef.current();
    };
  }, []);

  const toggleMute = useCallback(() => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      console.log("[SFU] Audio track enabled:", audioTrack.enabled);
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      console.log("[SFU] Video track enabled:", videoTrack.enabled);
    }
  }, [localStream]);

  return {
    roomId,
    participantId,
    localStream,
    remoteStreams,
    join,
    leave,
    toggleMute,
    toggleVideo,
  };
};

export default useSfuVideoCall;

