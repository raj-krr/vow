import socket, { connectSocket } from "../chat/socket.jsx";

export const mapSocket = socket;

export const connectMapSocket = () => {
  connectSocket();
};

export const disconnectMapSocket = () => {
  // Global socket managed by socket.jsx
};

// --------------------------------------------
// CLIENT → SERVER
// --------------------------------------------
export const joinMapPresence = ({ workspaceId, name, avatar, x, y }) => {
  connectSocket();
  socket.emit("join", {
    workspaceId,
    displayName: name || "User",
    avatar,
    x,
    y,
  });
};

export const updateMapPosition = ({ workspaceId, x, y, displayName, avatar }) => {
  socket.emit("move", { workspaceId, x, y, displayName, avatar });
};

export const leaveMapPresence = (workspaceId) => {
  socket.emit("leave", { workspaceId });
};

// --------------------------------------------
// SERVER → CLIENT
// --------------------------------------------
export const setupMapListeners = (cb = {}) => {
  socket.off("user-joined");
  socket.off("user-moved");
  socket.off("user-left");
  socket.off("join-ack");
  socket.off("presence-sync");

  socket.on("join-ack", (data) => {
    cb.onJoinAck && cb.onJoinAck(data);
  });

  socket.on("presence-sync", (avatars) => {
    cb.onState && cb.onState({ avatars });
  });

  socket.on("user-joined", (data) => {
    cb.onJoined && cb.onJoined(data);
  });

  socket.on("user-moved", (data) => {
    cb.onUpdated && cb.onUpdated(data);
  });

  socket.on("user-left", (data) => {
    cb.onLeft && cb.onLeft(data);
  });
};

export const removeMapListeners = () => {
  socket.off("user-joined");
  socket.off("user-moved");
  socket.off("user-left");
  socket.off("join-ack");
  socket.off("presence-sync");
};

export const getMapSocketStatus = () => {
  return {
    connected: socket.connected,
    id: socket.id,
    transport: socket.io?.engine?.transport?.name || "websocket",
    timestamp: new Date().toISOString(),
  };
};

export default socket;