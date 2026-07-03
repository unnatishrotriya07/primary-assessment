import api from "./api";

export interface SystemDiagnostics {
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  api_status: string;
  active_pipelines: number;
  tech_stack: {
    frontend: string;
    backend: string;
    pipeline: string;
    security: string;
  };
  ai_models: Array<{
    task: string;
    model: string;
    context: string;
    status: string;
  }>;
  transcripts: Array<{
    id: string | number;
    studentName: string;
    schoolName: string;
    subject: string;
    date: string;
    score: number;
    dialogue: Array<{ speaker: string; text: string }>;
  }>;
  errors: Array<{
    id: string;
    component: string;
    message: string;
    severity: string;
    time: string;
  }>;
}

export const controlPanelService = {
  getDiagnostics: () => api.get<SystemDiagnostics>("/control-panel/diagnostics"),
  getSchools: () => api.get<any[]>("/control-panel/schools"),
  createSchool: (data: any) => api.post<any>("/control-panel/schools", data),
  deleteSchool: (id: number) => api.delete<any>(`/control-panel/schools/${id}`),
  getSchoolSettings: () => api.get<any>("/control-panel/school-settings"),
  updateSchoolSettings: (data: { name: string }) => api.put<any>("/control-panel/school-settings", data),
};
