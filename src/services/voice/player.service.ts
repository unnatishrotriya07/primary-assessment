import { AudioPlayerCallbacks } from "./types";

export interface IAudioPlayerService {
  play(source: string | Blob, callbacks?: AudioPlayerCallbacks): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  isPlaying(): boolean;
  getDuration(): number;
  getCurrentTime(): number;
}

export class AudioPlayerService implements IAudioPlayerService {
  private audio: HTMLAudioElement | null = null;
  private isAudioPlaying: boolean = false;
  private activeObjectURL: string | null = null;

  async play(source: string | Blob, callbacks?: AudioPlayerCallbacks): Promise<void> {
    this.stop();

    let url: string;
    if (source instanceof Blob) {
      this.activeObjectURL = URL.createObjectURL(source);
      url = this.activeObjectURL;
    } else {
      url = source;
    }

    const audioEl = new Audio(url);
    this.audio = audioEl;
    this.isAudioPlaying = true;

    audioEl.onplay = () => {
      if (this.audio === audioEl) {
        callbacks?.onStart?.();
      }
    };

    audioEl.onended = () => {
      if (this.audio === audioEl) {
        this.isAudioPlaying = false;
        callbacks?.onEnd?.();
        this._cleanupObjectURL();
      }
    };

    audioEl.onerror = (err) => {
      if (this.audio === audioEl) {
        this.isAudioPlaying = false;
        callbacks?.onError?.(err);
        this._cleanupObjectURL();
      }
    };

    audioEl.ontimeupdate = () => {
      if (this.audio === audioEl) {
        callbacks?.onProgress?.(audioEl.currentTime, audioEl.duration || 0);
      }
    };

    try {
      await audioEl.play();
    } catch (err: any) {
      if (this.audio === audioEl) {
        this.isAudioPlaying = false;
        if (err && err.name !== "AbortError") {
          callbacks?.onError?.(err);
        }
        this._cleanupObjectURL();
      }
      if (err && err.name === "AbortError") {
        // Swallow AbortError as it is normal interruption
        return;
      }
      throw err;
    }
  }

  pause(): void {
    if (this.audio && this.isAudioPlaying) {
      this.audio.pause();
      this.isAudioPlaying = false;
    }
  }

  resume(): void {
    if (this.audio && !this.isAudioPlaying) {
      this.audio.play().then(() => {
        this.isAudioPlaying = true;
      }).catch(() => {});
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
    this.isAudioPlaying = false;
    this._cleanupObjectURL();
  }

  isPlaying(): boolean {
    return this.isAudioPlaying;
  }

  getDuration(): number {
    return this.audio ? this.audio.duration || 0 : 0;
  }

  getCurrentTime(): number {
    return this.audio ? this.audio.currentTime : 0;
  }

  private _cleanupObjectURL(): void {
    if (this.activeObjectURL) {
      URL.revokeObjectURL(this.activeObjectURL);
      this.activeObjectURL = null;
    }
  }
}

// Export singleton instance
export const audioPlayerService = new AudioPlayerService();
