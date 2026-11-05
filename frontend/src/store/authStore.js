import { create } from "zustand";
import { apiClient } from "../services/api/client";

const storedUser = localStorage.getItem("gov_user");
const initialUser = storedUser ? JSON.parse(storedUser) : null;
const initialToken = localStorage.getItem("gov_token") || null;

export const useAuthStore = create((set, get) => ({
  user: initialUser,
  token: initialToken,
  isAuthenticated: !!initialToken,

  login: async (username, password) => {
    const response = await apiClient.post("/auth/login", { username, password });
    const { access_token, user } = response.data;
    localStorage.setItem("gov_token", access_token);
    localStorage.setItem("gov_user", JSON.stringify(user));
    set({ user, token: access_token, isAuthenticated: true });
    return user;
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem("gov_token");
      localStorage.removeItem("gov_user");
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  hasRole: (allowedRoles) => {
    const user = get().user;
    if (!user) return false;
    if (user.role === "system_administrator") return true;
    return allowedRoles.includes(user.role);
  },
}));
