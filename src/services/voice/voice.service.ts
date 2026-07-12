import {
  VoiceEngineConfig,
  VoiceEngineState,
  STTCallbacks,
  TTSCallbacks,
} from "./types";
import { ttsService } from "./tts.service";
import { sttService } from "./stt.service";
import { microphoneService } from "./microphone.service";
import api from "../api";

export interface IVoiceService {
  initialize(config: VoiceEngineConfig): Promise<void>;
  speak(text: string, callbacks?: TTSCallbacks): Promise<void>;
  startListening(callbacks: STTCallbacks, options?: { interviewId?: number; questionIndex?: number }): void;
  stopListening(): void;
  cancelAll(): void;
  getState(): VoiceEngineState;
  subscribeToLevels(callback: (level: number) => void): () => void;
  isSpeechSupported(): boolean;
  getLastAudioUrl(): string | null;
}

export class VoiceService implements IVoiceService {
  private config: VoiceEngineConfig | null = null;
  private state: VoiceEngineState = "idle";
  private stateSubscribers: ((state: VoiceEngineState) => void)[] = [];

  async initialize(config: VoiceEngineConfig): Promise<void> {
    this.setState("initializing");

    let finalConfig = { ...config };

    try {
      // 1. Probe backend availability
      const health = await api.get<{ status: string; whisper?: string; kokoro?: string }>("/voice/health");
      if (health && (health.status === "ok" || health.status === "degraded")) {
        // Force sttProvider to "browser" to bypass MediaRecorder compatibility issues
        finalConfig.sttProvider = "browser";
        finalConfig.ttsProvider = health.kokoro === "available" ? "kokoro" : "browser";
        console.log(`[VoiceEngine] Connected to voice backend. Providers initialized: STT=${finalConfig.sttProvider}, TTS=${finalConfig.ttsProvider}`);
      } else {
        throw new Error("Backend health status not ok.");
      }
    } catch (err) {
      // 2. Fallback to browser Web Speech API
      finalConfig.sttProvider = "browser";
      finalConfig.ttsProvider = "browser";
      console.warn("[VoiceEngine] Voice backend not available. Falling back to local browser Speech API.", err);
    }

    this.config = finalConfig;

    try {
      await ttsService.initialize(finalConfig);
      await sttService.initialize(finalConfig);
      this.setState("idle");
    } catch (err) {
      this.setState("error");
      console.error("Failed to initialize VoiceService:", err);
      throw err;
    }
  }

  async speak(text: string, callbacks?: TTSCallbacks): Promise<void> {
    this.setState("speaking");
    sttService.stop();

    await ttsService.speak(text, {
      onStart: () => {
        callbacks?.onStart?.();
      },
      onEnd: () => {
        this.setState("idle");
        callbacks?.onEnd?.();
      },
      onError: (err) => {
        this.setState("error");
        callbacks?.onError?.(err);
      },
    });
  }

  startListening(callbacks: STTCallbacks, options?: { interviewId?: number; questionIndex?: number }): void {
    this.setState("listening");
    ttsService.stop();

    sttService.start({
      onStart: () => {
        callbacks.onStart?.();
      },
      onResult: (text, isFinal, confidence) => {
        callbacks.onResult?.(text, isFinal, confidence);
      },
      onSpeechEnd: () => {
        callbacks.onSpeechEnd?.();
      },
      onError: (err) => {
        this.setState("error");
        callbacks.onError?.(err);
      },
      onEnd: () => {
        this.setState("idle");
        callbacks.onEnd?.();
      },
    }, options);
  }

  getLastAudioUrl(): string | null {
    return sttService.getLastAudioUrl();
  }

  stopListening(): void {
    sttService.stop();
    this.setState("idle");
  }

  cancelAll(): void {
    ttsService.stop();
    sttService.stop();
    this.setState("idle");
  }

  getState(): VoiceEngineState {
    if (ttsService.isSpeaking()) return "speaking";
    if (sttService.isListening()) return "listening";
    return this.state;
  }

  subscribeToLevels(callback: (level: number) => void): () => void {
    return microphoneService.subscribeToLevels(callback);
  }

  subscribeToState(callback: (state: VoiceEngineState) => void): () => void {
    this.stateSubscribers.push(callback);
    callback(this.getState());
    return () => {
      this.stateSubscribers = this.stateSubscribers.filter((cb) => cb !== callback);
    };
  }

  isSpeechSupported(): boolean {
    // If browser supports neither STT nor TTS, speech is completely unavailable
    return sttService.isSupported() || ttsService.isSupported();
  }

  private setState(newState: VoiceEngineState): void {
    this.state = newState;
    this.stateSubscribers.forEach((cb) => cb(this.state));
  }
}

// Export singleton instance
export const voiceService = new VoiceService();
