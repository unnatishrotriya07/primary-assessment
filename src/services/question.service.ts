import api from "./api";
import { QuestionData } from "@/types/question.types";

export interface AIQuestionParams {
  classId?: string;
  subjectId: string;
  chapterId: string;
  difficulty: "easy" | "medium" | "hard";
  cognitiveLevel: string;
  count: number;
  regenerate?: boolean;
  previewOnly?: boolean;
  session?: string;
  questionType?: string;
  selectedText?: string;
}

export interface QuestionBatchSave {
  questions: Partial<QuestionData>[];
  clearExisting?: boolean;
  chapterId?: string;
  difficulty?: "easy" | "medium" | "hard";
  cognitiveLevel?: string;
}

export const questionService = {
  getAll: (filters?: { classId?: string | number; subjectId?: string | number; chapterId?: string | number; session?: string }): Promise<QuestionData[]> => {
    const params: Record<string, any> = {};
    if (filters?.classId) params.class_id = filters.classId;
    if (filters?.subjectId) params.subject_id = filters.subjectId;
    if (filters?.chapterId) params.chapter_id = filters.chapterId;
    if (filters?.session) params.session = filters.session;
    return api.get<QuestionData[]>("/questions/", { params });
  },
  generateAIQuestions: (params: AIQuestionParams): Promise<QuestionData[]> => {
    return api.post<QuestionData[]>("/questions/generate", params);
  },
  batchSave: (batchData: QuestionBatchSave): Promise<QuestionData[]> => {
    return api.post<QuestionData[]>("/questions/batch", batchData);
  },
  create: (data: Partial<QuestionData>): Promise<QuestionData> => {
    return api.post<QuestionData>("/questions", data);
  },
  delete: (id: string): Promise<void> => {
    return api.delete<void>(`/questions/${id}`);
  },
};
export default questionService;
