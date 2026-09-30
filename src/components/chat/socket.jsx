import { io } from "socket.io-client";

let rawSocketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
if (typeof window !== "undefined" && window.location.protocol === "https:" && rawSocketUrl.startsWith("http://")) {
  rawSocketUrl = rawSocketUrl.replace(/^http:\/\//i, "https://");
}
const SOCKET_URL = rawSocketUrl;

const socket = io(SOCKET_URL, {
  path: "/socket.io",
  transports: ["websocket", "polling"],
  withCredentials: true,
  autoConnect: false,
  timeout: 20000,
});

// connect only after token is ready
export const connectSocket = () => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    socket.auth = { token };
  }
  if (!socket.connected) {
    socket.connect();
  }
};

// Auto connect if token exists on load
if (typeof window !== "undefined" && localStorage.getItem("accessToken")) {
  connectSocket();
}

// optional disconnect helper
export const disconnectSocket = () => {
  if (socket.connected) socket.disconnect();
};

// logs
socket.on("connect", () => {
  const t = socket.io.engine.transport?.name;
  console.log("[socket] connected:", socket.id, "transport=", t);
});

socket.on("connect_error", (err) => {
  console.error("[socket] connect_error:", err?.message || err);
});

socket.on("disconnect", (reason) => {
  console.log("[socket] disconnected:", reason);
});

// Backend error events
socket.on("error", (msg) => {
  console.error("[socket] Server error:", msg);
});

socket.on("unauthorized", (msg) => {
  console.error("[socket] Unauthorized:", msg);
});

// DM functions
export const joinDMWorkspace = (workspaceId) => {
  connectSocket();
  socket.emit("join_workspace", workspaceId);
};

export const sendDirectMessage = (payload) => {
  connectSocket();
  socket.emit("send_dm", payload);
};

export const onReceiveDirectMessage = (callback) => {
  socket.off("receive_dm");
  socket.on("receive_dm", callback);
};

export const offReceiveDirectMessage = () => {
  socket.off("receive_dm");
};

// DM deleted listener
export const onDMDeleted = (callback) => {
  socket.off("dm_deleted");
  socket.on("dm_deleted", callback);
};

export const offDMDeleted = () => {
  socket.off("dm_deleted");
};

export default socket;