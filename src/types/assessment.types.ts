import { QuestionData } from "./question.types";

export interface StudentAssignmentData {
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
  interview?: {
    id: number;
    overallScore?: number;
    grade?: string;
    status: string;
    completedAt?: string;
  };
}

export interface AssessmentData {
  id: string;
  title: string;
  subjectId: string;
  classId: string;
  questionsCount: number;
  durationMinutes?: number;
  questions?: QuestionData[];
  questionsToAsk?: number;
  status: "Active" | "Completed" | "Scheduled";
  date?: string;
  assignedStudents?: StudentAssignmentData[];
}
