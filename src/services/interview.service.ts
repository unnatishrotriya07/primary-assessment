import api from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InterviewQuestion {
    q: string;
    skill: string;
    category: string;
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
     * Backend calls Claude AI and returns the full scored report.
     */
    submit: (payload: InterviewSubmitPayload): Promise<InterviewReport> =>
        api.post<InterviewReport>("/interviews/submit", payload),

    /**
     * Fetch a saved report by interview ID.
     * Used on the result page if sessionStorage was cleared.
     */
    getReport: (interviewId: number): Promise<InterviewReport> =>
        api.get<InterviewReport>(`/interviews/${interviewId}`),

    /**
     * Admin: all completed interviews for one assessment.
     */
    getByAssessment: (assessmentId: number): Promise<InterviewReport[]> =>
        api.get<InterviewReport[]>(`/interviews/assessment/${assessmentId}`),
};

export default interviewService;