"use client";

import React, { useState } from "react";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Button from "../common/Button";
import assessmentService, { StudentAssessmentResponse } from "@/services/assessment.service";
import { AssessmentData } from "@/types/assessment.types";

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
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState(classNamePrefill || "");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [contact, setContact] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<StudentAssessmentResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync class prefill when modal opens or assessment changes
  React.useEffect(() => {
    if (isOpen) {
      setStudentClass(classNamePrefill || "");
      setStudentName("");
      setDateOfBirth("");
      setStudentEmail("");
      setContact("");
      setError("");
      setSuccessData(null);
      setCopied(false);
    }
  }, [isOpen, classNamePrefill]);

  if (!assessment) return null;

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only accept numeric digits
    const numericValue = e.target.value.replace(/[^0-9]/g, "");
    setContact(numericValue);
  };

  const handleCopyLink = async () => {
    if (!successData) return;
    try {
      await navigator.clipboard.writeText(successData.assessmentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!(studentName || "").trim()) {
      setError("Student Name is required.");
      return;
    }
    if (!(studentClass || "").trim()) {
      setError("Class is required.");
      return;
    }
    if (!dateOfBirth) {
      setError("Date of Birth is required.");
      return;
    }
    if (!(studentEmail || "").trim()) {
      setError("Student Email is required.");
      return;
    }
    
    // Check contact length
    if ((contact || "").length < 7 || (contact || "").length > 15) {
      setError("Contact number must be between 7 and 15 digits.");
      return;
    }

    setLoading(true);
    try {
      const res = await assessmentService.assignAssessment({
        assessmentId: Number(assessment.id),
        studentName,
        studentClass,
        dateOfBirth,
        studentEmail,
        contact,
      });
      setSuccessData(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to assign assessment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={successData ? "Assessment Link Generated" : `Assign Assessment: ${assessment.title}`}
    >
      {successData ? (
        <div style={styles.successContainer} className="animate-fade-in">
          <div style={styles.successHeader}>
            <div style={styles.successIcon}>✓</div>
            <h4 style={styles.successTitle}>Successfully Assigned!</h4>
            <p style={styles.successSubtitle}>
              An invitation email has been logged and prepared for the student.
            </p>
          </div>

          <div style={styles.detailsGrid}>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Student</span>
              <span style={styles.detailValue}>{successData.studentName}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Class</span>
              <span style={styles.detailValue}>{successData.studentClass}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Date of Birth</span>
              <span style={styles.detailValue}>{successData.dateOfBirth}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Email</span>
              <span style={styles.detailValue}>{successData.studentEmail}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Contact</span>
              <span style={styles.detailValue}>{successData.contact}</span>
            </div>
          </div>

          <div style={styles.linkContainer}>
            <label style={styles.fieldLabel}>Assessment Link (Active for 24 hours)</label>
            <div style={styles.linkInputWrapper}>
              <input
                type="text"
                readOnly
                value={successData.assessmentLink}
                style={styles.linkInput}
              />
              <Button
                onClick={handleCopyLink}
                variant={copied ? "success" : "primary"}
                style={{ borderRadius: "0 var(--radius-sm) var(--radius-sm) 0", minWidth: "90px" }}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          <div style={styles.emailPreviewContainer}>
            <label style={styles.fieldLabel}>Simulated Invitation Email Preview</label>
            <pre style={styles.emailPreview}>{successData.emailContent}</pre>
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

          <Input
            label="Student Name"
            placeholder="Enter student's full name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            required
            disabled={loading}
          />

          <div style={styles.row}>
            <Input
              label="Class"
              placeholder="e.g. Grade 5A"
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              required
              disabled={loading}
            />

            <div style={styles.dobWrapper}>
              <label style={styles.dobLabel}>Date of Birth</label>
              <input
                type="date"
                style={styles.dateInput}
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <Input
            label="Student Email"
            type="email"
            placeholder="student@example.com"
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            required
            disabled={loading}
          />

          <Input
            label="Contact Number (Digits only)"
            type="tel"
            placeholder="e.g. 9876543210"
            value={contact}
            onChange={handleContactChange}
            required
            disabled={loading}
          />

          <div style={styles.actions}>
            <Button variant="secondary" onClick={onClose} type="button" disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Assign Student
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
  row: {
    display: "flex",
    gap: "1rem",
  },
  dobWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    width: "100%",
  },
  dobLabel: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  dateInput: {
    padding: "0.7rem 1rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    width: "100%",
    transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
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
  emailPreviewContainer: {
    width: "100%",
  },
  emailPreview: {
    backgroundColor: "var(--bg-app)",
    color: "var(--text-secondary)",
    padding: "1rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    fontSize: "0.8rem",
    fontFamily: "monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    maxHeight: "150px",
    overflowY: "auto",
  },
  successActions: {
    marginTop: "0.5rem",
  },
};
