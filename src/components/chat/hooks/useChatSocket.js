import { useEffect } from "react";
import socket, {
  connectSocket,
  joinDMWorkspace,
} from "../socket";

export const useChatSocket = ({
  isDMMode,
  dmReceiverId,
  workspaceId,
  activeRoomId,
  userId,
  setMessages,
  setUnreadDMs,
}) => {
  useEffect(() => {
    if (!socket) return;
    connectSocket();

    const isDM =
      isDMMode ||
      (typeof activeRoomId === "string" && activeRoomId.startsWith("dm-"));

    const handleMessage = (msg) => {
      if (!msg || isDM) return;
      const msgChannelId = typeof msg.channelId === "object" ? (msg.channelId._id || msg.channelId.id) : msg.channelId;
      if (activeRoomId && String(msgChannelId) === String(activeRoomId)) {
        setMessages((prev) => {
          if (msg._id && prev.some((m) => m._id === msg._id)) {
            return prev;
          }
          return [...prev, msg];
        });
      }
    };

    const handleDM = (msg) => {
      if (!msg) return;

      const senderId = typeof msg.sender === "object" ? (msg.sender._id || msg.sender.id) : msg.sender;
      const receiverId = typeof msg.receiver === "object" ? (msg.receiver._id || msg.receiver.id) : msg.receiver;

      const currentTargetDmId =
        typeof activeRoomId === "string" && activeRoomId.startsWith("dm-")
          ? activeRoomId.replace("dm-", "")
          : dmReceiverId;

      const isCurrentDMChat = isDM && currentTargetDmId && (String(senderId) === String(currentTargetDmId) || String(receiverId) === String(currentTargetDmId));

      if (isCurrentDMChat) {
        setMessages((prev) => {
          if (msg._id && prev.some((m) => m._id === msg._id)) {
            return prev;
          }
          return [...prev, msg];
        });
      } else {
        // Increment unread count if message came from another user
        if (userId && String(senderId) !== String(userId) && setUnreadDMs) {
          setUnreadDMs((prev) => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1,
          }));
        }
      }
    };

    socket.on("receive_message", handleMessage);
    socket.on("receive_dm", handleDM);

    if (workspaceId) {
      joinDMWorkspace(workspaceId);
    }
    if (activeRoomId && !isDM) {
      socket.emit("join_channel", activeRoomId);
    }

    return () => {
      socket.off("receive_message", handleMessage);
      socket.off("receive_dm", handleDM);
      if (activeRoomId && !isDM) {
        socket.emit("leave_channel", activeRoomId);
      }
    };
  }, [isDMMode, dmReceiverId, workspaceId, activeRoomId, userId, setMessages, setUnreadDMs]);
};