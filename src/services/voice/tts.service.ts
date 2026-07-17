import { TTSCallbacks, VoiceEngineConfig } from "./types";
import { audioPlayerService } from "./player.service";
import api from "../api";

export interface ITextToSpeechService {
  initialize(config: VoiceEngineConfig): Promise<void>;
  speak(text: string, callbacks?: TTSCallbacks): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  isSupported(): boolean;
  isSpeaking(): boolean;
}

export class BrowserTTSService implements ITextToSpeechService {
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private keepAliveInterval: any = null;
  private isSpeakingActive: boolean = false;
  private config: VoiceEngineConfig | null = null;

  async initialize(config: VoiceEngineConfig): Promise<void> {
    this.config = config;
  }

  async speak(text: string, callbacks?: TTSCallbacks): Promise<void> {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      callbacks?.onError?.("Speech synthesis not supported in this browser.");
      return;
    }

    this.stop();
    this.isSpeakingActive = true;

    const cleanedText = text
      .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "")
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}/gu, "")
      .trim();

    const utt = new SpeechSynthesisUtterance(cleanedText);
    this.activeUtterance = utt;
    utt.rate = 0.88;
    utt.pitch = 1.15;

    const lang = this.config?.language || "en-IN";
    utt.lang = lang;

    let voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      // Chrome/Safari often load voices asynchronously on first page load
      await new Promise<void>((resolve) => {
        const handler = () => {
          voices = window.speechSynthesis.getVoices();
          resolve();
        };
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = handler;
        }
        setTimeout(() => {
          voices = window.speechSynthesis.getVoices();
          resolve();
        }, 200);
      });
    }

    let voice = null;
    if (lang.startsWith("hi")) {
      voice =
        voices.find((v) => v.lang.startsWith("hi") && /google/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith("hi") && /lekha/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith("hi") && /kalpana/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith("hi") && /female/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith("hi")) ||
        voices.find((v) => v.lang.includes("IN"));
    } else {
      voice =
        voices.find((v) => v.lang.startsWith("en") && /google/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith("en") && /samantha/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith("en") && /zira/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith("en") && /veena/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith("en") && /karen/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith("en") && /tessa/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith("en") && /female/i.test(v.name));
    }

    if (voice) {
      utt.voice = voice;
    }

    this.keepAliveInterval = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);

    let fired = false;
    let fallbackTimeoutId: any = null;

    const wordCount = cleanedText.split(/\s+/).length;
    const estimatedDuration = (wordCount * 550) + 1500;

    const cleanup = () => {
      if (fired) return;
      fired = true;
      
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
      }
      if (fallbackTimeoutId) {
        clearTimeout(fallbackTimeoutId);
      }

      if (this.activeUtterance === utt) {
        this.isSpeakingActive = false;
        this.activeUtterance = null;
      }

      callbacks?.onEnd?.();
    };

    utt.onstart = () => {
      callbacks?.onStart?.();
    };

    utt.onend = cleanup;
    utt.onerror = (err) => {
      callbacks?.onError?.(err);
      cleanup();
    };

    fallbackTimeoutId = setTimeout(() => {
      cleanup();
    }, Math.max(8000, estimatedDuration + 5000));

    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.cancel();
      
      setTimeout(() => {
        if (this.isSpeakingActive) {
          window.speechSynthesis.speak(utt);
        }
      }, 100);
    } catch (err) {
      callbacks?.onError?.(err);
      cleanup();
    }
  }

  pause(): void {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
  }

  stop(): void {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    this.activeUtterance = null;
    this.isSpeakingActive = false;
  }

  isSupported(): boolean {
    return typeof window !== "undefined" && !!window.speechSynthesis;
  }

  isSpeaking(): boolean {
    return this.isSpeakingActive;
  }
}

export class ApiTTSService implements ITextToSpeechService {
  private isSpeakingActive: boolean = false;
  private config: VoiceEngineConfig | null = null;

  async initialize(config: VoiceEngineConfig): Promise<void> {
    this.config = config;
  }

  async speak(text: string, callbacks?: TTSCallbacks): Promise<void> {
    this.stop();
    this.isSpeakingActive = true;

    try {
      callbacks?.onStart?.();

      const response = await api.post(
        "/voice/speak",
        {
          text,
          voice: this.config?.voiceId || "af_bella",
          speed: 1.0,
        },
        { responseType: "blob" }
      );

      const audioBlob = response as unknown as Blob;

      await audioPlayerService.play(audioBlob, {
        onEnd: () => {
          this.isSpeakingActive = false;
          callbacks?.onEnd?.();
        },
        onError: (err) => {
          this.isSpeakingActive = false;
          callbacks?.onError?.(err);
        },
      });
    } catch (err) {
      this.isSpeakingActive = false;
      callbacks?.onError?.(err);
    }
  }

  pause(): void {
    audioPlayerService.pause();
  }

  resume(): void {
    audioPlayerService.resume();
  }

  stop(): void {
    audioPlayerService.stop();
    this.isSpeakingActive = false;
  }

  isSupported(): boolean {
    return true;
  }

  isSpeaking(): boolean {
    return this.isSpeakingActive;
  }
}

export class TTSService implements ITextToSpeechService {
  private activeService: ITextToSpeechService;

  constructor() {
    this.activeService = new BrowserTTSService();
  }

  async initialize(config: VoiceEngineConfig): Promise<void> {
    if (config.ttsProvider === "kokoro") {
      this.activeService = new ApiTTSService();
    } else {
      this.activeService = new BrowserTTSService();
    }
    await this.activeService.initialize(config);
  }

  async speak(text: string, callbacks?: TTSCallbacks): Promise<void> {
    await this.activeService.speak(text, callbacks);
  }

  pause(): void {
    this.activeService.pause();
  }

  resume(): void {
    this.activeService.resume();
  }

  stop(): void {
    this.activeService.stop();
  }

  isSupported(): boolean {
    return this.activeService.isSupported();
  }

  isSpeaking(): boolean {
    return this.activeService.isSpeaking();
  }
}

// Export singleton instance
export const ttsService = new TTSService();
