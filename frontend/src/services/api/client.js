import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("gov_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for session expiration handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if session expired
      localStorage.removeItem("gov_token");
      localStorage.removeItem("gov_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login?expired=1";
      }
    }
    return Promise.reject(error);
  }
);

export function getAuthToken() {
  return localStorage.getItem("gov_token") || "";
}

export function getAuthenticatedUrl(urlPath) {
  const token = getAuthToken();
  const sep = urlPath.includes("?") ? "&" : "?";
  const fullPath = urlPath.startsWith("http") ? urlPath : `${API_BASE_URL}${urlPath}`;
  if (!token) return fullPath;
  return `${fullPath}${sep}token=${encodeURIComponent(token)}`;
}

export async function downloadFile(urlPath, filename) {
  try {
    const res = await apiClient.get(urlPath, { responseType: "blob" });
    const contentType = res.headers["content-type"] || "application/octet-stream";
    const blob = new Blob([res.data], { type: contentType });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename || "document.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.warn("Direct blob download failed, falling back to authenticated browser window:", err);
    window.open(getAuthenticatedUrl(urlPath), "_blank");
  }
}
