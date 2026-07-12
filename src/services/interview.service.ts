import api from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InterviewQuestion {
    id?: number;
    q: string;
    skill: string;
    category: string;
    hint?: string;
}

export interface InterviewStartResponse {
    interview_id: number;
    student_name: string;
    student_class: string;
    assessment_title: string;
    questions: InterviewQuestion[];
}

export interface TranscriptEntry {
    role: "ai" | "student";
    text: string;
    question_category?: string;
}

export interface AnswerEntry {
    question_category: string;
    question: string;
    answer: string;
}

export interface InterviewSubmitPayload {
    interview_id: number;
    transcript: TranscriptEntry[];
    answers: AnswerEntry[];
}

export interface InterviewReport {
    id: number;
    student_name: string;
    student_class: string;
    assessment_title?: string;
    questions?: any[];
    overall_score?: number;
    grade?: string;
    recommendation?: string;
    score_communication?: number;
    score_numeracy?: number;
    score_creativity?: number;
    score_emotional_iq?: number;
    strengths?: string;
    improvements?: string;
    admin_note?: string;
    summary?: string;
    status: string;
    started_at?: string;
    completed_at?: string;
    evaluated_answers?: {
        question: string;
        studentAnswer: string;
        expectedAnswer: string;
        questionType: string;
        isCorrect: boolean;
        explanation?: string;
    }[];
    transcript?: TranscriptEntry[];
    language?: string;
    confidence?: number;
    audio_references?: string[];
    report_version?: string;
    requires_review?: boolean;
    review_reason?: string;
    current_question_index?: number;
    session_state?: string;
    comfort_index?: number;
    raw_answers?: AnswerEntry[];
    network_status?: string;
    completion_status?: string;
    evaluation_steps?: {
        step_name: string;
        status: string;
        output?: any;
        error?: string;
        completed_at?: string;
    }[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

const interviewService = {
    /**
     * Called right after Google sign-in on the verify page.
     * Creates the Interview row in the DB and returns questions.
     */
    start: (token: string, email: string): Promise<InterviewStartResponse> =>
        api.post<InterviewStartResponse>("/interviews/start", { token, email }),

    /**
     * Called when student finishes all questions.
     * Backend calls LLM and returns the report.
     */
    submit: (payload: InterviewSubmitPayload): Promise<InterviewReport> =>
        api.post<InterviewReport>("/interviews/submit", payload),

    /**
     * Fetch a saved report by interview ID.
     */
    getReport: (interviewId: number): Promise<InterviewReport> =>
        api.get<InterviewReport>(`/interviews/${interviewId}`),

    /**
     * Admin: all completed interviews for one assessment.
     */
    getByAssessment: (assessmentId: number): Promise<InterviewReport[]> =>
        api.get<InterviewReport[]>(`/interviews/assessment/${assessmentId}`),

    /**
     * Admin: update observation notes for a student's interview.
     */
    updateNotes: (interviewId: number, adminNote: string): Promise<InterviewReport> =>
        api.put<InterviewReport>(`/interviews/${interviewId}/notes`, { admin_note: adminNote }),

    /**
     * Called in real-time to save conversation turn by turn.
     */
    addMessage: (
        interviewId: number,
        payload: {
            role: "ai" | "student";
            text: string;
            question_category?: string;
            sequence_number?: number;
            question_id?: number;
            student_response?: string;
            buddy_response?: string;
            audio_url?: string;
            speech_confidence?: number;
        }
    ): Promise<{ status: string; message_id: number }> =>
        api.post<{ status: string; message_id: number }>(`/interviews/${interviewId}/messages`, payload),

    /**
     * Updates progressive session state turn-by-turn.
     */
    updateSession: (
        interviewId: number,
        payload: {
            current_question_index: number;
            session_state: string;
            comfort_index: number;
            raw_answers: AnswerEntry[];
            network_status: string;
            completion_status: string;
        }
    ): Promise<InterviewReport> =>
        api.post<InterviewReport>(`/interviews/${interviewId}/session`, payload),

    /**
     * V2 Real-Time Conversation Engine turn execution.
     */
    executeTurn: (
        interviewId: number,
        payload: {
            student_response: string;
            network_status: string;
            audio_url?: string;
        }
    ): Promise<{
        next_speech: string;
        next_state: string;
        hints_remaining: number;
        followups_remaining: number;
        active_hint: string | null;
        questions?: any[];
        current_question_index: number;
        comfort_index: number;
        completion_status: string;
    }> =>
        api.post(`/interviews/${interviewId}/turn`, payload),

    /**
     * Teacher: review and approve evaluation report.
     */
    reviewReport: (
        interviewId: number,
        payload: {
            evaluated_answers: any[];
            admin_note?: string;
        }
    ): Promise<InterviewReport> =>
        api.put<InterviewReport>(`/interviews/${interviewId}/review`, payload),

    /**
     * Admin: regenerate evaluation report.
     */
    regenerateReport: (interviewId: number): Promise<{ status: string; message: string }> =>
        api.post<{ status: string; message: string }>(`/interviews/${interviewId}/regenerate`, {}),
};

export default interviewService;