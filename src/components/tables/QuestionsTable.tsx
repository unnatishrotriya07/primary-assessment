"use client";

import React, { useEffect, useState } from "react";
import questionService from "@/services/question.service";
import subjectService from "@/services/subject.service";
import classService from "@/services/class.service";
import chapterService from "@/services/chapter.service";
import { QuestionData } from "@/types/question.types";
import { SubjectData } from "@/types/subject.types";
import { ClassData } from "@/types/class.types";
import { ChapterData } from "@/types/chapter.types";

interface QuestionsTableProps {
  refreshTrigger?: number;
}

export default function QuestionsTable({ refreshTrigger = 0 }: QuestionsTableProps) {
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  
  const [subjectsMap, setSubjectsMap] = useState<Record<string, string>>({});
  const [classesMap, setClassesMap] = useState<Record<string, string>>({});
  const [chaptersMap, setChaptersMap] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("");
  const [selectedChapterFilter, setSelectedChapterFilter] = useState("");
  const [selectedSessionFilter, setSelectedSessionFilter] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchQuestionsAndMetadata = async () => {
    setLoading(true);
    setError("");
    try {
      const [questionsData, subjectsData, classesData, chaptersData] = await Promise.all([
        questionService.getAll(),
        subjectService.getAll(),
        classService.getAll(),
        chapterService.getAll(),
      ]);
      setQuestions(questionsData);
      setSubjects(subjectsData);
      setClasses(classesData);
      setChapters(chaptersData);
      
      const subMap: Record<string, string> = {};
      subjectsData.forEach((sub) => {
        subMap[sub.id] = sub.name;
      });
      setSubjectsMap(subMap);

      const clMap: Record<string, string> = {};
      classesData.forEach((cls) => {
        clMap[cls.id] = cls.name;
      });
      setClassesMap(clMap);

      const chMap: Record<string, string> = {};
      chaptersData.forEach((chap) => {
        chMap[chap.id] = `Ch ${chap.number}: ${chap.title}`;
      });
      setChaptersMap(chMap);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load questions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestionsAndMetadata();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      await questionService.delete(id);
      fetchQuestionsAndMetadata();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete question.");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
        <div className="spinner" style={{ marginBottom: "1rem" }}></div>
        Loading questions...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", color: "var(--error)", backgroundColor: "var(--error-light)", borderRadius: "var(--radius-md)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
        {error}
      </div>
    );
  }

  const uniqueSessions = Array.from(new Set(questions.map((q) => q.session).filter(Boolean))) as string[];

  // Filter dropdown menus based on selections
  const filteredSubjectsForDropdown = selectedClassFilter
    ? subjects.filter((sub) => String(sub.classId) === selectedClassFilter)
    : subjects;

  const filteredChaptersForDropdown = selectedSubjectFilter
    ? chapters.filter((ch) => String(ch.subjectId) === selectedSubjectFilter)
    : selectedClassFilter
      ? chapters.filter((ch) => {
          const sub = subjects.find(s => String(s.id) === String(ch.subjectId));
          return sub && String(sub.classId) === selectedClassFilter;
        })
      : chapters;

  const filteredQuestions = questions.filter((item) => {
    const matchesClass = !selectedClassFilter || String(item.classId) === selectedClassFilter;
    const matchesSubject = !selectedSubjectFilter || String(item.subjectId) === selectedSubjectFilter;
    const matchesChapter = !selectedChapterFilter || (item.chapterId && String(item.chapterId) === selectedChapterFilter);
    const matchesSession = !selectedSessionFilter || item.session === selectedSessionFilter;
    return matchesClass && matchesSubject && matchesChapter && matchesSession;
  });

  const totalPages = Math.ceil(filteredQuestions.length / pageSize);
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (questions.length === 0) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)" }}>
        No questions found. Click "Generate via AI" or create a question.
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.filterBar} className="card">
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Filter by Class</label>
          <select
            value={selectedClassFilter}
            onChange={(e) => {
              setSelectedClassFilter(e.target.value);
              setSelectedSubjectFilter("");
              setSelectedChapterFilter("");
              setCurrentPage(1); // Reset page on filter change
            }}
            style={styles.filterSelect}
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Filter by Subject</label>
          <select
            value={selectedSubjectFilter}
            onChange={(e) => {
              setSelectedSubjectFilter(e.target.value);
              setSelectedChapterFilter("");
              setCurrentPage(1); // Reset page on filter change
            }}
            style={styles.filterSelect}
          >
            <option value="">All Subjects</option>
            {filteredSubjectsForDropdown.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name} ({classesMap[sub.classId] || `Class #${sub.classId}`})
              </option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Filter by Chapter</label>
          <select
            value={selectedChapterFilter}
            onChange={(e) => {
              setSelectedChapterFilter(e.target.value);
              setCurrentPage(1); // Reset page on filter change
            }}
            style={styles.filterSelect}
          >
            <option value="">All Chapters</option>
            {filteredChaptersForDropdown.map((chap) => (
              <option key={chap.id} value={chap.id}>
                Ch {chap.number}: {chap.title}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Filter by Session</label>
          <select
            value={selectedSessionFilter}
            onChange={(e) => {
              setSelectedSessionFilter(e.target.value);
              setCurrentPage(1); // Reset page on filter change
            }}
            style={styles.filterSelect}
          >
            <option value="">All Sessions</option>
            {uniqueSessions.map((session) => (
              <option key={session} value={session}>
                {session}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.tableWrapper} className="card">
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.th}>Question Prompt</th>
              <th style={styles.th}>Class</th>
              <th style={styles.th}>Subject</th>
              <th style={styles.th}>Chapter</th>
              <th style={styles.th}>Difficulty</th>
              <th style={styles.th}>Cognitive Level</th>
              <th style={styles.th}>Session</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedQuestions.length === 0 ? (
              <tr style={styles.row}>
                <td colSpan={8} style={{ ...styles.td, textAlign: "center", color: "var(--text-secondary)", padding: "3rem" }}>
                  No questions match the selected filters.
                </td>
              </tr>
            ) : (
              paginatedQuestions.map((item) => (
                <tr key={item.id} style={styles.row}>
                  <td style={{ ...styles.td, fontWeight: 500, maxWidth: "250px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={item.text}>
                    {item.text}
                  </td>
                  <td style={styles.td}>{classesMap[item.classId ?? ""] || `Class #${item.classId}`}</td>
                  <td style={styles.td}>{subjectsMap[item.subjectId] || `Subject #${item.subjectId}`}</td>
                  <td style={styles.td}>{item.chapterId ? (chaptersMap[item.chapterId] || `Chapter #${item.chapterId}`) : <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>—</span>}</td>
                  <td style={styles.td}>
                    <span 
                      style={{
                        ...styles.badge,
                        backgroundColor: 
                          item.difficulty === "easy" ? "var(--success-light)" : 
                          item.difficulty === "medium" ? "var(--warning-light)" : "var(--error-light)",
                        color: 
                          item.difficulty === "easy" ? "var(--success)" : 
                          item.difficulty === "medium" ? "var(--warning)" : "var(--error)",
                      }}
                    >
                      {item.difficulty}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.cognitiveTag}>{item.cognitiveLevel}</span>
                  </td>
                  <td style={styles.td}>
                    {item.session ? (
                      <span style={styles.sessionTag}>{item.session}</span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>—</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <button style={styles.actionBtn}>Edit</button>
                    <button style={styles.deleteBtn} onClick={() => handleDelete(item.id)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div style={styles.paginationBar}>
        <div style={styles.pageSizeSelectGroup}>
          <span style={styles.paginationText}>Items per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={styles.pageSizeSelect}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div style={styles.paginationNavigation}>
          <span style={styles.paginationText}>
            Showing {filteredQuestions.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
            {Math.min(currentPage * pageSize, filteredQuestions.length)} of {filteredQuestions.length} questions
          </span>
          <div style={styles.paginationButtons}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                ...styles.paginationBtn,
                ...(currentPage === 1 ? styles.paginationBtnDisabled : {}),
              }}
            >
              &larr; Prev
            </button>
            <span style={styles.currentPageIndicator}>
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              style={{
                ...styles.paginationBtn,
                ...(currentPage === totalPages || totalPages === 0 ? styles.paginationBtnDisabled : {}),
              }}
            >
              Next &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    width: "100%",
  },
  filterBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1.5rem",
    padding: "1rem 1.5rem",
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
    flex: "1 1 200px",
    maxWidth: "250px",
  },
  filterLabel: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  filterSelect: {
    padding: "0.5rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.85rem",
    outline: "none",
    cursor: "pointer",
    width: "100%",
  },
  sessionTag: {
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    color: "rgb(139, 92, 246)",
    padding: "0.2rem 0.6rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  tableWrapper: {
    padding: 0,
    overflowX: "auto",
    border: "1px solid var(--border-color)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  headerRow: {
    backgroundColor: "var(--bg-surface-hover)",
    borderBottom: "1px solid var(--border-color)",
  },
  th: {
    padding: "1rem 1.5rem",
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  row: {
    borderBottom: "1px solid var(--border-color)",
    transition: "background-color var(--transition-fast)",
  },
  td: {
    padding: "1rem 1.5rem",
    fontSize: "0.95rem",
    color: "var(--text-primary)",
  },
  badge: {
    display: "inline-flex",
    padding: "0.2rem 0.6rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "capitalize",
  },
  cognitiveTag: {
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
    padding: "0.2rem 0.6rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.8rem",
    fontWeight: 600,
    textTransform: "capitalize",
  },
  actionBtn: {
    color: "var(--primary)",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.9rem",
    border: "none",
    background: "none",
    padding: 0,
  },
  deleteBtn: {
    color: "var(--error)",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.9rem",
    border: "none",
    background: "none",
    padding: 0,
    marginLeft: "1rem",
  },
  paginationBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.5rem",
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    marginTop: "0.5rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  pageSizeSelectGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  paginationText: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
  },
  pageSizeSelect: {
    padding: "0.3rem 0.5rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.85rem",
    outline: "none",
    cursor: "pointer",
  },
  paginationNavigation: {
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
    flexWrap: "wrap",
  },
  paginationButtons: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
  },
  paginationBtn: {
    padding: "0.4rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface-hover)",
    color: "var(--text-primary)",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  paginationBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
    backgroundColor: "var(--bg-app)",
  },
  currentPageIndicator: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
};
