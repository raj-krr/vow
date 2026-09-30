import { useEffect, useState, useRef } from "react";
import { getMembers } from "../api/workspaceApi";
import socket, { connectSocket } from "./chat/socket";

// Fetch members for a given workspace using the scoped workspace token
export const useMembers = (workspaceId) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const onlineSetRef = useRef(new Set());

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!workspaceId) {
        throw new Error("Missing workspaceId");
      }
      const response = await getMembers(workspaceId);
      if (response.data?.success) {
        const raw = response.data.members || [];
        const normalized = raw.map((m) => {
          const stableId = m._id || m.id || m.userId || null;
          const isOnline = onlineSetRef.current.has(String(stableId));
          return { ...m, _id: stableId, online: isOnline };
        });
        setMembers(normalized);
        if (socket && socket.connected) {
          socket.emit("get_online_users");
        }
      } else {
        throw new Error(response.data?.message || "Failed to fetch members");
      }
    } catch (err) {
      console.error("Error fetching members:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) fetchMembers();
  }, [workspaceId]);

  useEffect(() => {
    connectSocket();

    const requestOnlineUsers = () => {
      if (socket.connected) {
        socket.emit("get_online_users");
      }
    };

    if (socket.connected) {
      requestOnlineUsers();
    }
    socket.on("connect", requestOnlineUsers);

    const handleUserOnline = ({ userId }) => {
      if (userId) {
        onlineSetRef.current.add(String(userId));
      }
      setMembers((prev) =>
        prev.map((m) => {
          const mid = String(m._id || m.id || m.userId || "");
          return mid === String(userId) ? { ...m, online: true } : m;
        })
      );
    };

    const handleUserOffline = ({ userId }) => {
      if (userId) {
        onlineSetRef.current.delete(String(userId));
      }
      setMembers((prev) =>
        prev.map((m) => {
          const mid = String(m._id || m.id || m.userId || "");
          return mid === String(userId) ? { ...m, online: false } : m;
        })
      );
    };

    const handleOnlineList = (userList) => {
      if (Array.isArray(userList)) {
        const set = new Set(userList.map((id) => String(id)));
        const selfUserId = localStorage.getItem("userId");
        if (selfUserId) set.add(String(selfUserId));

        onlineSetRef.current = set;
        setMembers((prev) =>
          prev.map((m) => {
            const mid = String(m._id || m.id || m.userId || "");
            return {
              ...m,
              online: set.has(mid),
            };
          })
        );
      }
    };

    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    socket.on("online_users_list", handleOnlineList);

    return () => {
      socket.off("connect", requestOnlineUsers);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
      socket.off("online_users_list", handleOnlineList);
    };
  }, []);

  return { members, loading, error, fetchMembers };
};