const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `http://${hostname}:5001/api`;
    }
  }
  return "http://localhost:5001/api";
};

export const API_BASE_URL = getApiBaseUrl();

export const STORAGE_KEYS = {
  TOKEN: "token",
  USER: "user_session",
  THEME: "app_theme",
};

export const ROLES = {
  ADMIN: "admin",
  STUDENT: "student",
} as const;

export const COGNITIVE_LEVELS = [
  { value: "remembering", label: "Remembering" },
  { value: "understanding", label: "Understanding" },
  { value: "applying", label: "Applying" },
  { value: "analyzing", label: "Analyzing" },
  { value: "evaluating", label: "Evaluating" },
  { value: "creating", label: "Creating" },
];
