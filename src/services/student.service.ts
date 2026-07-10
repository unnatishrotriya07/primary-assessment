import { api } from "./api";
import { StudentData, StudentResult, StudentJourneyData } from "@/types/student.types";
import apiClient from "@/lib/axios";

export const studentService = {
  getByClass: (classId: string): Promise<StudentData[]> => {
    return api.get<StudentData[]>(`/students/?class_id=${classId}`);
  },
  
  getById: (id: string): Promise<StudentData> => {
    return api.get<StudentData>(`/students/${id}`);
  },
  
  update: (id: string, data: Partial<StudentData>): Promise<StudentData> => {
    return api.put<StudentData>(`/students/${id}`, data);
  },
  
  delete: (id: string): Promise<void> => {
    return api.delete<void>(`/students/${id}`);
  },
  
  getResults: (id: string): Promise<StudentResult[]> => {
    return api.get<StudentResult[]>(`/students/${id}/results`);
  },
  
  getJourney: (id: string): Promise<StudentJourneyData> => {
    return api.get<StudentJourneyData>(`/students/${id}/journey`);
  },
  
  uploadExcel: async (classId: string, file: File): Promise<{ message: string; count: number }> => {
    const formData = new FormData();
    formData.append("class_id", classId);
    formData.append("file", file);
    
    const response = await apiClient.post<{ message: string; count: number }>(
      "/students/upload-excel",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  uploadMultipleSections: async (
    baseClassId: string,
    filesList: Array<{ file: File; section: string }>
  ): Promise<{ message: string; count: number; results?: Array<{ filename: string; section: string; classId: number; count: number }> }> => {
    const formData = new FormData();
    formData.append("base_class_id", baseClassId);
    
    const sectionsMap: Record<string, string> = {};
    filesList.forEach((item) => {
      formData.append("files", item.file);
      sectionsMap[item.file.name] = item.section;
    });
    
    formData.append("sections_map", JSON.stringify(sectionsMap));
    
    const response = await apiClient.post<{ message: string; count: number }>(
      "/students/upload-multiple-sections",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },
  
  uploadPicture: async (id: string, file: File): Promise<StudentData> => {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await apiClient.post<StudentData>(
      `/students/${id}/picture`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  }
};

export default studentService;
