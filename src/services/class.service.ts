import api from "./api";
import { ClassData } from "@/types/class.types";

export const classService = {
  getAll: (): Promise<ClassData[]> => {
    return api.get<ClassData[]>("/classes/");
  },
  getById: (id: string): Promise<ClassData> => {
    return api.get<ClassData>(`/classes/${id}`);
  },
  create: (data: Partial<ClassData>): Promise<ClassData> => {
    return api.post<ClassData>("/classes", data);
  },
  update: (id: string, data: Partial<ClassData>): Promise<ClassData> => {
    return api.put<ClassData>(`/classes/${id}`, data);
  },
  delete: (id: string): Promise<void> => {
    return api.delete<void>(`/classes/${id}`);
  },
};
export default classService;
