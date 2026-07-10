export interface StudentData {
  id: string;
  name: string;
  email: string;
  contactNumber?: string;
  scholarNumber: string;
  pictureUrl?: string;
  classId: number;
  tenantId?: string;
  teacherNotes?: string;
}

export interface StudentResult {
  id: number;
  assessmentId: number;
  assessmentTitle: string;
  score: number;
  grade: string;
  duration: string;
  accuracy: number;
  completedAt?: string;
  feedback?: string;
}

export interface ChapterMastery {
  id: number;
  number: string;
  title: string;
  status: "Not Started" | "In Progress" | "Mastered";
  score: number | null;
  assessmentsCount: number;
}

export interface SubjectMastery {
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  masteryScore: number | null;
  currentChapter: { number: string; title: string } | null;
  suggestedNextChapter: { number: string; title: string } | null;
  chapters: ChapterMastery[];
}

export interface JourneyTimelineEvent {
  type: "assessment" | "milestone";
  date: string;
  title: string;
  description: string;
  grade?: string;
  score?: number;
  subscores?: {
    communication?: number;
    numeracy?: number;
    creativity?: number;
    emotionalIq?: number;
  };
  achievements?: string[];
}

export interface JourneyAchievement {
  id: string;
  title: string;
  description: string;
  type: string; // bronze, silver, gold
  date: string;
}

export interface JourneyTrendData {
  date: string;
  assessmentTitle: string;
  overallScore: number;
  communication?: number;
  numeracy?: number;
  creativity?: number;
  emotionalIq?: number;
}

export interface StudentJourneyData {
  student: StudentData;
  parentSummary: string;
  strengths: string[];
  improvements: string[];
  teacherRecommendations: string[];
  teacherNotes: string[];
  achievements: JourneyAchievement[];
  subjects: SubjectMastery[];
  timeline: JourneyTimelineEvent[];
  trendData: JourneyTrendData[];
}
