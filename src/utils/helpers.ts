/**
 * Shuffle elements of an array in place using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate a random UUID-like string
 */
export function generateUUID(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Simple debounce helper
 */
export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function(...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Safely extracts a string error message from a backend error response (including FastAPI 422 validations).
 */
export function extractErrorMessage(err: any, fallback: string = "An unexpected error occurred."): string {
  if (!err) return fallback;
  
  const responseData = err.response?.data;
  if (responseData) {
    const detail = responseData.detail;
    if (detail) {
      if (typeof detail === "string") {
        return detail;
      }
      if (Array.isArray(detail)) {
        return detail
          .map((d: any) => {
            const locStr = d.loc ? d.loc.filter((l: any) => l !== "body").join(".") : "";
            const prefix = locStr ? `${locStr}: ` : "";
            return `${prefix}${d.msg || d.type || "Invalid input"}`;
          })
          .join("; ");
      }
      if (typeof detail === "object") {
        return JSON.stringify(detail);
      }
    }
    
    const message = responseData.message || responseData.error;
    if (typeof message === "string") return message;
  }
  
  if (err.message && typeof err.message === "string") {
    return err.message;
  }
  
  if (typeof err === "string") {
    return err;
  }
  
  return fallback;
}

/**
 * Formats class name to hide default 'A' section suffix if the class doesn't have students.
 */
export function formatClassName(cls: { name: string; section?: string; studentsCount?: number } | null | undefined): string {
  if (!cls) return "";
  const section = cls.section || "";
  const studentCount = cls.studentsCount ?? 0;
  
  if ((section === "A" && studentCount === 0) || !section) {
    return cls.name;
  }
  return `${cls.name} (${section})`;
}

/**
 * Formats class name from direct parameters to hide default 'A' section if student count is 0.
 */
export function formatClassDisplayName(name: string, section?: string, studentsCount?: number): string {
  const sec = section || "";
  const count = studentsCount ?? 0;
  if ((sec === "A" && count === 0) || !sec) {
    return name;
  }
  return `${name} (${sec})`;
}

/**
 * Detects if a text contains Hindi (Devanagari) characters
 */
export function isHindiText(text: string | null | undefined): boolean {
  if (!text) return false;
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Returns the CSS class name 'font-hindi' if the text is Hindi or if explicitly marked
 */
export function getFontClass(text?: string | null, isHindiSubject?: boolean): string {
  return (isHindiSubject || isHindiText(text)) ? "font-hindi" : "";
}

