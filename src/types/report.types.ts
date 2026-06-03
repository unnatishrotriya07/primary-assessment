export interface ReportData {
  id?: number;
  reportId: string;
  studentName: string;
  score: number;
  grade: string;
  duration: string;
  accuracy: number;
  completedAt?: string;
  feedback?: string;
  assessmentId?: number | string;
}
