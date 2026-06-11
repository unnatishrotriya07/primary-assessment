"use client";

import React, { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { AssessmentData, StudentAssignmentData } from "@/types/assessment.types";

interface ViewAssignmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: AssessmentData | null;
  onViewReport: (interviewId: number) => void;
}

export default function ViewAssignmentsModal({
  isOpen,
  onClose,
  assessment,
  onViewReport,
}: ViewAssignmentsModalProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  if (!assessment) return null;

  const handleCopyLink = async (student: StudentAssignmentData) => {
    const baseOrigin = window.location.origin;
    const encodedEmail = encodeURIComponent(student.studentEmail);
    const link = `${baseOrigin}/assessment/verify?token=${student.token}&email=${encodedEmail}`;

    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(student.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return { bg: "var(--success-light)", color: "var(--success)" };
      case "Started":
        return { bg: "var(--primary-light)", color: "var(--primary)" };
      case "Expired":
        return { bg: "var(--error-light)", color: "var(--error)" };
      default:
        return { bg: "var(--bg-surface-hover)", color: "var(--text-secondary)" };
    }
  };

  const students = assessment.assignedStudents || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assigned Students: ${assessment.title}`}
      size="large"
    >
      <div style={styles.container}>
        {students.length === 0 ? (
          <div style={styles.emptyState}>
            No students have been assigned to this assessment yet.
          </div>
        ) : (
          <div style={styles.tableWrapper} className="card">
            <table style={styles.table}>
              <thead>
                <tr style={styles.headerRow}>
                  <th style={styles.th}>Student Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Score</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const statusStyle = getStatusColor(student.status);
                  const isCompleted = student.status === "Completed";
                  const scoreDisplay = isCompleted && student.interview?.overallScore !== undefined
                    ? `${Math.round(student.interview.overallScore)}% (${student.interview.grade || "-"})`
                    : "-";

                  return (
                    <tr key={student.id} style={styles.row}>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{student.studentName}</td>
                      <td style={styles.td}>{student.studentEmail}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.badge,
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color,
                          }}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td style={{ ...styles.td, fontWeight: isCompleted ? 600 : 400 }}>{scoreDisplay}</td>
                      <td style={styles.td}>
                        {isCompleted && student.interview?.id ? (
                          <button
                            onClick={() => onViewReport(student.interview!.id)}
                            style={styles.viewReportBtn}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ marginRight: "0.25rem" }}
                            >
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            View Report
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCopyLink(student)}
                            style={{
                              ...styles.copyBtn,
                              color: copiedId === student.id ? "var(--success)" : "var(--primary)",
                            }}
                            disabled={student.status === "Expired"}
                          >
                            {copiedId === student.id ? "Copied!" : "Copy Link"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={styles.footerActions}>
          <Button onClick={onClose} variant="secondary" style={{ width: "100%" }}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    width: "100%",
    minWidth: "650px",
  },
  emptyState: {
    padding: "3rem",
    textAlign: "center",
    color: "var(--text-secondary)",
    border: "1px dashed var(--border-color)",
    borderRadius: "var(--radius-md)",
  },
  tableWrapper: {
    padding: 0,
    overflowX: "auto",
    border: "1px solid var(--border-color)",
    maxHeight: "350px",
    overflowY: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  headerRow: {
    backgroundColor: "var(--bg-surface-hover)",
    borderBottom: "1px solid var(--border-color)",
    position: "sticky",
    top: 0,
    zIndex: 1,
  },
  th: {
    padding: "0.8rem 1rem",
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    backgroundColor: "var(--bg-surface-hover)",
  },
  row: {
    borderBottom: "1px solid var(--border-color)",
  },
  td: {
    padding: "0.8rem 1rem",
    fontSize: "0.88rem",
    color: "var(--text-primary)",
  },
  badge: {
    display: "inline-flex",
    padding: "0.2rem 0.5rem",
    borderRadius: "9999px",
    fontSize: "0.7rem",
    fontWeight: 600,
  },
  viewReportBtn: {
    display: "inline-flex",
    alignItems: "center",
    color: "var(--primary)",
    background: "none",
    border: "none",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    padding: "0.2rem 0.4rem",
    borderRadius: "var(--radius-sm)",
    transition: "background-color 0.2s",
  },
  copyBtn: {
    background: "none",
    border: "none",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    padding: "0.2rem 0.4rem",
  },
  footerActions: {
    marginTop: "0.5rem",
  },
};
