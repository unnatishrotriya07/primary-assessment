export type VoiceEngineMode = "browser" | "api" | "auto";

export type VoiceEngineState =
  | "idle"
  | "initializing"
  | "listening"
  | "speaking"
  | "thinking"
  | "error";

export interface VoiceEngineConfig {
  mode: VoiceEngineMode;
  sttProvider: "browser" | "whisper";
  ttsProvider: "browser" | "kokoro";
  apiBaseUrl?: string;
  authToken?: string;
  language: string;       // e.g., 'en-US' or 'hi-IN'
  voiceId?: string;       // TTS voice selection
  silenceThresholdMs?: number; // silence auto-submission threshold in ms
}

export interface STTCallbacks {
  onStart?: () => void;
  onResult?: (text: string, isFinal: boolean, confidence?: number) => void;
  onSpeechEnd?: () => void;
  onError?: (error: any) => void;
  onEnd?: () => void;
}

export interface TTSCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

export interface AudioPlayerCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
  onProgress?: (currentTime: number, duration: number) => void;
}
