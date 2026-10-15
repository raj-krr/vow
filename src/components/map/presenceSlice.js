import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  avatars: {},        // remote users
  selfId: null,       // my real presence ID from join-ack / redux
  workspaceId: null,  // optional
};

const presenceSlice = createSlice({
  name: 'presence',
  initialState,
  reducers: {
    setIdentity(state, action) {
      const { selfId, workspaceId } = action.payload || {};
      if (selfId) {
        state.selfId = String(selfId);
        // Purge own avatar if it accidentally exists in remote avatars map
        if (state.avatars[state.selfId]) {
          delete state.avatars[state.selfId];
        }
      }
      if (workspaceId) state.workspaceId = workspaceId;
    },

    replaceAvatars(state, action) {
      const list = action.payload || [];
      const newMap = {};

      list.forEach(avatar => {
        if (!avatar || !avatar.userId) return;
        const uid = String(avatar.userId);
        if (state.selfId && uid === String(state.selfId)) return;

        const posX = typeof avatar.x === 'number' && !isNaN(avatar.x) ? avatar.x : 60;
        const posY = typeof avatar.y === 'number' && !isNaN(avatar.y) ? avatar.y : 60;

        newMap[uid] = {
          userId: uid,
          displayName: avatar.displayName || "User",
          avatar: avatar.avatar || state.avatars[uid]?.avatar || "",
          x: posX,
          y: posY,
          targetX: posX,
          targetY: posY,
          lastUpdate: Date.now(),
        };
      });

      state.avatars = newMap;
    },

    upsertAvatar(state, action) {
      const a = action.payload;
      if (!a || !a.userId) return;
      const uid = String(a.userId);
      if (state.selfId && uid === String(state.selfId)) return;

      const existing = state.avatars[uid];
      const posX = typeof a.x === 'number' && !isNaN(a.x) ? a.x : existing?.x ?? 60;
      const posY = typeof a.y === 'number' && !isNaN(a.y) ? a.y : existing?.y ?? 60;

      state.avatars[uid] = {
        userId: uid,
        displayName: a.displayName || existing?.displayName || "User",
        avatar: a.avatar || existing?.avatar || "",
        x: existing?.x ?? posX,
        y: existing?.y ?? posY,
        targetX: posX,
        targetY: posY,
        lastUpdate: Date.now(),
      };
    },

    updateAvatarPosition(state, action) {
      const { userId, x, y, displayName, avatar: avatarUrl } = action.payload || {};
      if (!userId) return;
      const uid = String(userId);
      if (state.selfId && uid === String(state.selfId)) return;

      const posX = typeof x === 'number' && !isNaN(x) ? x : 60;
      const posY = typeof y === 'number' && !isNaN(y) ? y : 60;

      const avatar = state.avatars[uid];
      if (avatar) {
        avatar.targetX = posX;
        avatar.targetY = posY;
        if (displayName) avatar.displayName = displayName;
        if (avatarUrl) avatar.avatar = avatarUrl;
        avatar.lastUpdate = Date.now();
      } else {
        state.avatars[uid] = {
          userId: uid,
          displayName: displayName || "User",
          avatar: avatarUrl || "",
          x: posX,
          y: posY,
          targetX: posX,
          targetY: posY,
          lastUpdate: Date.now(),
        };
      }
    },

    removeAvatar(state, action) {
      const id = action.payload;
      if (id) delete state.avatars[String(id)];
    },

    clearAvatars(state) {
      state.avatars = {};
    },
  }
});

export const {
  setIdentity,
  replaceAvatars,
  upsertAvatar,
  updateAvatarPosition,
  removeAvatar,
  clearAvatars
} = presenceSlice.actions;

export default presenceSlice.reducer;
