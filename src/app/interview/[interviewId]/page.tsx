"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import interviewService, {
    InterviewQuestion,
    TranscriptEntry,
    AnswerEntry,
} from "@/services/interview.service";
import { isHindiText } from "@/utils/helpers";

interface PageProps {
    params: Promise<{ interviewId: string }>;
}

const ENCOURAGEMENTS = [
    "That's thoughtful!",
    "Nice thinking!",
    "Wonderful!",
    "You're doing great!",
    "Let's try another one.",
    "Awesome effort!",
    "Keep going!",
];

export default function InterviewPage({ params }: PageProps) {
    const { interviewId } = use(params);
    const router = useRouter();

    // Student identity data
    const [studentName, setStudentName] = useState("");
    const [subjectName, setSubjectName] = useState("");
    const [chapterNumber, setChapterNumber] = useState("");
    const [chapterTitle, setChapterTitle] = useState("");
    
    // Core content lists
    const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [answers, setAnswers] = useState<AnswerEntry[]>([]);
    const [typedText, setTypedText] = useState("");
    const isHindi = subjectName.toLowerCase() === "hindi" || isHindiText(subjectName) || questions.some(q => isHindiText(q.q));

    // Journey states
    const [phase, setPhase] = useState<
        "loading" | "meet_buddy" | "device_setup" | "comfort_conv" | "transition" | "interview" | "generating" | "completed"
    >("loading");
    const [comfortIdx, setComfortIdx] = useState(0); // 0: How are you, 1: What did you enjoy, 2: Ready?
    
    // Buddy emotional state for animations
    const [buddyState, setBuddyState] = useState<"silent" | "speaking" | "listening" | "thinking" | "waving" | "completed">("silent");
    
    // Interactive features
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [liveCaption, setLiveCaption] = useState("");
    const [activeHint, setActiveHint] = useState<string | null>(null);
    const [showKeyboardInput, setShowKeyboardInput] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [silenceRetryCount, setSilenceRetryCount] = useState(0);
    const [speechSupported, setSpeechSupported] = useState(true);

    // Media permissions
    const [micEnabled, setMicEnabled] = useState(true);
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [micStatus, setMicStatus] = useState<"idle" | "granted" | "denied">("idle");
    const [cameraStatus, setCameraStatus] = useState<"idle" | "granted" | "denied">("idle");
    const [stream, setStream] = useState<MediaStream | null>(null);

    // Offline / Internet checks
    const [isOffline, setIsOffline] = useState(false);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
    const recognitionRef = useRef<any>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const isSpeakingRef = useRef(false);
    const isListeningRef = useRef(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    
    // Silence / idle timeout refs
    const silenceTimeoutRef = useRef<any>(null);
    const repeatTimeoutRef = useRef<any>(null);
    const textRef = useRef("");
    const speechConfidenceRef = useRef<number>(1.0);
    const currentIdxRef = useRef(0);
    const comfortIdxRef = useRef(0);
    const phaseRef = useRef<any>("loading");
    const answersRef = useRef<AnswerEntry[]>([]);
    const transcriptRef = useRef<TranscriptEntry[]>([]);
    const unusedEncouragementsRef = useRef<string[]>([]);

    // Encouragement history tracking to prevent direct repetition
    const [unusedEncouragements, setUnusedEncouragements] = useState<string[]>([...ENCOURAGEMENTS]);

    const recordTurn = (
        role: "ai" | "student",
        text: string,
        category?: string,
        speechConf?: number,
        qId?: number
    ) => {
        const seqNum = transcript.length + 1;
        interviewService.addMessage(parseInt(interviewId, 10), {
            role,
            text,
            question_category: category,
            sequence_number: seqNum,
            question_id: qId,
            student_response: role === "student" ? text : undefined,
            buddy_response: role === "ai" ? text : undefined,
            speech_confidence: speechConf
        }).catch((err) => console.error("Failed to persist conversation turn:", err));
    };

    const saveSessionProgress = (
        idx: number,
        stateName: string,
        comfortVal: number,
        updatedAnswers: AnswerEntry[],
        isCompleted: boolean = false
    ) => {
        interviewService.updateSession(parseInt(interviewId, 10), {
            current_question_index: idx,
            session_state: stateName,
            comfort_index: comfortVal,
            raw_answers: updatedAnswers,
            network_status: navigator.onLine ? "online" : "offline",
            completion_status: isCompleted ? "Completed" : "In Progress"
        }).catch((err) => console.error("Failed to save progressive session state:", err));
    };

    // Keep typing string reference for timeouts
    useEffect(() => {
        textRef.current = typedText;
    }, [typedText]);

    useEffect(() => {
        isSpeakingRef.current = isSpeaking;
    }, [isSpeaking]);

    useEffect(() => {
        currentIdxRef.current = currentIdx;
    }, [currentIdx]);

    useEffect(() => {
        comfortIdxRef.current = comfortIdx;
    }, [comfortIdx]);

    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        transcriptRef.current = transcript;
    }, [transcript]);

    useEffect(() => {
        unusedEncouragementsRef.current = unusedEncouragements;
    }, [unusedEncouragements]);

    // Track online/offline listeners
    useEffect(() => {
        if (typeof window === "undefined") return;
        const handleOnline = () => {
            setIsOffline(false);
            if (phase === "interview" && !isSpeakingRef.current && micEnabled) {
                startSpeechRecognition();
            }
        };
        const handleOffline = () => {
            setIsOffline(true);
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (_) {}
            }
            setIsRecording(false);
        };
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        setIsOffline(!window.navigator.onLine);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, isSpeaking, micEnabled]);

    // Load session data & recover progress if any
    useEffect(() => {
        let isMounted = true;

        async function initSession() {
            setPhase("loading");
            let questionsList: InterviewQuestion[] = [];
            let sName = "Aarav";
            let subName = "Fractions";
            let chNum = "";
            let chTitle = "";

            const raw = sessionStorage.getItem(`interview_session_${interviewId}`);
            if (raw) {
                try {
                    const data = JSON.parse(raw);
                    sName = data.student_name || "Aarav";
                    questionsList = data.questions || [];
                    subName = data.subject_name || "Fractions";
                    chNum = data.chapter_number || "";
                    chTitle = data.chapter_title || "";
                } catch (_) {}
            }

            try {
                const dbSession = await interviewService.getReport(parseInt(interviewId, 10));
                if (!isMounted) return;

                sName = dbSession.student_name || sName;
                setStudentName(sName);
                setSubjectName(dbSession.assessment_title || subName);
                
                if (questionsList.length === 0 && dbSession.questions && dbSession.questions.length > 0) {
                    questionsList = dbSession.questions;
                }
                setQuestions(questionsList);

                if (dbSession.status === "In Progress" || dbSession.status === "Transcript Saved") {
                    if (dbSession.transcript && dbSession.transcript.length > 0) {
                        setTranscript(dbSession.transcript);
                    }
                    if (dbSession.raw_answers && dbSession.raw_answers.length > 0) {
                        setAnswers(dbSession.raw_answers as any);
                    }

                    const savedIdx = dbSession.current_question_index || 0;
                    setCurrentIdx(savedIdx);
                    
                    const savedState = dbSession.session_state || "device_setup";

                    if (dbSession.completion_status === "Completed") {
                        setPhase("completed");
                        setBuddyState("completed");
                        return;
                    }

                    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                    if (!SpeechRecognition) {
                        setSpeechSupported(false);
                        setPhase("interview");
                        if (dbSession.transcript && dbSession.transcript.length > 0) {
                            // already loaded
                        } else {
                            const firstQText = questionsList[0]?.q || "Let's begin!";
                            setTranscript([{ role: "ai", text: firstQText }]);
                            speakText(firstQText);
                            recordTurn("ai", firstQText, questionsList[0]?.category);
                        }
                        return;
                    }

                    if (savedState === "interview") {
                        setPhase("interview");
                        const qText = questionsList[savedIdx]?.q || "Let's continue.";
                        speakText(qText, () => {
                            startSpeechRecognition();
                        });
                    } else if (savedState === "comfort_conv") {
                        setPhase("comfort_conv");
                        const cIdx = dbSession.comfort_index || 0;
                        setComfortIdx(cIdx);
                        let comfortQText = "Ready to learn together?";
                        if (cIdx === 0) comfortQText = `How are you today, ${sName}?`;
                        else if (cIdx === 1) comfortQText = "What did you enjoy doing today?";
                        speakText(comfortQText, () => {
                            startSpeechRecognition();
                        });
                    } else {
                        setPhase("device_setup");
                        setBuddyState("waving");
                    }
                } else if (dbSession.status === "Report Ready" || dbSession.status === "Completed") {
                    setPhase("completed");
                    setBuddyState("completed");
                } else {
                    setPhase("device_setup");
                    setBuddyState("waving");
                }
            } catch (err) {
                console.error("Failed to recover session from backend:", err);
                setStudentName(sName);
                setQuestions(questionsList);
                setPhase("device_setup");
                setBuddyState("waving");
            }
        }

        initSession();
        return () => {
            isMounted = false;
        };
    }, [interviewId]);

    // Handle audio context or stream changes
    useEffect(() => {
        if (stream && videoRef.current && cameraEnabled) {
            videoRef.current.srcObject = stream;
        }
    }, [stream, cameraEnabled, phase]);

    // Clean timers on unmount
    useEffect(() => {
        return () => {
            clearSilenceTimers();
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    const clearSilenceTimers = () => {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        if (repeatTimeoutRef.current) clearTimeout(repeatTimeoutRef.current);
    };

    // Text to Speech
    const speakText = useCallback((text: string, onEnd?: () => void) => {
        if (typeof window === "undefined" || !window.speechSynthesis) {
            onEnd?.();
            return;
        }

        try {
            window.speechSynthesis.resume();
            window.speechSynthesis.cancel();
        } catch (err) {
            console.error("Error canceling speech synthesis:", err);
        }

        isListeningRef.current = false;
        isSpeakingRef.current = true;
        setBuddyState("speaking");
        setIsSpeaking(true);
        setIsRecording(false);

        if (recognitionRef.current) {
            recognitionRef.current.onend = null;
            try { recognitionRef.current.stop(); } catch (_) {}
        }

        // Strip emojis to prevent speech synthesis from pronouncing them
        const cleanedText = text
            .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "")
            .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}/gu, "")
            .trim();

        const utt = new SpeechSynthesisUtterance(cleanedText);
        utteranceRef.current = utt;
        utt.rate = 0.88;
        utt.pitch = 1.15;

        // Try to fetch google female or Samanth female voice
        const voices = window.speechSynthesis.getVoices();
        const voice =
            voices.find((v) => v.lang.startsWith("en") && /google/i.test(v.name)) ||
            voices.find((v) => v.lang.startsWith("en") && /samantha/i.test(v.name)) ||
            voices.find((v) => v.lang.startsWith("en") && /zira/i.test(v.name)) ||
            voices.find((v) => v.lang.startsWith("en") && /female/i.test(v.name)) ||
            voices[0];
        if (voice) utt.voice = voice;

        const keepAliveInterval = setInterval(() => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
            }
        }, 10000);

        let fired = false;
        let timeoutId: any = null;
        const speakStartTime = Date.now();
        const wordCount = cleanedText.split(/\s+/).length;
        const estimatedDuration = (wordCount * 550) + 1500; // 550ms per word + 1.5s buffer

        const cleanup = () => {
            if (fired) return;
            fired = true;
            clearInterval(keepAliveInterval);
            if (timeoutId) clearTimeout(timeoutId);

            // If this is no longer the active utterance, discard the callback!
            if (utteranceRef.current !== utt) {
                return;
            }

            setIsSpeaking(false);
            isSpeakingRef.current = false;
            setBuddyState("silent");
            utteranceRef.current = null;

            // Call onEnd with a small safety delay to prevent mic picking up the end of speech
            setTimeout(() => {
                // Double check if another utterance has started in the meantime
                if (utteranceRef.current === null || utteranceRef.current === utt) {
                    onEnd?.();
                }
            }, 300);
        };

        utt.onend = cleanup;
        utt.onerror = cleanup;

        // Add 100ms delay to resolve the SpeechSynthesis hangs in Chrome
        setTimeout(() => {
            if (fired) return;
            try {
                window.speechSynthesis.speak(utt);
                
                const duration = Math.max(8000, (wordCount * 800) + 5000);
                timeoutId = setTimeout(() => {
                    cleanup();
                }, duration);
            } catch (err) {
                cleanup();
            }
        }, 100);
    }, []);

    // Draw Waveform on Canvas
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

            const barWidth = (width / bufferLength) * 2;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * height * 1.2;
                ctx.fillStyle = `rgba(37, 99, 235, ${0.4 + (dataArray[i] / 255) * 0.6})`;
                const y = (height - barHeight) / 2;
                ctx.fillRect(x, y, barWidth - 1, barHeight);
                x += barWidth;
            }
        };

        draw();
    };

    // Re-read current question verbally
    function triggerRepeat() {
        setTypedText("");
        setLiveCaption("");
        let repeatText = "";
        if (phase === "comfort_conv") {
            if (comfortIdx === 0) repeatText = `How are you today, ${studentName}?`;
            else if (comfortIdx === 1) repeatText = "What did you enjoy doing today?";
            else repeatText = "Ready to learn together?";
        } else if (phase === "interview") {
            repeatText = questions[currentIdx]?.q || "";
        }

        if (repeatText) {
            speakText(repeatText, () => {
                startSpeechRecognition();
            });
        } else {
            startSpeechRecognition();
        }
    }

    // Start Speech recognition
    function startSpeechRecognition() {
        if (isSpeakingRef.current || isSubmitting || !micEnabled || isOffline) return;

        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) {
            setError("Speech recognition is not supported in this browser. Please use the keyboard option.");
            return;
        }

        isListeningRef.current = true;

        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (_) {}
        }

        const rec = new SR();
        rec.lang = "en-US";
        rec.interimResults = true;
        rec.continuous = true;

        rec.onstart = () => {
            setIsRecording(true);
            setBuddyState("listening");
            setLiveCaption("Listening...");
            resetSilenceTimers();
        };

        rec.onresult = (e: any) => {
            if (!isListeningRef.current || isSpeakingRef.current) {
                return;
            }
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
            speechConfidenceRef.current = lastConfidence;
            const currentSpeech = (finalTranscript + interimTranscript).trim();
            setLiveCaption(currentSpeech);
            setTypedText(currentSpeech);

            const lowerSpeech = currentSpeech.toLowerCase().trim();
            if (
                lowerSpeech === "repeat" || 
                lowerSpeech === "repeat the question" || 
                lowerSpeech === "can you repeat" || 
                lowerSpeech === "please repeat" ||
                lowerSpeech === "can you repeat the question" ||
                lowerSpeech === "repeat please" ||
                lowerSpeech === "could you repeat the question"
            ) {
                clearSilenceTimers();
                isListeningRef.current = false;
                if (recognitionRef.current) {
                    recognitionRef.current.onend = null;
                    try { recognitionRef.current.stop(); } catch (_) {}
                }
                setIsRecording(false);
                triggerRepeat();
                return;
            }

            if (currentSpeech.length > 0) {
                setError(null);
                resetSilenceTimers(currentSpeech); // Reset timers since student is actively talking
            }
        };

        rec.onerror = (err: any) => {
            if (err.error === "aborted" || err.error === "no-speech") {
                return; // Suppress aborted error console spam when stop() is called programmatically
            }
            console.error("Speech recognition error:", err.error);
        };

        rec.onend = () => {
            setIsRecording(false);
            if (isListeningRef.current) {
                setBuddyState("silent");
                // Auto restart if mic is enabled and we are not speaking
                const isSessionActive = phase === "interview" || phase === "comfort_conv";
                if (micEnabled && !isSpeakingRef.current && !isSubmitting && !isOffline && isSessionActive) {
                    setTimeout(() => {
                        const stillActive = phase === "interview" || phase === "comfort_conv";
                        if (isListeningRef.current && micEnabled && !isSpeakingRef.current && !isSubmitting && !isOffline && stillActive) {
                            try { rec.start(); } catch (_) {}
                        }
                    }, 400);
                }
            }
        };

        recognitionRef.current = rec;
        try {
            rec.start();
        } catch (_) {}
    };

    // Silence timers logic
    const resetSilenceTimers = (latestSpeech: string = "") => {
        clearSilenceTimers();
        if (phase !== "interview" && phase !== "comfort_conv") return;

        const speechToUse = latestSpeech || textRef.current;

        // 6 seconds silence warning
        silenceTimeoutRef.current = setTimeout(() => {
            if (speechToUse.length === 0 && isListeningRef.current && !isOffline) {
                speakText("Take your time. I'm listening 😊", () => {
                    startSpeechRecognition();
                });
            }
        }, 6000);

        // 12 seconds silence repeat offer
        repeatTimeoutRef.current = setTimeout(() => {
            if (speechToUse.length === 0 && isListeningRef.current && !isOffline) {
                speakText("Would you like me to repeat the question?", () => {
                    startSpeechRecognition();
                });
            }
        }, 12000);

        // If student has spoken something, auto-submit after 4 seconds of silence
        if (speechToUse.length > 0 && isListeningRef.current && !isOffline) {
            silenceTimeoutRef.current = setTimeout(() => {
                if (textRef.current.length > 0 && isListeningRef.current && !isOffline) {
                    console.log("[Silence Detection] Auto-submitting due to student silence after response.");
                    if (phase === "comfort_conv") {
                        handleComfortSubmit();
                    } else {
                        handleAnswerSubmit();
                    }
                }
            }, 4000);
        }
    };

    // Advance comfort dialog
    function handleComfortSubmit() {
        try {
            clearSilenceTimers();
            const responseText = typedText.trim() || "(silent)";
            setTypedText("");
            setLiveCaption("");
            setActiveHint(null);

            isListeningRef.current = false;
            if (recognitionRef.current) {
                recognitionRef.current.onend = null;
                try { recognitionRef.current.stop(); } catch (_) {}
            }

            // Persist student's comfort response
            recordTurn("student", responseText, "Comfort Conversation", speechConfidenceRef.current);

            // Show thinking animation for 1s
            setBuddyState("thinking");
            setTimeout(() => {
                if (comfortIdx === 0) {
                    setComfortIdx(1);
                    const nextQ = "What did you enjoy doing today?";
                    speakText(nextQ, () => {
                        startSpeechRecognition();
                    });
                    recordTurn("ai", nextQ, "Comfort Conversation");
                    saveSessionProgress(currentIdx, "comfort_conv", 1, answers);
                } else if (comfortIdx === 1) {
                    setComfortIdx(2);
                    const nextQ = "Ready to learn together?";
                    speakText(nextQ, () => {
                        startSpeechRecognition();
                    });
                    recordTurn("ai", nextQ, "Comfort Conversation");
                    saveSessionProgress(currentIdx, "comfort_conv", 2, answers);
                } else {
                    // Transition phase (Step 5)
                    setPhase("transition");
                    setBuddyState("waving");
                    const transitionSpeech = `Great! Now let's talk about ${chapterTitle || subjectName || "Fractions"}.`;
                    speakText(transitionSpeech, () => {
                        setPhase("interview");
                        setCurrentIdx(0);
                        const firstQ = questions[0] || { q: "Let's begin!", category: "General" };
                        setTranscript([{ role: "ai", text: firstQ.q }]);
                        
                        const firstQText = firstQ.q;
                        speakText(firstQText, () => {
                            startSpeechRecognition();
                        });
                        recordTurn("ai", firstQText, firstQ.category);
                        saveSessionProgress(0, "interview", comfortIdx, answers);
                    });
                    recordTurn("ai", transitionSpeech, "Transition");
                }
            }, 1000);
        } catch (err) {
            console.error("[InterviewPage] Exception in handleComfortSubmit:", err);
            setError("An unexpected error occurred. Please try again.");
        }
    };

    // Request permissions
    const requestPermission = async (type: "mic" | "camera") => {
        if (type === "mic") {
            try {
                setMicStatus("idle");
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                setMicStatus("granted");
                setMicEnabled(true);
                
                // Set audio track into local stream
                if (stream) {
                    stream.addTrack(audioStream.getAudioTracks()[0]);
                } else {
                    setStream(audioStream);
                }

                // Web Audio API Visualizer Setup
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const audioCtx = new AudioContextClass();
                audioContextRef.current = audioCtx;

                const source = audioCtx.createMediaStreamSource(audioStream);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 64;
                analyserRef.current = analyser;
                source.connect(analyser);

                setTimeout(() => {
                    drawWaveform();
                }, 100);

                if (questions.length === 0) {
                    setError("Session data is empty. Please verify your invitation link.");
                    return;
                }

                // If camera is already granted or not needed, advance
                const readyText = `Awesome! Everything is ready. Let's start working on the assessment questions.`;
                speakText(readyText, () => {
                    setPhase("interview");
                    setCurrentIdx(0);
                    setTranscript([{ role: "ai", text: questions[0]?.q || "" }]);
                    
                    const firstQText = questions[0]?.q || "Let's begin!";
                    speakText(firstQText, () => {
                        startSpeechRecognition();
                    });
                    recordTurn("ai", firstQText, questions[0]?.category);
                });
                recordTurn("ai", readyText, "Device Setup");
            } catch (_) {
                setMicStatus("denied");
                setMicEnabled(false);
                setError("Microphone is required. Please check your browser bar.");
            }
        } else {
            try {
                setCameraStatus("idle");
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                setCameraStatus("granted");
                setCameraEnabled(true);

                if (stream) {
                    stream.addTrack(videoStream.getVideoTracks()[0]);
                    // Re-trigger srcObject assignment immediately
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } else {
                    setStream(videoStream);
                }
            } catch (_) {
                setCameraStatus("denied");
                setCameraEnabled(false);
            }
        }
    };

    // Submit individual question answers
    function handleAnswerSubmit() {
        try {
            if (questions.length === 0) {
                console.error("[InterviewPage] questions list is empty inside handleAnswerSubmit!");
                setError("No questions loaded. Please restart the session.");
                return;
            }
            clearSilenceTimers();
            const text = textRef.current.trim();
            setTypedText("");
            setLiveCaption("");
            setActiveHint(null);

            isListeningRef.current = false;
            if (recognitionRef.current) {
                recognitionRef.current.onend = null;
                try { recognitionRef.current.stop(); } catch (_) {}
            }

            if (!text) {
                const nextRetry = silenceRetryCount + 1;
                setSilenceRetryCount(nextRetry);

                if (nextRetry >= 3) {
                    setSilenceRetryCount(0);
                    speakText("I'm having a bit of trouble hearing you. Let's try typing the answer instead!", () => {
                        setShowKeyboardInput(true);
                    });
                } else {
                    // Speech not recognized fallback (Step 12)
                    speakText("Oops. I couldn't hear you clearly. Can you try once more?", () => {
                        startSpeechRecognition();
                    });
                }
                return;
            }

            setSilenceRetryCount(0);

            const activeCurrentIdx = currentIdxRef.current;
            const activeComfortIdx = comfortIdxRef.current;
            const activeTranscript = transcriptRef.current;
            const activeAnswers = answersRef.current;

            const q = questions[activeCurrentIdx] || questions[0] || { category: "General", q: "Question", id: undefined };
            
            // Persist student turn
            recordTurn("student", text, q.category, speechConfidenceRef.current, q.id);

            // Setup transcript items
            const newTranscript: TranscriptEntry[] = [
                ...activeTranscript,
                { role: "student", text, question_category: q.category }
            ];
            setTranscript(newTranscript);

            const newAnswers: AnswerEntry[] = [
                ...activeAnswers,
                { question_category: q.category, question: q.q, answer: text }
            ];
            setAnswers(newAnswers);

            // Save progressive state immediately
            saveSessionProgress(activeCurrentIdx, "interview", activeComfortIdx, newAnswers);

            // Transition: Thinking Bubble (Step 10)
            setBuddyState("thinking");

            setTimeout(() => {
                const isLast = activeCurrentIdx >= questions.length - 1;
                
                if (isLast) {
                    // Submit interview to backend
                    submitSession(newAnswers, newTranscript);
                } else {
                    // Select a random, non-repeating encouragement
                    let phrase = "";
                    let updatedPool = [...unusedEncouragementsRef.current];
                    if (updatedPool.length === 0) {
                        updatedPool = [...ENCOURAGEMENTS];
                    }
                    const randIndex = Math.floor(Math.random() * updatedPool.length);
                    phrase = updatedPool[randIndex] || "Great job!";
                    updatedPool.splice(randIndex, 1);
                    setUnusedEncouragements(updatedPool);

                    const next = activeCurrentIdx + 1;
                    const nextQ = questions[next] || { q: "Let's continue.", category: "General" };
                    const nextQText = nextQ.q;
                    
                    // Add AI next prompt
                    setTranscript([
                        ...newTranscript,
                        { role: "ai", text: nextQText, question_category: nextQ.category }
                    ]);
                    
                    setCurrentIdx(next);
                    
                    // Speak encouragement first, then the next question
                    const promptSpeech = `${phrase}. Let's look at the next one. ${nextQText}`;
                    speakText(promptSpeech, () => {
                        startSpeechRecognition();
                    });
                    recordTurn("ai", promptSpeech, nextQ.category);
                    saveSessionProgress(next, "interview", activeComfortIdx, newAnswers);
                }
            }, 1500);
        } catch (err) {
            console.error("[InterviewPage] Exception in handleAnswerSubmit:", err);
            setError("An unexpected error occurred. Please try again.");
        }
    };

    // Finalize session submission
    const submitSession = async (finalAnswers: AnswerEntry[], finalTranscript: TranscriptEntry[]) => {
        // Transition student to completion page immediately (0 seconds wait)
        setPhase("completed");
        setBuddyState("completed");
        triggerConfetti();
        
        // Record final turnaround turn
        const completionText = `Thank you ${studentName}! I loved talking with you. Your teacher will now understand how you're learning and help you even more. See you soon!`;
        recordTurn("ai", completionText, "Completion");

        if (stream) {
            stream.getTracks().forEach((t) => t.stop());
        }

        try {
            // Save progressive state as completed
            saveSessionProgress(currentIdx, "interview", comfortIdx, finalAnswers, true);

            // Fire-and-forget background queue trigger
            interviewService.submit({
                interview_id: parseInt(interviewId, 10),
                transcript: finalTranscript,
                answers: finalAnswers,
            }).then((report) => {
                sessionStorage.setItem(`interview_report_${report.id}`, JSON.stringify(report));
            }).catch((err) => {
                console.error("Async evaluation pipeline trigger failed:", err);
            });
        } catch (err) {
            console.error("Failed to submit session to backend:", err);
        }
    };

    // Confetti simulation trigger
    const triggerConfetti = () => {
        setTimeout(() => {
            const canvas = confettiCanvasRef.current;
            if (!canvas) return;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const colors = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#3B82F6"];
            const particles = Array.from({ length: 110 }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                r: Math.random() * 6 + 4,
                d: Math.random() * canvas.height,
                color: colors[Math.floor(Math.random() * colors.length)],
                tilt: Math.random() * 10 - 5,
                tiltAngleIncremental: Math.random() * 0.07 + 0.02,
                tiltAngle: 0
            }));

            let animationId: number;
            const draw = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                particles.forEach((p) => {
                    p.tiltAngle += p.tiltAngleIncremental;
                    p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
                    p.x += Math.sin(p.tiltAngle);
                    p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 8;

                    ctx.beginPath();
                    ctx.lineWidth = p.r / 2;
                    ctx.strokeStyle = p.color;
                    ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
                    ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
                    ctx.stroke();
                });
                animationId = requestAnimationFrame(draw);
            };
            draw();

            return () => cancelAnimationFrame(animationId);
        }, 100);
    };

    // Trigger help/hints (Step 7)
    const triggerHint = () => {
        setTypedText("");
        setLiveCaption("");
        const hintText = questions[currentIdx]?.hint || "Think about what fractions represent: equal pieces of a whole shape.";
        const fullHint = `Let's think together! ${hintText}`;
        setActiveHint(fullHint);
        speakText(fullHint, () => {
            setActiveHint(null);
            startSpeechRecognition();
        });
    };

    // Return to main app dashboard
    const handleReturnHome = () => {
        router.push("/");
    };

    // Render speech bubbles
    const getBuddySpeechText = () => {
        if (phase === "meet_buddy") {
            return `Hi ${studentName}! I'm Buddy 😊 Today we'll chat together about something you recently learned. Don't worry. There are no marks or difficult exams. Just answer naturally. I'm excited to meet you!`;
        }
        if (phase === "device_setup") {
            return "Buddy loves listening! Please allow your microphone so we can talk together. Camera is optional.";
        }
        if (phase === "comfort_conv") {
            if (comfortIdx === 0) return `How are you today, ${studentName}?`;
            if (comfortIdx === 1) return "What did you enjoy doing today?";
            return "Ready to learn together?";
        }
        if (phase === "transition") {
            return `Great! Now let's talk about ${chapterTitle || subjectName || "Fractions"}.`;
        }
        if (phase === "interview") {
            if (buddyState === "thinking") return "Hmm... Let me think...";
            if (activeHint) return activeHint;
            return questions[currentIdx]?.q || "Let's begin!";
        }
        if (phase === "generating") {
            return "Thinking... saving our conversation...";
        }
        if (phase === "completed") {
            return `🎉 Thank you ${studentName}! I loved talking with you. Your teacher will now understand how you're learning and help you even more. See you soon! 👋`;
        }
        return "";
    };

    // Render Visual Progress growing path (Step 9)
    const renderVisualProgress = () => {
        if (phase !== "interview" || questions.length === 0) return null;
        const pct = (currentIdx / (questions.length - 1)) * 100;
        
        return (
            <div style={styles.pathOuter}>
                <div style={styles.pathLineBg} />
                <div style={{ ...styles.pathLineFill, width: `${pct}%` }} />
                
                <div style={{ ...styles.pathNode, left: "5%" }} title="Home">🏡</div>
                <div style={{ ...styles.pathNode, left: "35%" }} title="Tree">🌳</div>
                <div style={{ ...styles.pathNode, left: "65%" }} title="Flower">🌼</div>
                <div style={{ ...styles.pathNode, left: "95%" }} title="School">🏫</div>

                {/* Animated walking Buddy dot representation */}
                <div style={{ ...styles.pathBuddyWalker, left: `calc(${pct}% - 14px)` }}>
                    <div style={styles.pathBuddyDot} />
                </div>
            </div>
        );
    };

    return (
        <div style={styles.appStage}>
            {/* Embedded CSS Animations */}
            <style>{`
                @keyframes scaleGlow {
                    0%, 100% { transform: scale(1); opacity: 0.25; }
                    50% { transform: scale(1.15); opacity: 0.55; }
                }
                @keyframes mouthTalk {
                    0%, 100% { transform: scaleY(1); }
                    50% { transform: scaleY(0.2); }
                }
                @keyframes pupilBlink {
                    0%, 90%, 100% { transform: scaleY(1); }
                    95% { transform: scaleY(0.1); }
                }
                @keyframes floatCard {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                }
                @keyframes armWave {
                    0%, 100% { transform: rotate(0deg); }
                    50% { transform: rotate(-20deg); }
                }
                @keyframes pulseDot {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 1; }
                }
            `}</style>

            {/* Confetti canvas overlay */}
            {phase === "completed" && (
                <canvas ref={confettiCanvasRef} style={styles.confettiOverlay} />
            )}

            {/* Offline Alert Cover */}
            {isOffline && (
                <div style={styles.offlineBoxCover}>
                    <div style={styles.offlineInnerCard}>
                        <span style={styles.offlineIcon}>📶</span>
                        <h3 style={styles.offlineTitle}>Internet break...</h3>
                        <p style={styles.offlineText}>
                            Looks like our internet is taking a short break. Don't worry, we will continue exactly where we stopped.
                        </p>
                        <div className="spinner" style={{ margin: "1.5rem auto 0 auto" }} />
                    </div>
                </div>
            )}

            {/* Main Stage Grid Container */}
            <div style={styles.stageGrid}>
                {/* Visual Progress Bar (Step 9) */}
                {renderVisualProgress()}

                {/* Buddy & Speech bubble Section or Split Layout depending on phase */}
                {phase === "interview" ? (
                    <div style={styles.splitGrid}>
                        {/* Left Panel: Bot */}
                        <div style={styles.panelCard}>
                            {/* Speech bubble */}
                            <div style={{ textAlign: "center", width: "100%" }}>
                                <p style={styles.speechText} className={isHindi ? "font-hindi" : ""}>
                                    {getBuddySpeechText()}
                                </p>
                                {buddyState === "thinking" && (
                                    <div style={styles.thinkDotRow}>
                                        <span style={{ ...styles.thinkDot, animation: "pulseDot 1.2s infinite" }} />
                                        <span style={{ ...styles.thinkDot, animation: "pulseDot 1.2s infinite 0.2s" }} />
                                        <span style={{ ...styles.thinkDot, animation: "pulseDot 1.2s infinite 0.4s" }} />
                                    </div>
                                )}
                                {liveCaption && isRecording && (
                                    <p style={styles.liveCaptionText}>&ldquo;{liveCaption}&rdquo;</p>
                                )}
                            </div>

                            {/* Buddy avatar SVG container */}
                            <div style={styles.avatarBox}>
                                {isSpeaking && (
                                    <div style={{ ...styles.glowRing, animation: "scaleGlow 1.8s infinite" }} />
                                )}
                                {isRecording && (
                                    <div style={{ ...styles.glowRing, animation: "scaleGlow 1.4s infinite", borderColor: "#10B981" }} />
                                )}

                                <svg width="150" height="150" viewBox="0 0 100 100" style={styles.buddySvgMain}>
                                    {/* Head/Face base */}
                                    <circle cx="50" cy="55" r="26" fill="#BFDBFE" stroke="#2563EB" strokeWidth="2.5" />
                                    
                                    {/* Graduation Cap */}
                                    <path d="M22 38 L50 24 L78 38 L50 52 Z" fill="#1E3A8A" stroke="#1E40AF" strokeWidth="2" />
                                    <rect x="47" y="38" width="6" height="15" fill="#1E3A8A" />
                                    <circle cx="50" cy="53" r="3.5" fill="#F59E0B" />
                                    <path d="M70 38 L78 48 L78 53" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
                                    <circle cx="78" cy="54" r="2" fill="#F59E0B" />

                                    {/* Eyes (Blinking animation) */}
                                    <g style={{ transformOrigin: "50% 53%", animation: "pupilBlink 6s infinite" }}>
                                        <ellipse cx="42" cy="53" rx="2.5" ry="4" fill="#1E3A8A" />
                                        <ellipse cx="58" cy="53" rx="2.5" ry="4" fill="#1E3A8A" />
                                    </g>

                                    {/* Cheeks */}
                                    <circle cx="36" cy="59" r="3" fill="#F87171" opacity="0.65" />
                                    <circle cx="64" cy="59" r="3" fill="#F87171" opacity="0.65" />

                                    {/* Mouth (Talking animation) */}
                                    {isSpeaking ? (
                                        <ellipse cx="50" cy="62" rx="3.5" ry="4.5" fill="#1E3A8A" style={{ transformOrigin: "50% 62%", animation: "mouthTalk 0.5s infinite" }} />
                                    ) : (
                                        <path d="M45 61 Q50 67 55 61" fill="none" stroke="#1E3A8A" strokeWidth="2.5" strokeLinecap="round" />
                                    )}

                                    {/* Arm (Waving animation) */}
                                    {buddyState === "waving" || buddyState === "completed" ? (
                                        <path d="M24 64 C20 60 14 62 16 68 L24 72" fill="none" stroke="#2563EB" strokeWidth="3.5" strokeLinecap="round"
                                              style={{ transformOrigin: "24px 68px", animation: "armWave 1s infinite ease" }} />
                                    ) : null}
                                </svg>
                            </div>
                        </div>

                        {/* Right Panel: Student camera / Waveform */}
                        <div style={styles.panelCard}>
                            {cameraEnabled ? (
                                <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "14px", border: "1px solid #E5E7EB" }} />
                            ) : (
                                <div style={{
                                    width: "120px",
                                    height: "120px",
                                    borderRadius: "50%",
                                    backgroundColor: "var(--primary-light)",
                                    border: "1px solid var(--border-color)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "3rem",
                                    fontWeight: 700,
                                    color: "var(--primary)"
                                }}>
                                    {studentName ? studentName[0].toUpperCase() : "S"}
                                </div>
                            )}

                            {/* Name Label */}
                            <div style={{
                                position: "absolute",
                                bottom: "1rem",
                                left: "1rem",
                                backgroundColor: "#2563EB",
                                padding: "0.4rem 0.8rem",
                                borderRadius: "8px",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                color: "#ffffff",
                                zIndex: 3
                            }}>
                                {studentName} (You)
                            </div>

                            {/* Audio visualizer canvas */}
                            <canvas
                                ref={canvasRef}
                                width={120}
                                height={36}
                                style={{
                                    position: "absolute",
                                    bottom: "1.2rem",
                                    right: "1.2rem",
                                    width: "80px",
                                    height: "24px",
                                    pointerEvents: "none",
                                    zIndex: 3
                                }}
                            />
                        </div>
                    </div>
                ) : (
                    /* Default Setup View */
                    <div style={styles.buddyZone}>
                        {/* Speech bubble */}
                        <div style={styles.bubbleBox}>
                            <div style={styles.bubbleArrow} />
                            <p style={styles.speechText}>
                                {getBuddySpeechText()}
                            </p>
                        </div>

                        {/* Buddy avatar SVG container */}
                        <div style={styles.avatarBox}>
                            <svg width="180" height="180" viewBox="0 0 100 100" style={styles.buddySvgMain}>
                                <circle cx="50" cy="55" r="26" fill="#BFDBFE" stroke="#2563EB" strokeWidth="2.5" />
                                <path d="M22 38 L50 24 L78 38 L50 52 Z" fill="#1E3A8A" stroke="#1E40AF" strokeWidth="2" />
                                <rect x="47" y="38" width="6" height="15" fill="#1E3A8A" />
                                <circle cx="50" cy="53" r="3.5" fill="#F59E0B" />
                                <ellipse cx="42" cy="53" rx="2.5" ry="4" fill="#1E3A8A" />
                                <ellipse cx="58" cy="53" rx="2.5" ry="4" fill="#1E3A8A" />
                                <path d="M45 61 Q50 67 55 61" fill="none" stroke="#1E3A8A" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                        </div>
                    </div>
                )}

                {/* Center stage display per phase */}
                <div style={styles.interactiveArea}>
                    {phase === "device_setup" && (
                        <div style={styles.setupContainer}>
                            <div 
                                style={{
                                    ...styles.setupCard,
                                    borderColor: micStatus === "granted" ? "#10B981" : "#E5E7EB"
                                }}
                                onClick={() => requestPermission("mic")}
                            >
                                <span style={styles.setupCardIcon}>🎤</span>
                                <div style={styles.setupCardText}>
                                    <h4 style={styles.setupCardTitle}>Microphone</h4>
                                    <p style={styles.setupCardSub}>Required to speak answers</p>
                                </div>
                                <span style={{
                                    ...styles.setupCardBadge,
                                    backgroundColor: micStatus === "granted" ? "#E6F4EA" : "#F3F4F6",
                                    color: micStatus === "granted" ? "#137333" : "#374151"
                                }}>
                                    {micStatus === "granted" ? "Allowed" : "Allow mic"}
                                </span>
                            </div>

                            <div 
                                style={{
                                    ...styles.setupCard,
                                    borderColor: cameraStatus === "granted" ? "#2563EB" : "#E5E7EB"
                                }}
                                onClick={() => requestPermission("camera")}
                            >
                                <span style={styles.setupCardIcon}>📷</span>
                                <div style={styles.setupCardText}>
                                    <h4 style={styles.setupCardTitle}>Camera</h4>
                                    <p style={styles.setupCardSub}>Optional visual companion</p>
                                </div>
                                <span style={{
                                    ...styles.setupCardBadge,
                                    backgroundColor: cameraStatus === "granted" ? "#EFF6FF" : "#F3F4F6",
                                    color: cameraStatus === "granted" ? "#1E40AF" : "#374151"
                                }}>
                                    {cameraStatus === "granted" ? "Allowed" : "Optional"}
                                </span>
                            </div>
                        </div>
                    )}

                    {phase === "interview" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "680px", margin: "0 auto" }}>
                            {/* Status label: Listening / Speaking / Keyboard */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
                                <span style={{ 
                                    fontSize: "13px", 
                                    fontWeight: "600",
                                    color: isSpeaking ? "#2563EB" : (isRecording ? "#16A34A" : "#6B7280"),
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px"
                                }}>
                                    {isSpeaking && (
                                        <>
                                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#2563EB", display: "inline-block" }} />
                                            🔊 Buddy is speaking...
                                        </>
                                    )}
                                    {!isSpeaking && isRecording && (
                                        <>
                                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#16A34A", display: "inline-block", animation: "pulseDot 1.2s infinite" }} />
                                            🎤 Listening... Speak your answer.
                                        </>
                                    )}
                                    {!isSpeaking && !isRecording && (
                                        <>
                                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#9CA3AF", display: "inline-block" }} />
                                            ⌨️ Keyboard mode (Type or click mic to talk)
                                        </>
                                    )}
                                </span>
                                
                                {activeHint && (
                                    <span style={{ fontSize: "12px", color: "#D97706", fontWeight: "600" }}>
                                        💡 Hint visible
                                    </span>
                                )}
                            </div>

                            {/* Main Input Text Area & Submit Button Row */}
                            <div style={{ display: "flex", gap: "12px" }}>
                                <textarea
                                    style={{
                                        flex: 1,
                                        height: "64px",
                                        border: "1px solid #D1D5DB",
                                        borderRadius: "10px",
                                        padding: "12px 16px",
                                        fontSize: "15px",
                                        fontFamily: isHindi ? "var(--font-hindi), sans-serif" : "Inter, sans-serif",
                                        resize: "none",
                                        outline: "none",
                                        transition: "border-color 0.15s ease",
                                        borderColor: isFocused ? "#2563EB" : "#D1D5DB",
                                        boxShadow: isFocused ? "0 0 0 3px rgba(37, 99, 235, 0.15)" : "none"
                                    }}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    placeholder={isHindi ? "अपना उत्तर यहाँ लिखें या बोलें..." : "Type or speak your answer here..."}
                                    value={typedText}
                                    onChange={(e) => setTypedText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            if (typedText.trim() && !isSpeaking && !isSubmitting) {
                                                handleAnswerSubmit();
                                            }
                                        }
                                    }}
                                    disabled={isSpeaking || isSubmitting}
                                    autoFocus
                                />
                                
                                <button 
                                    style={{
                                        height: "64px",
                                        padding: "0 28px",
                                        backgroundColor: (typedText.trim() && !isSpeaking && !isSubmitting) ? "#2563EB" : "#D1D5DB",
                                        color: "#FFFFFF",
                                        border: "none",
                                        borderRadius: "10px",
                                        fontWeight: "600",
                                        fontSize: "15px",
                                        cursor: (typedText.trim() && !isSpeaking && !isSubmitting) ? "pointer" : "default",
                                        transition: "all 0.15s ease",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                    onClick={() => {
                                        if (typedText.trim() && !isSpeaking && !isSubmitting) {
                                            handleAnswerSubmit();
                                        }
                                    }}
                                    disabled={!typedText.trim() || isSpeaking || isSubmitting}
                                >
                                    Submit
                                </button>
                            </div>

                            {/* Secondary Controls: Mic toggle, Repeat question, Hint toggle */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
                                <div style={{ display: "flex", gap: "10px" }}>
                                    {speechSupported && (
                                        <button
                                            style={{
                                                backgroundColor: "#FFFFFF",
                                                border: "1px solid #E5E7EB",
                                                borderRadius: "10px",
                                                padding: "6px 14px",
                                                fontSize: "13px",
                                                fontWeight: "600",
                                                color: isRecording ? "#EF4444" : "#2563EB",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                height: "36px"
                                            }}
                                            onClick={() => {
                                                if (isRecording) {
                                                    isListeningRef.current = false;
                                                    setIsRecording(false);
                                                    if (recognitionRef.current) {
                                                        recognitionRef.current.onend = null;
                                                        try { recognitionRef.current.stop(); } catch (_) {}
                                                    }
                                                } else {
                                                    setMicEnabled(true);
                                                    startSpeechRecognition();
                                                }
                                            }}
                                            disabled={isSpeaking}
                                        >
                                            {isRecording ? "🔴 Stop Listening" : "🎤 Start Listening"}
                                        </button>
                                    )}

                                    <button
                                        style={{
                                            backgroundColor: "#FFFFFF",
                                            border: "1px solid #E5E7EB",
                                            borderRadius: "10px",
                                            padding: "6px 14px",
                                            fontSize: "13px",
                                            fontWeight: "600",
                                            color: "#374151",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            height: "36px"
                                        }}
                                        onClick={triggerRepeat}
                                        disabled={isSpeaking}
                                    >
                                        🔁 Repeat Question
                                    </button>
                                </div>

                                {questions[currentIdx]?.hint && (
                                    <button
                                        style={{
                                            backgroundColor: "#FEF3C7",
                                            border: "1px solid #FDE68A",
                                            borderRadius: "10px",
                                            padding: "6px 14px",
                                            fontSize: "13px",
                                            fontWeight: "600",
                                            color: "#D97706",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            height: "36px"
                                        }}
                                        onClick={triggerHint}
                                        disabled={isSpeaking}
                                    >
                                        💡 Get Hint
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {phase === "completed" && (
                        <button style={styles.ctaButton} onClick={() => router.push(`/interview/${interviewId}/result`)}>
                            View Results
                        </button>
                    )}
                </div>

                {/* Error Banner Toast */}
                {error && <div style={styles.errorToast}>{error}</div>}
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    appStage: {
        width: "100vw",
        height: "100vh",
        backgroundColor: "#F8FAFC",
        position: "fixed",
        top: 0,
        left: 0,
        fontFamily: "var(--font-sans), system-ui, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden"
    },
    splitGrid: {
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        justifyContent: "center",
        gap: "1.5rem",
        width: "100%",
        maxWidth: "960px",
        boxSizing: "border-box",
        padding: "0 1rem"
    },
    panelCard: {
        flex: 1,
        height: "420px",
        borderRadius: "16px",
        backgroundColor: "#ffffff",
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        padding: "2rem",
        boxSizing: "border-box"
    },
    confettiOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 50,
        pointerEvents: "none"
    },
    offlineBoxCover: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(15,23,42,0.4)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
    },
    offlineInnerCard: {
        backgroundColor: "#ffffff",
        border: "1px solid #E5E7EB",
        borderRadius: "16px",
        padding: "2.5rem",
        textAlign: "center",
        maxWidth: "420px",
        boxShadow: "0 12px 32px rgba(15,23,42,0.14)"
    },
    offlineIcon: {
        fontSize: "3rem",
        display: "block",
        marginBottom: "1rem"
    },
    offlineTitle: {
        fontSize: "1.4rem",
        fontWeight: 700,
        marginBottom: "0.5rem",
        color: "#111827"
    },
    offlineText: {
        fontSize: "0.95rem",
        color: "#6B7280",
        lineHeight: "1.5"
    },
    stageGrid: {
        width: "90%",
        maxWidth: "800px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2.5rem"
    },
    pathOuter: {
        position: "relative",
        width: "100%",
        height: "50px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 10%",
        boxSizing: "border-box",
        marginBottom: "1rem"
    },
    pathLineBg: {
        position: "absolute",
        left: "10%",
        right: "10%",
        height: "4px",
        backgroundColor: "#E5E7EB",
        zIndex: 1,
        borderRadius: "2px"
    },
    pathLineFill: {
        position: "absolute",
        left: "10%",
        height: "4px",
        backgroundColor: "#2563EB",
        zIndex: 2,
        borderRadius: "2px",
        transition: "width 0.6s ease"
    },
    pathNode: {
        position: "absolute",
        zIndex: 3,
        fontSize: "1.5rem",
        transform: "translateY(-50%)",
        top: "50%"
    },
    pathBuddyWalker: {
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 4,
        transition: "left 0.6s ease"
    },
    pathBuddyDot: {
        width: "14px",
        height: "14px",
        backgroundColor: "#2563EB",
        borderRadius: "50%",
        border: "3px solid #ffffff",
        boxShadow: "0 2px 4px rgba(37,99,235,0.4)"
    },
    buddyZone: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
        width: "100%"
    },
    bubbleBox: {
        backgroundColor: "#ffffff",
        border: "1px solid #E5E7EB",
        borderRadius: "14px",
        padding: "1.5rem 2rem",
        position: "relative",
        boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
        width: "100%",
        maxWidth: "600px",
        textAlign: "center"
    },
    bubbleArrow: {
        position: "absolute",
        bottom: "-10px",
        left: "50%",
        transform: "translateX(-50%) rotate(45deg)",
        width: "20px",
        height: "20px",
        backgroundColor: "#ffffff",
        borderRight: "1px solid #E5E7EB",
        borderBottom: "1px solid #E5E7EB",
        zIndex: 1
    },
    speechText: {
        fontSize: "1.2rem",
        fontWeight: 500,
        color: "#111827",
        lineHeight: "1.6",
        margin: 0
    },
    thinkDotRow: {
        display: "flex",
        justifyContent: "center",
        gap: "0.25rem",
        marginTop: "0.75rem"
    },
    thinkDot: {
        width: "6px",
        height: "6px",
        backgroundColor: "#2563EB",
        borderRadius: "50%"
    },
    liveCaptionText: {
        fontSize: "1.05rem",
        fontStyle: "italic",
        color: "#6B7280",
        marginTop: "1rem",
        borderTop: "1px solid #F1F5F9",
        paddingTop: "0.75rem"
    },
    avatarBox: {
        position: "relative",
        width: "180px",
        height: "180px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
    },
    glowRing: {
        position: "absolute",
        width: "160px",
        height: "160px",
        borderRadius: "50%",
        border: "2px solid #2563EB",
        pointerEvents: "none"
    },
    buddySvgMain: {
        zIndex: 5,
        overflow: "visible"
    },
    interactiveArea: {
        width: "100%",
        display: "flex",
        justifyContent: "center"
    },
    ctaButton: {
        padding: "0.9rem 2.5rem",
        backgroundColor: "#2563EB",
        border: "none",
        borderRadius: "10px",
        color: "#ffffff",
        fontSize: "1.1rem",
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: "0 4px 6px -1px rgba(37,99,235,0.2)",
        transition: "background 0.2s"
    },
    setupContainer: {
        display: "flex",
        gap: "1.5rem",
        width: "100%",
        maxWidth: "500px",
        flexDirection: "column"
    },
    setupCard: {
        backgroundColor: "#ffffff",
        border: "1.5px solid #E5E7EB",
        borderRadius: "14px",
        padding: "1.25rem 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "1.25rem",
        cursor: "pointer",
        transition: "all 0.2s ease"
    },
    setupCardIcon: {
        fontSize: "2rem"
    },
    setupCardText: {
        flexGrow: 1
    },
    setupCardTitle: {
        fontSize: "1.1rem",
        fontWeight: 600,
        color: "#111827",
        margin: 0
    },
    setupCardSub: {
        fontSize: "0.85rem",
        color: "#6B7280",
        margin: "0.15rem 0 0 0"
    },
    setupCardBadge: {
        padding: "0.4rem 0.8rem",
        borderRadius: "999px",
        fontSize: "0.8rem",
        fontWeight: 600
    },
    inputConsole: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
        width: "100%"
    },
    videoBox: {
        width: "120px",
        height: "90px",
        borderRadius: "12px",
        overflow: "hidden",
        border: "2px solid #E5E7EB",
        backgroundColor: "#000000",
        boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
    },
    videoStream: {
        width: "100%",
        height: "100%",
        objectFit: "cover"
    },
    hintTriggerBtn: {
        backgroundColor: "#EFF6FF",
        border: "1px dashed #BFDBFE",
        borderRadius: "10px",
        padding: "0.6rem 1.25rem",
        color: "#2563EB",
        fontSize: "0.95rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "background 0.2s"
    },
    actionRow: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1rem",
        width: "100%",
        maxWidth: "360px"
    },
    actionBtnConsole: {
        width: "100%",
        padding: "1rem 2rem",
        border: "none",
        borderRadius: "10px",
        color: "#ffffff",
        fontSize: "1.05rem",
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
        transition: "background 0.2s ease"
    },
    keyboardSwitchBtn: {
        background: "none",
        border: "none",
        color: "#6B7280",
        fontSize: "0.9rem",
        fontWeight: 500,
        cursor: "pointer",
        textDecoration: "underline"
    },
    modalBackdrop: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15,23,42,0.4)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
    },
    modalBox: {
        backgroundColor: "#ffffff",
        border: "1px solid #E5E7EB",
        borderRadius: "16px",
        padding: "1.75rem",
        width: "90%",
        maxWidth: "460px",
        boxShadow: "0 12px 32px rgba(15,23,42,0.14)"
    },
    modalHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "0.75rem",
        color: "#111827"
    },
    modalClose: {
        background: "none",
        border: "none",
        fontSize: "1.1rem",
        color: "#9CA3AF",
        cursor: "pointer"
    },
    modalDesc: {
        fontSize: "0.85rem",
        color: "#6B7280",
        lineHeight: "1.4",
        marginBottom: "1.5rem"
    },
    modalInputRow: {
        display: "flex",
        gap: "0.75rem"
    },
    modalInput: {
        flexGrow: 1,
        border: "1px solid #E5E7EB",
        borderRadius: "10px",
        padding: "0.75rem 1rem",
        fontSize: "0.95rem",
        outline: "none"
    },
    modalSendBtn: {
        backgroundColor: "#2563EB",
        border: "none",
        borderRadius: "10px",
        padding: "0 1.5rem",
        color: "#ffffff",
        fontWeight: 600,
        cursor: "pointer"
    },
    errorToast: {
        position: "fixed",
        top: "24px",
        backgroundColor: "#DC2626",
        color: "#ffffff",
        padding: "0.75rem 1.5rem",
        borderRadius: "10px",
        boxShadow: "0 4px 10px rgba(220,38,38,0.25)",
        zIndex: 1100,
        fontSize: "0.9rem",
        fontWeight: 600
    }
};