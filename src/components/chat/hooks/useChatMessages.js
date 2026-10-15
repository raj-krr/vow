import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  fetchChannelMessages,
  getDirectMessages,
} from "../../../api/messageApi";

export const useChatMessages = ({
  activeRoomId,
  isDMMode,
  dmReceiverId,
  workspaceId,
  userId,
  profile,
}) => {
  const [messages, setMessages] = useState([]);
  const [visibleLimit, setVisibleLimit] = useState(50);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const dmCacheRef = useRef({});

  useEffect(() => {
    setVisibleLimit(50);
    setMessages([]); // Clear previous room's messages immediately

    if (!activeRoomId || !workspaceId) return;

    let isSubscribed = true;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const isDM =
          isDMMode ||
          (typeof activeRoomId === "string" && activeRoomId.startsWith("dm-"));

        if (isDM) {
          // Resolve targetDmId from activeRoomId first (most authoritative) then dmReceiverId
          const targetDmId =
            typeof activeRoomId === "string" && activeRoomId.startsWith("dm-")
              ? activeRoomId.replace("dm-", "")
              : dmReceiverId;

          if (!targetDmId || targetDmId === "undefined" || targetDmId === "null") {
            if (isSubscribed) {
              setMessages([]);
              setLoadingMessages(false);
            }
            return;
          }

          // Resolve selfId — use Redux userId FIRST, then profile, then localStorage, then JWT
          let selfId =
            userId ||
            profile?._id ||
            profile?.id ||
            profile?.userId ||
            localStorage.getItem("userId") ||
            localStorage.getItem("profileId");

          if (!selfId) {
            const token = localStorage.getItem("accessToken");
            if (token) {
              try {
                const payload = JSON.parse(atob(token.split(".")[1]));
                selfId = payload.id || payload._id || payload.userId;
              } catch (e) {}
            }
          }

          // Fallback to "me" so server resolves the caller via verified JWT token
          if (!selfId) {
            selfId = "me";
          }

          // Use cached messages if available to prevent UI flashing
          if (dmCacheRef.current[targetDmId]?.length) {
            setMessages(dmCacheRef.current[targetDmId]);
          }

          console.log("[useChatMessages] DM fetch:", { selfId, targetDmId, workspaceId });

          const response = await getDirectMessages(
            workspaceId,
            selfId,
            targetDmId
          );

          let raw = [];
          if (Array.isArray(response?.data?.messages)) {
            raw = response.data.messages;
          } else if (Array.isArray(response?.data)) {
            raw = response.data;
          }

          console.log("[useChatMessages] DM fetched:", raw.length, "messages");

          if (isSubscribed) {
            dmCacheRef.current[targetDmId] = raw;
            setMessages(raw);
          }
        } else {
          // Channel messages
          const response = await fetchChannelMessages(activeRoomId);

          const raw = Array.isArray(response?.data)
            ? response.data
            : response?.data?.messages || [];

          if (isSubscribed) {
            setMessages(raw);
          }
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
        if (isSubscribed) setMessages([]);
      } finally {
        if (isSubscribed) setLoadingMessages(false);
      }
    };

    fetchMessages();

    return () => {
      isSubscribed = false;
    };
  }, [
    activeRoomId,
    isDMMode,
    dmReceiverId,
    workspaceId,
    userId,
    profile?._id,
    profile?.id,
  ]);

  const loadMoreMessages = useCallback(() => {
    setVisibleLimit((prev) => prev + 50);
  }, []);

  const visibleMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    if (messages.length <= visibleLimit) return messages;
    return messages.slice(messages.length - visibleLimit);
  }, [messages, visibleLimit]);

  const hasMore = messages.length > visibleLimit;

  return {
    messages: visibleMessages,
    allMessagesCount: messages.length,
    setMessages,
    dmCacheRef,
    loadingMessages,
    hasMore,
    loadMoreMessages,
  };
};