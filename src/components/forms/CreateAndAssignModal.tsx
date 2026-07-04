"use client";

import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Button from "../common/Button";
import assessmentService from "@/services/assessment.service";
import { extractErrorMessage } from "@/utils/helpers";
import { AssessmentData } from "@/types/assessment.types";

interface CreateAndAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: number;
  subjectId: number;
  questionsCount: number;
  defaultTitle: string;
  classNamePrefill?: string;
  questionIds?: number[];
}

export default function CreateAndAssignModal({
  isOpen,
  onClose,
  classId,
  subjectId,
  questionsCount,
  defaultTitle,
  classNamePrefill = "",
  questionIds = [],
}: CreateAndAssignModalProps) {
  const [assessmentTitle, setAssessmentTitle] = useState(defaultTitle || "");
  const [studentClass, setStudentClass] = useState(classNamePrefill || "");
  const [questionsToAsk, setQuestionsToAsk] = useState<number>(5);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<AssessmentData | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync prefill values when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setAssessmentTitle(defaultTitle || "");
      setStudentClass(classNamePrefill || "");
      setError("");
      setSuccessData(null);
      setCopied(false);
      setQuestionsToAsk(5);
    }
  }, [isOpen, defaultTitle, classNamePrefill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!(assessmentTitle || "").trim()) {
      setError("Assessment Title is required.");
      return;
    }

    setLoading(true);
    try {
      // Create the Assessment
      const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const createdAssessment = await assessmentService.create({
        title: (assessmentTitle || "").trim(),
        subjectId,
        classId,
        status: "Active",
        date: todayStr,
        questionsCount,
        questionIds,
        questionsToAsk,
      });

      setSuccessData(createdAssessment);
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to create assessment."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={successData ? "Your assessment is ready to assign" : "Create Assessment"}
    >
      {successData ? (
        <div style={styles.successContainer} className="animate-fade-in">
          <div style={styles.successHeader}>
            <div style={styles.successIcon}>✓</div>
            <h4 style={styles.successTitle}>Your assessment is ready to assign.</h4>
            <p style={styles.successSubtitle}>
              The assessment is active. Students can verify themselves and take it via the shareable link.
            </p>
          </div>

          <div style={styles.detailsGrid}>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Title</span>
              <span style={styles.detailValue}>{successData.title}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Class</span>
              <span style={styles.detailValue}>{studentClass || "N/A"}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Total Questions Pool</span>
              <span style={styles.detailValue}>{questionsCount}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Questions to Ask</span>
              <span style={styles.detailValue}>{questionsToAsk}</span>
            </div>
          </div>

          <div style={styles.linkContainer}>
            <label style={styles.fieldLabel}>Class Shareable Link (Expires in 24 hours)</label>
            <div style={styles.linkInputWrapper}>
              <input
                type="text"
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/assessment/join?id=${successData.id}`}
                style={styles.linkInput}
              />
              <Button
                onClick={async () => {
                  try {
                    const link = `${window.location.origin}/assessment/join?id=${successData.id}`;
                    await navigator.clipboard.writeText(link);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch (err) {
                    console.error("Failed to copy link", err);
                  }
                }}
                variant={copied ? "success" : "primary"}
                style={{ borderRadius: "0 var(--radius-sm) var(--radius-sm) 0", minWidth: "90px" }}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
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

          <div style={styles.sectionHeader}>Assessment Settings</div>
          
          <Input
            label="Assessment Title"
            placeholder="e.g. Science - Chapter 1 Diagnostic"
            value={assessmentTitle}
            onChange={(e) => setAssessmentTitle(e.target.value)}
            required
            disabled={loading}
          />

          <Input
            label="Questions to Ask Each Student (5 to 10)"
            type="number"
            min={5}
            max={10}
            value={questionsToAsk}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                setQuestionsToAsk(val);
              }
            }}
            required
            disabled={loading}
          />

          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "-0.5rem" }}>
            This assessment will include the <strong>{questionsCount} questions</strong> you just saved.
          </div>

          <div style={styles.actions}>
            <Button variant="secondary" onClick={onClose} type="button" disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Assessment
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
    gap: "1rem",
    maxHeight: "80vh",
    overflowY: "auto",
    paddingRight: "0.3rem",
  },
  sectionHeader: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "var(--primary)",
    borderBottom: "1px solid var(--border-color)",
    paddingBottom: "0.3rem",
    marginTop: "0.5rem",
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
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.8rem",
    marginTop: "1rem",
    borderTop: "1px solid var(--border-color)",
    paddingTop: "1rem",
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
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "0.8rem",
    backgroundColor: "var(--bg-surface-hover)",
    padding: "1rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
  },
  detailItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.15rem",
  },
  detailLabel: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    fontWeight: 600,
  },
  detailValue: {
    fontSize: "0.9rem",
    fontWeight: 500,
    color: "var(--text-primary)",
  },
  fieldLabel: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    display: "block",
    marginBottom: "0.4rem",
  },
  linkContainer: {
    width: "100%",
  },
  linkInputWrapper: {
    display: "flex",
    width: "100%",
  },
  linkInput: {
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
  successActions: {
    marginTop: "0.5rem",
  },
};
