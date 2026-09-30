import React, { useState, useRef } from "react";
import socket from "./socket.jsx";
import down from "../../assets/down.svg";
import right from "../../assets/right arrow.svg";
import { useDispatch, useSelector } from "react-redux";
import { useMembers } from "../useMembers";
import { setUserProfile } from "../userslice";
import { getProfileInfo } from "../../api/profileapi";
import { getWorkspaceForUsers } from "../../api/authApi";

const MembersSection = ({ onSelectChannel, onOpenChat, onStartDM, unreadDMs = {} }) => {

  const dispatch = useDispatch();
  const userState = useSelector((state) => state.user);
  const { workspaceId, profile } = userState;
  const { members, loading, error, fetchMembers } = useMembers(workspaceId);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const storedId = (() => {
    try { return localStorage.getItem('selfUserId'); } catch (_) { return null; }
  })();
  const selfUserId = profile?._id || profile?.id || userState.userId || userState.id || storedId || null;


  React.useEffect(() => {
    let cancelled = false;
    const primeProfile = async () => {
      if (selfUserId) return; 
      try {
        const res = await getProfileInfo();
        const data = res?.data?.data;
        if (!cancelled && data) {
          dispatch(setUserProfile(data));
          const id = data?._id || data?.id || null;
          if (id) {
            try { localStorage.setItem('selfUserId', id); } catch (_) {}
          }
          console.log('[p2p] hydrated profile via API; id=', id);
        }
      } catch (err) {
        console.warn('[p2p] failed to hydrate profile', err);
      }
    };
    primeProfile();
    return () => { cancelled = true; };
  }, [selfUserId, dispatch]);
  const toggle = () => setIsCollapsed((p) => !p);
  const pcRef = useRef(null); 
  const localStreamRef = useRef(null);
  const [activePeer, setActivePeer] = useState(null); 
  const [callStatus, setCallStatus] = useState("idle"); 

  
  const remoteAudioRef = useRef(null);


  React.useEffect(() => {
    console.log('[p2p] effect: mount/join selfUserId=', selfUserId);
    if (!selfUserId) {
      console.warn('[p2p] selfUserId missing; cannot join personal signaling room yet');
      return;
    }
    socket.emit('joinRoom', selfUserId);
    console.log('[p2p] emitted joinRoom for', selfUserId);
    return () => {
      console.log('[p2p] cleanup: leaveRoom', selfUserId);
      socket.emit('leaveRoom', selfUserId);
    };
  }, [socket, selfUserId]);

  const cleanupPeer = () => {
    try { pcRef.current?.close(); } catch (_) {}
    pcRef.current = null;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
  };

  const startLocalMedia = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    return stream;
  };

  const createPeerConnection = (targetUserId) => {
    console.log('[p2p] createPeerConnection target=', targetUserId);
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[p2p] ICE candidate generated, sending to peer');
        socket.emit('ice-candidate', {
          toUserId: targetUserId,
          candidate: event.candidate,
          fromUserId: selfUserId,
        });
      } else {
        console.log('[p2p] ICE candidate gathering complete');
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      const remoteStream = stream || (() => {
        const s = new MediaStream();
        s.addTrack(event.track);
        return s;
      })();
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
      const tracks = remoteStream.getTracks ? remoteStream.getTracks() : [event.track];
      console.log('[p2p] remote stream received tracks=', tracks.map(t => t.kind));
      setCallStatus('in-call');
    };

    pc.onconnectionstatechange = () => {
      console.log('[p2p] connectionState=', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setCallStatus('ended');
        cleanupPeer();
      }
    };
    pc.onsignalingstatechange = () => console.log('[p2p] signalingState=', pc.signalingState);
    pc.oniceconnectionstatechange = () => console.log('[p2p] iceConnectionState=', pc.iceConnectionState);
    pc.onnegotiationneeded = () => console.log('[p2p] negotiationneeded');
    return pc;
  };

  const initiatePeerChat = async (targetUserId) => {
    console.log('[p2p] initiatePeerChat target=', targetUserId, 'self=', selfUserId);
    if (!selfUserId) {
      console.warn('[p2p] abort: no selfUserId');
      return;
    }
    if (!targetUserId) {
      console.warn('[p2p] abort: no targetUserId');
      return;
    }
    if (selfUserId === targetUserId) {
      console.warn('[p2p] abort: clicked self');
      return;
    }
    setActivePeer(targetUserId);
    setCallStatus("calling");
   
    let channelId = null;
    try {
      const res = await getWorkspaceForUsers(selfUserId, targetUserId);
      const data = res?.data || {};
      channelId = data.channelId
        || data.channel?._id
        || data.workspace?.channelId
        || data.workspaceId
        || data.workspace?._id
        || null;
      if (!channelId) {
        
        channelId = [selfUserId, targetUserId].sort().join("-");
        console.warn('[p2p] using synthetic DM channel id; server did not return a channelId');
      } else {
        console.log('[p2p] resolved DM channelId=', channelId);
      }
    } catch (err) {
      console.warn('[p2p] getWorkspaceForUsers failed; falling back to synthetic id', err?.response?.data || err?.message || err);
      channelId = [selfUserId, targetUserId].sort().join("-");
    }
    onSelectChannel?.(channelId);
    onOpenChat?.();
    cleanupPeer();
    pcRef.current = createPeerConnection(targetUserId);
    try {
      const stream = await startLocalMedia();
      console.log('[p2p] local media tracks=', stream.getTracks().map(t=>t.kind));
      stream.getTracks().forEach(t => pcRef.current.addTrack(t, stream));
      const offer = await pcRef.current.createOffer();
      console.log('[p2p] created offer type=', offer.type, 'sdp length=', offer.sdp?.length);
      await pcRef.current.setLocalDescription(offer);
      console.log('[p2p] setLocalDescription(offer) signalingState=', pcRef.current.signalingState);
      socket.emit("call-user", { to: targetUserId, offer, fromUserId: selfUserId });
      console.log('[p2p] emitted call-user to=', targetUserId);
    } catch (err) {
      console.error("Failed to start call", err);
      setCallStatus("error");
      cleanupPeer();
    }
  };

 
  React.useEffect(() => {
    if (!socket) return;
    const onIncoming = async ({ from, fromUserId, offer }) => {
     
      if (fromUserId === selfUserId) { console.log('[p2p] incoming-call ignored (from self)'); return; }
      console.log('[p2p] incoming-call from=', fromUserId, 'offer present=', !!offer);
      setActivePeer(fromUserId);
      setCallStatus("ringing");
      // Auto switch chat to the incoming peer channel
      const channelId = [selfUserId, fromUserId].sort().join("-");
      onSelectChannel?.(channelId);
      onOpenChat?.();
      cleanupPeer();
      pcRef.current = createPeerConnection(fromUserId);
      try {
        const stream = await startLocalMedia();
        console.log('[p2p] (answer) local media tracks=', stream.getTracks().map(t=>t.kind));
        stream.getTracks().forEach(t => pcRef.current.addTrack(t, stream));
        await pcRef.current.setRemoteDescription(offer);
        console.log('[p2p] setRemoteDescription(offer) signalingState=', pcRef.current.signalingState);
        const answer = await pcRef.current.createAnswer();
        console.log('[p2p] created answer type=', answer.type, 'sdp length=', answer.sdp?.length);
        await pcRef.current.setLocalDescription(answer);
        console.log('[p2p] setLocalDescription(answer) signalingState=', pcRef.current.signalingState);
        socket.emit("answer-call", { to: fromUserId, answer, fromUserId: selfUserId });
        console.log('[p2p] emitted answer-call to=', fromUserId);
      } catch (err) {
        console.error("Error answering call", err);
        setCallStatus("error");
        cleanupPeer();
      }
    };
    const onAnswered = async ({ fromUserId, answer }) => {
      if (fromUserId !== activePeer) return;
      try {
        console.log('[p2p] received call-answered from', fromUserId, 'answer len=', answer?.sdp?.length);
        await pcRef.current.setRemoteDescription(answer);
        console.log('[p2p] setRemoteDescription(answer) signalingState=', pcRef.current.signalingState);
        setCallStatus("in-call");
      } catch (err) {
        console.error("Failed setting remote answer", err);
        setCallStatus("error");
      }
    };
    const onCandidate = async ({ fromUserId, candidate }) => {
      if (fromUserId !== activePeer) return;
      try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate)); } catch (err) {
        console.error("ICE add error", err);
      }
      console.log('[p2p] added remote candidate from', fromUserId, candidate);
    };
    const onEnded = ({ fromUserId }) => {
      if (fromUserId !== activePeer) return;
      console.log('[p2p] received end-call from', fromUserId);
      setCallStatus("ended");
      cleanupPeer();
    };
    console.log('[p2p] signaling listeners attached');
    socket.on("incoming-call", onIncoming);
    socket.on("call-answered", onAnswered);
    socket.on("ice-candidate", onCandidate);
    socket.on("call-ended", onEnded);
    return () => {
      console.log('[p2p] signaling listeners detached');
      socket.off("incoming-call", onIncoming);
      socket.off("call-answered", onAnswered);
      socket.off("ice-candidate", onCandidate);
      socket.off("call-ended", onEnded);
    };
  }, [socket, activePeer, selfUserId]);

  const endActiveCall = () => {
    if (activePeer) {
      socket.emit("end-call", { to: activePeer, fromUserId: selfUserId });
      console.log('[p2p] emitted end-call to=', activePeer);
    } else {
      console.warn('[p2p] endActiveCall invoked with no activePeer');
    }
    setCallStatus("ended");
    cleanupPeer();
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-white bg-[#200539] py-2 px-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={toggle}>
          <img
            src={isCollapsed ? right : down}
            alt="toggle arrow"
            className="mt-2.5 w-6 transition-transform"
          />
          <h3 className="text-xl">Members</h3>
        </div>
        <button
          type="button"
          onClick={fetchMembers}
          className="text-xs bg-[#BFA2E1] text-[#0E1219] px-2 py-1 rounded-md font-medium hover:opacity-90"
        >
          Refresh
        </button>
      </div>
      {!isCollapsed && (
        <div className="max-h-64 overflow-y-auto scrollbar-hide">
          <style>{`.scrollbar-hide{ -ms-overflow-style:none; scrollbar-width:none; }.scrollbar-hide::-webkit-scrollbar{display:none;}`}</style>
          {!selfUserId && (
            <p className="text-[11px] text-yellow-300 bg-[#3A0E70] px-4 py-1">Loading your identity… please wait a moment before starting a call.</p>
          )}
          {loading && (
            <p className="text-[#BCBCBC] text-sm px-4 py-2">Loading members…</p>
          )}
          {error && (
            <p className="text-red-400 text-sm px-4 py-2">Failed to load members</p>
          )}
            {members.map((m) => {
              const isSelf = m._id === selfUserId;
              const isActive = activePeer === m._id && ["calling","ringing","in-call"].includes(callStatus);
              const unreadCount = unreadDMs[m._id] || 0;
              if (!m._id) {
                console.warn('[p2p] member missing _id', m);
              }
              return (
                <div
                  key={m._id}
                  className={`flex items-center justify-between text-white px-4 py-2 ${isActive ? 'bg-[#3A0E70]' : 'bg-[#200539] hover:bg-[#2A0C52]'}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        m.online ? "bg-green-500 shadow-[0_0_6px_#22c55e]" : "bg-gray-400"
                      }`}
                      title={m.online ? "Online" : "Offline"}
                    />
                    <h4 className="text-[#BCBCBC] text-base">{m.fullName || m.username}{isSelf ? ' (You)' : ''}</h4>
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isSelf && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartDM?.(m._id, m.username || m.fullName);
                        }}
                        className="text-[10px] bg-[#5E9BFF] hover:bg-[#4A8AEE] px-2 py-0.5 rounded font-medium"
                      >
                        DM
                      </button>
                    )}
                    {isActive && (
                      <button
                        onClick={(e) => { e.stopPropagation(); endActiveCall(); }}
                        className="text-[10px] bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded"
                      >End</button>
                    )}
                    <span className="text-[12px] text-[#BCBCBC] bg-[#2F0A5C] px-2 py-0.5 rounded-md">{m.role || ""}</span>
                  </div>
                </div>
              );
            })}
            {(!loading && members.length === 0) && (
              <p className="text-[#BCBCBC] text-sm px-4 py-2">No members yet</p>
            )}
            {activePeer && (
              <div className="px-4 py-2 text-[11px] text-[#BCBCBC] italic">
                Status: {callStatus}{callStatus === 'ringing' && ' (incoming...)'}
              </div>
            )}
        </div>
      )}
      {/* Hidden audio element for remote stream playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
    </div>
  );
};

export default MembersSection;
