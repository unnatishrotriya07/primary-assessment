"use client";

import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import assessmentService, { StudentAssessmentResponse } from "@/services/assessment.service";
import studentService from "@/services/student.service";
import { AssessmentData } from "@/types/assessment.types";
import { StudentData } from "@/types/student.types";
import { extractErrorMessage } from "@/utils/helpers";

interface AssignAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: AssessmentData | null;
  classNamePrefill?: string;
}

export default function AssignAssessmentModal({
  isOpen,
  onClose,
  assessment,
  classNamePrefill = "",
}: AssignAssessmentModalProps) {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentsSearch, setStudentsSearch] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<StudentAssessmentResponse[] | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedClassLink, setCopiedClassLink] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync and fetch student roster when modal opens
  useEffect(() => {
    let active = true;
    if (isOpen && assessment && assessment.classId) {
      setSelectedStudentIds([]);
      setStudentsSearch("");
      setError("");
      setSuccessData(null);
      setCopiedAll(false);
      setCopiedClassLink(false);
      setCopiedId(null);

      const fetchStudents = async () => {
        setLoadingStudents(true);
        try {
          const res = await studentService.getByClass(String(assessment.classId));
          if (active) {
            setStudents(res);
            // Default select all students in the class
            setSelectedStudentIds(res.map(s => Number(s.id)));
          }
        } catch (err) {
          console.error("Failed to fetch students for class", err);
        } finally {
          if (active) {
            setLoadingStudents(false);
          }
        }
      };
      fetchStudents();
    }
    return () => {
      active = false;
    };
  }, [isOpen, assessment]);

  if (!assessment) return null;

  const handleCopyLink = async (link: string, id: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  const handleCopyAllLinks = async () => {
    if (!successData) return;
    try {
      const allLinks = successData
        .map(sa => `${sa.studentName}: ${sa.assessmentLink}`)
        .join("\n");
      await navigator.clipboard.writeText(allLinks);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error("Failed to copy all links", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (selectedStudentIds.length === 0) {
      setError("Please select at least one student to assign the assessment.");
      return;
    }

    setLoading(true);
    try {
      const res = await assessmentService.assignAssessmentBulk({
        assessmentId: Number(assessment.id),
        studentIds: selectedStudentIds,
      });
      setSuccessData(res);
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to assign assessment."));
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const query = studentsSearch.toLowerCase();
    return (
      s.name.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query) ||
      s.scholarNumber.toLowerCase().includes(query)
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={successData ? "Assessment Link Generated" : `Assign Assessment: ${assessment.title}`}
      size={successData ? "medium" : "large"}
    >
      {successData ? (
        <div style={styles.successContainer} className="animate-fade-in">
          <div style={styles.successHeader}>
            <div style={styles.successIcon}>✓</div>
            <h4 style={styles.successTitle}>Successfully Assigned!</h4>
            <p style={styles.successSubtitle}>
              Simulated invitation emails have been logged and prepared for {successData.length} students.
            </p>
          </div>

          <div style={styles.bulkAssignSummary}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Class</span>
              <span style={styles.summaryValue}>{successData[0]?.studentClass || classNamePrefill}</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Assigned Students</span>
              <span style={styles.summaryValue}>{successData.length}</span>
            </div>
            <div style={{ ...styles.summaryItem, gridColumn: "span 2" }}>
              <Button
                onClick={handleCopyAllLinks}
                variant={copiedAll ? "success" : "primary"}
                style={{ width: "100%", fontSize: "0.85rem", height: "38px" }}
              >
                {copiedAll ? "All Links Copied!" : "Copy All Invitation Links"}
              </Button>
            </div>
          </div>

          <div style={{ ...styles.sectionHeader, marginTop: "0.5rem" }}>
            Class Shareable Link (All Students)
          </div>
          <div style={styles.shareableLinkWrapper}>
            <input
              type="text"
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/assessment/join?id=${successData[0]?.assessmentId}`}
              style={styles.shareableLinkInput}
            />
            <Button
              onClick={async () => {
                try {
                  const link = `${window.location.origin}/assessment/join?id=${successData[0]?.assessmentId}`;
                  await navigator.clipboard.writeText(link);
                  setCopiedClassLink(true);
                  setTimeout(() => setCopiedClassLink(false), 2000);
                } catch (err) {
                  console.error("Failed to copy link", err);
                }
              }}
              variant={copiedClassLink ? "success" : "primary"}
              style={{ borderRadius: "0 var(--radius-sm) var(--radius-sm) 0", minWidth: "90px", height: "43px" }}
              type="button"
            >
              {copiedClassLink ? "Copied!" : "Copy Link"}
            </Button>
          </div>

          <div style={{ ...styles.sectionHeader, marginTop: "0.5rem" }}>
            Student Access Links
          </div>

          <div style={styles.linksTableContainer}>
            <table style={styles.linksTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Student Name</th>
                  <th style={styles.th}>Email Address</th>
                  <th style={styles.th}>Assessment URL / Action</th>
                </tr>
              </thead>
              <tbody>
                {successData.map((sa) => {
                  const isCopied = copiedId === String(sa.id);
                  return (
                    <tr key={sa.id} style={styles.tableRow}>
                      <td style={styles.td}>{sa.studentName}</td>
                      <td style={styles.td}>{sa.studentEmail}</td>
                      <td style={styles.td}>
                        <Button
                          onClick={() => handleCopyLink(sa.assessmentLink, String(sa.id))}
                          variant={isCopied ? "success" : "secondary"}
                          style={styles.copyCellBtn}
                        >
                          {isCopied ? "Copied!" : "Copy Link"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={styles.successActions}>
            <Button onClick={onClose} variant="secondary" style={{ width: "100%" }}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.errorBanner}>{error}</div>}

          <div style={{ ...styles.sectionHeader, marginTop: "0.5rem" }}>
            Select Students ({selectedStudentIds.length} Selected)
          </div>

          <div style={styles.studentControlsRow}>
            <input
              type="text"
              placeholder="Search students by name, email, or scholar ID..."
              value={studentsSearch}
              onChange={(e) => setStudentsSearch(e.target.value)}
              style={styles.studentSearchInput}
            />
            <div style={styles.studentBatchActions}>
              <button
                type="button"
                onClick={() => {
                  const filteredIds = filteredStudents.map(s => Number(s.id));
                  setSelectedStudentIds(prev => Array.from(new Set([...prev, ...filteredIds])));
                }}
                style={styles.textLinkButton}
              >
                Select All Matching
              </button>
              <span style={{ color: "var(--border-color)" }}>|</span>
              <button
                type="button"
                onClick={() => {
                  const filteredIds = filteredStudents.map(s => Number(s.id));
                  setSelectedStudentIds(prev => prev.filter(id => !filteredIds.includes(id)));
                }}
                style={styles.textLinkButton}
              >
                Deselect All Matching
              </button>
            </div>
          </div>

          <div style={styles.studentListContainer}>
            {loadingStudents ? (
              <div style={styles.emptyState}>
                <div className="spinner" style={{ marginBottom: "1rem" }}></div>
                Loading student records...
              </div>
            ) : students.length === 0 ? (
              <div style={styles.emptyState}>
                No students found in this class. Please upload students first.
              </div>
            ) : (
              <div style={styles.studentGrid}>
                {filteredStudents.map(s => {
                  const isChecked = selectedStudentIds.includes(Number(s.id));
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        const idNum = Number(s.id);
                        setSelectedStudentIds(prev =>
                          prev.includes(idNum)
                            ? prev.filter(id => id !== idNum)
                            : [...prev, idNum]
                        );
                      }}
                      style={{
                        ...styles.studentCard,
                        borderColor: isChecked ? "var(--primary)" : "var(--border-color)",
                        backgroundColor: isChecked ? "var(--primary-light)" : "var(--bg-card)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by card onClick
                        style={styles.checkbox}
                      />
                      {s.pictureUrl ? (
                        <img
                          src={s.pictureUrl}
                          alt={s.name}
                          style={styles.studentAvatar}
                        />
                      ) : (
                        <div style={styles.studentAvatarInitials}>
                          {s.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                      )}
                      <div style={styles.studentCardInfo}>
                        <div style={styles.studentName}>{s.name}</div>
                        <div style={styles.studentEmail}>{s.email}</div>
                        <div style={styles.studentScholar}>Scholar ID: {s.scholarNumber}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={styles.actions}>
            <Button variant="secondary" onClick={onClose} type="button" disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading} disabled={selectedStudentIds.length === 0}>
              Assign Student ({selectedStudentIds.length})
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
  },
  errorBanner: {
    padding: "0.8rem 1rem",
    backgroundColor: "var(--error-light)",
    color: "var(--error)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.85rem",
    fontWeight: 500,
    border: "1px solid rgba(239, 68, 68, 0.2)",
  },
  sectionHeader: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "var(--primary)",
    borderBottom: "1px solid var(--border-color)",
    paddingBottom: "0.3rem",
    marginTop: "0.5rem",
  },
  studentListContainer: {
    maxHeight: "300px",
    overflowY: "auto",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    padding: "1rem",
    backgroundColor: "var(--bg-app)",
  },
  studentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "1rem",
  },
  studentCard: {
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    padding: "0.8rem",
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  studentAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    objectFit: "cover",
  },
  studentAvatarInitials: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.85rem",
    fontWeight: 700,
  },
  studentCardInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "0.1rem",
    overflow: "hidden",
  },
  studentName: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  studentEmail: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  studentScholar: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
  studentControlsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    flexWrap: "wrap",
  },
  studentSearchInput: {
    flex: 1,
    minWidth: "200px",
    padding: "0.6rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
  },
  studentBatchActions: {
    display: "flex",
    gap: "0.6rem",
    alignItems: "center",
    fontSize: "0.85rem",
  },
  textLinkButton: {
    background: "none",
    border: "none",
    color: "var(--primary)",
    cursor: "pointer",
    padding: 0,
    fontSize: "inherit",
    fontWeight: 600,
  },
  checkbox: {
    width: "16px",
    height: "16px",
    cursor: "pointer",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.8rem",
    marginTop: "0.5rem",
  },
  successContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
  },
  successHeader: {
    textAlign: "center",
    padding: "0.5rem 0",
  },
  successIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "var(--success-light)",
    color: "var(--success)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.5rem",
    fontWeight: "bold",
    margin: "0 auto 0.8rem",
  },
  successTitle: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: "0.4rem",
  },
  successSubtitle: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
  },
  bulkAssignSummary: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "1rem",
    backgroundColor: "var(--bg-surface-hover)",
    padding: "1rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
  },
  summaryItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.2rem",
  },
  summaryLabel: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    fontWeight: 600,
  },
  summaryValue: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  shareableLinkWrapper: {
    display: "flex",
    width: "100%",
  },
  shareableLinkInput: {
    flex: 1,
    padding: "0.7rem 1rem",
    border: "1px solid var(--border-color)",
    borderRight: "none",
    borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
    outline: "none",
  },
  linksTableContainer: {
    maxHeight: "200px",
    overflowY: "auto",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    marginTop: "0.5rem",
  },
  linksTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.85rem",
  },
  th: {
    position: "sticky",
    top: 0,
    backgroundColor: "var(--bg-surface-hover)",
    borderBottom: "1px solid var(--border-color)",
    padding: "0.6rem 0.8rem",
    textAlign: "left",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  tableRow: {
    borderBottom: "1px solid var(--border-color)",
  },
  td: {
    padding: "0.6rem 0.8rem",
    color: "var(--text-primary)",
  },
  copyCellBtn: {
    padding: "0.3rem 0.6rem",
    fontSize: "0.75rem",
    borderRadius: "var(--radius-xs)",
  },
  emptyState: {
    textAlign: "center",
    padding: "2rem",
    color: "var(--text-secondary)",
    fontSize: "0.9rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  successActions: {
    marginTop: "0.5rem",
  },
};
