"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import interviewService, {
    InterviewQuestion,
    TranscriptEntry,
    AnswerEntry,
} from "@/services/interview.service";

interface PageProps {
    params: Promise<{ interviewId: string }>;
}

const CHEERS = [
    "Great answer!",
    "Wonderful! Keep going!",
    "Amazing!",
    "Brilliant!",
    "Super!",
    "Love that!",
    "Fantastic!",
];

export default function InterviewPage({ params }: PageProps) {
    const { interviewId } = use(params);
    const router = useRouter();

    const [studentName, setStudentName] = useState("");
    const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [answers, setAnswers] = useState<AnswerEntry[]>([]);
    const [typedText, setTypedText] = useState("");
    
    // UI states
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [phase, setPhase] = useState<"loading" | "lobby" | "interview" | "generating">("loading");

    // Media states
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [micEnabled, setMicEnabled] = useState(true);
    const [showKeyboardInput, setShowKeyboardInput] = useState(false);
    const [liveCaption, setLiveCaption] = useState("");
    const [stream, setStream] = useState<MediaStream | null>(null);

        // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const recognitionRef = useRef<any>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // ── Load questions from sessionStorage ───────────────────────────────────
    useEffect(() => {
        const raw = sessionStorage.getItem(`interview_session_${interviewId}`);
        if (raw) {
            try {
                const data = JSON.parse(raw);
                setStudentName(data.student_name || "Student");
                const qs = data.questions || [];
                setQuestions(qs);
                setPhase("lobby");
                if (qs.length > 0) {
                    setTranscript([{ role: "ai", text: qs[0].q, question_category: qs[0].category }]);
                }
                return;
            } catch (_) { }
        }
        setError("Session data not found. Please use your original invitation link.");
        setPhase("lobby");
    }, [interviewId]);

    // ── Capture Camera and Mic ───────────────────────────────────────────────
    useEffect(() => {
        if (phase !== "interview") return;

        let activeStream: MediaStream | null = null;

        async function initMedia() {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 480, height: 360, facingMode: "user" },
                    audio: true,
                });
                activeStream = mediaStream;
                setStream(mediaStream);

                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }

                // Web Audio API Visualizer Setup
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const audioCtx = new AudioContextClass();
                audioContextRef.current = audioCtx;

                const source = audioCtx.createMediaStreamSource(mediaStream);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 64;
                analyserRef.current = analyser;
                source.connect(analyser);

                drawWaveform();
            } catch (err) {
                console.error("Error accessing camera/mic:", err);
                setError("Camera or Microphone access denied. You can still complete the interview using keyboard fallback.");
                setCameraEnabled(false);
                setMicEnabled(false);
            }
        }

        initMedia();

        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach((track) => track.stop());
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    // ── Draw Waveform on Canvas ──────────────────────────────────────────────
    const drawWaveform = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationFrameRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            // Draw audio bars
            const barWidth = (width / bufferLength) * 2;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                // Amplify visual effect slightly
                barHeight = (dataArray[i] / 255) * height * 1.2;
                
                // Color matches premium cyan/blue gradient theme
                ctx.fillStyle = `rgba(34, 211, 238, ${0.4 + (dataArray[i] / 255) * 0.6})`;
                
                // Draw symmetric from the center
                const y = (height - barHeight) / 2;
                ctx.fillRect(x, y, barWidth - 1, barHeight);

                x += barWidth;
            }
        };

        draw();
    };

    // ── Speak question whenever currentIdx changes ────────────────────────────
    useEffect(() => {
        if (phase !== "interview" || questions.length === 0) return;
        
        // Speak question
        speakText(questions[currentIdx].q, () => {
            // Once Buddy finishes speaking, automatically open mic if mic is enabled
            if (micEnabled) {
                startSpeechRecognition();
            }
        });
        
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIdx, phase, questions.length]);

    // ── Text to speech (TTS) ──────────────────────────────────────────────────
    const speakText = useCallback((text: string, onEnd?: () => void) => {
        if (!window.speechSynthesis) {
            onEnd?.();
            return;
        }
        window.speechSynthesis.cancel();
        
        if (utteranceRef.current) {
            utteranceRef.current.onstart = null;
            utteranceRef.current.onend = null;
            utteranceRef.current.onerror = null;
        }

        const utt = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utt;

        utt.rate = 0.88;
        utt.pitch = 1.15;
        utt.volume = 1;
        
        const voices = window.speechSynthesis.getVoices();
        const voice =
            voices.find((v) => v.lang.startsWith("en") && /female|woman|google/i.test(v.name)) ||
            voices.find((v) => v.lang.startsWith("en")) ||
            voices[0];
        if (voice) utt.voice = voice;

        // Chrome bug: Speech synthesis stops speaking after 15 seconds.
        // We call pause and resume periodically to keep it alive.
        const resumeInterval = setInterval(() => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
            }
        }, 10000);

        utt.onstart = () => {
            setIsSpeaking(true);
            setIsRecording(false);
            if (recognitionRef.current) {
                recognitionRef.current.onend = null;
                recognitionRef.current.stop();
            }
        };
        utt.onend = () => {
            clearInterval(resumeInterval);
            setIsSpeaking(false);
            utteranceRef.current = null;
            onEnd?.();
        };
        utt.onerror = () => {
            clearInterval(resumeInterval);
            setIsSpeaking(false);
            utteranceRef.current = null;
            onEnd?.();
        };
        window.speechSynthesis.speak(utt);
    }, []);

    // ── Add message to transcript state ──────────────────────────────────────
    const addMsg = useCallback((role: "ai" | "student", text: string, category?: string) => {
        setTranscript((prev) => [...prev, { role, text, question_category: category }]);
    }, []);

    // ── Start STT Speech Recognition ─────────────────────────────────────────
    const startSpeechRecognition = () => {
        if (isSpeaking || isSubmitting) return;

        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) {
            setError("Speech recognition is not supported in this browser. Please type your answers using the keyboard button below.");
            return;
        }

        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (_) {}
        }

        const rec = new SR();
        rec.lang = "en-US";
        rec.interimResults = true;
        rec.continuous = false; // Capture phrase by phrase
        rec.maxAlternatives = 1;

        let finalAnswer = "";

        rec.onstart = () => {
            setIsRecording(true);
            setLiveCaption("Listening...");
        };

        rec.onresult = (e: any) => {
            let interimTranscript = "";
            for (let i = e.resultIndex; i < e.results.length; ++i) {
                const text = e.results[i][0].transcript;
                if (e.results[i].isFinal) {
                    finalAnswer = text;
                } else {
                    interimTranscript = text;
                }
            }
            setLiveCaption(interimTranscript || finalAnswer);
        };

        rec.onerror = (err: any) => {
            console.error("Speech recognition error:", err.error);
            setIsRecording(false);
        };

        rec.onend = () => {
            setIsRecording(false);
            if (finalAnswer.trim()) {
                setLiveCaption(finalAnswer);
                // Pause briefly so student can see their final caption before moving on
                setTimeout(() => {
                    handleSubmitAnswer(finalAnswer);
                    setLiveCaption("");
                }, 1000);
            } else {
                setLiveCaption("");
                // Auto-restart if mic is enabled, and we aren't speaking or submitting
                if (micEnabled && !isSpeaking && !isSubmitting) {
                    setTimeout(() => {
                        // Double check values to ensure state hasn't changed during the delay
                        if (micEnabled && !isSpeaking && !isSubmitting) {
                            try { rec.start(); } catch (_) {}
                        }
                    }, 300);
                }
            }
        };

        recognitionRef.current = rec;
        rec.start();
    };

    // ── Submit Answer ────────────────────────────────────────────────────────
    const handleSubmitAnswer = useCallback((overrideText?: string) => {
        const text = (overrideText ?? typedText).trim();
        if (!text || questions.length === 0) return;

        // Turn off keyboard input overlay if it was open
        setShowKeyboardInput(false);

        // Turn off active mic
        if (recognitionRef.current) {
            recognitionRef.current.onend = null;
            recognitionRef.current.onresult = null;
            try { recognitionRef.current.stop(); } catch (_) {}
        }

        const q = questions[currentIdx];
        addMsg("student", text, q.category);
        setTypedText("");

        const newAnswers: AnswerEntry[] = [
            ...answers,
            { question_category: q.category, question: q.q, answer: text },
        ];
        setAnswers(newAnswers);

        const isLast = currentIdx === questions.length - 1;

        if (isLast) {
            setIsSubmitting(true);
            const goodbye = `Thank you ${studentName}! That was wonderful. Let me prepare your report now.`;
            addMsg("ai", goodbye);

            const finalTranscript: TranscriptEntry[] = [
                ...transcript,
                { role: "student", text, question_category: q.category },
                { role: "ai", text: goodbye }
            ];

            speakText(goodbye, () => submitInterview(newAnswers, finalTranscript));
        } else {
            const cheer = CHEERS[currentIdx % CHEERS.length];
            addMsg("ai", cheer);
            speakText(cheer, () => {
                const next = currentIdx + 1;
                setCurrentIdx(next);
                addMsg("ai", questions[next].q, questions[next].category);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [typedText, answers, currentIdx, questions, studentName, transcript]);

    // ── Submit to Backend ────────────────────────────────────────────────────
    const submitInterview = async (finalAnswers: AnswerEntry[], finalTranscript: TranscriptEntry[]) => {
        setPhase("generating");
        setIsSubmitting(true);

        // Stop all camera and mic tracks
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        try {
            const report = await interviewService.submit({
                interview_id: parseInt(interviewId, 10),
                transcript: finalTranscript,
                answers: finalAnswers,
            });
            sessionStorage.setItem(`interview_report_${report.id}`, JSON.stringify(report));
            router.push(`/interview/${report.id}/result`);
        } catch (e: any) {
            setError("Failed to submit interview. Please try again.");
            setPhase("interview");
            setIsSubmitting(false);
        }
    };

    // ── Call Toggles ─────────────────────────────────────────────────────────
    const toggleCamera = () => {
        if (!stream) return;
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            setCameraEnabled(videoTrack.enabled);
        }
    };

    const toggleMic = () => {
        if (!stream) return;
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setMicEnabled(audioTrack.enabled);

            // Stop/Start recognition accordingly
            if (!audioTrack.enabled) {
                if (recognitionRef.current) {
                    recognitionRef.current.onend = null;
                    recognitionRef.current.stop();
                }
                setIsRecording(false);
            } else if (!isSpeaking && !isSubmitting) {
                startSpeechRecognition();
            }
        }
    };

    const handleManualNext = () => {
        if (isSpeaking || isSubmitting) return;
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };

    // ── Screen rendering branches ────────────────────────────────────────────

    if (phase === "loading") {
        return (
            <div style={s.centerScreen}>
                <div className="spinner" style={{ marginBottom: "1.5rem" }} />
                <h3 style={{ fontFamily: "var(--font-heading)" }}>Connecting call...</h3>
                <p style={{ color: "var(--text-secondary)" }}>Setting up secure virtual room.</p>
            </div>
        );
    }

    if (phase === "lobby") {
        return (
            <div style={s.centerScreen}>
                <div style={s.lobbyCard} className="glass-panel animate-fade-in">
                    <div style={s.lobbyAvatarCircle}>
                        <span style={s.aiAvatarEmoji}>🤖</span>
                    </div>
                    <h2 style={s.lobbyTitle}>Welcome to the Interview Lobby</h2>
                    <p style={s.lobbySubtitle}>
                        Hi <strong style={{ color: "#22d3ee" }}>{studentName}</strong>, Buddy is ready to talk with you!
                    </p>
                    <div style={s.lobbyInstructions}>
                        <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600, color: "#f1f5f9" }}>Tips before you start:</p>
                        <ul style={{ paddingLeft: "1.2rem", margin: 0, textAlign: "left", fontSize: "0.9rem", color: "#94a3b8", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            <li>Make sure you are in a quiet room so Buddy can hear you.</li>
                            <li>Buddy will read each question aloud. Listen carefully!</li>
                            <li>Speak clearly into your microphone when you answer.</li>
                        </ul>
                    </div>
                    <button
                        onClick={() => setPhase("interview")}
                        style={s.lobbyStartBtn}
                        className="interactive-element gradient-bg"
                    >
                        Start Interview
                    </button>
                </div>
            </div>
        );
    }

    if (phase === "generating") {
        return (
            <div style={s.centerScreen}>
                <div style={s.callConnectingRipple}>
                    <div style={s.rippleCircle}></div>
                    <div style={s.rippleCenter}>🤖</div>
                </div>
                <h3 style={{ fontFamily: "var(--font-heading)", marginTop: "2rem", marginBottom: "0.5rem" }}>
                    Analyzing responses...
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                    Buddy is reviewing your verbal responses to compile your admission note.
                </p>
            </div>
        );
    }

    if (error && questions.length === 0) {
        return (
            <div style={s.centerScreen}>
                <div style={s.errorBadge}>✕</div>
                <p style={{ color: "var(--danger)", margin: "1rem 0" }}>{error}</p>
                <button onClick={() => router.push("/")} style={s.btnControlClose}>
                    Return to Portal
                </button>
            </div>
        );
    }

    const currentQ = questions[currentIdx];

    return (
        <div style={s.pageContainer}>
            {/* Header / Room Status */}
            <div style={s.roomHeader}>
                <div style={s.logoArea}>
                    <span style={s.callIndicatorPulse}></span>
                    <span style={s.logoText}>Live AI Interview Room</span>
                </div>
                <div style={s.progressChip}>
                    Question {currentIdx + 1} of {questions.length}
                </div>
            </div>

            {/* Main Stage Grid */}
            <div style={s.callGrid}>
                {/* AI Panel (Large View) */}
                <div style={s.aiVideoPanel}>
                    <div style={s.aiFaceContainer}>
                        {/* Glowing backdrop rings */}
                        <div style={{
                            ...s.avatarGlowRing,
                            ...(isSpeaking ? s.ringSpeakingPulse : {})
                        }} />
                        <div style={s.aiAvatarCircle}>
                            <span style={s.aiAvatarEmoji}>🤖</span>
                        </div>
                    </div>
                    
                    {/* Status Text overlay */}
                    <div style={s.statusPill}>
                        {isSpeaking ? "🔊 Buddy is Speaking" : isRecording ? "🎤 Mic Active" : "👂 Listening"}
                    </div>

                    {/* Question Subtitles overlay */}
                    <div style={s.questionSubtitleBox}>
                        <p style={s.questionText}>{currentQ?.q || "Initializing..."}</p>
                    </div>
                </div>

                {/* Picture in Picture Student Video */}
                <div style={s.studentPip}>
                    {cameraEnabled ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={s.pipVideo}
                        />
                    ) : (
                        <div style={s.pipPlaceholder}>
                            <span style={s.placeholderInitials}>
                                {studentName ? studentName[0].toUpperCase() : "S"}
                            </span>
                        </div>
                    )}
                    
                    {/* Name Label */}
                    <div style={s.studentLabel}>
                        {studentName} (You)
                    </div>

                    {/* Audio Canvas visualizer overlay */}
                    <canvas
                        ref={canvasRef}
                        width={120}
                        height={36}
                        style={s.waveCanvas}
                    />
                </div>
            </div>

            {/* Live Caption Overlays for Speech-to-Text */}
            {liveCaption && (
                <div style={s.liveCaptionOverlay} className="animate-fade-in">
                    <p style={s.captionText}>&ldquo;{liveCaption}&rdquo;</p>
                </div>
            )}

            {/* Top Error Banner */}
            {error && <div style={s.errorToast}>{error}</div>}

            {/* Keyboard Input Fallback Panel */}
            {showKeyboardInput && (
                <div style={s.keyboardPanelOverlay}>
                    <div style={s.keyboardModal} className="animate-fade-in">
                        <div style={s.modalHeader}>
                            <h4 style={{ margin: 0 }}>Type Your Answer</h4>
                            <button
                                style={s.modalCloseBtn}
                                onClick={() => setShowKeyboardInput(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <p style={s.modalInstruction}>
                            If your microphone isn't working, you can type your answer below:
                        </p>
                        <div style={s.modalInputRow}>
                            <input
                                type="text"
                                style={s.modalInput}
                                placeholder="Type answer here..."
                                value={typedText}
                                onChange={(e) => setTypedText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && typedText.trim()) handleSubmitAnswer();
                                }}
                                autoFocus
                            />
                            <button
                                style={{
                                    ...s.modalSendBtn,
                                    ...(!typedText.trim() ? { backgroundColor: "rgba(2, 132, 199, 0.4)", cursor: "not-allowed" } : {})
                                }}
                                onClick={() => typedText.trim() && handleSubmitAnswer()}
                                disabled={!typedText.trim()}
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Call Control Bar */}
            <div style={s.controlBar}>
                {/* Mute Mic Button */}
                <button
                    style={{
                        ...s.controlBtn,
                        ...(micEnabled ? s.btnActive : s.btnMuted)
                    }}
                    onClick={toggleMic}
                    title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
                    disabled={isSubmitting}
                >
                    {micEnabled ? (
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                        </svg>
                    ) : (
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.79 1.79C13.43 15.89 12.74 16 12 16c-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
                        </svg>
                    )}
                </button>

                {/* Toggle Camera Button */}
                <button
                    style={{
                        ...s.controlBtn,
                        ...(cameraEnabled ? s.btnActive : s.btnMuted)
                    }}
                    onClick={toggleCamera}
                    title={cameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
                    disabled={isSubmitting}
                >
                    {cameraEnabled ? (
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                        </svg>
                    ) : (
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2zM15 16H5v-8h1.73l8 8H15z" />
                        </svg>
                    )}
                </button>

                {/* Keyboard Input Button */}
                <button
                    style={{ ...s.controlBtn, ...s.btnKeyboard }}
                    onClick={() => setShowKeyboardInput(true)}
                    title="Type Answer Instead"
                    disabled={isSubmitting}
                >
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v-2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v-2zm0-3h-2V8h2v2zm3 4h-2v-2h2v-2zm0-3h-2V8h2v2z" />
                    </svg>
                </button>

                {/* Manual Next Question Button (Call Style Mute/End) */}
                <button
                    style={{ ...s.controlBtn, ...s.btnEndCall }}
                    onClick={handleManualNext}
                    disabled={isSpeaking || isSubmitting || (!isRecording && !liveCaption)}
                    title="Skip/Submit Answer"
                >
                    <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Next →</span>
                </button>
            </div>
        </div>
    );
}

// ── Immersive CSS Styles ──────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
    pageContainer: {
        width: "100vw",
        height: "100vh",
        backgroundColor: "#090d16",
        color: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
        fontFamily: "var(--font-sans), system-ui, -apple-system, sans-serif",
    },
    roomHeader: {
        height: "60px",
        padding: "0 1.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        zIndex: 10,
        backgroundColor: "rgba(9, 13, 22, 0.8)",
        backdropFilter: "blur(8px)",
    },
    logoArea: {
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
    },
    callIndicatorPulse: {
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        backgroundColor: "#22d3ee",
        boxShadow: "0 0 10px #22d3ee",
        animation: "pulse 1.8s infinite",
    },
    logoText: {
        fontSize: "0.95rem",
        fontWeight: 700,
        letterSpacing: "0.03em",
        color: "#e2e8f0",
    },
    progressChip: {
        padding: "0.4rem 0.8rem",
        borderRadius: "9999px",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        fontSize: "0.8rem",
        fontWeight: 600,
        color: "#cbd5e1",
    },
    callGrid: {
        flex: 1,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        boxSizing: "border-box",
    },
    aiVideoPanel: {
        width: "100%",
        maxWidth: "960px",
        height: "80%",
        maxHeight: "560px",
        borderRadius: "24px",
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        backdropFilter: "blur(12px)",
    },
    aiFaceContainer: {
        position: "relative",
        width: "180px",
        height: "180px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "2rem",
    },
    aiAvatarCircle: {
        width: "120px",
        height: "120px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #0891b2, #4f46e5)",
        border: "3px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 10px 30px rgba(79, 70, 229, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
    },
    aiAvatarEmoji: {
        fontSize: "4.5rem",
    },
    avatarGlowRing: {
        position: "absolute",
        width: "150px",
        height: "150px",
        borderRadius: "50%",
        border: "2px solid #22d3ee",
        opacity: 0,
        zIndex: 1,
        transition: "all 0.3s ease",
    },
    ringSpeakingPulse: {
        animation: "avatarPulse 1.2s infinite ease-out",
        opacity: 0.8,
    },
    statusPill: {
        padding: "0.35rem 0.9rem",
        borderRadius: "9999px",
        backgroundColor: "rgba(9, 13, 22, 0.7)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        fontSize: "0.8rem",
        fontWeight: 600,
        letterSpacing: "0.02em",
        color: "#94a3b8",
        marginBottom: "1rem",
    },
    questionSubtitleBox: {
        width: "85%",
        maxWidth: "720px",
        textAlign: "center",
        padding: "1rem 1.5rem",
        borderRadius: "16px",
        backgroundColor: "rgba(9, 13, 22, 0.75)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
    },
    questionText: {
        fontSize: "1.25rem",
        fontWeight: 600,
        lineHeight: 1.5,
        color: "#f1f5f9",
        margin: 0,
    },
    studentPip: {
        position: "absolute",
        bottom: "2.5rem",
        right: "2.5rem",
        width: "160px",
        height: "120px",
        borderRadius: "16px",
        overflow: "hidden",
        border: "2px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
        backgroundColor: "#1e293b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 5,
        transition: "all 0.3s ease",
    },
    pipVideo: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    pipPlaceholder: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle, #334155, #1e293b)",
    },
    placeholderInitials: {
        fontSize: "2rem",
        fontWeight: 700,
        color: "#94a3b8",
    },
    studentLabel: {
        position: "absolute",
        bottom: "0.5rem",
        left: "0.5rem",
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        padding: "0.2rem 0.5rem",
        borderRadius: "6px",
        fontSize: "0.7rem",
        fontWeight: 600,
        color: "#f1f5f9",
    },
    waveCanvas: {
        position: "absolute",
        bottom: "0.5rem",
        right: "0.5rem",
        width: "60px",
        height: "18px",
        pointerEvents: "none",
    },
    liveCaptionOverlay: {
        position: "absolute",
        bottom: "120px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        padding: "0.75rem 2rem",
        borderRadius: "9999px",
        border: "1px solid rgba(34, 211, 238, 0.3)",
        boxShadow: "0 10px 30px rgba(34, 211, 238, 0.15)",
        zIndex: 8,
        maxWidth: "80%",
        textAlign: "center",
    },
    captionText: {
        fontSize: "1.1rem",
        fontWeight: 500,
        color: "#22d3ee",
        margin: 0,
        fontStyle: "italic",
    },
    controlBar: {
        height: "80px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "1.25rem",
        zIndex: 10,
        backgroundColor: "#090d16",
        borderTop: "1px solid rgba(255, 255, 255, 0.05)",
    },
    controlBtn: {
        width: "48px",
        height: "48px",
        borderRadius: "50%",
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "#ffffff",
        transition: "all 0.25s ease",
    },
    btnActive: {
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        color: "#f8fafc",
    },
    btnMuted: {
        backgroundColor: "#ef4444",
        boxShadow: "0 0 10px rgba(239, 68, 68, 0.4)",
    },
    btnKeyboard: {
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
    },
    btnEndCall: {
        width: "90px",
        borderRadius: "24px",
        backgroundColor: "#0284c7",
        boxShadow: "0 4px 14px rgba(2, 132, 199, 0.4)",
        color: "#ffffff",
    },
    centerScreen: {
        width: "100vw",
        height: "100vh",
        backgroundColor: "#090d16",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: "#f8fafc",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
    },
    callConnectingRipple: {
        position: "relative",
        width: "100px",
        height: "100px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    rippleCircle: {
        position: "absolute",
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        border: "3px solid #22d3ee",
        animation: "ripple 1.5s infinite ease-out",
    },
    rippleCenter: {
        fontSize: "3.5rem",
        zIndex: 2,
    },
    errorBadge: {
        width: "64px",
        height: "64px",
        borderRadius: "50%",
        backgroundColor: "rgba(239, 68, 68, 0.15)",
        color: "#ef4444",
        border: "2px solid #ef4444",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "2rem",
        fontWeight: "bold",
    },
    btnControlClose: {
        padding: "0.6rem 1.5rem",
        borderRadius: "8px",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        color: "#ffffff",
        cursor: "pointer",
        fontWeight: 600,
    },
    errorToast: {
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "#ef4444",
        color: "#ffffff",
        padding: "0.6rem 1.5rem",
        borderRadius: "8px",
        zIndex: 1000,
        boxShadow: "0 10px 20px rgba(0, 0, 0, 0.3)",
        fontSize: "0.9rem",
        fontWeight: 600,
    },
    keyboardPanelOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
    },
    keyboardModal: {
        backgroundColor: "#0f172a",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "20px",
        width: "90%",
        maxWidth: "500px",
        padding: "1.5rem",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    },
    modalHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1rem",
        color: "#f1f5f9",
    },
    modalCloseBtn: {
        background: "none",
        border: "none",
        color: "#94a3b8",
        fontSize: "1.1rem",
        cursor: "pointer",
    },
    modalInstruction: {
        fontSize: "0.85rem",
        color: "#94a3b8",
        marginBottom: "1.25rem",
        lineHeight: 1.4,
    },
    modalInputRow: {
        display: "flex",
        gap: "0.75rem",
    },
    modalInput: {
        flex: 1,
        backgroundColor: "#1e293b",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "10px",
        padding: "0.75rem 1rem",
        color: "#ffffff",
        outline: "none",
        fontSize: "0.95rem",
    },
    modalSendBtn: {
        backgroundColor: "#0284c7",
        border: "none",
        borderRadius: "10px",
        padding: "0 1.25rem",
        color: "#ffffff",
        fontWeight: 600,
        cursor: "pointer",
        transition: "background 0.2s",
    },
    lobbyCard: {
        width: "90%",
        maxWidth: "500px",
        padding: "2.5rem",
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "24px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backdropFilter: "blur(12px)",
    },
    lobbyAvatarCircle: {
        width: "100px",
        height: "100px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #0891b2, #4f46e5)",
        border: "3px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 10px 30px rgba(79, 70, 229, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "1.5rem",
    },
    lobbyTitle: {
        fontFamily: "var(--font-heading)",
        fontSize: "1.6rem",
        fontWeight: 700,
        marginBottom: "0.5rem",
        color: "#f8fafc",
    },
    lobbySubtitle: {
        fontSize: "1rem",
        color: "#cbd5e1",
        marginBottom: "1.5rem",
        textAlign: "center",
    },
    lobbyInstructions: {
        backgroundColor: "rgba(9, 13, 22, 0.5)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: "16px",
        padding: "1.2rem",
        width: "100%",
        textAlign: "left",
        marginBottom: "2rem",
        color: "#94a3b8",
    },
    lobbyStartBtn: {
        width: "100%",
        padding: "0.9rem 1.5rem",
        borderRadius: "14px",
        border: "none",
        color: "#ffffff",
        fontWeight: 700,
        fontSize: "1.05rem",
        cursor: "pointer",
        boxShadow: "0 10px 25px rgba(79, 70, 229, 0.45)",
        transition: "all 0.25s ease",
    },
};