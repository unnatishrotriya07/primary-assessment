export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId?: string;
  schoolName?: string;
  allowedFeatures?: string[];
}

export interface LoginCredentials {
  email: string;
  password?: string;
  role?: "admin" | "student";
}

export interface AuthResponse {
  token: string;
  user: User;
}
