import { STTCallbacks, VoiceEngineConfig } from "./types";
import { microphoneService } from "./microphone.service";
import api from "../api";

function getSupportedMimeType(): { mimeType: string; extension: string } {
  const candidates = [
    { mimeType: "audio/webm;codecs=opus", extension: "webm" },
    { mimeType: "audio/webm", extension: "webm" },
    { mimeType: "audio/ogg;codecs=opus", extension: "ogg" },
    { mimeType: "audio/ogg", extension: "ogg" },
    { mimeType: "audio/mp4", extension: "mp4" },
    { mimeType: "audio/aac", extension: "aac" },
  ];

  if (typeof window !== "undefined" && typeof MediaRecorder !== "undefined") {
    for (const candidate of candidates) {
      if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
        return candidate;
      }
    }
  }
  return { mimeType: "", extension: "webm" };
}


export interface ISpeechToTextService {
  initialize(config: VoiceEngineConfig): Promise<void>;
  start(callbacks: STTCallbacks, options?: { interviewId?: number; questionIndex?: number }): void;
  stop(): void;
  isSupported(): boolean;
  isListening(): boolean;
  getLastAudioUrl?(): string | null;
}

export class BrowserSTTService implements ISpeechToTextService {
  private recognition: any = null;
  private isListeningActive: boolean = false;
  private callbacks: STTCallbacks | null = null;

  async initialize(config: VoiceEngineConfig): Promise<void> {}

  start(callbacks: STTCallbacks, options?: { interviewId?: number; questionIndex?: number }): void {
    if (typeof window === "undefined") return;

    this.stop();
    this.callbacks = callbacks;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      callbacks.onError?.("Speech recognition not supported in this browser.");
      return;
    }

    const rec = new SR();
    this.recognition = rec;
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = true;

    rec.onspeechend = () => {
      callbacks.onSpeechEnd?.();
    };

    rec.onstart = () => {
      this.isListeningActive = true;
      callbacks.onStart?.();
    };

    rec.onresult = (e: any) => {
      let interimTranscript = "";
      let finalTranscript = "";
      let lastConfidence = 1.0;

      for (let i = 0; i < e.results.length; ++i) {
        const res = e.results[i][0];
        const txt = res.transcript;
        if (res.confidence !== undefined) {
          lastConfidence = res.confidence;
        }
        if (e.results[i].isFinal) {
          finalTranscript += txt + " ";
        } else {
          interimTranscript += txt;
        }
      }

      const transcriptText = (finalTranscript + interimTranscript).trim();
      const isFinal = e.results[e.results.length - 1].isFinal;
      callbacks.onResult?.(transcriptText, isFinal, lastConfidence);
    };

    rec.onerror = (err: any) => {
      if (err.error === "aborted" || err.error === "no-speech") {
        return;
      }
      callbacks.onError?.(err);
    };

    rec.onend = () => {
      this.isListeningActive = false;
      callbacks.onEnd?.();
    };

    try {
      rec.start();
    } catch (err) {
      callbacks.onError?.(err);
    }
  }

  stop(): void {
    if (this.recognition) {
      this.recognition.onend = null;
      this.recognition.onerror = null;
      this.recognition.onresult = null;
      try {
        this.recognition.abort();
      } catch (_) {}
      this.recognition = null;
    }
    this.isListeningActive = false;
  }

  isSupported(): boolean {
    return typeof window !== "undefined" && (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);
  }

  isListening(): boolean {
    return this.isListeningActive;
  }

  getLastAudioUrl(): string | null {
    return null;
  }
}

export class ApiSTTService implements ISpeechToTextService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isListeningActive: boolean = false;
  private callbacks: STTCallbacks | null = null;
  private lastAudioUrl: string | null = null;

  async initialize(config: VoiceEngineConfig): Promise<void> {}

  start(callbacks: STTCallbacks, options?: { interviewId?: number; questionIndex?: number }): void {
    this.stop();
    this.callbacks = callbacks;
    this.audioChunks = [];
    this.lastAudioUrl = null;

    (async () => {
      try {
        const stream = await microphoneService.startStream();
        
        const { mimeType, extension } = getSupportedMimeType();
        const recorderOptions: any = {};
        if (mimeType) {
          recorderOptions.mimeType = mimeType;
        }
        const recorder = new MediaRecorder(stream, recorderOptions);
        this.mediaRecorder = recorder;
        this.isListeningActive = true;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        recorder.onstop = async () => {
          this.isListeningActive = false;
          
          if (this.audioChunks.length === 0) {
            callbacks.onError?.("No audio recorded.");
            return;
          }

          const audioBlob = new Blob(this.audioChunks, { type: mimeType || undefined });
          
          try {
            callbacks.onResult?.("Processing audio...", false);

            const formData = new FormData();
            formData.append("file", audioBlob, `speech.${extension}`);
            if (options?.interviewId !== undefined) {
              formData.append("interview_id", options.interviewId.toString());
            }
            if (options?.questionIndex !== undefined) {
              formData.append("question_index", options.questionIndex.toString());
            }

            const response: any = await api.post("/voice/transcribe", formData, {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            });

            const transcript = response.transcript || "";
            this.lastAudioUrl = response.audio_url || null;
            callbacks.onResult?.(transcript, true, 0.99);
            
          } catch (err) {
            callbacks.onError?.(err);
          } finally {
            callbacks.onEnd?.();
          }
        };

        recorder.start();
        callbacks.onStart?.();
        
      } catch (err) {
        this.isListeningActive = false;
        callbacks.onError?.(err);
      }
    })();
  }

  stop(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onstop = null;
      if (this.mediaRecorder.state !== "inactive") {
        try {
          this.mediaRecorder.stop();
        } catch (_) {}
      }
    }
    this.mediaRecorder = null;
    this.isListeningActive = false;
  }

  isSupported(): boolean {
    return typeof window !== "undefined" && !!window.MediaRecorder;
  }

  isListening(): boolean {
    return this.isListeningActive;
  }

  getLastAudioUrl(): string | null {
    return this.lastAudioUrl;
  }
}

export class STTService implements ISpeechToTextService {
  private activeService: ISpeechToTextService;

  constructor() {
    this.activeService = new BrowserSTTService();
  }

  async initialize(config: VoiceEngineConfig): Promise<void> {
    if (config.sttProvider === "whisper") {
      this.activeService = new ApiSTTService();
    } else {
      this.activeService = new BrowserSTTService();
    }
    await this.activeService.initialize(config);
  }

  start(callbacks: STTCallbacks, options?: { interviewId?: number; questionIndex?: number }): void {
    this.activeService.start(callbacks, options);
  }

  stop(): void {
    this.activeService.stop();
  }

  isSupported(): boolean {
    return this.activeService.isSupported();
  }

  isListening(): boolean {
    return this.activeService.isListening();
  }

  getLastAudioUrl(): string | null {
    return this.activeService.getLastAudioUrl?.() || null;
  }
}

// Export singleton instance
export const sttService = new STTService();
