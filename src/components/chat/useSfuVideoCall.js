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
    {
      urls: "turns:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: "all",
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

// Max number of ICE restarts before giving up on a peer
const MAX_ICE_RESTARTS = 3;

// Studio-grade Audio Constraints: AEC, noise suppression, AGC, and 48kHz voice capture
const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: 48000,
  sampleSize: 16,
  googEchoCancellation: true,
  googAutoGainControl: true,
  googNoiseSuppression: true,
  googHighpassFilter: true,
  googTypingNoiseDetection: true,
};

// Google Meet-style Video Constraints: 720p HD @ 30fps ideal with smooth scaling
const VIDEO_CONSTRAINTS = {
  width: { ideal: 1280, min: 640 },
  height: { ideal: 720, min: 360 },
  frameRate: { ideal: 30, min: 15 },
  facingMode: "user",
};

// Tune SDP for Opus Forward Error Correction (FEC), mono voice clarity, 64kbps HD bitrate, and DTX
const tuneSdp = (sdp) => {
  if (!sdp) return sdp;
  let tuned = sdp;
  const opusPtMatch = tuned.match(/a=rtpmap:(\d+)\s+opus\/48000/i);
  if (opusPtMatch) {
    const pt = opusPtMatch[1];
    const fmtpRegex = new RegExp(`a=fmtp:${pt}\\s+(.*)`, "i");
    if (fmtpRegex.test(tuned)) {
      tuned = tuned.replace(fmtpRegex, (match, existing) => {
        let params = existing.trim();
        if (!params.includes("useinbandfec=")) params += ";useinbandfec=1";
        if (!params.includes("stereo=")) params += ";stereo=0";
        if (!params.includes("sprop-stereo=")) params += ";sprop-stereo=0";
        if (!params.includes("usedtx=")) params += ";usedtx=1";
        if (!params.includes("maxaveragebitrate=")) params += ";maxaveragebitrate=64000";
        return `a=fmtp:${pt} ${params}`;
      });
    } else {
      const rtpmapRegex = new RegExp(`(a=rtpmap:${pt}\\s+opus\\/48000.*\\r?\\n)`, "i");
      tuned = tuned.replace(
        rtpmapRegex,
        `$1a=fmtp:${pt} minptime=10;useinbandfec=1;stereo=0;sprop-stereo=0;usedtx=1;maxaveragebitrate=64000\r\n`
      );
    }
  }
  return tuned;
};

