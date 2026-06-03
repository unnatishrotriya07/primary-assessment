import { QuestionData } from "./question.types";

export interface AssessmentData {
  id: string;
  title: string;
  subjectId: string;
  classId: string;
  questionsCount: number;
  durationMinutes?: number;
  questions?: QuestionData[];
  status: "Active" | "Completed" | "Scheduled";
  date?: string;
}
