export interface SubjectData {
  id: string;
  name: string;
  code: string;
  classId: string;
  chaptersCount?: number;
  status: "Active" | "Draft";
}
