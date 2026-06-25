import api from "./api";
import { AssessmentData } from "@/types/assessment.types";

export interface SubmitAnswersParams {
  sessionId: string;
  answers: Record<string, string>;
}

export interface AssessmentJoinInfoResponse {
  id: number;
  title: string;
  subjectName: string;
  className: string;
  isExpired: boolean;
  questionsCount: number;
}

export interface StudentJoinVerifyRequest {
  assessmentId: number;
  scholarNumber: string;
  studentName: string;
}

export interface StudentAssessmentCreate {
  assessmentId: number;
  studentName: string;
  studentClass: string;
  dateOfBirth: string;
  studentEmail: string;
  contact: string;
}

export interface StudentAssessmentResponse {
  id: number;
  assessmentId: number;
  studentName: string;
  studentClass: string;
  dateOfBirth: string;
  studentEmail: string;
  contact: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  isUsed: boolean;
  sessionId?: string;
  status: string;
  assessmentLink: string;
  emailContent: string;
}

export interface StudentAssessmentVerifyResponse {
  valid: boolean;
  reason?: string;
  studentName?: string;
  studentEmail?: string;
  assessmentTitle?: string;
  subjectName?: string;
  className?: string;
}

export const assessmentService = {
  getAll: (): Promise<AssessmentData[]> => {
    return api.get<AssessmentData[]>("/assessments/");
  },
  getById: (id: string): Promise<AssessmentData> => {
    return api.get<AssessmentData>(`/assessments/${id}`);
  },
  create: (data: {
    title: string;
    subjectId: number;
    classId: number;
    status?: string;
    date?: string;
    questionsCount: number;
    questionIds?: number[];
    questionsToAsk?: number;
  }): Promise<AssessmentData> => {
    return api.post<AssessmentData>("/assessments/", data);
  },
  startSession: (assessmentId: string): Promise<{ sessionId: string; assessment: AssessmentData }> => {
    return api.post<{ sessionId: string; assessment: AssessmentData }>(`/assessments/${assessmentId}/start`);
  },
  submitAnswers: (params: SubmitAnswersParams): Promise<{ score: number; resultId: string }> => {
    return api.post<{ score: number; resultId: string }>(`/assessments/submit`, params);
  },
  assignAssessment: (data: StudentAssessmentCreate): Promise<StudentAssessmentResponse> => {
    return api.post<StudentAssessmentResponse>("/assessments/assign", data);
  },
  assignAssessmentBulk: (data: { assessmentId: number; studentIds: number[] }): Promise<StudentAssessmentResponse[]> => {
    return api.post<StudentAssessmentResponse[]>("/assessments/assign-bulk", data);
  },
  verifyToken: (token: string, email: string): Promise<StudentAssessmentVerifyResponse> => {
    return api.get<StudentAssessmentVerifyResponse>(`/assessments/verify-token`, {
      params: { token, email },
    });
  },
  startByToken: (token: string, email: string): Promise<{ sessionId: string; assessment: AssessmentData }> => {
    return api.post<{ sessionId: string; assessment: AssessmentData }>("/assessments/start-by-token", { token, email });
  },
  getJoinInfo: (id: string): Promise<AssessmentJoinInfoResponse> => {
    return api.get<AssessmentJoinInfoResponse>(`/assessments/${id}/join-info`);
  },
  joinVerify: (data: StudentJoinVerifyRequest): Promise<StudentAssessmentResponse> => {
    return api.post<StudentAssessmentResponse>("/assessments/join-verify", data);
  },
};
export default assessmentService;

