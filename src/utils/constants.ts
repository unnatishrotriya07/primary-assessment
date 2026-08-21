const getApiBaseUrl = () => {
  // In production/staging the URL must be set explicitly at build time
  // (NEXT_PUBLIC_API_URL is inlined by Next.js). Never fall back to an
  // http://{hostname}:5001 guess, which is broken behind a domain/TLS.
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
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
