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

import socket, { sendDirectMessage } from "./socket.jsx";
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

  const workspaceId = paramWorkspaceId || reduxWorkspaceId || localStorage.getItem("workspaceId");
  const userId = reduxUserId || localStorage.getItem("userId") || profile?._id;
  const workspaceName = reduxWorkspaceName || localStorage.getItem("workspaceName");

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
  const [actionType, setActionType] = useState(null);

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
              sessionStorage.removeItem("currentDM");
            }}
            onStartDM={(id, name) => {
              setShowMap(false);
              setShowMeeting(false);
              setShowVideoConference(false);
              handleStartDM(id, name);
            }}
            unreadDMs={unreadDMs}
            onVirtualSpaceClick={() => {
              setShowMap(true);
              setShowMeeting(false);
              setShowVideoConference(false);
              setIsDMMode(false);
              setDmReceiverId(null);
              sessionStorage.removeItem("currentDM");
            }}
            onShowMap={() => {
              setShowMap(true);
              setShowMeeting(false);
              setShowVideoConference(false);
              setIsDMMode(false);
              setDmReceiverId(null);
              sessionStorage.removeItem("currentDM");
            }}
            onCreateMeeting={() => {
              setShowMap(false);
              setShowMeeting(true);
              setShowVideoConference(false);
            }}
            onVideoConferenceClick={() => {
              setShowMap(false);
              setShowMeeting(false);
              setShowVideoConference(true);
            }}
            onChatClick={() => {
              setShowMap(false);
              setShowMeeting(false);
              setShowVideoConference(false);
            }}
            onCreateTeam={() => setShowCreateTeamModal(true)}
            onOpenMemberModal={() => setShowCreateTeamModal(true)}
          />
        }
      >
        {showMap ? (
          <Map
            onAvatarCollision={(receiverId, receiverName) => {
              handleStartDM(receiverId, receiverName);
              setShowMap(false);
            }}
          />
        ) : showMeeting ? (
          <ManagerMeeting />
        ) : showVideoConference ? (
          <VideoConference />
        ) : (
          <>
            <Header title={headerTitle} onCallClick={() => startCall(remoteUserId)} />

            <MessageList
              messages={displayedMessages}
              username={profile?.username || profile?.fullName || username}
              currentUserId={profile?._id || profile?.id || localStorage.getItem("userId")}
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