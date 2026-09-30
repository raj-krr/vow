# VOW Frontend - Suggestions, Optimizations & Feature Roadmap

This document outlines key technical suggestions, performance optimizations, and UX enhancements for the **VOW Frontend Application**.

---

## 1. Technical & Performance Optimizations

### 1.1 Axios Response Interceptor for Silent Token Refresh
- **Problem**: When access tokens expire (8 hours), API requests fail with 401 Unauthorized errors and force the user to re-login.
- **Solution**: Implement an Axios response interceptor that transparently invokes `/auth/refresh-token` upon receiving a 401 error and retries the original failed request.

```javascript
// Example Interceptor Implementation for src/api/axiosConfig.js
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await api.post("/auth/refresh-token");
        return api(originalRequest);
      } catch (refreshErr) {
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);
```

---

### 1.2 Canvas Rendering Optimization (`requestAnimationFrame` Loop)
- **Problem**: `Map.jsx` and `AvatarsLayer.jsx` rely on React DOM re-renders and CSS transitions for 2D movement, resulting in frame stuttering under high member density.
- **Solution**: Decouple avatar positions into an off-screen HTML5 Canvas layer updated via a native `requestAnimationFrame` render loop with linear delta interpolation.

---

### 1.3 Secure Storage Strategy (Migrate from LocalStorage to Cookies)
- **Problem**: Storing access tokens in `localStorage` exposes them to XSS attacks if third-party packages are compromised.
- **Solution**: Rely exclusively on HTTP-Only, Secure, SameSite cookies managed by the backend server for session tokens.

---

## 2. Feature Expansion Roadmap

1. **Spatial Proximity Voice Controls**: Visual indicator rings around avatars on the 2D map showing spatial voice hearing radiuses.
2. **Screen Share Canvas Projection**: Project screen sharing feeds onto virtual TV screens or presentation boards inside 2D office meeting rooms.
3. **Rich Text & Code Block Highlighting in Chat**: Upgrade text channels with syntax-highlighted code blocks, inline LaTeX rendering, and thread drawer components.
4. **Dark / Light Glassmorphism Themes**: Add customizable UI themes matching individual workspace branding preferences.
