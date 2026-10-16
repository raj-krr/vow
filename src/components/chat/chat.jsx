import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { setWorkspaceContext } from "../userslice";

import MessageList from "../chat/message.jsx";
import Sidebar from "../chat/sidebar.jsx";
import CreateTeamModal from "./CreateTeamModal.jsx";
import MemberMultiSelect from "./MemberMultiSelect.jsx";

import InputBox from "../chat/input.jsx";
import Header from "../chat/header.jsx";
import InfoBar from "../chat/infobar.jsx";
import TeamBuilder from "../chat/teambuilder.jsx";
import Map from "../map/Map.jsx";
import ManagerMeeting from "../dashboard/Meeting/ManagerMeeting.jsx";
import VideoConference from "./VideoConference.jsx";

import { useVoiceCall } from "../voice/useVoiceCall.js";
import { useMembers } from "../useMembers.js";

import socket, { connectSocket, sendDirectMessage } from "./socket.jsx";
import ChatLayout from "./ChatLayout.jsx";
import { getChannels } from "../../api/channelApi.js";

// ✅ NEW HOOKS
import { useChatTeams } from "./hooks/useChatTeams";
import { useChatMessages } from "./hooks/useChatMessages";
import { useChatSocket } from "./hooks/useChatSocket";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

const Chat = ({ username, roomId, remoteUserId }) => {
  const { workspaceId: paramWorkspaceId } = useParams();
  const dispatch = useDispatch();
  const reduxWorkspaceName = useSelector((state) => state.user.workspaceName);
  const profile = useSelector((state) => state.user.profile);
  const reduxUserId = useSelector((state) => state.user.userId);
  const reduxWorkspaceId = useSelector((state) => state.user.workspaceId);
  const presenceSelfId = useSelector((state) => state.presence?.selfId);

  const jwtUserId = useMemo(() => {
    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload._id || payload.id || payload.userId || null;
      }
    } catch (e) {}
    return null;
  }, []);

  const workspaceId = paramWorkspaceId || reduxWorkspaceId || localStorage.getItem("workspaceId");
  const userId = reduxUserId || profile?._id || profile?.id || localStorage.getItem("userId") || jwtUserId;
  const workspaceName = reduxWorkspaceName || localStorage.getItem("workspaceName");

  useEffect(() => {
    if (userId) {
      try {
        localStorage.setItem("userId", userId);
      } catch (e) {}
    }
  }, [userId]);

  useEffect(() => {
    if (workspaceId) {
      localStorage.setItem("workspaceId", workspaceId);
      if (!reduxWorkspaceId) {
        dispatch(setWorkspaceContext({ workspaceId, workspaceName }));
      }
    }
  }, [workspaceId, reduxWorkspaceId, workspaceName, dispatch]);

  const { members } = useMembers(workspaceId);

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(roomId || null);
  const [messageInput, setMessageInput] = useState("");
  const [attachments, setAttachments] = useState([]);

  const [showMap, setShowMap] = useState(true);
  const [showMeeting, setShowMeeting] = useState(false);
  const [showVideoConference, setShowVideoConference] = useState(false);
  const [showTeamBuilder, setShowTeamBuilder] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const [isDMMode, setIsDMMode] = useState(false);
  const [dmReceiverId, setDmReceiverId] = useState(null);
  const [dmReceiverName, setDmReceiverName] = useState("");
  const [unreadDMs, setUnreadDMs] = useState({});
  const [callRoomId, setCallRoomId] = useState(null);
  const [callPartner, setCallPartner] = useState(null);
  const [callPartnerId, setCallPartnerId] = useState(null);
  const [callPartnerAvatar, setCallPartnerAvatar] = useState("");
  const [lastCallEndTime, setLastCallEndTime] = useState(0);
  const [lastCallPartnerId, setLastCallPartnerId] = useState(null);

  const callPartnerIdRef = useRef(null);
  const callRoomIdRef = useRef(null);

  const setCallSession = useCallback((roomId, partnerName, partnerId, partnerAvatar = "") => {
    callRoomIdRef.current = roomId;
    callPartnerIdRef.current = partnerId;
    setCallRoomId(roomId);
    setCallPartner(partnerName);
    setCallPartnerId(partnerId);
    setCallPartnerAvatar(partnerAvatar);
  }, []);

  const textareaRef = useRef(null);
  const mainRef = useRef(null);
  const { startCall } = useVoiceCall(SOCKET_URL);
  const [typingUser, setTypingUser] = useState("");

  useEffect(() => {
    if (!socket) return;

    const handleTyping = ({ username, channelId }) => {
      if (channelId && String(channelId) !== String(activeRoomId)) return;
      setTypingUser(username || "Someone");
    };

    const handleStopTyping = () => {
      setTypingUser("");
    };

    socket.on("user_typing", handleTyping);
    socket.on("user_stop_typing", handleStopTyping);
    socket.on("dm_user_typing", handleTyping);
    socket.on("dm_user_stop_typing", handleStopTyping);

    return () => {
      socket.off("user_typing", handleTyping);
      socket.off("user_stop_typing", handleStopTyping);
      socket.off("dm_user_typing", handleTyping);
      socket.off("dm_user_stop_typing", handleStopTyping);
    };
  }, [activeRoomId, isDMMode]);

  // ✅ HOOKS
  const { teams } = useChatTeams(workspaceId);

  const { messages, setMessages, dmCacheRef, hasMore, loadMoreMessages } = useChatMessages({
    activeRoomId,
    isDMMode,
    dmReceiverId,
    workspaceId,
    userId,
    profile,
  });

  useChatSocket({
    isDMMode,
    dmReceiverId,
    workspaceId,
    activeRoomId,
    userId,
    setMessages,
    setUnreadDMs,
  });

  // Restore DM session
  useEffect(() => {
    const savedDMState = sessionStorage.getItem("currentDM");
    if (!savedDMState) return;

    try {
      const { receiverId, receiverName } = JSON.parse(savedDMState);

      if (receiverId && receiverName) {
        setIsDMMode(true);
        setDmReceiverId(receiverId);
        setDmReceiverName(receiverName);
        setActiveRoomId(`dm-${receiverId}`);
        setShowMap(false);
      }
    } catch (err) {
      console.error("Failed to restore DM state:", err);
    }
  }, []);

  // Auto-select first channel if activeRoomId is null
  useEffect(() => {
    if (activeRoomId || !workspaceId || isDMMode) return;
    const loadDefaultChannel = async () => {
      try {
        const res = await getChannels(workspaceId);
        const list = res?.data || [];
        if (list.length > 0 && list[0]._id) {
          setActiveRoomId(list[0]._id);
        }
      } catch (e) {
        console.error("Auto select channel failed:", e);
      }
    };
    loadDefaultChannel();
  }, [workspaceId, activeRoomId, isDMMode]);

  // Auto resize
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(
      textareaRef.current.scrollHeight,
      160
    )}px`;
  }, [messageInput]);

  const handleEmojiSelect = useCallback(
    (emoji) => setMessageInput((prev) => prev + emoji),
    []
  );

  const handleStartDM = (receiverId, receiverName) => {
    if (!receiverId || receiverId === "undefined") {
      console.warn("Invalid receiverId passed to handleStartDM", receiverId);
      return;
    }
    setMessages([]);
    setIsDMMode(true);
    setDmReceiverId(receiverId);
    setDmReceiverName(receiverName || "User");
    setActiveRoomId(`dm-${receiverId}`);

    // Clear unread badge counter for this user
    setUnreadDMs((prev) => ({
      ...prev,
      [receiverId]: 0,
    }));

    sessionStorage.setItem(
      "currentDM",
      JSON.stringify({ receiverId, receiverName: receiverName || "User" })
    );
  };

  // ✅ START DIRECT CALL ON AVATAR COLLISION
  const handleStartCollisionCall = useCallback((receiverId, receiverName, receiverAvatar = "") => {
    const currentUserId = String(
      presenceSelfId ||
      userId ||
      profile?._id ||
      profile?.id ||
      jwtUserId ||
      localStorage.getItem("userId") ||
      ""
    );
    if (!receiverId || receiverId === "undefined" || !currentUserId) {
      console.warn("[Collision] Invalid receiverId or currentUserId for collision call", receiverId, currentUserId);
      return;
    }

    // Deterministic roomId for the pair of users in this workspace
    // If we are already in an active room, invite the new peer to join our existing room
    const myCurrentRoom = callRoomIdRef.current;
    let generatedRoom = myCurrentRoom;
    if (!generatedRoom) {
      const sortedPair = [String(currentUserId), String(receiverId)].sort();
      generatedRoom = `call-${workspaceId || "ws"}-${sortedPair[0]}-${sortedPair[1]}`;
    }

    console.log(`[Collision] 🤝 Avatar collision! Starting call with ${receiverName} (${receiverId}) in room: ${generatedRoom}`);

    setCallSession(generatedRoom, receiverName || "Member", receiverId, receiverAvatar);

    // Signal remote user via presence/dm socket so both users start the call simultaneously
    if (socket) {
      connectSocket();
      socket.emit("collision_call", {
        workspaceId,
        targetUserId: receiverId,
        callerId: currentUserId,
        callerSocketId: socket.id,
        callerName: profile?.fullName || profile?.username || username || "Member",
        callerAvatar: profile?.avatar || "",
        roomId: generatedRoom,
      });
    }

    setShowMap(false);
    setShowMeeting(false);
    setShowVideoConference(true);
  }, [userId, presenceSelfId, jwtUserId, workspaceId, profile, username, setCallSession]);

  // ✅ END DIRECT CALL ON USER HANGUP
  const handleEndCollisionCall = useCallback(() => {
    const partnerId = callPartnerIdRef.current;
    const currentRoom = callRoomIdRef.current;
    console.log("[Collision] 📴 Ending call locally. Partner was:", partnerId, "Room:", currentRoom);

    if (socket && (partnerId || currentRoom)) {
      socket.emit("collision_call_ended", {
        workspaceId,
        targetUserId: partnerId || null,
        callerId: String(presenceSelfId || userId || localStorage.getItem("userId") || ""),
        callerSocketId: socket.id,
        roomId: currentRoom,
      });
    }

    if (partnerId) setLastCallPartnerId(partnerId);
    setLastCallEndTime(Date.now());
    setCallSession(null, null, null, "");
    setShowVideoConference(false);
    setShowMap(true);
  }, [workspaceId, userId, presenceSelfId, setCallSession]);

  // Listen for incoming collision call notifications and remote call endings
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCollisionCall = (data) => {
      if (!data) return;
      const { callerId, callerName, targetUserId, roomId, callerSocketId, callerAvatar } = data;
      console.log("[Collision] 📞 Received collision_call_incoming:", data);

      // Only ignore if THIS EXACT tab/socket was the caller
      if (callerSocketId && socket?.id && callerSocketId === socket.id) {
        console.log("[Collision] Ignoring own event from callerSocketId:", callerSocketId);
        return;
      }

      const myMember = (members || []).find((m) =>
        String(m._id || m.id || m.userId) === String(presenceSelfId || userId || localStorage.getItem("userId"))
      );

      const allMyIds = [
        String(presenceSelfId || ""),
        String(userId || ""),
        String(profile?._id || ""),
        String(profile?.id || ""),
        String(profile?.userId || ""),
        String(jwtUserId || ""),
        String(myMember?._id || ""),
        String(myMember?.userId || ""),
        String(myMember?.id || ""),
      ].filter(Boolean);

      // If no socket ID, check presenceSelfId directly
      if (!callerSocketId && callerId && presenceSelfId && String(callerId) === String(presenceSelfId)) {
        console.log("[Collision] Ignoring own event from presenceSelfId:", callerId);
        return;
      }

      // Check if this incoming call is targeted at us
      let isForMe = false;
      if (!targetUserId || targetUserId === "all") {
        isForMe = true;
      } else {
        const targetStr = String(targetUserId).toLowerCase();
        isForMe = allMyIds.some((id) => String(id).toLowerCase() === targetStr);

        // Also check if username matches
        if (!isForMe) {
          const myNames = [
            profile?.username,
            profile?.fullName,
            username,
            localStorage.getItem("username"),
            myMember?.fullName,
            myMember?.username,
          ].filter(Boolean).map((n) => String(n).toLowerCase());

          if (myNames.includes(targetStr)) {
            isForMe = true;
          }
        }
      }

      if (!isForMe) {
        console.log("[Collision] Event not for me. targetUserId:", targetUserId, "allMyIds:", allMyIds);
        return;
      }

      console.log(`[Collision] 📞 Joining collision call from ${callerName} (${callerId}) in room: ${roomId}`);
      setCallSession(roomId, callerName || "Member", callerId, callerAvatar || "");
      setShowMap(false);
      setShowMeeting(false);
      setShowVideoConference(true);
    };

    const handleCollisionCallEnded = (data) => {
      if (!data) return;
      const { callerId, targetUserId, roomId, callerSocketId } = data;

      if (callerSocketId && socket?.id && callerSocketId === socket.id) return;

      const myCurrentId = String(presenceSelfId || userId || localStorage.getItem("userId") || "");
      const myActiveRoom = String(callRoomIdRef.current || "");
      const myPartnerId = String(callPartnerIdRef.current || "");

      // Ignore if sent by ourselves
      if (!callerSocketId && callerId && presenceSelfId && String(callerId) === String(presenceSelfId)) return;

      // If we have an active room and data specifies a roomId, ensure it matches our active room
      if (myActiveRoom && roomId && String(roomId) !== myActiveRoom) return;

      const roomMatches = roomId && myActiveRoom && String(roomId) === myActiveRoom;
      const partnerMatches = callerId && myPartnerId && String(callerId) === myPartnerId;
      const targetMatches = targetUserId && myCurrentId && String(targetUserId) === myCurrentId;

      if (!roomMatches && !partnerMatches && !targetMatches) return;

      console.log(`[Collision] 📴 Remote partner (${callerId}) ended collision call in room: ${roomId}`);
      if (callerId) setLastCallPartnerId(callerId);
      setLastCallEndTime(Date.now());
      setCallSession(null, null, null, "");
      setShowVideoConference(false);
      setShowMap(true);
    };

    socket.on("collision_call_incoming", handleIncomingCollisionCall);
    socket.on("collision_call_ended", handleCollisionCallEnded);

    return () => {
      socket.off("collision_call_incoming", handleIncomingCollisionCall);
      socket.off("collision_call_ended", handleCollisionCallEnded);
    };
  }, [userId, presenceSelfId, jwtUserId, members, profile, username, setCallSession]);

  const sendMessage = async () => {
    if (!messageInput.trim() && attachments.length === 0) return;

    const isDM =
      isDMMode ||
      (typeof activeRoomId === "string" && activeRoomId.startsWith("dm-"));
    let targetReceiverId =
      dmReceiverId ||
      (typeof activeRoomId === "string" && activeRoomId.startsWith("dm-")
        ? activeRoomId.replace("dm-", "")
        : null);

    if (targetReceiverId === "undefined") targetReceiverId = null;

    console.log("[sendMessage]", { isDM, isDMMode, activeRoomId, targetReceiverId, dmReceiverId, workspaceId });

    if (isDM && targetReceiverId) {
      const payload = {
        receiverId: targetReceiverId,
        workspaceId,
        content: messageInput,
        attachments,
      };
      console.log("[sendMessage] Emitting send_dm to", targetReceiverId, "attachments:", attachments.length);
      sendDirectMessage(payload);
    } else if (activeRoomId && typeof activeRoomId === "string" && !activeRoomId.startsWith("dm-")) {
      socket.emit("send_message", {
        channelId: activeRoomId,
        content: messageInput,
      });
    }

    setMessageInput("");
    setAttachments([]);
  };

  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);

  const displayedMessages = searchQuery
    ? messages.filter((m) =>
        m.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  const headerTitle = useMemo(() => {
    if (isDMMode || (typeof activeRoomId === "string" && activeRoomId.startsWith("dm-"))) {
      return dmReceiverName ? `@ ${dmReceiverName}` : "Direct Message";
    }
    return workspaceName || "Chat";
  }, [isDMMode, activeRoomId, dmReceiverName, workspaceName]);

  return (
    <>
      <ChatLayout
        sidebar={
          <Sidebar
            activeRoomId={activeRoomId}
            onChannelSelect={(id) => {
              setMessages([]);
              setIsDMMode(false);
              setDmReceiverId(null);
              setActiveRoomId(id);
              setShowMap(false);
              setShowMeeting(false);
              setShowVideoConference(false);
              setCallRoomId(null);
              setCallPartner(null);
              sessionStorage.removeItem("currentDM");
            }}
            onStartDM={(id, name) => {
              setShowMap(false);
              setShowMeeting(false);
              setShowVideoConference(false);
              setCallSession(null, null, null);
              handleStartDM(id, name);
            }}
            unreadDMs={unreadDMs}
            onVirtualSpaceClick={() => {
              setShowMap(true);
              setShowMeeting(false);
              setShowVideoConference(false);
              setCallSession(null, null, null);
              setIsDMMode(false);
              setDmReceiverId(null);
              sessionStorage.removeItem("currentDM");
            }}
            onShowMap={() => {
              setShowMap(true);
              setShowMeeting(false);
              setShowVideoConference(false);
              setCallSession(null, null, null);
              setIsDMMode(false);
              setDmReceiverId(null);
              sessionStorage.removeItem("currentDM");
            }}
            onCreateMeeting={() => {
              setShowMap(false);
              setShowMeeting(true);
              setShowVideoConference(false);
              setCallSession(null, null, null);
            }}
            onVideoConferenceClick={() => {
              setShowMap(false);
              setShowMeeting(false);
              setShowVideoConference(true);
              setCallSession(null, null, null);
            }}
            onChatClick={() => {
              setShowMap(false);
              setShowMeeting(false);
              setShowVideoConference(false);
              setCallSession(null, null, null);
            }}
            onCreateTeam={() => setShowCreateTeamModal(true)}
            onOpenMemberModal={() => setShowCreateTeamModal(true)}
          />
        }
      >
        {showMap ? (
          <Map
            lastCallEndTime={lastCallEndTime}
            lastCallPartnerId={lastCallPartnerId}
            onAvatarCollision={(receiverId, receiverName, receiverAvatar) => {
              handleStartCollisionCall(receiverId, receiverName, receiverAvatar);
            }}
          />
        ) : showMeeting ? (
          <ManagerMeeting />
        ) : showVideoConference ? (
          <VideoConference
            key={callRoomId || "video-conf"}
            initialRoomId={callRoomId}
            autoStart={!!callRoomId}
            callPartnerName={callPartner}
            callPartnerAvatar={callPartnerAvatar}
            onLeaveCall={handleEndCollisionCall}
          />
        ) : (
          <>
            <Header title={headerTitle} onCallClick={() => startCall(remoteUserId)} />

            <MessageList
              messages={displayedMessages}
              username={profile?.username || profile?.fullName || username}
              currentUserId={userId}
              hasMore={hasMore}
              onLoadMore={loadMoreMessages}
            />

            {typingUser && (
              <div className="px-4 py-1 text-xs text-[#AC92CB] italic flex items-center gap-1 font-medium bg-[#200539]/60 border-t border-[#3D1B5F]">
                <span>{typingUser} is typing</span>
                <span className="animate-pulse">...</span>
              </div>
            )}

            <InputBox
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              sendMessage={sendMessage}
              textareaRef={textareaRef}
              handleEmojiSelect={handleEmojiSelect}
              attachments={attachments}
              setAttachments={setAttachments}
              members={members}
              isDMMode={isDMMode}
              dmReceiverId={dmReceiverId}
              activeRoomId={activeRoomId}
            />
          </>
        )}
      </ChatLayout>

      <CreateTeamModal
        open={showCreateTeamModal}
        onClose={() => setShowCreateTeamModal(false)}
        onChannelCreated={(channel) => {
          if (channel?._id) {
            setActiveRoomId(channel._id);
            setIsDMMode(false);
          }
        }}
      />
    </>
  );
};

export default Chat;