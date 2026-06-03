import api from "./api";
import { SubjectData } from "@/types/subject.types";

export const subjectService = {
  getAll: (classId?: string): Promise<SubjectData[]> => {
    const params = classId ? { class_id: classId } : undefined;
    return api.get<SubjectData[]>("/subjects/", { params });
  },
  getById: (id: string): Promise<SubjectData> => {
    return api.get<SubjectData>(`/subjects/${id}`);
  },
  create: (data: Partial<SubjectData>): Promise<SubjectData> => {
    return api.post<SubjectData>("/subjects", data);
  },
  update: (id: string, data: Partial<SubjectData>): Promise<SubjectData> => {
    return api.put<SubjectData>(`/subjects/${id}`, data);
  },
  delete: (id: string): Promise<void> => {
    return api.delete<void>(`/subjects/${id}`);
  },
};
export default subjectService;
