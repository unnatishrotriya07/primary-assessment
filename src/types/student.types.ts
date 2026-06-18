export interface StudentData {
  id: string;
  name: string;
  email: string;
  contactNumber?: string;
  scholarNumber: string;
  pictureUrl?: string;
  classId: number;
  tenantId?: string;
}

export interface StudentResult {
  id: number;
  assessmentId: number;
  assessmentTitle: string;
  score: number;
  grade: string;
  duration: string;
  accuracy: number;
  completedAt?: string;
  feedback?: string;
}