// Configure sender parameters: 2.0 Mbps HD video with adaptive resolution, 64 kbps HD audio
const configurePeerSenders = (pc) => {
  if (!pc) return;
  try {
    const senders = pc.getSenders();
    senders.forEach((sender) => {
      if (!sender || !sender.track) return;
      try {
        const params = sender.getParameters();
        if (!params || !params.encodings || params.encodings.length === 0) return;

        let changed = false;
        if (sender.track.kind === "video") {
          if (params.encodings[0].maxBitrate !== 2000000) {
            params.encodings[0].maxBitrate = 2000000; // 2.0 Mbps HD
            changed = true;
          }
          if (params.encodings[0].maxFramerate !== 30) {
            params.encodings[0].maxFramerate = 30;
            changed = true;
          }
          if (params.degradationPreference !== "maintain-framerate") {
            params.degradationPreference = "maintain-framerate"; // Dynamic resolution scaling without dropping frames
            changed = true;
          }
        } else if (sender.track.kind === "audio") {
          if (params.encodings[0].maxBitrate !== 64000) {
            params.encodings[0].maxBitrate = 64000; // 64 kbps HD speech
            changed = true;
          }
        }

        if (changed) {
          sender.setParameters(params).catch(() => {});
        }
      } catch (_) {}
    });
  } catch (_) {}
};

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
  const isAudioOnlyCallRef = useRef(false);
  const dataChannelsRef = useRef(new Map()); // peerId -> RTCDataChannel
  const localMediaStateRef = useRef({ isVideoOff: false, isMuted: false });
  const participantNameRef = useRef("");

  const [roomId, setRoomId] = useState(null);
  const [participantId, setParticipantId] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [remoteMediaStates, setRemoteMediaStates] = useState(new Map()); // peerId -> { isVideoOff: boolean, isMuted: boolean }

  const updateLocalStream = useCallback((stream) => {
    localStreamRef.current = stream;
    setLocalStream(stream);
    if (stream) {
      peersRef.current.forEach((pc) => {
        attachLocalTracks(pc, stream);
      });
    }
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

  const mediaPromiseRef = useRef(null);

  const ensureLocalMedia = useCallback(async (options = {}) => {
    if (mediaPromiseRef.current) {
      return mediaPromiseRef.current;
    }

    const audioOnly = options.audioOnly ?? isAudioOnlyCallRef.current;
    const current = localStreamRef.current;
    if (current && current.active && current.getTracks().some(t => t.readyState === "live")) {
      const hasAudio = current.getAudioTracks().some(t => t.readyState === "live");
      const hasVideo = current.getVideoTracks().some(t => t.readyState === "live");
      if (audioOnly && hasAudio) {
        return current;
      }
      if (!audioOnly && hasAudio && hasVideo) {
        return current;
      }
    }

    mediaPromiseRef.current = (async () => {
      try {
        if (audioOnly) {
          console.log("[SFU] Acquiring audio stream with studio noise suppression...");
          try {
            const s = await navigator.mediaDevices.getUserMedia({
              audio: AUDIO_CONSTRAINTS,
              video: false,
            });
            updateLocalStream(s);
            return s;
          } catch (audioConstErr) {
            console.warn("[SFU] Advanced audio constraints fallback:", audioConstErr);
            const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            updateLocalStream(s);
            return s;
          }
        } else {
          console.log("[SFU] Acquiring HD audio + video stream with noise suppression...");
          try {
            const s = await navigator.mediaDevices.getUserMedia({
              audio: AUDIO_CONSTRAINTS,
              video: VIDEO_CONSTRAINTS,
            });
            updateLocalStream(s);
            return s;
          } catch (hdErr) {
            console.warn("[SFU] HD constraints fallback to standard video:", hdErr);
            try {
              const s = await navigator.mediaDevices.getUserMedia({
                audio: AUDIO_CONSTRAINTS,
                video: true,
              });
              updateLocalStream(s);
              return s;
            } catch (standardErr) {
              console.warn("[SFU] Standard constraints fallback:", standardErr);
              const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
              updateLocalStream(s);
              return s;
            }
          }
        }
      } catch (err) {
        console.warn("[SFU] Could not get media (audioOnly=" + audioOnly + "):", err);
        try {
          const audioFallback = await navigator.mediaDevices.getUserMedia({
            audio: AUDIO_CONSTRAINTS,
            video: false,
          });
          updateLocalStream(audioFallback);
          return audioFallback;
        } catch (audioErr) {
          try {
            const basicAudio = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false,
            });
            updateLocalStream(basicAudio);
            return basicAudio;
          } catch (_) {
            console.warn("[SFU] Could not access microphone or camera, using fallback stream:", audioErr);
            const emptyStream = new MediaStream();
            updateLocalStream(emptyStream);
            return emptyStream;
          }
        }
      } finally {
        mediaPromiseRef.current = null;
      }
    })();

    return mediaPromiseRef.current;
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
      offer.sdp = tuneSdp(offer.sdp);
      await pc.setLocalDescription(offer);
      configurePeerSenders(pc);

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
    // In direct 1-on-1 collision calls, there is only one remote peer.
    // If a new peer connection arrives with a different ID, evict any prior connections!
    const isDirectCall = (currentRoomId && String(currentRoomId).startsWith("call-")) ||
                         (roomIdRef.current && String(roomIdRef.current).startsWith("call-"));
    if (isDirectCall) {
      for (const [oldPeerId, oldPc] of peersRef.current.entries()) {
        if (oldPeerId !== peerId) {
          console.log("[SFU 1-on-1] Evicting prior peer connection:", oldPeerId, "for new peer:", peerId);
          try { oldPc.close(); } catch (_) {}
          peersRef.current.delete(oldPeerId);
          dataChannelsRef.current.get(oldPeerId)?.close?.();
          dataChannelsRef.current.delete(oldPeerId);
          candidateQueuesRef.current.delete(oldPeerId);
          iceRestartCountRef.current.delete(oldPeerId);
          setRemoteStreams((prev) => {
            const m = new Map(prev);
            m.delete(oldPeerId);
            return m;
          });
          setRemoteMediaStates((prev) => {
            const m = new Map(prev);
            m.delete(oldPeerId);
            return m;
          });
        }
      }
    }

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

    // Pre-negotiated DataChannel for instant P2P media state synchronization
    try {
      const dc = pc.createDataChannel("media-state", { negotiated: true, id: 10 });
      dc.onopen = () => {
        try {
          dc.send(JSON.stringify({
            type: "media-state",
            ...localMediaStateRef.current,
          }));
        } catch (_) {}
      };
      dc.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === "media-state") {
            console.log("[SFU DC] Media state from peer:", peerId, data);
            setRemoteMediaStates((prev) => {
              const m = new Map(prev);
              m.set(peerId, {
                isVideoOff: Boolean(data.isVideoOff),
                isMuted: Boolean(data.isMuted),
              });
              return m;
            });
          }
        } catch (_) {}
      };
      dataChannelsRef.current.set(peerId, dc);
    } catch (err) {
      console.warn("[SFU] Could not create data channel for peer:", peerId, err);
    }

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
        const existing = m.get(peerId);
        let tracks = existing ? [...existing.getTracks()] : [];
        if (e.streams?.[0]) {
          e.streams[0].getTracks().forEach((t) => {
            if (!tracks.some((tr) => tr.id === t.id)) {
              tracks.push(t);
            }
          });
        }
        if (!tracks.some((t) => t.id === e.track.id)) {
          tracks.push(e.track);
        }
        const freshStream = new MediaStream(tracks);
        m.set(peerId, freshStream);
        console.log("[SFU] Remote streams updated, total peers:", m.size, "tracks:", tracks.map(t => `${t.kind}:${t.enabled}`));
        return m;
      });
    };

    pc.onremovetrack = (e) => {
      console.log("[SFU] Remote track removed from peer:", peerId, "kind:", e.track?.kind);
      setRemoteStreams((prev) => {
        const m = new Map(prev);
        const existing = m.get(peerId);
        if (!existing) return m;
        const tracks = existing.getTracks().filter((t) => t.id !== e.track?.id);
        m.set(peerId, new MediaStream(tracks));
        return m;
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
    configurePeerSenders(pc);
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
        offer.sdp = tuneSdp(offer.sdp);
        await pc.setLocalDescription(offer);
        configurePeerSenders(pc);

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
      if (!from || from === participantIdRef.current) return;

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
      ans.sdp = tuneSdp(ans.sdp);
      await pc.setLocalDescription(ans);
      configurePeerSenders(pc);

      signalingRef.current.sendAnswer(currentRoomId, participantIdRef.current, from, ans);
      console.log("[SFU] Answer sent to peer:", from);
    });

    s.on("answer", async (msg) => {
      if (!msg.participantId || msg.participantId === participantIdRef.current) return;
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
        configurePeerSenders(pc);
        console.log("[SFU] Answer applied successfully for peer:", msg.participantId);
      } catch (err) {
        console.error("[SFU] Error setting remote description (answer):", err);
      }
    });

    s.on("ice-candidate", async (msg) => {
      if (!msg.participantId || msg.participantId === participantIdRef.current) return;
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

    s.on("media-state", (msg) => {
      const fromPeerId = msg.participantId;
      if (!fromPeerId || fromPeerId === participantIdRef.current) return;
      console.log("[SFU WS] Media state from peer:", fromPeerId, msg.data);
      setRemoteMediaStates((prev) => {
        const m = new Map(prev);
        m.set(fromPeerId, {
          isVideoOff: Boolean(msg.data?.isVideoOff),
          isMuted: Boolean(msg.data?.isMuted),
        });
        return m;
      });
    });

    s.on("participant-left", (msg) => {
      const leftPeerId = msg.participantId;
      console.log("[SFU] Participant left:", leftPeerId);

      const pc = peersRef.current.get(leftPeerId);
      if (pc) {
        pc.close();
        peersRef.current.delete(leftPeerId);
      }

      dataChannelsRef.current.get(leftPeerId)?.close?.();
      dataChannelsRef.current.delete(leftPeerId);
      candidateQueuesRef.current.delete(leftPeerId);
      iceRestartCountRef.current.delete(leftPeerId);

      setRemoteStreams((prev) => {
        const m = new Map(prev);
        m.delete(leftPeerId);
        return m;
      });
      setRemoteMediaStates((prev) => {
        const m = new Map(prev);
        m.delete(leftPeerId);
        return m;
      });
    });

    s.on("reconnected", async () => {
      console.log("[SFU] Signaling reconnected, rejoining room:", roomIdRef.current);
      if (roomIdRef.current && participantNameRef.current) {
        s.join(roomIdRef.current, participantNameRef.current);
      }
    });
  }, [createPeer, ensureLocalMedia, startHeartbeat, attemptIceRestart]);

  const join = useCallback(async (rid, name, options = {}) => {
    const { audioOnly = false } = options;
    isAudioOnlyCallRef.current = audioOnly;

    setRoomId(rid);
    roomIdRef.current = rid;
    participantNameRef.current = name;

    const s = await ensureSignaling();
    registerHandlers(s, rid);

    // Join signaling room immediately so server & remote peers acknowledge entry instantly
    s.join(rid, name);

    // Concurrently acquire local media tracks
    ensureLocalMedia({ audioOnly }).catch((e) => {
      console.warn("[SFU] Error acquiring media on join:", e);
    });
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
    dataChannelsRef.current.forEach((dc) => {
      try { dc.close(); } catch (_) {}
    });
    dataChannelsRef.current.clear();
    setRemoteMediaStates(new Map());
    localMediaStateRef.current = { isVideoOff: false, isMuted: false };
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

  const broadcastMediaState = useCallback((state) => {
    localMediaStateRef.current = { ...localMediaStateRef.current, ...state };
    const payload = JSON.stringify({ type: "media-state", ...localMediaStateRef.current });

    // 1. Direct WebRTC DataChannels (zero server latency)
    dataChannelsRef.current.forEach((dc) => {
      if (dc.readyState === "open") {
        try {
          dc.send(payload);
        } catch (_) {}
      }
    });

    // 2. Signaling WebSocket
    if (signalingRef.current && roomIdRef.current) {
      try {
        signalingRef.current.sendMediaState(
          roomIdRef.current,
          participantIdRef.current,
          localMediaStateRef.current
        );
      } catch (_) {}
    }
  }, []);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return false;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      const nextEnabled = !audioTrack.enabled;
      audioTrack.enabled = nextEnabled;
      console.log("[SFU] Audio track enabled:", nextEnabled);

      // Directly update all RTCRtpSenders across all active peer connections
      peersRef.current.forEach((pc) => {
        try {
          pc.getSenders().forEach((sender) => {
            if (sender.track && sender.track.kind === "audio") {
              sender.track.enabled = nextEnabled;
            }
          });
        } catch (_) {}
      });

      setLocalStream(new MediaStream(stream.getTracks()));
      const videoTrack = stream.getVideoTracks()[0];
      const isMutedNow = !nextEnabled;
      broadcastMediaState({
        isMuted: isMutedNow,
        isVideoOff: videoTrack ? !videoTrack.enabled : false,
      });
      return isMutedNow; // returns true if now muted
    }
    return false;
  }, [broadcastMediaState]);

  const toggleVideo = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return false;

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const nextEnabled = !videoTrack.enabled;
      videoTrack.enabled = nextEnabled;
      console.log("[SFU] Video track toggled, enabled:", nextEnabled);

      // Directly update all RTCRtpSenders across all active peer connections
      peersRef.current.forEach((pc) => {
        try {
          pc.getSenders().forEach((sender) => {
            if (sender.track && sender.track.kind === "video") {
              sender.track.enabled = nextEnabled;
            }
          });
        } catch (_) {}
      });

      setLocalStream(new MediaStream(stream.getTracks()));
      const audioTrack = stream.getAudioTracks()[0];
      const isVideoActiveNow = nextEnabled;
      broadcastMediaState({
        isVideoOff: !isVideoActiveNow,
        isMuted: audioTrack ? !audioTrack.enabled : false,
      });
      return isVideoActiveNow; // returns true if video is active
    } else {
      // Dynamic camera track acquisition when user switches from audio-only to video
      try {
        console.log("[SFU] Requesting camera track dynamically...");
        let camStream;
        try {
          camStream = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS });
        } catch (_) {
          camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        const newTrack = camStream.getVideoTracks()[0];
        if (newTrack) {
          stream.addTrack(newTrack);
          isAudioOnlyCallRef.current = false;

          // Attach track to all existing RTCPeerConnections and renegotiate
          for (const [peerId, pc] of peersRef.current.entries()) {
            try {
              pc.addTrack(newTrack, stream);
              const offer = await pc.createOffer();
              offer.sdp = tuneSdp(offer.sdp);
              await pc.setLocalDescription(offer);
              configurePeerSenders(pc);
              if (signalingRef.current && roomIdRef.current && participantIdRef.current) {
                signalingRef.current.sendOffer(
                  roomIdRef.current,
                  participantIdRef.current,
                  peerId,
                  offer
                );
              }
              console.log("[SFU] Sent renegotiated offer with video to peer:", peerId);
            } catch (err) {
              console.warn("[SFU] Failed adding video track to peer:", peerId, err);
            }
          }

          setLocalStream(new MediaStream(stream.getTracks()));
          const audioTrack = stream.getAudioTracks()[0];
          broadcastMediaState({
            isVideoOff: false,
            isMuted: audioTrack ? !audioTrack.enabled : false,
          });
          return true;
        }
      } catch (camErr) {
        console.error("[SFU] Could not enable camera:", camErr);
        return false;
      }
    }
    return false;
  }, [broadcastMediaState]);

  return {
    roomId,
    participantId,
    localStream,
    remoteStreams,
    remoteMediaStates,
    broadcastMediaState,
    join,
    leave,
    toggleMute,
    toggleVideo,
  };
};

export default useSfuVideoCall;

