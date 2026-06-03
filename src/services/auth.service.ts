import api from "./api";
import { LoginCredentials, AuthResponse } from "@/types/auth.types";

export const authService = {
  login: (credentials: LoginCredentials): Promise<AuthResponse> => {
    return api.post<AuthResponse>("/auth/login", credentials);
  },
  logout: (): Promise<void> => {
    return api.post<void>("/auth/logout");
  },
  getCurrentUser: (): Promise<AuthResponse["user"]> => {
    return api.get<AuthResponse["user"]>("/auth/me");
  },
};
export default authService;
