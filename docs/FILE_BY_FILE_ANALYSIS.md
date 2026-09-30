# VOW Frontend - Detailed File-by-File Technical Audit

This document presents a comprehensive file-by-file analysis of every source file in the **VOW Frontend (`VOW/src/`)** application.

---

## 1. Top-Level Core Files (`src/`)

### `src/main.jsx`
- **Purpose**: React 19 application entry point mounting `App` inside `ReactDOM.createRoot`.
- **Dependencies**: React Redux `Provider`, Redux Persist `PersistGate`, Redux `store`, `index.css`.
- **Logic**: Wraps root component tree with Redux store provider and persistence loading gate.

---

### `src/App.jsx`
- **Purpose**: Declarative client-side routing hierarchy using React Router v7.
- **Routes Covered**:
  - Public: `/`, `/login`, `/signup`, `/forgot-password`, `/TermsAndConditions`.
  - Protected: `/dashboard`, `/profile`, `/map`, `/workspace/:workspaceId/chat`.
  - Flow Protected: `/verify-otp`, `/reset-password`, `/reset-success`.
- **Flaws**: Relies heavily on mixed `localStorage`, `sessionStorage`, and Redux state flags for route protection conditions.

---

### `src/ProtectedRoute.jsx`
- **Purpose**: Wraps routes requiring authentication. Checks `isAuthenticated()` helper. Redirects to `/login` if false.
- **Flaws**: Only checks local storage token string existence; does not parse JWT expiration timestamp or trigger refresh token logic automatically.

---

### `src/FlowProtectedRoute.jsx`
- **Purpose**: Guards multi-step state workflows (OTP verification, password reset) preventing users from skipping steps manually via URL navigation.

---

### `src/RouteWatcher.jsx`
- **Purpose**: Listens to React Router location changes (`useLocation`) to clear transient session storage flags upon navigating away from specific flow steps.

---

## 2. API Layer (`src/api/`)

### `src/api/axiosConfig.js`
- **Purpose**: Configures Axios instance with `baseURL`, `withCredentials: true`, and authorization request interceptor.
- **Flaws**: Request interceptor attaches `accessToken` from `localStorage` but lacks response interceptor to intercept `401 Unauthorized` responses and attempt automatic access token refreshing.

---

### `src/api/file.js`
- **Purpose**: API client functions for file upload, retrieval, download, and deletion.
- **Flaws**:
  - **CRITICAL INTEGRATION BUG**: `downloadFile` executes `api.get('/files/download/${id}')`, calling a non-existent backend endpoint!
  - `getCurrentWorkspaceId` attempts to extract workspace ID from global `window.store` directly instead of using React Redux hooks.

---

### `src/api/authApi.js`
- **Purpose**: Wraps auth REST endpoints (`/auth/login`, `/auth/register`, `/auth/verifyemail`, etc.).
- **Flaws**: Stores tokens in `localStorage` exposing them to Potential XSS attacks.

---

### `src/api/workspaceApi.js`, `teamApi.js`, `channelApi.js`, `messageApi.js`, `meetingApi.js`, `layoutApi.js`, `profileapi.js`
- **Purpose**: Modular REST API abstractions wrapping Axios requests for their respective domains.

---

## 3. Spatial 2D Office Engine (`src/components/map/`)

### `src/components/map/Map.jsx`
- **Purpose**: 2D Virtual office canvas rendering tile maps, walkable paths, collision boundaries, and user interactions.
- **Key Integration**: Integrates `pathfinding` (A* algorithm) to compute step-by-step tile coordinates from current location to clicked location.
- **Flaws**: Re-renders entire canvas component on position changes without spatial chunk caching.

---

### `src/components/map/AvatarsLayer.jsx`
- **Purpose**: Renders 2D avatar sprites over map tiles based on real-time presence data.
- **Flaws**: Uses CSS transitions for sprite movement rather than smooth delta-time interpolation in a `requestAnimationFrame` loop.

---

### `src/components/map/mapSocket.jsx`
- **Purpose**: Maintains Socket.IO connection for spatial movement events (`join`, `move`, `user-joined`, `user-moved`, `user-left`).

---

## 4. Chat & WebRTC Subsystem (`src/components/chat/` & `src/components/voice/`)

> [!IMPORTANT]
> A full root-cause analysis of the audio and video calling issues in the frontend is documented in [FRONTEND_VIDEOCHAT_ANALYSIS.md](file:///c:/Users/ASUS/Desktop/Project/vow_project/VOW/docs/FRONTEND_VIDEOCHAT_ANALYSIS.md).

### `src/components/chat/chat.jsx`
- **Purpose**: Unified workspace communication interface uniting channel list, text chat messages, workspace members, and SFU video conference overlay.

---

### `src/components/chat/VideoConference.jsx`
- **Purpose**: SFU multi-participant video conference grid featuring video tiles, screen share, mute/unmute buttons.
- **Flaw**: Hardcodes `https://vow-org.me/videochat/start` and `https://vow-org.me/videochat/join`, failing on local and preview environments.

---

### `src/components/chat/useSfuVideoCall.js` & `sfuSignaling.js`
- **Purpose**: Custom React hook and WebSocket client managing WebRTC SFU signaling (SDP offers, answers, ICE candidates, track management).
- **Flaws**: Lacks `participant-joined` listener, suffers from closure stale-state bug (`participantId: null`), and lacks ICE candidate queuing.

---

### `src/components/voice/useVoiceCall.js`
- **Purpose**: Alternate P2P voice call hook.
- **Flaw**: Emits Socket.IO events (`"offer"`, `"answer"`, `"ice-candidate"`) to main chat socket, which has no backend handlers. Completely non-functional.

---

## 5. Dashboard & File Vault (`src/components/dashboard/`)

### `src/components/dashboard/FileTransfer.jsx`
- **Purpose**: File vault UI listing uploaded workspace documents, upload dropzone, file type icons, and download triggers.
- **Flaws**: Clicking download triggers the broken `downloadFile` function.

---

### `src/components/dashboard/dashboard.jsx`
- **Purpose**: Workspace portal home view featuring workspace switcher, member summary, calendar preview, and navigation controls.
