export interface QuestionData {
  id: string;
  text: string;
  options: string[];
  correctAnswer?: string;
  difficulty: "easy" | "medium" | "hard";
  cognitiveLevel: string;
  subjectId: string | number;
  chapterId?: string | number;
  classId?: string | number;
  generatedBy?: string;
  session?: string;
  createdAt?: string;
}
