import axios from "axios";

let rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Ensure URL includes scheme (http:// or https://) so Axios sends absolute requests instead of relative Vercel paths
if (rawApiUrl && !rawApiUrl.startsWith("http://") && !rawApiUrl.startsWith("https://")) {
  rawApiUrl = `https://${rawApiUrl}`;
}

const api = axios.create({
  baseURL: rawApiUrl,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const currentWorkspaceId = localStorage.getItem("workspaceId");
    if (currentWorkspaceId) {
      const wsToken = localStorage.getItem(`workspaceToken_${currentWorkspaceId}`);
      if (wsToken) {
        config.headers["x-workspace-token"] = wsToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;