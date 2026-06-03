import api from "./api";
import { ChapterData } from "@/types/chapter.types";

export const chapterService = {
  getAll: (): Promise<ChapterData[]> => {
    return api.get<ChapterData[]>("/chapters/");
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
