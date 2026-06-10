"use client";

import React, { useEffect, useState } from "react";
import chapterService from "@/services/chapter.service";
import subjectService from "@/services/subject.service";
import classService from "@/services/class.service";
import { ChapterData } from "@/types/chapter.types";
import { SubjectData } from "@/types/subject.types";
import { ClassData } from "@/types/class.types";

interface ChaptersTableProps {
  refreshTrigger?: number;
}

export default function ChaptersTable({ refreshTrigger = 0 }: ChaptersTableProps) {
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  
  const [subjectsMap, setSubjectsMap] = useState<Record<string, SubjectData>>({});
  const [classesMap, setClassesMap] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [syncingMap, setSyncingMap] = useState<Record<string, boolean>>({});

  const handleSyncNcert = async (id: string) => {
    setSyncingMap((prev) => ({ ...prev, [id]: true }));
    try {
      const updatedChapter = await chapterService.syncNcert(id);
      setChapters((prev) =>
        prev.map((ch) => (ch.id === id ? { ...ch, textContent: updatedChapter.textContent } : ch))
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to sync NCERT content. Make sure a valid textbook mapping exists for this class/subject.");
    } finally {
      setSyncingMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  const fetchChaptersAndMetadata = async () => {
    setLoading(true);
    setError("");
    try {
      const [chaptersData, subjectsData, classesData] = await Promise.all([
        chapterService.getAll(),
        subjectService.getAll(),
        classService.getAll(),
      ]);
      setChapters(chaptersData);
      setSubjects(subjectsData);
      setClasses(classesData);
      
      const subMap: Record<string, SubjectData> = {};
      subjectsData.forEach((sub) => {
        subMap[sub.id] = sub;
      });
      setSubjectsMap(subMap);

      const clMap: Record<string, string> = {};
      classesData.forEach((cls) => {
        clMap[cls.id] = cls.name;
      });
      setClassesMap(clMap);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load chapters.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChaptersAndMetadata();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this chapter?")) return;
    try {
      await chapterService.delete(id);
      fetchChaptersAndMetadata();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete chapter.");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
        <div className="spinner" style={{ marginBottom: "1rem" }}></div>
        Loading chapters...
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

  // Filter subjects for the dropdown based on selected class
  const filteredSubjectsForDropdown = selectedClassFilter
    ? subjects.filter((sub) => String(sub.classId) === selectedClassFilter)
    : subjects;

  // Filter chapters based on selected class and subject
  const filteredChapters = chapters.filter((item) => {
    const sub = subjectsMap[item.subjectId];
    const matchesClass = !selectedClassFilter || (sub && String(sub.classId) === selectedClassFilter);
    const matchesSubject = !selectedSubjectFilter || String(item.subjectId) === selectedSubjectFilter;
    return matchesClass && matchesSubject;
  });

  const totalPages = Math.ceil(filteredChapters.length / pageSize);
  const paginatedChapters = filteredChapters.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (chapters.length === 0) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)" }}>
        No chapters found. Click "Add Chapter" to create one.
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
              setSelectedSubjectFilter(""); // Reset subject selection
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
      </div>

      <div style={styles.tableWrapper} className="card">
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.th}>Chapter</th>
              <th style={styles.th}>Title</th>
              <th style={styles.th}>Subject</th>
              <th style={styles.th}>Class</th>
              <th style={styles.th}>NCERT Source</th>
              <th style={styles.th}>Questions Count</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedChapters.length === 0 ? (
              <tr style={styles.row}>
                <td colSpan={7} style={{ ...styles.td, textAlign: "center", color: "var(--text-secondary)", padding: "3rem" }}>
                  No chapters match the selected filters.
                </td>
              </tr>
            ) : (
              paginatedChapters.map((item) => {
                const sub = subjectsMap[item.subjectId];
                const className = sub ? classesMap[sub.classId] : "";
                return (
                  <tr key={item.id} style={styles.row}>
                    <td style={{ ...styles.td, fontWeight: 700 }}>Ch {item.number}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{item.title}</td>
                    <td style={styles.td}>{sub ? sub.name : `Subject #${item.subjectId}`}</td>
                    <td style={styles.td}>{className || `Class #${sub?.classId}`}</td>
                    <td style={styles.td}>
                      <div style={styles.syncContainer}>
                        {item.textContent ? (
                          <span style={{ ...styles.badge, ...styles.syncedBadge }}>Synced</span>
                        ) : (
                          <span style={{ ...styles.badge, ...styles.notSyncedBadge }}>Not Synced</span>
                        )}
                        <button
                          onClick={() => handleSyncNcert(item.id)}
                          disabled={syncingMap[item.id]}
                          style={{
                            ...styles.syncBtn,
                            ...(syncingMap[item.id] ? styles.syncBtnDisabled : {})
                          }}
                          title="Sync textbook content directly from official NCERT servers"
                        >
                          {syncingMap[item.id] ? (
                            <span style={styles.spinnerIcon}></span>
                          ) : item.textContent ? "Resync" : "Sync"}
                        </button>
                      </div>
                    </td>
                    <td style={styles.td}>{item.questionsCount ?? 0} Items</td>
                    <td style={styles.td}>
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
                        <button style={styles.deleteBtn} onClick={() => handleDelete(item.id)} title="Delete">
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
                );
              })
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
            Showing {filteredChapters.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
            {Math.min(currentPage * pageSize, filteredChapters.length)} of {filteredChapters.length} chapters
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
    flex: 1,
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
  syncContainer: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  badge: {
    display: "inline-flex",
    padding: "0.2rem 0.6rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "capitalize",
  },
  syncedBadge: {
    backgroundColor: "var(--success-light, rgba(34, 197, 94, 0.1))",
    color: "var(--success, rgb(34, 197, 94))",
  },
  notSyncedBadge: {
    backgroundColor: "var(--bg-surface-hover, rgba(0, 0, 0, 0.05))",
    color: "var(--text-secondary, rgb(115, 115, 115))",
  },
  syncBtn: {
    padding: "0.25rem 0.6rem",
    borderRadius: "var(--radius-sm, 4px)",
    border: "1px solid var(--border-color, #e5e5e5)",
    backgroundColor: "var(--bg-app, #ffffff)",
    color: "var(--primary)",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all var(--transition-fast, 0.2s)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "60px",
    height: "24px",
  },
  syncBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  spinnerIcon: {
    width: "12px",
    height: "12px",
    border: "2px solid var(--primary)",
    borderTopColor: "transparent",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};
