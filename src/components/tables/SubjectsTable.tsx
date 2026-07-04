"use client";

import React, { useEffect, useState } from "react";
import subjectService from "@/services/subject.service";
import classService from "@/services/class.service";
import { SubjectData } from "@/types/subject.types";
import { ClassData } from "@/types/class.types";
import { extractErrorMessage } from "@/utils/helpers";

interface SubjectsTableProps {
  refreshTrigger?: number;
}

export default function SubjectsTable({ refreshTrigger = 0 }: SubjectsTableProps) {
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [classesMap, setClassesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [selectedClassFilter, setSelectedClassFilter] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchSubjectsAndClasses = async () => {
    setLoading(true);
    setError("");
    try {
      const [subjectsData, classesData] = await Promise.all([
        subjectService.getAll(),
        classService.getAll(),
      ]);
      setSubjects(subjectsData);
      setClasses(classesData);

      const clMap: Record<string, string> = {};
      classesData.forEach((cls) => {
        clMap[cls.id] = cls.name;
      });
      setClassesMap(clMap);
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to load subjects."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjectsAndClasses();
  }, [refreshTrigger]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("user_session");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.role === "admin" && !parsed.tenantId) {
            setIsSuperAdmin(true);
          }
        } catch (e) {}
      }
    }
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this subject?")) return;
    try {
      await subjectService.delete(id);
      fetchSubjectsAndClasses();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete subject.");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
        <div className="spinner" style={{ marginBottom: "1rem" }}></div>
        Loading subjects...
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

  const filteredSubjects = subjects.filter((item) => {
    return !selectedClassFilter || String(item.classId) === selectedClassFilter;
  });

  const totalPages = Math.ceil(filteredSubjects.length / pageSize);
  const paginatedSubjects = filteredSubjects.slice(
    (currentPage - 1) * pageSize,
    (currentPage) * pageSize
  );

  if (subjects.length === 0) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)" }}>
        No subjects found. {isSuperAdmin ? 'Click "Add Subject" to create one.' : ''}
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
      </div>

      <div style={styles.tableWrapper} className="card">
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.th}>Subject Name</th>
              <th style={styles.th}>Class</th>
              <th style={styles.th}>Code</th>
              <th style={styles.th}>Chapters</th>
              <th style={styles.th}>Status</th>
              {isSuperAdmin && <th style={styles.th}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedSubjects.length === 0 ? (
              <tr style={styles.row}>
                <td colSpan={isSuperAdmin ? 6 : 5} style={{ ...styles.td, textAlign: "center", color: "var(--text-secondary)", padding: "3rem" }}>
                  No subjects match the selected filters.
                </td>
              </tr>
            ) : (
              paginatedSubjects.map((item) => (
                <tr key={item.id} style={styles.row}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{item.name}</td>
                  <td style={styles.td}>{classesMap[item.classId] || `Class #${item.classId}`}</td>
                  <td style={styles.td}>{item.code}</td>
                  <td style={styles.td}>{item.chaptersCount ?? 0} Chapters</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.badge,
                        backgroundColor: item.status === "Active" ? "var(--success-light)" : "var(--bg-surface-hover)",
                        color: item.status === "Active" ? "var(--success)" : "var(--text-secondary)",
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                  {isSuperAdmin && (
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
                  )}
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
            Showing {filteredSubjects.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
            {Math.min(currentPage * pageSize, filteredSubjects.length)} of {filteredSubjects.length} subjects
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
  badge: {
    display: "inline-flex",
    padding: "0.2rem 0.6rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 600,
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
};

