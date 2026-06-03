import api from "./api";
import { ReportData } from "@/types/report.types";

export const reportService = {
  getOverview: (): Promise<{ totalStudents: number; passingRate: number }> => {
    return api.get<{ totalStudents: number; passingRate: number }>("/reports/overview");
  },
  getById: (id: string): Promise<ReportData> => {
    return api.get<ReportData>(`/reports/${id}`);
  },
  getClassReport: (classId: string): Promise<ReportData[]> => {
    return api.get<ReportData[]>(`/reports/class/${classId}`);
  },
};
export default reportService;
