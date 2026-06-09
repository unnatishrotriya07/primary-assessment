import api from "./api";
import { ChapterData } from "@/types/chapter.types";

export const chapterService = {
  getAll: (classId?: string | number, subjectId?: string | number): Promise<ChapterData[]> => {
    const params: Record<string, any> = {};
    if (classId) params.class_id = classId;
    if (subjectId) params.subject_id = subjectId;
    return api.get<ChapterData[]>("/chapters/", { params });
  },
  getBySubject: (subjectId: string): Promise<ChapterData[]> => {
    return api.get<ChapterData[]>(`/subjects/${subjectId}/chapters`);
  },
  create: (data: Partial<ChapterData>): Promise<ChapterData> => {
    return api.post<ChapterData>("/chapters", data);
  },
  parseFile: (file: File): Promise<{ text: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<{ text: string }>("/chapters/parse-file", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  update: (id: string, data: Partial<ChapterData>): Promise<ChapterData> => {
    return api.put<ChapterData>(`/chapters/${id}`, data);
  },
  delete: (id: string): Promise<void> => {
    return api.delete<void>(`/chapters/${id}`);
  },
};
export default chapterService;
