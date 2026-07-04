"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import assessmentService from "@/services/assessment.service";
import subjectService from "@/services/subject.service";
import classService from "@/services/class.service";
import { AssessmentData } from "@/types/assessment.types";
import AssignAssessmentModal from "../forms/AssignAssessmentModal";
import ViewAssignmentsModal from "../forms/ViewAssignmentsModal";
import StudentReportModal from "../forms/StudentReportModal";
import { extractErrorMessage } from "@/utils/helpers";

export default function AssessmentsTable() {
  const [assessments, setAssessments] = useState<AssessmentData[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subjectsMap, setSubjectsMap] = useState<Record<string, string>>({});
  const [classesMap, setClassesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedAsmtId, setCopiedAsmtId] = useState<string | null>(null);
  
  // Search, filter, and sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // View assignments state
  const [selectedAssessmentForView, setSelectedAssessmentForView] = useState<AssessmentData | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentData | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedInterviewId, setSelectedInterviewId] = useState<number | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleAssignClick = (assessment: AssessmentData) => {
    setSelectedAssessment(assessment);
    setIsAssignModalOpen(true);
  };

  const handleCopyShareableLink = async (assessmentId: string) => {
    try {
      const shareableLink = `${window.location.origin}/assessment/join?id=${assessmentId}`;
      await navigator.clipboard.writeText(shareableLink);
      setCopiedAsmtId(assessmentId);
      setTimeout(() => setCopiedAsmtId(null), 2000);
    } catch (err) {
      console.error("Failed to copy shareable link", err);
    }
  };

  const fetchAssessments = async () => {
    setLoading(true);
    setError("");
    try {
      const [assessmentsData, subjectsData, classesData] = await Promise.all([
        assessmentService.getAll(),
        subjectService.getAll(),
        classService.getAll(),
      ]);
      setAssessments(assessmentsData);
      setClasses(classesData);
      setSubjects(subjectsData);

      const subMap: Record<string, string> = {};
      subjectsData.forEach((sub) => {
        subMap[sub.id] = sub.name;
      });
      setSubjectsMap(subMap);

      const clsMap: Record<string, string> = {};
      classesData.forEach((cls) => {
        clsMap[cls.id] = `${cls.name} (${cls.section})`;
      });
      setClassesMap(clsMap);
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to load assessments."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
        <div className="spinner" style={{ marginBottom: "1rem" }}></div>
        Loading assessments...
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

  const filteredAssessments = assessments.filter((item) => {
    const matchesSearch = !searchTerm || item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = !selectedClassFilter || String(item.classId) === selectedClassFilter;
    const matchesSubject = !selectedSubjectFilter || String(item.subjectId) === selectedSubjectFilter;
    return matchesSearch && matchesClass && matchesSubject;
  });

  const sortedAssessments = [...filteredAssessments].sort((a, b) => {
    if (sortBy === "title-asc") {
      return a.title.localeCompare(b.title);
    } else if (sortBy === "title-desc") {
      return b.title.localeCompare(a.title);
    } else if (sortBy === "date-asc") {
      return (a.date || "").localeCompare(b.date || "");
    } else if (sortBy === "date-desc") {
      return (b.date || "").localeCompare(a.date || "");
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedAssessments.length / pageSize);
  const paginatedAssessments = sortedAssessments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (assessments.length === 0) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)" }}>
        No assessments configured.
      </div>
    );
  }

  return (
    <>
      <div style={styles.filterSection}>
        <div style={styles.searchContainer}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={styles.searchIcon}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search assessments by title..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={styles.searchInput}
          />
        </div>

        <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={selectedClassFilter}
            onChange={(e) => {
              setSelectedClassFilter(e.target.value);
              setCurrentPage(1);
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

          <select
            value={selectedSubjectFilter}
            onChange={(e) => {
              setSelectedSubjectFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={styles.filterSelect}
          >
            <option value="">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
          </select>
        </div>
      </div>
      <div style={styles.tableWrapper} className="card">
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.th}>Assessment Title</th>
              <th style={styles.th}>Subject</th>
              <th style={styles.th}>Assigned Class</th>
              <th style={styles.th}>Assigned Students</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAssessments.length === 0 ? (
              <tr style={styles.row}>
                <td colSpan={7} style={{ ...styles.td, textAlign: "center", color: "var(--text-secondary)", padding: "3rem" }}>
                  No assessments match the selected search or filters.
                </td>
              </tr>
            ) : (
              paginatedAssessments.map((item) => (
                <tr key={item.id} style={styles.row}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{item.title}</td>
                  <td style={styles.td}>{subjectsMap[item.subjectId] || `Subject #${item.subjectId}`}</td>
                  <td style={styles.td}>{classesMap[item.classId] || `Class #${item.classId}`}</td>
                  <td style={styles.td}>
                    <button
                      onClick={() => {
                        setSelectedAssessmentForView(item);
                        setIsViewModalOpen(true);
                      }}
                      style={styles.assignedBadgeBtn}
                    >
                      {item.assignedStudents?.length || 0} Assigned
                    </button>
                  </td>
                  <td style={styles.td}>{item.date || "N/A"}</td>
                  <td style={styles.td}>
                    <span 
                      style={{
                        ...styles.badge,
                        backgroundColor: 
                          item.status === "Active" ? "var(--warning-light)" : 
                          item.status === "Completed" ? "var(--success-light)" : "var(--bg-surface-hover)",
                        color: 
                          item.status === "Active" ? "var(--warning)" : 
                          item.status === "Completed" ? "var(--success)" : "var(--text-secondary)",
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
                      {item.status === "Completed" ? (
                        <Link href={`/reports/${item.id}`} style={styles.actionBtn}>
                          View Report
                        </Link>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleAssignClick(item)}
                            style={styles.assignBtn}
                          >
                            Assign Student
                          </button>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>|</span>
                          <button 
                            onClick={() => handleCopyShareableLink(item.id)}
                            style={{
                              ...styles.shareBtn,
                              color: copiedAsmtId === item.id ? "var(--success)" : "var(--primary)"
                            }}
                          >
                            {copiedAsmtId === item.id ? "Copied!" : "Copy Share Link"}
                          </button>
                        </>
                      )}
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
            Showing {sortedAssessments.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
            {Math.min(currentPage * pageSize, sortedAssessments.length)} of {sortedAssessments.length} assessments
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

      <AssignAssessmentModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          fetchAssessments();
        }}
        assessment={selectedAssessment}
        classNamePrefill={selectedAssessment ? (classesMap[selectedAssessment.classId] || "") : ""}
      />

      <ViewAssignmentsModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        assessment={selectedAssessmentForView}
        onViewReport={(interviewId) => {
          setSelectedInterviewId(interviewId);
          setIsViewModalOpen(false);
          setIsReportModalOpen(true);
        }}
      />

      <StudentReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setIsViewModalOpen(true);
        }}
        interviewId={selectedInterviewId}
      />
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
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
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.9rem",
    textDecoration: "none",
  },
  assignedBadgeBtn: {
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
    border: "1px solid rgba(139, 124, 251, 0.15)",
    borderRadius: "12px",
    padding: "0.25rem 0.6rem",
    fontSize: "0.82rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  assignBtn: {
    color: "var(--primary)",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.9rem",
    backgroundColor: "transparent",
    border: "none",
    padding: 0,
    textDecoration: "none",
    transition: "color var(--transition-fast)",
  },
  shareBtn: {
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.9rem",
    backgroundColor: "transparent",
    border: "none",
    padding: 0,
    textDecoration: "none",
    transition: "color var(--transition-fast)",
  },
  filterSection: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1rem",
    flexWrap: "wrap",
    width: "100%",
  },
  searchContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    maxWidth: "350px",
    flex: "1 1 280px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
  },
  searchIcon: {
    position: "absolute",
    left: "12px",
    color: "var(--text-muted)",
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    padding: "0.7rem 1rem 0.7rem 2.5rem",
    border: "none",
    background: "transparent",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    outline: "none",
    borderRadius: "10px",
  },
  filterSelect: {
    padding: "0.5rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    fontSize: "0.85rem",
    outline: "none",
    cursor: "pointer",
    height: "40px",
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
