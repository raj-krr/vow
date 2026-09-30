import React, { useState, useRef, useEffect } from 'react';
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

const VideoConference = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [stream, setStream] = useState(null);
  const [lastEmoji, setLastEmoji] = useState(null);
  const reactionTimeoutRef = useRef(null);
  const callContainerRef = useRef(null);

  //  real roomId returned by SFU backend
  const [generatedRoomId, setGeneratedRoomId] = useState("");

  // user’s text input (title before room is created)
  const [callTitle, setCallTitle] = useState("");

  const [joinInput, setJoinInput] = useState("");
  const localVideoRef = useRef(null);
  const profile = useSelector((state) => state.user.profile);

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
  };

  return (
    <div className="h-full bg-white text-black flex flex-col">

      {/* BEFORE CALL */}
      {!isCallActive ? (
        <div className="h-full flex flex-col">
          <div className="flex-1 w-full overflow-y-auto px-4 py-6 space-y-6 flex flex-col items-center">

           
            {/* START A NEW CALL (UI UNCHANGED!) */}
            
            <div
              className="flex flex-col items-center justify-center rounded-2xl bg-[#EFE7F6] px-[18px] py-6 gap-6 w-[944px] max-w-[95vw] h-[285px]"
              style={{
                boxShadow:
                  '0 -23px 25px 0 rgba(191, 162, 225, 0.17) inset, 0 -36px 30px 0 rgba(204, 180, 227, 0.15) inset, 0 -79px 40px 0 rgba(204, 180, 227, 0.10) inset, 0 2px 1px 0 rgba(204, 180, 227, 0.06), 0 4px 2px 0 rgba(204, 180, 227, 0.09), 0 8px 4px 0 rgba(204, 180, 227, 0.09), 0 16px 8px 0 rgba(204, 180, 227, 0.09), 0 32px 16px 0 rgba(204, 180, 227, 0.09)',
              }}
            >
              <div className="w-16 h-16 rounded-lg flex items-center justify-center">
                <img src={Play} alt="Start Call" className="w-8 h-8" />
              </div>

              <div className="text-center">
                <h3 className="text-[24px] font-bold text-black">Start a New Call</h3>
                <p className="text-black mt-2 text-[20px]">Instantly create a video conference.</p>
              </div>

              {/* REAL roomId after creation */}
              <div className="relative w-full max-w-sm">
                <img src={KeyIcon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-70" />

                <input
                  value={generatedRoomId ? generatedRoomId : callTitle}
                  onChange={(e) => setCallTitle(e.target.value)}
                  type="text"
                  placeholder="Enter title of the call"
                  className="w-full pl-9 pr-10 py-2 rounded-md border border-[#D6DAE1] bg-white text-sm text-[#0E1219]"
                />

                <img src={textFields} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-70" />
              </div>

              <button
                onClick={startCall}
                className="bg-[#5E9BFF] text-white font-medium py-2 px-8 rounded-md"
              >
                Start Call
              </button>
            </div>

            
            {/* JOIN EXISTING CALL  */}
           
            <div
              className="flex flex-col items-center justify-center rounded-2xl bg-[#EFE7F6] px-[18px] py-6 gap-6 w-[944px] max-w-[95vw] h-[285px]"
              style={{
                boxShadow:
                  '0 -23px 25px 0 rgba(191, 162, 225, 0.17) inset, 0 -36px 30px 0 rgba(204, 180, 227, 0.15) inset, 0 -79px 40px 0 rgba(204, 180, 227, 0.10) inset, 0 2px 1px 0 rgba(204, 180, 227, 0.06), 0 4px 2px 0 rgba(204, 180, 227, 0.09), 0 8px 4px 0 rgba(204, 180, 227, 0.09), 0 16px 8px 0 rgba(204, 180, 227, 0.09), 0 32px 16px 0 rgba(204, 180, 227, 0.09)',
              }}
            >
              <div className="w-16 h-16 rounded-lg flex items-center justify-center">
                <img src={Link} alt="Join Call" className="w-8 h-8" />
              </div>

              <div className="text-center">
                <h3 className="text-[24px] font-bold text-black">Join a Call</h3>
                <p className="text-black mt-2 text-[20px]">Enter a meeting ID or paste a link.</p>
              </div>

              <div className="relative w-full max-w-sm">
                <img src={textFields} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-70" />

                <input
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  type="text"
                  placeholder="Enter meeting ID"
                  className="w-full pl-9 pr-3 py-2 rounded-md border border-[#D6DAE1] bg-white text-sm text-[#0E1219]"
                />
              </div>

              <button
                onClick={joinCall}
                className="bg-[#5E9BFF] text-white font-medium py-2 px-8 rounded-md"
              >
                Join Now
              </button>
            </div>

          </div>
        </div>
      ) : (

       
        <div ref={callContainerRef} className="h-full bg-[#FEFEFE] flex flex-col">

          <div className="flex-1 p-4">
            <div className="grid grid-cols-2 gap-4 h-full">

              {/* local video */}
              <div className="relative bg-gray-800 rounded-xl overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
              </div>

              {/* remote peers */}
              {Array.from(remoteStreams.entries()).map(([peerId, mediaStream]) => (
                <div key={peerId} className="relative bg-gray-800 rounded-xl overflow-hidden">
                  <video
                    autoPlay
                    playsInline
                    ref={(el) => {
                      if (el && el.srcObject !== mediaStream) {
                        el.srcObject = mediaStream;
                        console.log("[VideoConference] Remote video element attached for peer:", peerId, 
                          "tracks:", mediaStream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));
                        el.play().catch(err => {
                          console.error("[VideoConference] Error playing remote video:", peerId, err);
                        });
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    Peer: {peerId.slice(0, 8)}
                  </div>
                </div>
              ))}

              {/* Waiting for peers placeholder */}
              {remoteStreams.size === 0 && (
                <div className="relative bg-gray-700 rounded-xl overflow-hidden flex items-center justify-center">
                  <div className="text-white/60 text-center">
                    <div className="text-2xl mb-2"></div>
                    <div className="text-sm">Waiting for others to join...</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* bottom controls */}
          <div className="bg-[#200539] border-t border-[#3D1B5F] px-6 py-3">
            <div className="flex items-center justify-center gap-5">
              <button
                onClick={() => {
                  toggleMuteHook();
                  setIsMuted((v) => !v);
                }}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-[#35115A]"
              >
                <img src={mic} className="w-6 h-6" />
              </button>

              <button
                onClick={() => {
                  toggleVideoHook();
                  setIsVideoOff((v) => !v);
                }}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-[#35115A]"
              >
                <img src={videocam} className="w-6 h-6" />
              </button>

              <button
                onClick={endCall}
                className="inline-flex items-center justify-center bg-[#FF3B30] text-white font-medium px-4 py-2 ml-7 rounded-md"
              >
                Leave Meet
              </button>
            </div>

            {roomId && (
              <div className="mt-3 text-center text-white/80 text-sm">
                Meeting ID: <b>{roomId}</b>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoConference;
