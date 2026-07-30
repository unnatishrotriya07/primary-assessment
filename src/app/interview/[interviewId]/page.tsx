"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import interviewService, {
    InterviewQuestion,
    TranscriptEntry,
    AnswerEntry,
} from "@/services/interview.service";
import { isHindiText } from "@/utils/helpers";
import { voiceService, microphoneService } from "@/services/voice";
import { API_BASE_URL } from "@/utils/constants";

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
    const [sessionId, setSessionId] = useState<string | null>(null);

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
    const autoSubmitTimeoutRef = useRef<any>(null);
    const gracePeriodTimeoutRef = useRef<any>(null);
    const isSubmittingRef = useRef(false);
    const socketRef = useRef<WebSocket | null>(null);
    const lastSentResponseRef = useRef("");
    const textRef = useRef("");
    const speechConfidenceRef = useRef<number>(1.0);
    const currentIdxRef = useRef(0);
    const comfortIdxRef = useRef(0);
    const phaseRef = useRef<any>("loading");
    const answersRef = useRef<AnswerEntry[]>([]);
    const transcriptRef = useRef<TranscriptEntry[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const unusedEncouragementsRef = useRef<string[]>([]);
    const silenceNudgeCountRef = useRef(0);

    // Function refs to avoid stale closures in effects and callbacks
    const handleTurnResultRef = useRef<any>(null);
    const startSpeechRecognitionRef = useRef<any>(null);
    const submitTurnLocalRef = useRef<any>(null);
    const triggerRepeatRef = useRef<any>(null);
    const resetSilenceTimersRef = useRef<any>(null);

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

    // Scroll chat to bottom on updates
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [transcript, buddyState]);


    // Track online/offline listeners
    useEffect(() => {
        if (typeof window === "undefined") return;
        const handleOnline = () => {
            setIsOffline(false);
            if ((phase === "interview" || phase === "comfort_conv") && !isSpeakingRef.current && micEnabled) {
                startSpeechRecognition();
            }
        };
        const handleOffline = () => {
            setIsOffline(true);
            voiceService.stopListening();
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

    // Initialize WebSocket connection
    useEffect(() => {
        if (!interviewId) return;

        let wsUrl = "";
        if (API_BASE_URL.startsWith("http")) {
            wsUrl = API_BASE_URL.replace(/^http/, "ws") + `/interviews/ws/${interviewId}`;
        } else {
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const host = window.location.host;
            wsUrl = `${protocol}//${host}/api/interviews/ws/${interviewId}`;
        }

        console.log(`[WebSocket] Connecting to ${wsUrl}`);
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log("[WebSocket] Connected successfully");
        };

        ws.onmessage = (event) => {
            if (socketRef.current !== ws) {
                console.log("[WebSocket] Ignoring message from stale connection");
                return;
            }
            try {
                const result = JSON.parse(event.data);
                console.log("[WebSocket] Received message:", result);
                if (result.error) {
                    console.error("[WebSocket] Error from server:", result.error);
                    if (fallbackToHttpRef.current) fallbackToHttpRef.current();
                    return;
                }
                const responseText = lastSentResponseRef.current;
                const activeState = phaseRef.current;
                const transcriptVal = transcriptRef.current;
                
                if (handleTurnResultRef.current) {
                    handleTurnResultRef.current(result, responseText, activeState, transcriptVal);
                }
                
                isSubmittingRef.current = false;
                setIsSubmitting(false);
            } catch (err) {
                console.error("[WebSocket] Failed to parse message, falling back to HTTP:", err);
                if (fallbackToHttpRef.current) fallbackToHttpRef.current();
            }
        };

        ws.onerror = (err) => {
            console.error("[WebSocket] Connection error:", err);
            if (socketRef.current === ws && isSubmittingRef.current) {
                console.log("[WebSocket] Connection error during submission. Falling back to HTTP");
                if (fallbackToHttpRef.current) fallbackToHttpRef.current();
            }
        };

        ws.onclose = (event) => {
            console.log(`[WebSocket] Connection closed: code=${event.code}, reason=${event.reason}`);
            if (socketRef.current === ws) {
                socketRef.current = null;
                if (isSubmittingRef.current) {
                    console.log("[WebSocket] Connection closed during submission. Falling back to HTTP");
                    if (fallbackToHttpRef.current) fallbackToHttpRef.current();
                }
            }
        };

        socketRef.current = ws;

        return () => {
            console.log("[WebSocket] Cleaning up connection");
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
            if (socketRef.current === ws) {
                socketRef.current = null;
            }
        };
    }, [interviewId]);

    const handleTurnResult = (
        result: any,
        responseText: string,
        activeState: string,
        transcriptVal: TranscriptEntry[]
    ) => {
        // Update states from result
        setBuddyState("speaking");
        silenceNudgeCountRef.current = 0;
        
        const nextState = result.next_state;
        const nextSpeech = result.next_speech;
        
        const speechToUse = nextSpeech;

        const isTransitioningFromComfort = activeState === "comfort_conv" && nextState === "interview";

        if (isTransitioningFromComfort) {
            setComfortIdx(result.comfort_index);
            setCurrentIdx(result.current_question_index);
            setActiveHint(result.active_hint);

            // Add student response + transition message to transcript
            const updatedTranscript = [...transcriptVal];
            if (responseText.trim()) {
                updatedTranscript.push({ role: "student" as const, text: responseText, question_category: activeState });
            }
            updatedTranscript.push({ role: "ai" as const, text: speechToUse, question_category: "comfort_conv" });
            setTranscript(updatedTranscript);

            const qText = questions[result.current_question_index]?.q || null;
            let qTextToSpeak: string | null = qText;
            if (speechToUse && qText) {
                const cleanSpeech = speechToUse.toLowerCase().replace(/[^a-z0-9]/g, "");
                const cleanQ = qText.toLowerCase().replace(/[^a-z0-9]/g, "");
                if (cleanSpeech.includes(cleanQ)) {
                    qTextToSpeak = null;
                }
            }

            // Speak transition speech first while keeping user on welcome screen
            speakText(speechToUse, () => {
                // Transition layout to interview
                setPhase("interview");

                if (qTextToSpeak) {
                    setTimeout(() => {
                        speakText(qTextToSpeak, () => {
                            if (startSpeechRecognitionRef.current) {
                                startSpeechRecognitionRef.current();
                            }
                        });
                    }, 400);
                } else {
                    if (startSpeechRecognitionRef.current) {
                        startSpeechRecognitionRef.current();
                    }
                }
            });
        } else {
            // Normal turn execution flow (for comfort questions, and for subsequent interview turns)
            const updatedTranscript = [...transcriptVal];
            if (responseText.trim()) {
                updatedTranscript.push({ role: "student" as const, text: responseText, question_category: activeState });
            }
            updatedTranscript.push({ role: "ai" as const, text: speechToUse, question_category: nextState });

            setTranscript(updatedTranscript);
            setPhase(nextState === "GOODBYE" ? "completed" : (nextState === "comfort_conv" || nextState === "meet_buddy" ? "comfort_conv" : "interview"));
            setCurrentIdx(result.current_question_index);
            setComfortIdx(result.comfort_index);
            setActiveHint(result.active_hint);

            if (result.completion_status === "Completed" || nextState === "GOODBYE") {
                setPhase("completed");
                setBuddyState("completed");
                triggerConfetti();
                
                speakText(speechToUse);
                if (stream) {
                    stream.getTracks().forEach((t) => t.stop());
                }
                
                setTimeout(async () => {
                    try {
                        const finalReport = await interviewService.getReport(parseInt(interviewId, 10));
                        sessionStorage.setItem(`interview_report_${finalReport.id}`, JSON.stringify(finalReport));
                    } catch (err) {
                        console.error("Failed to load completed report:", err);
                    }
                }, 2000);
            } else {
                // Check if we should speak the question text (next state is interview, and either we advanced to a new question or it's a repeat)
                let qTextToSpeak: string | null = null;
                if (nextState === "interview") {
                    const isNewQuestion = result.current_question_index !== currentIdx || isTransitioningFromComfort;
                    const isRepeat = result.action === "repeat" || result.next_speech?.toLowerCase().includes("repeat") || result.next_speech?.toLowerCase().includes("sure, let me");
                    if (isNewQuestion || isRepeat) {
                        const qText = questions[result.current_question_index]?.q || "";
                        // If the next_speech already contains the question text, we don't need to append it again.
                        const cleanSpeech = result.next_speech?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
                        const cleanQ = qText.toLowerCase().replace(/[^a-z0-9]/g, "");
                        if (!cleanSpeech.includes(cleanQ)) {
                            qTextToSpeak = qText;
                        }
                    }
                }

                speakChainedText(speechToUse, qTextToSpeak, () => {
                    if (startSpeechRecognitionRef.current) {
                        startSpeechRecognitionRef.current();
                    }
                });
            }
        }
    };

    const sessionIdRef = useRef<string | null>(null);
    useEffect(() => {
        sessionIdRef.current = sessionId;
    }, [sessionId]);

    const fallbackToHttpRef = useRef<() => Promise<void>>(async () => {});
    fallbackToHttpRef.current = async () => {
        try {
            const responseText = lastSentResponseRef.current;
            const activeState = phaseRef.current;
            const transcriptVal = transcriptRef.current;
            const currentSessionId = sessionIdRef.current || sessionId || interviewId;

            console.log("[WebSocket Fallback] Executing turn via HTTP");
            const result = await interviewService.executeTurn(currentSessionId, {
                student_response: responseText,
                network_status: navigator.onLine ? "online" : "offline"
            });
            if (handleTurnResultRef.current) {
                handleTurnResultRef.current(result, responseText, activeState, transcriptVal);
            }
        } catch (httpErr) {
            console.error("[WebSocket Fallback] HTTP fallback also failed:", httpErr);
            setError("Connection lost. Please check your internet connection.");
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };


    // Text to Speech
    const speakText = useCallback((text: string, onEnd?: () => void) => {
        isListeningRef.current = false;
        isSpeakingRef.current = true;
        setBuddyState("speaking");
        setIsSpeaking(true);
        setIsRecording(false);

        voiceService.speak(text, {
            onStart: () => {},
            onEnd: () => {
                setIsSpeaking(false);
                isSpeakingRef.current = false;
                setBuddyState("silent");
                setTimeout(() => {
                    if (!isSpeakingRef.current) {
                        onEnd?.();
                    }
                }, 300);
            },
            onError: (err) => {
                console.error("Speak error:", err);
                setIsSpeaking(false);
                isSpeakingRef.current = false;
                setBuddyState("silent");
                onEnd?.();
            }
        });
    }, []);

    const speakChainedText = useCallback((firstPart: string, secondPart: string | null, onFinish?: () => void) => {
        speakText(firstPart, () => {
            if (secondPart) {
                setTimeout(() => {
                    speakText(secondPart, onFinish);
                }, 400);
            } else {
                onFinish?.();
            }
        });
    }, [speakText]);

    // Load session data & recover progress if any
    useEffect(() => {
        let isMounted = true;

        async function initSession() {
            setPhase("loading");
            try {
                const selectedLang = sessionStorage.getItem("selected_language") || "en-IN";
                await voiceService.initialize({
                    mode: "auto",
                    sttProvider: "browser",
                    ttsProvider: "browser",
                    language: selectedLang
                });
                const isSpeechEnabled = voiceService.isSpeechSupported();
                setSpeechSupported(isSpeechEnabled);
            } catch (err) {
                console.error("Failed to initialize VoiceService:", err);
                setSpeechSupported(false);
            }
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
                    if (data.session_id) {
                        setSessionId(data.session_id);
                    }
                } catch (_) {}
            }

            try {
                const dbSession = await interviewService.getReport(parseInt(interviewId, 10));
                if (!isMounted) return;

                if (dbSession.session_id) {
                    setSessionId(dbSession.session_id);
                }

                sName = dbSession.student_name || sName;
                setStudentName(sName);
                setSubjectName(dbSession.assessment_title || subName);
                
                if (questionsList.length === 0 && dbSession.questions && dbSession.questions.length > 0) {
                    questionsList = dbSession.questions;
                }
                setQuestions(questionsList);

                if (dbSession.status === "In Progress" || dbSession.status === "Transcript Saved") {
                    let mappedTranscript: TranscriptEntry[] = [];
                    if (dbSession.transcript && dbSession.transcript.length > 0) {
                        mappedTranscript = dbSession.transcript;
                        setTranscript(mappedTranscript);
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

                    if (dbSession.transcript && dbSession.transcript.length > 0) {
                        setPhase(savedState === "GOODBYE" ? "completed" : (savedState === "comfort_conv" || savedState === "meet_buddy" ? "comfort_conv" : "interview"));
                        setBuddyState(savedState === "GOODBYE" ? "completed" : "speaking");

                        // Auto-initialize camera and microphone streams on recovery
                        try {
                            const audioStream = await microphoneService.startStream();
                            setMicStatus("granted");
                            setMicEnabled(true);
                            const analyser = microphoneService.getAnalyser();
                            analyserRef.current = analyser;

                            let activeStream = audioStream;
                            try {
                                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                                setCameraStatus("granted");
                                setCameraEnabled(true);
                                audioStream.addTrack(videoStream.getVideoTracks()[0]);
                                activeStream = new MediaStream(audioStream.getTracks());
                            } catch (camErr) {
                                console.warn("Camera auto-grant failed on recovery:", camErr);
                            }
                            setStream(activeStream);
                        } catch (micErr) {
                            console.error("Microphone auto-grant failed on recovery:", micErr);
                            setError("Microphone access is required to continue. Please enable it in your browser.");
                        }

                        // Customize welcome back greeting instead of repeating the last transcript AI message
                        const resumeText = `Welcome back, ${sName}! Let's resume your assessment where we left off.`;

                        // If the recovered state is interview, we must also read the question text!
                        let qTextToSpeak: string | null = null;
                        if (savedState === "interview") {
                            qTextToSpeak = questionsList[savedIdx]?.q || null;
                        }

                        speakChainedText(resumeText, qTextToSpeak, () => {
                            if (dbSession.completion_status !== "Completed" && savedState !== "GOODBYE") {
                                if (startSpeechRecognitionRef.current) {
                                    startSpeechRecognitionRef.current();
                                }
                            }
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
            voiceService.cancelAll();
            microphoneService.stopStream();
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    const clearSilenceTimers = () => {
        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
        }
        if (repeatTimeoutRef.current) {
            clearTimeout(repeatTimeoutRef.current);
            repeatTimeoutRef.current = null;
        }
        if (autoSubmitTimeoutRef.current) {
            clearTimeout(autoSubmitTimeoutRef.current);
            autoSubmitTimeoutRef.current = null;
        }
        if (gracePeriodTimeoutRef.current) {
            clearTimeout(gracePeriodTimeoutRef.current);
            gracePeriodTimeoutRef.current = null;
        }
    };

    // speakText moved up

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
            repeatText = `How are you today, ${studentName}?`;
        } else if (phase === "interview") {
            repeatText = questions[currentIdx]?.q || "";
        }

        if (repeatText) {
            speakText(repeatText, () => {
                if (startSpeechRecognitionRef.current) {
                    startSpeechRecognitionRef.current();
                }
            });
        } else {
            if (startSpeechRecognitionRef.current) {
                startSpeechRecognitionRef.current();
            }
        }
    }

    // Start Speech recognition
    function startSpeechRecognition() {
        if (isSpeakingRef.current || isSubmittingRef.current || !micEnabled || !navigator.onLine) return;

        isListeningRef.current = true;
        textRef.current = ""; // Clear text ref to start fresh

        voiceService.startListening({
            onStart: () => {
                setIsRecording(true);
                setBuddyState("listening");
                setLiveCaption("Listening...");
                if (resetSilenceTimersRef.current) resetSilenceTimersRef.current();
            },
            onResult: (currentSpeech, isFinal, confidence) => {
                if (!isListeningRef.current || isSpeakingRef.current) {
                    return;
                }

                // Instantly clear grace period countdown if child starts talking again
                if (gracePeriodTimeoutRef.current) {
                    clearTimeout(gracePeriodTimeoutRef.current);
                    gracePeriodTimeoutRef.current = null;
                }

                speechConfidenceRef.current = confidence ?? 1.0;
                setLiveCaption(currentSpeech);
                setTypedText(currentSpeech);
                textRef.current = currentSpeech; // Sync directly and synchronously

                const lowerSpeech = currentSpeech.toLowerCase().trim();
                const keywords = [
                    "repeat the question",
                    "can you say it again",
                    "dobara bolna",
                    "dobara bolie",
                    "say it again",
                    "please repeat",
                    "can you repeat",
                    "repeat please",
                    "could you repeat",
                    "what did you say"
                ];
                const matchesCommand = keywords.some(kw => lowerSpeech.includes(kw));

                if (matchesCommand) {
                    clearSilenceTimers();
                    isListeningRef.current = false;
                    voiceService.stopListening();
                    setIsRecording(false);
                    if (triggerRepeatRef.current) triggerRepeatRef.current();
                    return;
                }

                if (currentSpeech.length > 0) {
                    setError(null);
                    if (resetSilenceTimersRef.current) resetSilenceTimersRef.current(currentSpeech);
                }
            },
            onSpeechEnd: () => {
                const text = textRef.current.trim();
                if (!text) {
                    console.log("[Silence Detection] Speech ended but no text transcribed. Ignoring auto-submit.");
                    return;
                }
                console.log("[Silence Detection] Speech ended. Auto-submitting response:", text);
                const activeState = phaseRef.current;
                if (isListeningRef.current && navigator.onLine && (activeState === "interview" || activeState === "comfort_conv")) {
                    setSilenceRetryCount(0);
                    if (submitTurnLocalRef.current) submitTurnLocalRef.current(text);
                }
            },
            onError: (err) => {
                console.error("Speech recognition error:", err);
            },
            onEnd: () => {
                setIsRecording(false);
                if (isListeningRef.current) {
                    setBuddyState("silent");
                    const isSessionActive = phaseRef.current === "interview" || phaseRef.current === "comfort_conv";
                    if (micEnabled && !isSpeakingRef.current && !isSubmittingRef.current && navigator.onLine && isSessionActive) {
                        setTimeout(() => {
                            const stillActive = phaseRef.current === "interview" || phaseRef.current === "comfort_conv";
                            if (isListeningRef.current && micEnabled && !isSpeakingRef.current && !isSubmittingRef.current && navigator.onLine && stillActive) {
                                if (startSpeechRecognitionRef.current) startSpeechRecognitionRef.current();
                            }
                        }, 400);
                    }
                }
            }
        }, {
            interviewId: parseInt(interviewId as string, 10),
            questionIndex: currentIdxRef.current
        });
    }

    // Silence timers logic
    const resetSilenceTimers = (latestSpeech: string = "") => {
        clearSilenceTimers();
        if (phaseRef.current !== "interview" && phaseRef.current !== "comfort_conv") return;

        const speechToUse = latestSpeech || textRef.current;

        if (speechToUse.trim().length > 0) {
            silenceNudgeCountRef.current = 0;
            return;
        }

        // 8-Second Nudge: if no speech is heard for 8 consecutive seconds
        silenceTimeoutRef.current = setTimeout(() => {
            if (speechToUse.length === 0 && isListeningRef.current && navigator.onLine) {
                const currentNudges = silenceNudgeCountRef.current;
                if (currentNudges < 2) {
                    const nudgeText = phaseRef.current === "comfort_conv"
                        ? "Go ahead, I'm listening!"
                        : "Take your time, tell me whatever you remember!";
                    
                    silenceNudgeCountRef.current = currentNudges + 1;
                    
                    speakText(nudgeText, () => {
                        if (startSpeechRecognitionRef.current) {
                            startSpeechRecognitionRef.current();
                        }
                    });
                } else {
                    // Third timeout (2 nudges already spoken)
                    const skipPromptText = "No worries, let's go to the next question!";
                    silenceNudgeCountRef.current = 0;
                    
                    speakText(skipPromptText, () => {
                        if (submitTurnLocalRef.current) {
                            submitTurnLocalRef.current("skip");
                        }
                    });
                }
            }
        }, 8000);
    };

    // Execute local turn
    const submitTurnLocal = async (responseText: string) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setIsSubmitting(true);

        try {
            clearSilenceTimers();
            setTypedText("");
            setLiveCaption("");
            setActiveHint(null);
            textRef.current = ""; // Clear speech text ref synchronously

            isListeningRef.current = false;
            voiceService.stopListening();

            setBuddyState("thinking");

            const activeState = phaseRef.current;
            const transcriptVal = transcriptRef.current;

            lastSentResponseRef.current = responseText;

            // Try sending over WebSocket first
            const ws = socketRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) {
                console.log("[WebSocket] Submitting turn via WS");
                try {
                    ws.send(JSON.stringify({
                        student_response: responseText
                    }));
                } catch (sendErr) {
                    console.error("[WebSocket] ws.send failed, falling back to HTTP:", sendErr);
                    if (fallbackToHttpRef.current) fallbackToHttpRef.current();
                }
                // Note: isSubmittingRef.current and isSubmitting are set to false in ws.onmessage
            } else {
                console.log("[WebSocket] WebSocket not open. Falling back to HTTP");
                const result = await interviewService.executeTurn(sessionId || interviewId, {
                    student_response: responseText,
                    network_status: navigator.onLine ? "online" : "offline"
                });
                if (handleTurnResultRef.current) {
                    handleTurnResultRef.current(result, responseText, activeState, transcriptVal);
                }
                isSubmittingRef.current = false;
                setIsSubmitting(false);
            }

        } catch (err) {
            console.error("[InterviewPage] Exception in submitTurnLocal:", err);
            setError("An unexpected error occurred. Retrying automatically...");
            
            setTimeout(() => {
                isSubmittingRef.current = false;
                setIsSubmitting(false);
                if (submitTurnLocalRef.current) {
                    submitTurnLocalRef.current(responseText);
                }
            }, 3000);
        }
    };

    function handleComfortSubmit() {
        const responseText = typedText.trim() || "(silent)";
        if (submitTurnLocalRef.current) {
            submitTurnLocalRef.current(responseText);
        }
    }

    function handleNextQuestionClick() {
        const text = textRef.current.trim();
        setSilenceRetryCount(0);
        if (submitTurnLocalRef.current) {
            submitTurnLocalRef.current(text || "(No spoken response)");
        }
    }

    // Request permissions
    const requestPermission = async (type: "mic" | "camera") => {
        if (type === "mic") {
            try {
                setMicStatus("idle");
                const audioStream = await microphoneService.startStream();
                setMicStatus("granted");
                setMicEnabled(true);
                
                if (stream) {
                    stream.addTrack(audioStream.getAudioTracks()[0]);
                    setStream(new MediaStream(stream.getTracks()));
                } else {
                    setStream(audioStream);
                }

                // Expose AnalyserNode for local visualizer drawing loop
                const analyser = microphoneService.getAnalyser();
                analyserRef.current = analyser;
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
                    setStream(new MediaStream(stream.getTracks()));
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
                setError("Camera is required. Please check your browser bar.");
            }
        }
    };

    // Start assessment after permissions granted
    const startAssessment = async () => {
        if (questions.length === 0) {
            setError("Session data is empty. Please verify your invitation link.");
            return;
        }

        if (micStatus !== "granted" || cameraStatus !== "granted") {
            setError("Both microphone and camera must be allowed to start.");
            return;
        }

        // Expose AnalyserNode for local visualizer drawing loop
        setTimeout(() => {
            drawWaveform();
        }, 200);

        setPhase("comfort_conv");
        setBuddyState("thinking");

        // Reset the session state on the backend to guarantee we start from the greeting
        try {
            await interviewService.updateSession(parseInt(interviewId, 10), {
                session_state: "meet_buddy",
                comfort_index: 0,
                current_question_index: 0,
                raw_answers: [] as AnswerEntry[],
                network_status: navigator.onLine ? "online" : "offline",
                completion_status: "In Progress"
            });
        } catch (resetErr) {
            console.error("Failed to reset session state on backend:", resetErr);
        }

        // Submit first turn with empty response to get greeting from backend LLM
        try {
            if (submitTurnLocalRef.current) {
                await submitTurnLocalRef.current("");
            }
        } catch (err) {
            console.error("Failed to start assessment:", err);
            setError("Failed to start the assessment. Please try again.");
            setPhase("device_setup");
        }
    };

    // Submit individual question answers
    function handleAnswerSubmit() {
        const text = textRef.current.trim();
        if (!text) {
            const nextRetry = silenceRetryCount + 1;
            setSilenceRetryCount(nextRetry);

            if (nextRetry >= 3) {
                setSilenceRetryCount(0);
                speakText("I'm having a bit of trouble hearing you. Let's try typing the answer instead!", () => {
                    setShowKeyboardInput(true);
                });
            } else {
                speakText("Oops. I couldn't hear you clearly. Can you try once more?", () => {
                    if (startSpeechRecognitionRef.current) {
                        startSpeechRecognitionRef.current();
                    }
                });
            }
            return;
        }

        setSilenceRetryCount(0);
        if (submitTurnLocalRef.current) {
            submitTurnLocalRef.current(text);
        }
    }

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
            if (startSpeechRecognitionRef.current) {
                startSpeechRecognitionRef.current();
            }
        });
    };

    // Return to main app dashboard
    const handleReturnHome = () => {
        router.push("/");
    };

    // Render Buddy Avatar with dynamic active animations
    const renderBuddyAvatar = (size: number = 150) => (
        <div style={styles.avatarBox}>
            {isSpeaking && (
                <div style={{ ...styles.glowRing, animation: "scaleGlow 1.8s infinite" }} />
            )}
            {isRecording && (
                <div style={{ ...styles.glowRing, animation: "scaleGlow 1.4s infinite", borderColor: "#10B981" }} />
            )}

            <svg width={size} height={size} viewBox="0 0 100 100" style={styles.buddySvgMain}>
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
    );

    // Render speech bubbles
    const getBuddySpeechText = () => {
        if (phase === "device_setup") {
            return "Please allow your microphone and camera to start the assessment. Both must be enabled.";
        }
        if (phase === "generating") {
            return "Thinking... saving our conversation...";
        }

        // Prioritize dynamic AI messages in the transcript
        const aiMsgs = transcript.filter(t => t.role === "ai");
        if (aiMsgs.length > 0) {
            return aiMsgs[aiMsgs.length - 1].text;
        }

        if (phase === "meet_buddy") {
            return `Hi ${studentName}! I'm Buddy 😊 Today we'll chat together about something you recently learned. Don't worry. There are no marks or difficult exams. Just answer naturally. I'm excited to meet you!`;
        }
        if (phase === "interview") {
            if (activeHint) return activeHint;
            return questions[currentIdx]?.q || "Let's begin!";
        }
        return "";
    };

    // Render Visual Progress growing path (Step 9)
    const renderVisualProgress = () => {
        if (phase !== "interview" || questions.length === 0) return null;
        const pct = (currentIdx / (questions.length - 1)) * 100;
        
        return (
            <div className="interview-progress-path" style={styles.pathOuter}>
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

    const renderTopBar = () => {
        if (phase !== "interview" && phase !== "comfort_conv" && phase !== "device_setup") return null;
        const displayTitle = subjectName && chapterTitle && subjectName !== chapterTitle
            ? `${subjectName} - ${chapterTitle}`
            : (chapterTitle || subjectName || "Assessment");
        return (
            <div className="interview-top-bar" style={styles.assessmentTopBar}>
                <div style={styles.topBarTitle}>
                    📚 {displayTitle}
                </div>
                <button onClick={handleReturnHome} style={styles.topBarLeaveBtn}>
                    🚪 Leave Interview
                </button>
            </div>
        );
    };

    const renderTopQuestionText = () => {
        if (phase !== "interview" || questions.length === 0) return null;
        const currentNum = currentIdx + 1;
        const totalNum = questions.length;
        
        return (
            <div className="interview-question-container" style={styles.topQuestionTextContainer}>
                <div style={styles.questionNumberText}>
                    Question {currentNum} of {totalNum} {chapterTitle ? ` • ${chapterTitle}` : ""}
                </div>
                <h2 style={styles.topQuestionTitle} className={isHindi ? "font-hindi" : ""}>
                    {questions[currentIdx]?.q || ""}
                </h2>
            </div>
        );
    };

    // Keep function refs up to date on every render
    handleTurnResultRef.current = handleTurnResult;
    startSpeechRecognitionRef.current = startSpeechRecognition;
    submitTurnLocalRef.current = submitTurnLocal;
    triggerRepeatRef.current = triggerRepeat;
    resetSilenceTimersRef.current = resetSilenceTimers;

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

            {/* Scroll wrapper to prevent flexbox top-cutoff and allow scrolling */}
            <div style={styles.scrollWrapper}>
                {/* Main Stage Grid Container */}
                <div style={styles.stageGrid}>
                {/* Top header navigation bar */}
                {renderTopBar()}

                {/* Visual Progress Bar (Step 9) */}
                {renderVisualProgress()}

                {/* Question title and indicator displayed prominently at the top */}
                {renderTopQuestionText()}

                {/* Buddy & Speech bubble Section or Split Layout depending on phase */}
                {phase === "interview" ? (
                    <div className="interview-split-grid" style={styles.splitGrid}>
                        {/* Left Panel: Bot */}
                        <div className="interview-left-card interview-panel-card" style={styles.panelCard}>
                            {/* Speech bubble removed to avoid double display; teacher-generated question is at the top */}
                            {renderBuddyAvatar(180)}
                        </div>

                        {/* Right Panel: Student camera / Waveform */}
                        <div className="interview-right-card interview-panel-card" style={styles.panelCard}>
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
                    phase !== "device_setup" ? (
                        <div className="interview-buddy-zone" style={styles.buddyZone}>
                            {/* Speech bubble - hide in comfort_conv */}
                            {phase !== "comfort_conv" && (
                                <div className="interview-bubble-box" style={styles.bubbleBox}>
                                    <div style={styles.bubbleArrow} />
                                    <p style={styles.speechText}>
                                        {getBuddySpeechText()}
                                    </p>
                                </div>
                            )}

                            {/* Buddy avatar SVG container */}
                            {renderBuddyAvatar(180)}
                        </div>
                    ) : null
                )}

                {/* Bottom subtitle/live caption capsule for interview */}
                {phase === "interview" && (
                    <div className="interview-status-container" style={styles.bottomStatusContainer}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "8px 16px",
                            backgroundColor: isSpeaking ? "#EFF6FF" : (isRecording ? "#E6F4EA" : "#F3F4F6"),
                            border: `1px solid ${isSpeaking ? "#BFDBFE" : (isRecording ? "#A7F3D0" : "#E5E7EB")}`,
                            borderRadius: "999px",
                            fontSize: "13.5px",
                            fontWeight: 600,
                            color: isSpeaking ? "#2563EB" : (isRecording ? "#047857" : "#4B5563"),
                            gap: "8px"
                        }}>
                            {isSpeaking && (
                                <>
                                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#2563EB", display: "inline-block", animation: "pulseDot 1.2s infinite" }} />
                                    🔊 Buddy is speaking...
                                </>
                            )}
                            {!isSpeaking && isRecording && (
                                <>
                                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10B981", display: "inline-block", animation: "pulseDot 1.2s infinite" }} />
                                    🎤 Listening... Speak your answer.
                                </>
                            )}
                            {!isSpeaking && !isRecording && (
                                <>
                                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#9CA3AF", display: "inline-block" }} />
                                    ⏳ Processing...
                                </>
                            )}
                        </div>

                        {liveCaption && isRecording && (
                            <div style={styles.liveSubtitlePill}>
                                &ldquo;{liveCaption}&rdquo;
                            </div>
                        )}
                    </div>
                )}

                {/* Center stage display per phase */}
                <div style={styles.interactiveArea}>
                    {phase === "device_setup" && (
                        <div style={styles.setupContainer}>
                            <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
                                <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#111827", marginBottom: "0.4rem" }}>
                                    Set Up Your Devices
                                </h2>
                                <p style={{ fontSize: "0.9rem", color: "#6B7280", margin: 0, lineHeight: 1.4 }}>
                                    Please click below to allow camera and microphone access.
                                </p>
                            </div>
                            {!speechSupported && (
                                <div style={{
                                    backgroundColor: "#FEF2F2",
                                    border: "1.5px solid #FCA5A5",
                                    borderRadius: "14px",
                                    padding: "1rem",
                                    marginBottom: "1rem",
                                    color: "#991B1B",
                                    fontSize: "14px",
                                    lineHeight: "1.5",
                                    textAlign: "center"
                                }}>
                                    <strong style={{ display: "block", marginBottom: "4px" }}>Browser Speech Recognition Unsupported</strong>
                                    Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.
                                </div>
                            )}
                            {cameraEnabled && (
                                <div style={{
                                    width: "100%",
                                    height: "200px",
                                    borderRadius: "14px",
                                    overflow: "hidden",
                                    border: "1.5px solid #E5E7EB",
                                    backgroundColor: "#000000",
                                    position: "relative",
                                    marginBottom: "0.5rem"
                                }}>
                                    <video 
                                        ref={videoRef} 
                                        autoPlay 
                                        playsInline 
                                        muted 
                                        style={{ 
                                            width: "100%", 
                                            height: "100%", 
                                            objectFit: "cover" 
                                        }} 
                                    />
                                    <div style={{
                                        position: "absolute",
                                        bottom: "0.75rem",
                                        left: "0.75rem",
                                        backgroundColor: "rgba(17, 24, 39, 0.7)",
                                        padding: "0.25rem 0.6rem",
                                        borderRadius: "6px",
                                        fontSize: "0.75rem",
                                        fontWeight: 500,
                                        color: "#ffffff",
                                    }}>
                                        Camera Preview
                                    </div>
                                </div>
                            )}

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
                                    borderColor: cameraStatus === "granted" ? "#10B981" : "#E5E7EB"
                                }}
                                onClick={() => requestPermission("camera")}
                            >
                                <span style={styles.setupCardIcon}>📷</span>
                                <div style={styles.setupCardText}>
                                    <h4 style={styles.setupCardTitle}>Camera</h4>
                                    <p style={styles.setupCardSub}>Required for the assessment</p>
                                </div>
                                <span style={{
                                    ...styles.setupCardBadge,
                                    backgroundColor: cameraStatus === "granted" ? "#E6F4EA" : "#F3F4F6",
                                    color: cameraStatus === "granted" ? "#137333" : "#374151"
                                }}>
                                    {cameraStatus === "granted" ? "Allowed" : "Allow camera"}
                                </span>
                            </div>
                            {micStatus === "granted" && cameraStatus === "granted" && (
                                <button 
                                    onClick={startAssessment}
                                    style={{
                                        width: "100%",
                                        marginTop: "1.5rem",
                                        backgroundColor: "#2563EB",
                                        color: "#FFFFFF",
                                        borderRadius: "10px",
                                        height: "44px",
                                        fontSize: "15px",
                                        fontWeight: "600",
                                        border: "none",
                                        cursor: "pointer",
                                        boxShadow: "0 2px 4px rgba(37, 99, 235, 0.15)",
                                        transition: "all 0.15s ease"
                                    }}
                                >
                                    Begin
                                </button>
                            )}
                        </div>
                    )}

                    {/* Interactive controls removed for interview phase to focus on natural verbal dialogue */}

                    {phase === "completed" && (
                        <button style={styles.ctaButton} onClick={() => router.push(`/interview/${interviewId}/result`)}>
                            View Results
                        </button>
                    )}
                </div>

            </div>
        </div>
        {/* Error Banner Toast */}
        {error && <div style={styles.errorToast}>{error}</div>}
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
        overflowY: "auto"
    },
    scrollWrapper: {
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 0",
        boxSizing: "border-box"
    },
    splitGrid: {
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        justifyContent: "center",
        gap: "1.5rem",
        width: "100%",
        maxWidth: "1200px",
        boxSizing: "border-box",
        padding: "0 1rem"
    },
    panelCard: {
        flex: 1,
        height: "380px",
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
    rightPanelCard: {
        flex: 1,
        height: "420px",
        borderRadius: "16px",
        backgroundColor: "#ffffff",
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box"
    },
    cameraPreviewContainer: {
        position: "absolute",
        top: "12px",
        right: "12px",
        width: "130px",
        height: "90px",
        borderRadius: "10px",
        overflow: "hidden",
        border: "2px solid #ffffff",
        boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
        backgroundColor: "#000000",
        zIndex: 10
    },
    smallCameraVideo: {
        width: "100%",
        height: "100%",
        objectFit: "cover"
    },
    smallCameraFallback: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.8rem",
        fontWeight: 700,
        color: "#2563EB",
        backgroundColor: "#EFF6FF"
    },
    smallCameraLabel: {
        position: "absolute",
        bottom: "4px",
        left: "4px",
        backgroundColor: "rgba(17, 24, 39, 0.6)",
        padding: "2px 6px",
        borderRadius: "4px",
        fontSize: "0.65rem",
        fontWeight: 600,
        color: "#ffffff",
        whiteSpace: "nowrap"
    },
    smallCameraVisualizer: {
        position: "absolute",
        bottom: "4px",
        right: "4px",
        width: "40px",
        height: "12px",
        pointerEvents: "none"
    },
    chatConversationArea: {
        flex: 1,
        overflowY: "auto",
        padding: "16px",
        boxSizing: "border-box"
    },
    chatScrollContainer: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minHeight: "100%",
        paddingRight: "145px"
    },
    assessmentTopBar: {
        width: "100%",
        maxWidth: "1200px",
        height: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1rem",
        borderBottom: "1px solid #E5E7EB",
        boxSizing: "border-box",
        marginBottom: "1rem"
    },
    topBarTitle: {
        fontSize: "1.1rem",
        fontWeight: 700,
        color: "#111827",
        display: "flex",
        alignItems: "center",
        gap: "6px"
    },
    topBarLeaveBtn: {
        backgroundColor: "#FFFFFF",
        border: "1px solid #D1D5DB",
        borderRadius: "8px",
        padding: "6px 12px",
        fontSize: "13.5px",
        fontWeight: "600",
        color: "#DC2626",
        cursor: "pointer",
        transition: "all 0.15s ease",
        display: "flex",
        alignItems: "center",
        gap: "6px"
    },
    topQuestionTextContainer: {
        width: "100%",
        maxWidth: "1200px",
        padding: "0 1rem",
        boxSizing: "border-box",
        marginBottom: "1.5rem",
        textAlign: "center"
    },
    questionNumberText: {
        fontSize: "0.9rem",
        fontWeight: 600,
        color: "#6B7280",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: "4px"
    },
    topQuestionTitle: {
        fontSize: "1.3rem",
        fontWeight: 600,
        color: "#111827",
        lineHeight: "1.45",
        margin: 0
    },
    bottomStatusContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        marginTop: "1.5rem"
    },
    liveSubtitlePill: {
        marginTop: "12px",
        backgroundColor: "rgba(17, 24, 39, 0.85)",
        color: "#ffffff",
        padding: "8px 16px",
        borderRadius: "20px",
        fontSize: "14px",
        fontWeight: 500,
        textAlign: "center",
        maxWidth: "600px",
        lineHeight: "1.4",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)"
    },
    confettiOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 50,
        pointerEvents: "none"
    },
    offlineBoxCover: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
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
        width: "100%",
        maxWidth: "1200px",
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