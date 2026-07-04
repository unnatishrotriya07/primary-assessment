export interface ChapterAssetData {
  id: number;
  sectionId: number;
  assetType: string;
  image: string;
  caption?: string;
}

export interface ChapterSectionData {
  id: number;
  chapterId: number;
  heading: string;
  order: number;
  htmlContent: string;
  plainText: string;
  assets?: ChapterAssetData[];
}

export interface BookChapterData {
  id: number;
  bookId: number;
  chapterNumber: number;
  title: string;
  slug: string;
  summary?: string;
  sections?: ChapterSectionData[];
}

export interface ChapterData {
  id: string;
  number: string;
  title: string;
  subjectId: string;
  content?: string;
  textContent?: string;
  questionsCount?: number;
  tenantId?: string;
  bookChapter?: BookChapterData;
}
