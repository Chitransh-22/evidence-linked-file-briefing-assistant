import { create } from "zustand";
import { apiClient } from "../services/api/client";
import {
  VALID_ROLES,
  canAccessMenu as rbacCanAccessMenu,
  canPerformAction as rbacCanPerformAction,
  hasPermission as rbacHasPermission,
} from "../config/rbac";

function readStoredUser() {
  try {
    const storedUser = localStorage.getItem("gov_user");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
}

const initialUser = readStoredUser();
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
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("gov_token");
      localStorage.removeItem("gov_user");
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  hasRole: (allowedRoles) => {
    const user = get().user;
    if (!user?.role || !VALID_ROLES.has(user.role) || !Array.isArray(allowedRoles)) {
      return false;
    }
    return allowedRoles.includes(user.role);
  },

  canAccessMenu: (menuId) => rbacCanAccessMenu(get().user?.role, menuId),
  canPerformAction: (action) => rbacCanPerformAction(get().user?.role, action),
  hasPermission: (permission) => rbacHasPermission(get().user?.role, permission),
}));
