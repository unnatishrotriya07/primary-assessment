export interface ChapterData {
  id: string;
  number: string;
  title: string;
  subjectId: string;
  content?: string;
  textContent?: string;
  questionsCount?: number;
  tenantId?: string;
}
