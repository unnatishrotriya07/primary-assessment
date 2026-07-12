export interface IMicrophoneService {
  requestPermission(): Promise<PermissionStatus>;
  startStream(): Promise<MediaStream>;
  stopStream(): void;
  getStream(): MediaStream | null;
  getAnalyser(): AnalyserNode | null;
  getAudioLevel(): number;
  subscribeToLevels(callback: (level: number) => void): () => void;
}

export class MicrophoneService implements IMicrophoneService {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private levelSubscribers: ((level: number) => void)[] = [];
  private currentLevel: number = 0;

  async requestPermission(): Promise<PermissionStatus> {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        return await navigator.permissions.query({ name: "microphone" as any });
      } catch (_) {}
    }
    return {
      state: "prompt",
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    } as any;
  }

  async startStream(): Promise<MediaStream> {
    if (this.stream) {
      const activeTracks = this.stream.getTracks();
      const allLive = activeTracks.length > 0 && activeTracks.every(t => t.readyState === "live");
      if (allLive) {
        return this.stream;
      }
      this.stopStream();
    }

    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.stream = audioStream;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      this.audioContext = audioCtx;

      const source = audioCtx.createMediaStreamSource(audioStream);
      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 64;
      this.analyser = analyserNode;
      source.connect(analyserNode);

      this._startLevelAnalysisLoop();
    } catch (err) {
      console.error("Failed to setup microphone Web Audio context analyzer:", err);
    }

    return audioStream;
  }

  stopStream(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.analyser = null;
    this.currentLevel = 0;
    this.levelSubscribers = [];
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  getAudioLevel(): number {
    return this.currentLevel;
  }

  subscribeToLevels(callback: (level: number) => void): () => void {
    this.levelSubscribers.push(callback);
    return () => {
      this.levelSubscribers = this.levelSubscribers.filter((cb) => cb !== callback);
    };
  }

  private _startLevelAnalysisLoop(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkLevel = () => {
      if (!this.analyser) return;
      
      this.analyser.getByteFrequencyData(dataArray);
      
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      
      this.currentLevel = Math.min(100, Math.round((avg / 255) * 100));

      this.levelSubscribers.forEach((cb) => cb(this.currentLevel));

      this.animationFrameId = requestAnimationFrame(checkLevel);
    };

    checkLevel();
  }
}

// Export singleton instance
export const microphoneService = new MicrophoneService();
