import api from "./api";

export interface DashboardStats {
  total_classes: number;
  active_students: number;
  generated_questions: number;
  assessments_conducted: number;
  average_score: number;
  average_accuracy: number;
  active_teachers?: number;
  class_performance?: Array<{
    class_name: string;
    topic: string;
    status: string;
    color_type: string;
  }>;
  recent_activity: Array<{
    id: number;
    student_name: string;
    student_class: string;
    score: number;
    grade: string;
    accuracy: number;
  }>;
  teacher_workloads?: Array<{
    name: string;
    course_class: string;
    recent_action: string;
    time: string;
    status: string;
  }>;
}

export const dashboardService = {
  getStats: () => api.get<DashboardStats>("/dashboard/stats"),
};
