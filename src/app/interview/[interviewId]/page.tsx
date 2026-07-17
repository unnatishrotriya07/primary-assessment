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
    const textRef = useRef("");
    const speechConfidenceRef = useRef<number>(1.0);
    const currentIdxRef = useRef(0);
    const comfortIdxRef = useRef(0);
    const phaseRef = useRef<any>("loading");
    const answersRef = useRef<AnswerEntry[]>([]);
    const transcriptRef = useRef<TranscriptEntry[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const unusedEncouragementsRef = useRef<string[]>([]);

    const fastForwardComfortPhase = async (startIdx: number) => {
        try {
            let currentCIdx = startIdx;
            let lastResult: any = null;
            
            while (currentCIdx < 3) {
                const respText = currentCIdx === 0 ? "" : "yes";
                const result = await interviewService.executeTurn(sessionId || interviewId, {
                    student_response: respText,
                    network_status: navigator.onLine ? "online" : "offline"
                });
                
                lastResult = result;
                currentCIdx = result.comfort_index;
            }
            
            if (currentCIdx === 3) {
                const result = await interviewService.executeTurn(sessionId || interviewId, {
                    student_response: "yes",
                    network_status: navigator.onLine ? "online" : "offline"
                });
                lastResult = result;
            }
            
            return lastResult;
        } catch (err) {
            console.error("Fast forward failed:", err);
            throw err;
        }
    };

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

    // Auto-request mic and camera permissions in device_setup phase
    useEffect(() => {
        if (phase === "device_setup") {
            const requestPermissionsAutomatically = async () => {
                try {
                    await requestPermission("mic");
                } catch (err) {
                    console.error("Auto mic request failed:", err);
                }
                try {
                    await requestPermission("camera");
                } catch (err) {
                    console.error("Auto camera request failed:", err);
                }
            };
            requestPermissionsAutomatically();
        }
    }, [phase]);

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
                        let comfortCount = 0;
                        const finalChapterName = chTitle || dbSession.assessment_title || subName || "Fractions";
                        mappedTranscript = dbSession.transcript.map(t => {
                            if (t.role === "ai" && (t.question_category === "comfort_conv" || t.question_category === "meet_buddy")) {
                                comfortCount++;
                                if (comfortCount === 1) return { ...t, text: "Hello! I'm Buddy. Can you tell me how you're feeling today?" };
                                if (comfortCount === 2) return { ...t, text: "What's something you enjoyed doing today?" };
                                if (comfortCount === 3) return { ...t, text: "Great! We'll be learning about " + finalChapterName + " today. Are you ready to begin?" };
                            }
                            return t;
                        });
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
                        if (savedState === "comfort_conv" || savedState === "meet_buddy") {
                            setPhase("comfort_conv");
                            setBuddyState("speaking");
                            const finalChapterName = chTitle || dbSession.assessment_title || subName || "Fractions";
                            const welcomeSpeech = `Hi! I'm Buddy, your learning assistant. Let's start learning ${finalChapterName} together!`;

                            const fastForwardPromise = fastForwardComfortPhase(dbSession.comfort_index || 0);
                            speakText(welcomeSpeech, async () => {
                                try {
                                    const result = await fastForwardPromise;
                                    if (result) {
                                        setTranscript(result.transcript || []);
                                        setPhase("interview");
                                        setCurrentIdx(result.current_question_index);
                                        setComfortIdx(result.comfort_index);
                                        setActiveHint(result.active_hint);

                                        const firstQuestionText = result.next_speech || "";
                                        setBuddyState("speaking");
                                        speakText(firstQuestionText, () => {
                                            startSpeechRecognition();
                                        });
                                    }
                                } catch (_) {
                                    setError("Failed to restore the session.");
                                    setPhase("device_setup");
                                }
                            });
                        } else {
                            const aiMsgs = mappedTranscript.filter(t => t.role === "ai");
                            const lastAiText = aiMsgs.length > 0 ? aiMsgs[aiMsgs.length - 1].text : "Let's continue.";

                            setPhase(savedState === "GOODBYE" ? "completed" : "interview");
                            setBuddyState(savedState === "GOODBYE" ? "completed" : "speaking");

                            speakText(lastAiText, () => {
                                if (dbSession.completion_status !== "Completed" && savedState !== "GOODBYE") {
                                    startSpeechRecognition();
                                }
                            });
                        }
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

        isListeningRef.current = true;
        textRef.current = ""; // Clear text ref to start fresh

        voiceService.startListening({
            onStart: () => {
                setIsRecording(true);
                setBuddyState("listening");
                setLiveCaption("Listening...");
                resetSilenceTimers();
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
                    triggerRepeat();
                    return;
                }

                if (currentSpeech.length > 0) {
                    setError(null);
                    resetSilenceTimers(currentSpeech);
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
                if (isListeningRef.current && !isOffline && (activeState === "interview" || activeState === "comfort_conv")) {
                    setSilenceRetryCount(0);
                    submitTurnLocal(text);
                }
            },
            onError: (err) => {
                console.error("Speech recognition error:", err);
            },
            onEnd: () => {
                setIsRecording(false);
                if (isListeningRef.current) {
                    setBuddyState("silent");
                    const isSessionActive = phase === "interview" || phase === "comfort_conv";
                    if (micEnabled && !isSpeakingRef.current && !isSubmitting && !isOffline && isSessionActive) {
                        setTimeout(() => {
                            const stillActive = phase === "interview" || phase === "comfort_conv";
                            if (isListeningRef.current && micEnabled && !isSpeakingRef.current && !isSubmitting && !isOffline && stillActive) {
                                startSpeechRecognition();
                            }
                        }, 400);
                    }
                }
            }
        }, {
            interviewId: parseInt(interviewId as string, 10),
            questionIndex: currentIdx
        });
    }

    // Silence timers logic
    const resetSilenceTimers = (latestSpeech: string = "") => {
        clearSilenceTimers();
        if (phase !== "interview" && phase !== "comfort_conv") return;

        const speechToUse = latestSpeech || textRef.current;

        // 8-Second Nudge: if no speech is heard for 8 consecutive seconds
        silenceTimeoutRef.current = setTimeout(() => {
            if (speechToUse.length === 0 && isListeningRef.current && !isOffline) {
                const nudgeText = phaseRef.current === "comfort_conv"
                    ? "Go ahead, I'm listening!"
                    : "Take your time, tell me whatever you remember!";
                speakText(nudgeText, () => {
                    startSpeechRecognition();
                });
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
            const currentIdxVal = currentIdxRef.current;
            const comfortIdxVal = comfortIdxRef.current;
            const transcriptVal = transcriptRef.current;

            // Call the backend executeTurn endpoint
            const result = await interviewService.executeTurn(sessionId || interviewId, {
                student_response: responseText,
                network_status: navigator.onLine ? "online" : "offline"
            });

            // Update states from result
            setBuddyState("speaking");
            
            const nextState = result.next_state;
            const nextSpeech = result.next_speech;
            
            let speechToUse = nextSpeech;
            if (nextState === "comfort_conv") {
                if (result.comfort_index === 1) {
                    speechToUse = "Hello! I'm Buddy. Can you tell me how you're feeling today?";
                } else if (result.comfort_index === 2) {
                    speechToUse = "What's something you enjoyed doing today?";
                } else if (result.comfort_index === 3) {
                    speechToUse = `Great! We'll be learning about ${chapterTitle || subjectName || "Fractions"} today. Are you ready to begin?`;
                }
            }

            const isTransitioningFromComfort = activeState === "comfort_conv" && nextState === "interview";

            if (isTransitioningFromComfort) {
                // 1. Transition to split layout
                setPhase("interview");
                setComfortIdx(result.comfort_index);
                setCurrentIdx(result.current_question_index);
                setActiveHint(result.active_hint);

                const transitionText = `Awesome! Let's start our assessment on ${chapterTitle || subjectName || "Fractions"}. I'll ask you one question at a time. Take your time, and do your best!`;
                
                // Add student response + transition message to transcript
                const updatedTranscript = [...transcriptVal];
                if (responseText.trim()) {
                    updatedTranscript.push({ role: "student" as const, text: responseText, question_category: activeState });
                }
                updatedTranscript.push({ role: "ai" as const, text: transitionText, question_category: "transition" });
                setTranscript(updatedTranscript);

                // Speak transition message first
                speakText(transitionText, () => {
                    // Once transition finishes, speak and show the actual first question
                    const firstQText = nextSpeech; // from backend
                    
                    const finalTranscript = [...updatedTranscript, { role: "ai" as const, text: firstQText, question_category: "interview" }];
                    setTranscript(finalTranscript);
                    
                    speakText(firstQText, () => {
                        startSpeechRecognition();
                    });
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
                    speakText(speechToUse, () => {
                        startSpeechRecognition();
                    });
                }
            }

            isSubmittingRef.current = false;
            setIsSubmitting(false);

        } catch (err) {
            console.error("[InterviewPage] Exception in submitTurnLocal:", err);
            setError("An unexpected error occurred. Retrying automatically...");
            
            // Auto retry logic on network timeout / failure
            setTimeout(() => {
                isSubmittingRef.current = false;
                setIsSubmitting(false);
                submitTurnLocal(responseText);
            }, 3000);
        }
    };

    function handleComfortSubmit() {
        const responseText = typedText.trim() || "(silent)";
        submitTurnLocal(responseText);
    }

    function handleNextQuestionClick() {
        const text = textRef.current.trim();
        setSilenceRetryCount(0);
        submitTurnLocal(text || "(No spoken response)");
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
    const startAssessment = () => {
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
        setBuddyState("speaking");

        const welcomeSpeech = `Hi! I'm Buddy, your learning assistant. Let's start learning ${chapterTitle || subjectName || "Fractions"} together!`;

        // Start fast forwarding in the background
        const fastForwardPromise = fastForwardComfortPhase(0);

        speakText(welcomeSpeech, async () => {
            try {
                // Wait for background fast-forward to complete
                const result = await fastForwardPromise;
                if (result) {
                    // Update frontend state with first question
                    setTranscript(result.transcript || []);
                    setPhase("interview");
                    setCurrentIdx(result.current_question_index);
                    setComfortIdx(result.comfort_index);
                    setActiveHint(result.active_hint);

                    // Buddy speaks the first question
                    const firstQuestionText = result.next_speech || "";
                    setBuddyState("speaking");
                    speakText(firstQuestionText, () => {
                        startSpeechRecognition();
                    });
                }
            } catch (err) {
                console.error("Failed starting session:", err);
                setError("Failed to start the assessment. Please try again.");
                setPhase("device_setup");
            }
        });
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
                    startSpeechRecognition();
                });
            }
            return;
        }

        setSilenceRetryCount(0);
        submitTurnLocal(text);
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
            startSpeechRecognition();
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
        if (phase === "meet_buddy") {
            return `Hi ${studentName}! I'm Buddy 😊 Today we'll chat together about something you recently learned. Don't worry. There are no marks or difficult exams. Just answer naturally. I'm excited to meet you!`;
        }
        if (phase === "device_setup") {
            return "Please allow your microphone and camera to start the assessment. Both must be enabled.";
        }
        if (phase === "interview") {
            if (activeHint) return activeHint;
            return questions[currentIdx]?.q || "Let's begin!";
        }

        // Try to get latest AI message from transcript to guarantee perfect text-audio sync
        const aiMsgs = transcript.filter(t => t.role === "ai");
        if (aiMsgs.length > 0) {
            return aiMsgs[aiMsgs.length - 1].text;
        }

        if (phase === "comfort_conv") {
            const finalChapterName = chapterTitle || subjectName || "Fractions";
            if (comfortIdx === 0 || comfortIdx === 1) return "Hello! I'm Buddy. Can you tell me how you're feeling today?";
            if (comfortIdx === 2) return "What's something you enjoyed doing today?";
            return `Great! We'll be learning about ${finalChapterName} today. Are you ready to begin?`;
        }
        if (phase === "transition") {
            return `Great! Now let's talk about ${chapterTitle || subjectName || "Fractions"}.`;
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

    const renderTopBar = () => {
        if (phase !== "interview" && phase !== "comfort_conv" && phase !== "device_setup") return null;
        const displayTitle = subjectName && chapterTitle && subjectName !== chapterTitle
            ? `${subjectName} - ${chapterTitle}`
            : (chapterTitle || subjectName || "Assessment");
        return (
            <div style={styles.assessmentTopBar}>
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
            <div style={styles.topQuestionTextContainer}>
                <div style={styles.questionNumberText}>
                    Question {currentNum} of {totalNum} {chapterTitle ? ` • ${chapterTitle}` : ""}
                </div>
                <h2 style={styles.topQuestionTitle} className={isHindi ? "font-hindi" : ""}>
                    {questions[currentIdx]?.q || ""}
                </h2>
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
                    <div style={styles.splitGrid}>
                        {/* Left Panel: Bot */}
                        <div style={styles.panelCard}>
                            {/* Speech bubble removed to avoid double display; teacher-generated question is at the top */}
                            {renderBuddyAvatar(180)}
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
                    phase !== "device_setup" ? (
                        <div style={styles.buddyZone}>
                            {/* Speech bubble - hide in comfort_conv */}
                            {phase !== "comfort_conv" && (
                                <div style={styles.bubbleBox}>
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
                    <div style={styles.bottomStatusContainer}>
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