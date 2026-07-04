export interface QuestionData {
  id: string;
  text: string;
  options: string[];
  correctAnswer?: string;
  questionType?: string;
  difficulty: "easy" | "medium" | "hard";
  cognitiveLevel: string;
  subjectId: string | number;
  chapterId?: string | number;
  classId?: string | number;
  generatedBy?: string;
  session?: string;
  createdAt?: string;
  source?: string;
  section?: string;
  page?: string;
  confidence?: number;
  referenceText?: string;
}

