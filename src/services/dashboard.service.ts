import api from "./api";

export interface DashboardStats {
  total_classes: number;
  active_students: number;
  generated_questions: number;
  assessments_conducted: number;
  average_score: number;
  average_accuracy: number;
  recent_activity: Array<{
    id: number;
    student_name: string;
    student_class: string;
    score: number;
    grade: string;
    accuracy: number;
  }>;
}

export const dashboardService = {
  getStats: () => api.get<DashboardStats>("/dashboard/stats"),
};
