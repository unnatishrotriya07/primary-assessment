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
    const [subjectName, setSubjectName] = useState("");
    const [chapterNumber, setChapterNumber] = useState("");
    const [chapterTitle, setChapterTitle] = useState("");
    
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
    const silenceTimeoutRef = useRef<any>(null);
    const submitRef = useRef<any>(null);
    const [voicesLoaded, setVoicesLoaded] = useState(false);
    const hasRepeatedCurrentRef = useRef(false);
    const silenceCountRef = useRef(0);

    const micEnabledRef = useRef(micEnabled);
    const isSpeakingRef = useRef(isSpeaking);
    const isSubmittingRef = useRef(isSubmitting);

    useEffect(() => {
        micEnabledRef.current = micEnabled;
    }, [micEnabled]);

    useEffect(() => {
        isSpeakingRef.current = isSpeaking;
    }, [isSpeaking]);

    useEffect(() => {
        isSubmittingRef.current = isSubmitting;
    }, [isSubmitting]);

    const updateIsSpeaking = (val: boolean) => {
        setIsSpeaking(val);
        isSpeakingRef.current = val;
    };

    const updateMicEnabled = (val: boolean) => {
        setMicEnabled(val);
        micEnabledRef.current = val;
    };

    const updateIsSubmitting = (val: boolean) => {
        setIsSubmitting(val);
        isSubmittingRef.current = val;
    };

    // Pre-load synthesis voices to prevent first question voice mismatch
    useEffect(() => {
        if (typeof window === "undefined" || !window.speechSynthesis) return;
        const loadVoices = () => {
            const list = window.speechSynthesis.getVoices();
            if (list.length > 0) {
                setVoicesLoaded(true);
            }
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, []);


    // Cleanup silence timeout on unmount
    useEffect(() => {
        return () => {
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
            }
        };
    }, []);

    // ── Load questions from sessionStorage ───────────────────────────────────
    useEffect(() => {
        const raw = sessionStorage.getItem(`interview_session_${interviewId}`);
        if (raw) {
            try {
                const data = JSON.parse(raw);
                setStudentName(data.student_name || "Student");
                const qs = data.questions || [];
                setQuestions(qs);
                setSubjectName(data.subject_name || "");
                setChapterNumber(data.chapter_number || "");
                setChapterTitle(data.chapter_title || "");
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

                // If Buddy finished speaking before we got permission, start speech recognition now
                if (!isSpeakingRef.current && !isSubmittingRef.current && micEnabledRef.current) {
                    startSpeechRecognition();
                }
            } catch (err) {
                console.warn("First getUserMedia attempt failed (video + audio), trying audio-only fallback...", err);
                try {
                    const audioStream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                    });
                    activeStream = audioStream;
                    setStream(audioStream);
                    setCameraEnabled(false);
                    updateMicEnabled(true);

                    // Web Audio API Visualizer Setup
                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                    const audioCtx = new AudioContextClass();
                    audioContextRef.current = audioCtx;

                    const source = audioCtx.createMediaStreamSource(audioStream);
                    const analyser = audioCtx.createAnalyser();
                    analyser.fftSize = 64;
                    analyserRef.current = analyser;
                    source.connect(analyser);

                    drawWaveform();

                    // If Buddy finished speaking before we got permission, start speech recognition now
                    if (!isSpeakingRef.current && !isSubmittingRef.current) {
                        startSpeechRecognition();
                    }
                } catch (fallbackErr) {
                    console.error("Audio-only fallback getUserMedia failed:", fallbackErr);
                    setError("Microphone access denied. Please click the camera/mic icon in your address bar to allow microphone access, or use the keyboard fallback.");
                    setCameraEnabled(false);
                    updateMicEnabled(false);
                }
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
        
        hasRepeatedCurrentRef.current = false; // Reset repeat flag for new question

        let textToSpeak = questions[currentIdx].q;
        const isMath = (subjectName || "").toLowerCase().includes("math");
        if (isMath) {
            textToSpeak = textToSpeak.trim().endsWith(".") 
                ? `${textToSpeak} Please write down your step-by-step solution.` 
                : `${textToSpeak}. Please write down your step-by-step solution.`;
        }
        if (currentIdx === 0) {
            // Get greeting time of day (morning, afternoon, evening)
            const hour = new Date().getHours();
            let timeOfDay = "day";
            if (hour < 12) timeOfDay = "morning";
            else if (hour < 17) timeOfDay = "afternoon";
            else timeOfDay = "evening";

            const greeting = `Hi! Good ${timeOfDay}. Let's start with your ${subjectName || "Subject"}${chapterNumber ? `, Chapter - ${chapterNumber}` : ""}${chapterTitle ? `, ${chapterTitle}` : ""}. `;
            textToSpeak = greeting + textToSpeak;
        }

        // Speak question
        speakText(textToSpeak, () => {
            // Once Buddy finishes speaking, automatically open mic if mic is enabled
            if (micEnabledRef.current) {
                startSpeechRecognition();
            }
        });
        
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIdx, phase, questions.length, subjectName, chapterNumber, chapterTitle]);

    // ── Text to speech (TTS) ──────────────────────────────────────────────────
    const speakText = useCallback((text: string, onEnd?: () => void) => {
        if (!window.speechSynthesis) {
            onEnd?.();
            return;
        }

        try {
            window.speechSynthesis.resume();
            window.speechSynthesis.cancel();
        } catch (err) {
            console.error("Error canceling speech synthesis:", err);
        }

        updateIsSpeaking(true);
        setIsRecording(false);
        if (recognitionRef.current) {
            recognitionRef.current.onend = null;
            try { recognitionRef.current.stop(); } catch (_) {}
        }
        
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
            voices.find((v) => v.lang.startsWith("en") && /google/i.test(v.name)) ||
            voices.find((v) => v.lang.startsWith("en") && /samantha/i.test(v.name)) ||
            voices.find((v) => v.lang.startsWith("en") && /zira/i.test(v.name)) ||
            voices.find((v) => v.lang.startsWith("en") && /female|woman/i.test(v.name)) ||
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

        let fired = false;
        let fallbackTimeout: any = null;
        let onstartFired = false;
        let onstartTimeout: any = null;

        const onEndOnce = () => {
            if (fired) return;
            fired = true;
            
            // Clear callbacks immediately to prevent late-firing events
            utt.onstart = null;
            utt.onend = null;
            utt.onerror = null;

            if (onstartTimeout) clearTimeout(onstartTimeout);
            if (fallbackTimeout) clearTimeout(fallbackTimeout);
            clearInterval(resumeInterval);
            updateIsSpeaking(false);
            if (utteranceRef.current === utt) {
                utteranceRef.current = null;
            }
            onEnd?.();
        };

        utt.onstart = () => {
            onstartFired = true;
            if (onstartTimeout) clearTimeout(onstartTimeout);
            updateIsSpeaking(true);
            setIsRecording(false);
            if (recognitionRef.current) {
                recognitionRef.current.onend = null;
                try { recognitionRef.current.stop(); } catch (_) {}
            }
        };
        utt.onend = () => {
            onEndOnce();
        };
        utt.onerror = () => {
            onEndOnce();
        };

        // Safety fallback timeout: estimate duration based on 150 words per minute (400ms per word) + 2.5s buffer
        const wordCount = text.split(/\s+/).length;
        const estimatedDurationMs = Math.max(3000, (wordCount * 450) + 2500);

        fallbackTimeout = setTimeout(() => {
            console.warn(`SpeechSynthesis fallback timeout triggered for text: "${text}". Moving ahead.`);
            onEndOnce();
        }, estimatedDurationMs);

        onstartTimeout = setTimeout(() => {
            if (!onstartFired) {
                console.warn(`SpeechSynthesis failed to start within 1.5 seconds for text: "${text}". Bypassing speech synthesis.`);
                onEndOnce();
            }
        }, 1500);

        try {
            window.speechSynthesis.speak(utt);
        } catch (speakErr) {
            console.error("SpeechSynthesis speak failed:", speakErr);
            onEndOnce();
        }
    }, []);

    // ── Add message to transcript state ──────────────────────────────────────
    const addMsg = useCallback((role: "ai" | "student", text: string, category?: string) => {
        setTranscript((prev) => [...prev, { role, text, question_category: category }]);
    }, []);

    // ── Start STT Speech Recognition ─────────────────────────────────────────
    const startSpeechRecognition = () => {
        if (isSpeakingRef.current || isSubmittingRef.current || !micEnabledRef.current) return;

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
        rec.continuous = true; // Continuous listening so pauses don't cut off the user
        rec.maxAlternatives = 1;

        rec.onstart = () => {
            setIsRecording(true);
            setLiveCaption("Listening...");
        };

        rec.onresult = (e: any) => {
            let interimTranscript = "";
            let finalTranscript = "";
            for (let i = 0; i < e.results.length; ++i) {
                const text = e.results[i][0].transcript;
                if (e.results[i].isFinal) {
                    finalTranscript += text + " ";
                } else {
                    interimTranscript += text;
                }
            }
            const currentSpeech = (finalTranscript + interimTranscript).trim();
            setLiveCaption(currentSpeech);
            setTypedText(currentSpeech);

            if (currentSpeech.length > 0) {
                silenceCountRef.current = 0;
                setError("");
            }

            // Repeat question detection: check if student asks to repeat
            const lowerSpeech = currentSpeech.toLowerCase().trim();
            const repeatTriggers = [
                "repeat the question",
                "repeat please",
                "can you repeat",
                "say that again",
                "say again",
                "speak again",
                "repeat question",
                "what was the question",
                "pardon me",
                "didn't hear you",
                "did not hear"
            ];
            const isRepeatRequest = lowerSpeech === "repeat" || repeatTriggers.some(trigger => lowerSpeech.includes(trigger));

            if (isRepeatRequest && !hasRepeatedCurrentRef.current) {
                console.log("Repeat request detected. Repeating current question...");
                hasRepeatedCurrentRef.current = true;
                if (silenceTimeoutRef.current) {
                    clearTimeout(silenceTimeoutRef.current);
                }
                if (recognitionRef.current) {
                    recognitionRef.current.onend = null;
                    recognitionRef.current.onresult = null;
                    try { recognitionRef.current.stop(); } catch (_) {}
                }
                setIsRecording(false);
                setLiveCaption("");
                setTypedText("");

                let qText = questions[currentIdx].q;
                const isMath = (subjectName || "").toLowerCase().includes("math");
                if (isMath) {
                    qText = qText.trim().endsWith(".") 
                        ? `${qText} Please write down your step-by-step solution.` 
                        : `${qText}. Please write down your step-by-step solution.`;
                }
                const repeatPrompt = `Sure, let me repeat that. ${qText}`;
                speakText(repeatPrompt, () => {
                    if (micEnabledRef.current) {
                        startSpeechRecognition();
                    }
                });
                return;
            }

            // Auto-next silence detection: submit after 4.5 seconds of silence
            if (currentSpeech.length > 0) {
                if (silenceTimeoutRef.current) {
                    clearTimeout(silenceTimeoutRef.current);
                }
                silenceTimeoutRef.current = setTimeout(() => {
                    console.log("Silence detected. Auto-submitting response:", currentSpeech);
                    if (recognitionRef.current) {
                        recognitionRef.current.onend = null;
                        recognitionRef.current.onresult = null;
                        try { recognitionRef.current.stop(); } catch (_) {}
                    }
                    setIsRecording(false);
                    setLiveCaption("");
                    if (submitRef.current) {
                        submitRef.current(currentSpeech);
                    }
                }, 4500); // 4.5 seconds of silence
            }
        };

        rec.onerror = (err: any) => {
            if (err.error === "not-allowed") {
                console.error("Speech recognition permission denied:", err.error);
                setError("Microphone permission denied. Please click the camera/mic icon in your address bar to allow microphone access, or use the keyboard fallback.");
            } else if (err.error === "audio-capture") {
                console.error("Speech recognition audio capture failed:", err.error);
                setError("No microphone detected or microphone is busy. Please connect a mic or use the keyboard fallback.");
            } else if (err.error === "no-speech") {
                console.log("Speech recognition info: no-speech (user is silent)");
                silenceCountRef.current += 1;
                if (silenceCountRef.current >= 3) {
                    setError("We are having trouble hearing you. Please check if your system microphone is muted or set incorrectly in System Settings, or use the keyboard fallback.");
                }
            } else if (err.error === "network") {
                console.error("Speech recognition network error:", err.error);
                setError("Speech recognition service connection error. Please verify your internet connection or use the keyboard fallback.");
            } else {
                console.error("Speech recognition error:", err.error);
            }
            setIsRecording(false);
        };

        rec.onend = () => {
            setIsRecording(false);
            // Auto-restart if mic is enabled, and we aren't speaking or submitting
            if (micEnabledRef.current && !isSpeakingRef.current && !isSubmittingRef.current) {
                setTimeout(() => {
                    // Double check values using refs to ensure state hasn't changed during the delay
                    if (micEnabledRef.current && !isSpeakingRef.current && !isSubmittingRef.current) {
                        try { rec.start(); } catch (_) {}
                    }
                }, 300);
            }
        };

        recognitionRef.current = rec;
        try {
            rec.start();
        } catch (startErr) {
            console.error("Failed to start SpeechRecognition:", startErr);
        }
    };

    // ── Submit Answer ────────────────────────────────────────────────────────
    const handleSubmitAnswer = useCallback((overrideText?: string) => {
        const text = (overrideText ?? typedText).trim();
        if (!text || questions.length === 0) return;

        silenceCountRef.current = 0;

        // Clear silence timeout
        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
        }

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
            updateIsSubmitting(true);
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

    // Keep submitRef updated with latest handleSubmitAnswer to prevent stale closure bugs
    useEffect(() => {
        submitRef.current = handleSubmitAnswer;
    }, [handleSubmitAnswer]);

    // ── Submit to Backend ────────────────────────────────────────────────────
    const submitInterview = async (finalAnswers: AnswerEntry[], finalTranscript: TranscriptEntry[]) => {
        setPhase("generating");
        updateIsSubmitting(true);

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
            setError("Failed to submit assessment. Please try again.");
            setPhase("interview");
            updateIsSubmitting(false);
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
            updateMicEnabled(audioTrack.enabled);

            // Stop/Start recognition accordingly
            if (!audioTrack.enabled) {
                if (silenceTimeoutRef.current) {
                    clearTimeout(silenceTimeoutRef.current);
                }
                if (recognitionRef.current) {
                    recognitionRef.current.onend = null;
                    try { recognitionRef.current.stop(); } catch (_) {}
                }
                setIsRecording(false);
            } else if (!isSpeaking && !isSubmitting) {
                startSpeechRecognition();
            }
        }
    };

    const handleManualNext = useCallback(() => {
        if (isSpeaking || isSubmitting) return;
        
        // Clear silence timeout
        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
        }

        // Stop recognition
        if (recognitionRef.current) {
            recognitionRef.current.onend = null;
            recognitionRef.current.onresult = null;
            try { recognitionRef.current.stop(); } catch (_) {}
        }
        setIsRecording(false);

        // Submit the answer
        handleSubmitAnswer(typedText);
        setLiveCaption("");
    }, [isSpeaking, isSubmitting, handleSubmitAnswer, typedText]);

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
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary)" }}>
                            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
                            <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                            <path d="M21.5 12v6" />
                        </svg>
                    </div>
                    <h2 style={s.lobbyTitle}>Welcome to the Assessment Lobby</h2>
                    <p style={s.lobbySubtitle}>
                        Hi <strong style={{ color: "var(--primary)" }}>{studentName}</strong>, Buddy is ready to guide you through <span style={{ color: "var(--primary)" }}>{subjectName || "your assessment"}</span>{chapterNumber ? ` (Chapter - ${chapterNumber}${chapterTitle ? `: ${chapterTitle}` : ""})` : ""}!
                    </p>
                    <div style={s.lobbyInstructions}>
                        <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600, color: "var(--text-primary)" }}>Tips before you start:</p>
                        <ul style={{ paddingLeft: "1.2rem", margin: 0, textAlign: "left", fontSize: "0.9rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            <li>Make sure you are in a quiet room so Buddy can hear you.</li>
                            <li>Buddy will read each question aloud. Listen carefully!</li>
                            <li>Speak clearly into your microphone when you answer.</li>
                        </ul>
                    </div>
                    <button
                        onClick={() => {
                            // Unlock SpeechSynthesis synchronously within user gesture
                            if (typeof window !== "undefined" && window.speechSynthesis) {
                                try {
                                    const unlockUtt = new SpeechSynthesisUtterance("");
                                    window.speechSynthesis.speak(unlockUtt);
                                } catch (e) {
                                    console.warn("Failed to unlock speech synthesis:", e);
                                }
                            }
                            setPhase("interview");
                        }}
                        style={s.lobbyStartBtn}
                        className="interactive-element"
                    >
                        Start Assessment
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
                    <div style={s.rippleCenter}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary)" }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                    </div>
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
                    <span style={s.logoText}>Oral Assessment Room</span>
                </div>
                <div style={s.progressChip}>
                    Question {currentIdx + 1} of {questions.length}
                </div>
            </div>

            {/* Main Stage Grid */}
            <div style={s.callGrid} className="interview-call-grid">
                {/* AI Panel (Large View) */}
                <div style={s.aiVideoPanel} className="interview-ai-video-panel">
                    <div style={s.aiFaceContainer}>
                        {/* Glowing backdrop rings */}
                        <div style={{
                            ...s.avatarGlowRing,
                            ...(isSpeaking ? s.ringSpeakingPulse : {})
                        }} />
                        <div style={s.aiAvatarCircle}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary)" }}>
                                <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
                                <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                                <path d="M21.5 12v6" />
                            </svg>
                        </div>
                    </div>
                    
                    {/* Status Text overlay */}
                    <div style={s.statusPill}>
                        {isSpeaking ? (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }}>
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                                </svg>
                                Buddy is Speaking
                            </>
                        ) : isRecording ? (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }}>
                                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
                                </svg>
                                Mic Active
                            </>
                        ) : (
                            <>
                                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--primary)", marginRight: 6, animation: "pulse-glow 1.5s infinite", verticalAlign: "middle" }}></span>
                                Listening
                            </>
                        )}
                    </div>

                    {/* Question Subtitles overlay */}
                    <div style={s.questionSubtitleBox}>
                        <p style={s.questionText}>{currentQ?.q || "Initializing..."}</p>
                        {currentQ && (subjectName || "").toLowerCase().includes("math") && (
                            <p style={{
                                fontSize: "0.95rem",
                                color: "var(--primary)",
                                fontWeight: "bold",
                                marginTop: "0.5rem",
                                fontStyle: "italic"
                            }}>
                                Please write down your step-by-step solution.
                            </p>
                        )}
                        {currentQ && (
                            <button
                                onClick={() => {
                                    if (window.speechSynthesis) {
                                        try { window.speechSynthesis.cancel(); } catch (_) {}
                                    }
                                    if (recognitionRef.current) {
                                        try { recognitionRef.current.stop(); } catch (_) {}
                                    }
                                    let readText = questions[currentIdx].q;
                                    const isMath = (subjectName || "").toLowerCase().includes("math");
                                    if (isMath) {
                                        readText = readText.trim().endsWith(".") 
                                            ? `${readText} Please write down your step-by-step solution.` 
                                            : `${readText}. Please write down your step-by-step solution.`;
                                    }
                                    speakText(readText, () => {
                                        if (micEnabledRef.current) {
                                            startSpeechRecognition();
                                        }
                                    });
                                }}
                                style={s.readAloudBtn}
                                className="interactive-element"
                                title="Read Question Aloud"
                                disabled={isSpeaking || isSubmitting}
                            >
                                {isSpeaking ? (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }}>
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                                        </svg>
                                        Speaking...
                                    </>
                                ) : (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }}>
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                        </svg>
                                        Read Aloud
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Picture in Picture Student Video */}
                <div style={s.studentPip} className="interview-student-pip">
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
                        className="interview-wave-canvas"
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
                    onClick={() => {
                        setTypedText(liveCaption || "");
                        setShowKeyboardInput(true);
                    }}
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
                    disabled={isSubmitting}
                    title="Submit Answer"
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
        backgroundColor: "transparent",
        color: "var(--text-primary)",
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
        borderBottom: "1px solid var(--border-color)",
        zIndex: 10,
        backgroundColor: "var(--bg-surface)",
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
        backgroundColor: "var(--secondary)",
        boxShadow: "0 0 10px var(--secondary)",
        animation: "pulse 1.8s infinite",
    },
    logoText: {
        fontSize: "0.95rem",
        fontWeight: 700,
        letterSpacing: "0.03em",
        color: "var(--text-primary)",
    },
    progressChip: {
        padding: "0.4rem 0.8rem",
        borderRadius: "9999px",
        backgroundColor: "var(--primary-light)",
        border: "1px solid var(--border-color)",
        fontSize: "0.8rem",
        fontWeight: 600,
        color: "var(--primary)",
    },
    callGrid: {
        flex: 1,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        padding: "1.5rem",
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "1200px",
        margin: "0 auto",
    },
    aiVideoPanel: {
        flex: 1,
        height: "80%",
        maxHeight: "560px",
        borderRadius: "24px",
        backgroundColor: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--glass-shadow)",
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
        background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
        border: "3px solid var(--glass-border)",
        boxShadow: "0 10px 30px rgba(139, 124, 251, 0.25)",
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
        border: "2px solid var(--secondary)",
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
        backgroundColor: "var(--primary-light)",
        border: "1px solid var(--border-color)",
        fontSize: "0.8rem",
        fontWeight: 600,
        letterSpacing: "0.02em",
        color: "var(--text-secondary)",
        marginBottom: "1rem",
    },
    questionSubtitleBox: {
        width: "85%",
        maxWidth: "720px",
        textAlign: "center",
        padding: "1rem 1.5rem",
        borderRadius: "16px",
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-color)",
    },
    questionText: {
        fontSize: "1.25rem",
        fontWeight: 600,
        lineHeight: 1.5,
        color: "var(--text-primary)",
        margin: 0,
    },
    readAloudBtn: {
        marginTop: "0.75rem",
        padding: "0.4rem 1rem",
        borderRadius: "20px",
        border: "1px solid var(--primary)",
        backgroundColor: "var(--primary-light)",
        color: "var(--primary)",
        fontSize: "0.85rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
    },
    studentPip: {
        flex: 1,
        height: "80%",
        maxHeight: "560px",
        borderRadius: "24px",
        backgroundColor: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--glass-shadow)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        backdropFilter: "blur(12px)",
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
        background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-hover) 100%)",
    },
    placeholderInitials: {
        width: "120px",
        height: "120px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, var(--secondary-light) 0%, var(--secondary) 100%)",
        border: "3px solid var(--glass-border)",
        boxShadow: "0 10px 30px rgba(199, 198, 245, 0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "3rem",
        fontWeight: 700,
        color: "var(--primary)",
    },
    studentLabel: {
        position: "absolute",
        bottom: "1rem",
        left: "1rem",
        backgroundColor: "var(--primary)",
        padding: "0.4rem 0.8rem",
        borderRadius: "8px",
        fontSize: "0.85rem",
        fontWeight: 600,
        color: "#ffffff",
        zIndex: 3,
    },
    waveCanvas: {
        position: "absolute",
        bottom: "1rem",
        right: "1rem",
        width: "80px",
        height: "24px",
        pointerEvents: "none",
        zIndex: 3,
    },
    liveCaptionOverlay: {
        position: "absolute",
        bottom: "120px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "var(--glass-bg)",
        padding: "0.75rem 2rem",
        borderRadius: "9999px",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--glass-shadow)",
        zIndex: 8,
        maxWidth: "80%",
        textAlign: "center",
    },
    captionText: {
        fontSize: "1.1rem",
        fontWeight: 500,
        color: "var(--text-primary)",
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
        backgroundColor: "var(--bg-surface)",
        borderTop: "1px solid var(--border-color)",
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
        color: "var(--text-primary)",
        transition: "all 0.25s ease",
    },
    btnActive: {
        backgroundColor: "var(--secondary-light)",
        border: "1px solid var(--border-color)",
        color: "var(--text-primary)",
    },
    btnMuted: {
        backgroundColor: "#ef4444",
        boxShadow: "0 0 10px rgba(239, 68, 68, 0.4)",
    },
    btnKeyboard: {
        backgroundColor: "var(--secondary-light)",
        border: "1px solid var(--border-color)",
    },
    btnEndCall: {
        width: "90px",
        borderRadius: "24px",
        backgroundColor: "var(--primary)",
        boxShadow: "var(--shadow-sm)",
        color: "#ffffff",
    },
    centerScreen: {
        width: "100vw",
        height: "100vh",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: "var(--text-primary)",
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
        border: "3px solid var(--secondary)",
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
        border: "none",
        backgroundColor: "var(--primary)",
        color: "#ffffff",
        cursor: "pointer",
        fontWeight: 600,
    },
    errorToast: {
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "var(--error)",
        color: "#ffffff",
        padding: "0.6rem 1.5rem",
        borderRadius: "8px",
        zIndex: 1000,
        boxShadow: "var(--shadow-sm)",
        fontSize: "0.9rem",
        fontWeight: 600,
    },
    keyboardPanelOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
    },
    keyboardModal: {
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-color)",
        borderRadius: "20px",
        width: "90%",
        maxWidth: "500px",
        padding: "1.5rem",
        boxShadow: "var(--shadow-lg)",
    },
    modalHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1rem",
        color: "var(--text-primary)",
    },
    modalCloseBtn: {
        background: "none",
        border: "none",
        color: "var(--text-muted)",
        fontSize: "1.1rem",
        cursor: "pointer",
    },
    modalInstruction: {
        fontSize: "0.85rem",
        color: "var(--text-secondary)",
        marginBottom: "1.25rem",
        lineHeight: 1.4,
    },
    modalInputRow: {
        display: "flex",
        gap: "0.75rem",
    },
    modalInput: {
        flex: 1,
        backgroundColor: "var(--bg-app)",
        border: "1px solid var(--border-color)",
        borderRadius: "10px",
        padding: "0.75rem 1rem",
        color: "var(--text-primary)",
        outline: "none",
        fontSize: "0.95rem",
    },
    modalSendBtn: {
        backgroundColor: "var(--primary)",
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
        backgroundColor: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        borderRadius: "24px",
        boxShadow: "var(--glass-shadow)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backdropFilter: "blur(12px)",
    },
    lobbyAvatarCircle: {
        width: "100px",
        height: "100px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
        border: "3px solid var(--glass-border)",
        boxShadow: "0 10px 30px rgba(139, 124, 251, 0.25)",
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
        color: "var(--text-primary)",
    },
    lobbySubtitle: {
        fontSize: "1rem",
        color: "var(--text-secondary)",
        marginBottom: "1.5rem",
        textAlign: "center",
    },
    lobbyInstructions: {
        backgroundColor: "var(--primary-light)",
        border: "1px solid var(--border-color)",
        borderRadius: "16px",
        padding: "1.2rem",
        width: "100%",
        textAlign: "left",
        marginBottom: "2rem",
        color: "var(--text-secondary)",
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
        boxShadow: "var(--shadow-sm)",
        transition: "all 0.25s ease",
        backgroundColor: "var(--primary)",
    },
};