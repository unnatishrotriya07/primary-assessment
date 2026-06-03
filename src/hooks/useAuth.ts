"use client";

import { useState, useEffect } from "react";
import authService from "@/services/auth.service";
import { AuthResponse } from "@/types/auth.types";

export function useAuth() {
  const [user, setUser] = useState<AuthResponse["user"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage or token session
    const token = localStorage.getItem("token");
    if (token) {
      authService.getCurrentUser()
        .then((userData) => setUser(userData))
        .catch(() => localStorage.removeItem("token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials: any) => {
    setLoading(true);
    try {
      const res = await authService.login(credentials);
      localStorage.setItem("token", res.token);
      setUser(res.user);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem("token");
      setUser(null);
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}
export default useAuth;
