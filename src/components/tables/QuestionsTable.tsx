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
import Modal from "@/components/common/Modal";
import { extractErrorMessage } from "@/utils/helpers";

interface SessionGroup {
  sessionKey: string;
  sessionName: string;
  classId?: string | number;
  subjectId?: string | number;
  chapterId?: string | number;
  questions: QuestionData[];
}

const getShortSessionName = (name: string) => {
  if (!name) return "Individual";
  if (name === "Individual Question") return "Individual";
  
  const parts = name.split(" - ");
  if (parts.length >= 3) {
    const subject = parts[0];
    const datePart = parts[parts.length - 1];
    // E.g. "Jun 10, 2026 12:00:00 PM" -> "Jun 10, 12:00 PM"
    const cleanTime = datePart.replace(/,\s\d{4}/, "").replace(/:\d{2}\s/, " ");
    return `${subject} (${cleanTime})`;
  }
  return name.length > 25 ? name.substring(0, 22) + "..." : name;
};

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
  
  const [selectedGroup, setSelectedGroup] = useState<SessionGroup | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedGroupQuestions, setSelectedGroupQuestions] = useState<QuestionData[]>([]);

  const handleViewSession = (group: SessionGroup) => {
    setSelectedGroup(group);
    setSelectedGroupQuestions(group.questions);
    setIsDetailModalOpen(true);
  };

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
      setError(extractErrorMessage(err, "Failed to load questions."));
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

  const handleDeleteSession = async (group: SessionGroup) => {
    const confirmMsg = group.questions.length > 1
      ? `Are you sure you want to delete all ${group.questions.length} questions in this session?`
      : `Are you sure you want to delete this question?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await Promise.all(group.questions.map(q => questionService.delete(q.id)));
      fetchQuestionsAndMetadata();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete session questions.");
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      await questionService.delete(id);
      await fetchQuestionsAndMetadata();
      setSelectedGroupQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete question.");
    }
  };

  useEffect(() => {
    if (isDetailModalOpen && selectedGroupQuestions.length === 0) {
      setIsDetailModalOpen(false);
    }
  }, [selectedGroupQuestions, isDetailModalOpen]);

  const filteredQuestions = questions.filter((item) => {
    const matchesClass = !selectedClassFilter || String(item.classId) === selectedClassFilter;
    const matchesSubject = !selectedSubjectFilter || String(item.subjectId) === selectedSubjectFilter;
    const matchesChapter = !selectedChapterFilter || (item.chapterId && String(item.chapterId) === selectedChapterFilter);
    const matchesSession = !selectedSessionFilter || item.session === selectedSessionFilter;
    return matchesClass && matchesSubject && matchesChapter && matchesSession;
  });

  const groupedSessions = React.useMemo(() => {
    const groups: Record<string, SessionGroup> = {};
    filteredQuestions.forEach((q) => {
      const sessionKey = q.session ? q.session.trim() : `Individual - ${q.id}`;
      if (!groups[sessionKey]) {
        groups[sessionKey] = {
          sessionKey,
          sessionName: q.session || "Individual Question",
          classId: q.classId,
          subjectId: q.subjectId,
          chapterId: q.chapterId,
          questions: [],
        };
      }
      groups[sessionKey].questions.push(q);
    });
    return Object.values(groups);
  }, [filteredQuestions]);

  const totalPages = Math.ceil(groupedSessions.length / pageSize);
  const paginatedSessions = groupedSessions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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

  if (questions.length === 0) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)" }}>
        No questions found. Use the question generator or create a question to begin.
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div className="table-filter-bar card">
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
              <th style={styles.th}>Session</th>
              <th style={styles.th}>Class</th>
              <th style={styles.th}>Subject</th>
              <th style={styles.th}>Chapter</th>
              <th style={styles.th}>Questions Count</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedSessions.length === 0 ? (
              <tr style={styles.row}>
                <td colSpan={6} style={{ ...styles.td, textAlign: "center", color: "var(--text-secondary)", padding: "3rem" }}>
                  No sessions match the selected filters.
                </td>
              </tr>
            ) : (
              paginatedSessions.map((item) => (
                <tr key={item.sessionKey} style={styles.row}>
                  <td style={styles.td}>
                    <code style={styles.sessionCode} title={item.sessionName}>
                      {getShortSessionName(item.sessionName)}
                    </code>
                  </td>
                  <td style={styles.td}>{classesMap[item.classId ?? ""] || `Class #${item.classId}`}</td>
                  <td style={styles.td}>{subjectsMap[item.subjectId ?? ""] || `Subject #${item.subjectId}`}</td>
                  <td style={styles.td}>
                    {item.chapterId ? (
                      chaptersMap[item.chapterId] || `Chapter #${item.chapterId}`
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>—</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.countBadge}>
                      {item.questions.length} Question{item.questions.length > 1 ? "s" : ""}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => handleViewSession(item)}
                        style={styles.actionBtn}
                        title="View Questions"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="3" />
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteSession(item)}
                        style={styles.deleteBtn}
                        title="Delete Session"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          <line x1="10" x2="10" y1="11" y2="17" />
                          <line x1="14" x2="14" y1="11" y2="17" />
                        </svg>
                      </button>
                    </div>
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
            Showing {groupedSessions.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
            {Math.min(currentPage * pageSize, groupedSessions.length)} of {groupedSessions.length} sessions
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

      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Session Details`}
        size="large"
      >
        <div style={styles.modalContent}>
          <div style={styles.modalSubHeader}>
            <strong>Full Name:</strong> {selectedGroup?.sessionName}
          </div>
          <div style={styles.modalQuestionsList}>
            {selectedGroupQuestions.map((q, idx) => (
              <div key={q.id} style={styles.modalQuestionCard}>
                <div style={styles.modalQuestionHeader}>
                  <div style={styles.modalQuestionText}>
                    <strong>Q{idx + 1}.</strong> {q.text}
                  </div>
                  <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                    <button style={styles.actionBtn} title="Edit">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                    <button
                      style={styles.modalDeleteBtn}
                      onClick={() => handleDeleteQuestion(q.id)}
                      title="Delete Question"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        <line x1="10" x2="10" y1="11" y2="17" />
                        <line x1="14" x2="14" y1="11" y2="17" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Options / Answer */}
                {q.options && q.options.length > 0 ? (
                  <div style={styles.modalOptionsGrid}>
                    {q.options.map((option, optIdx) => {
                      const isCorrect = q.correctAnswer === option || q.correctAnswer === String.fromCharCode(65 + optIdx);
                      return (
                        <div
                          key={optIdx}
                          style={{
                            ...styles.modalOptionItem,
                            ...(isCorrect ? styles.modalOptionCorrect : {})
                          }}
                        >
                          <strong>{String.fromCharCode(65 + optIdx)}.</strong> {option}
                          {isCorrect && <span style={styles.correctCheck}>✓ Correct</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={styles.modalTitaAnswer}>
                    <strong>Correct Answer:</strong> {q.correctAnswer || "TITA (Short Answer)"}
                  </div>
                )}

                {/* Question metadata badges */}
                <div style={styles.modalBadgeRow}>
                  <span
                    style={{
                      ...styles.badge,
                      backgroundColor:
                        q.difficulty === "easy" ? "var(--success-light)" :
                        q.difficulty === "medium" ? "var(--warning-light)" : "var(--error-light)",
                      color:
                        q.difficulty === "easy" ? "var(--success)" :
                        q.difficulty === "medium" ? "var(--warning)" : "var(--error)",
                    }}
                  >
                    {q.difficulty}
                  </span>
                  <span style={styles.cognitiveTag}>
                    {q.cognitiveLevel}
                  </span>
                  {q.questionType && (
                    <span style={{ ...styles.badge, backgroundColor: "var(--bg-surface-hover)", color: "var(--text-secondary)" }}>
                      {q.questionType.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
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
    cursor: "pointer",
    border: "none",
    background: "none",
    padding: "0.3rem",
    borderRadius: "var(--radius-sm)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s",
  },
  deleteBtn: {
    color: "var(--error)",
    cursor: "pointer",
    border: "none",
    background: "none",
    padding: "0.3rem",
    borderRadius: "var(--radius-sm)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s",
  },
  sessionCode: {
    fontFamily: "monospace",
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    color: "rgb(139, 92, 246)",
    padding: "0.25rem 0.5rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.85rem",
    fontWeight: 600,
    wordBreak: "break-all",
  },
  countBadge: {
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
    padding: "0.2rem 0.6rem",
    borderRadius: "9999px",
    fontSize: "0.8rem",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
  },
  modalContent: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    maxHeight: "60vh",
    overflowY: "auto",
    paddingRight: "0.3rem",
  },
  modalSubHeader: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    borderBottom: "1px solid var(--border-color)",
    paddingBottom: "0.5rem",
  },
  modalQuestionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
  },
  modalQuestionCard: {
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    padding: "1rem",
    backgroundColor: "var(--bg-app)",
    display: "flex",
    flexDirection: "column",
    gap: "0.8rem",
  },
  modalQuestionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1rem",
  },
  modalQuestionText: {
    fontSize: "0.95rem",
    fontWeight: 500,
    color: "var(--text-primary)",
    lineHeight: "1.4",
  },
  modalDeleteBtn: {
    color: "var(--error)",
    cursor: "pointer",
    border: "none",
    background: "none",
    padding: "0.3rem",
    borderRadius: "var(--radius-sm)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s",
  },
  modalOptionsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.5rem",
    marginTop: "0.5rem",
  },
  modalOptionItem: {
    padding: "0.6rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-card)",
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
  },
  modalOptionCorrect: {
    borderColor: "var(--success)",
    backgroundColor: "var(--success-light)",
    color: "var(--success)",
    fontWeight: 600,
  },
  correctCheck: {
    float: "right",
    fontSize: "0.75rem",
    fontWeight: 700,
  },
  modalTitaAnswer: {
    padding: "0.6rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
    fontSize: "0.85rem",
    fontWeight: 600,
    marginTop: "0.5rem",
  },
  modalBadgeRow: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.3rem",
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
