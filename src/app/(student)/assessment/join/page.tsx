"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import assessmentService, { AssessmentJoinInfoResponse } from "@/services/assessment.service";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { extractErrorMessage } from "@/utils/helpers";

function JoinAssessmentForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const assessmentId = searchParams.get("id");

  const [joinInfo, setJoinInfo] = useState<AssessmentJoinInfoResponse | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [infoError, setInfoError] = useState("");

  const [studentName, setStudentName] = useState("");
  const [scholarNumber, setScholarNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!assessmentId) {
      setInfoError("Invalid request. Assessment ID is missing in the URL.");
      setLoadingInfo(false);
      return;
    }

    const fetchInfo = async () => {
      try {
        const info = await assessmentService.getJoinInfo(assessmentId);
        setJoinInfo(info);
      } catch (err) {
        setInfoError(extractErrorMessage(err, "Failed to load assessment details."));
      } finally {
        setLoadingInfo(false);
      }
    };

    fetchInfo();
  }, [assessmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!assessmentId) return;
    if (!studentName.trim() || !scholarNumber.trim()) {
      setSubmitError("Please fill in both name and scholar ID.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await assessmentService.joinVerify({
        assessmentId: Number(assessmentId),
        scholarNumber: scholarNumber.trim(),
        studentName: studentName.trim(),
      });

      // Redirect student to the verify endpoint, which will auto-start their test session
      const encodedEmail = encodeURIComponent(response.studentEmail);
      router.push(`/assessment/verify?token=${response.token}&email=${encodedEmail}`);
    } catch (err: any) {
      setSubmitError(extractErrorMessage(err, "Verification failed. Student details not found for this class."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInfo) {
    return (
      <div style={styles.loadingWrapper}>
        <div className="spinner" style={{ marginBottom: "1rem" }}></div>
        <p style={{ color: "var(--text-secondary)" }}>Loading assessment context...</p>
      </div>
    );
  }

  if (infoError) {
    return (
      <div style={styles.cardContainer}>
        <div className="glass-panel" style={{ ...styles.card, borderColor: "var(--error)" }}>
          <div style={styles.errorIcon}>✕</div>
          <h2 style={{ ...styles.title, color: "var(--error)" }}>Error Joining Assessment</h2>
          <p style={styles.subtitle}>{infoError}</p>
        </div>
      </div>
    );
  }

  if (joinInfo?.isExpired) {
    return (
      <div style={styles.cardContainer}>
        <div className="glass-panel" style={{ ...styles.card, borderColor: "var(--warning)" }}>
          <div style={styles.warningIcon}>⚠️</div>
          <h2 style={styles.title}>Assessment Link Expired</h2>
          <p style={styles.subtitle}>
            This assessment shareable link was only valid for 24 hours from creation. Please ask your class teacher to assign it again.
          </p>
          <div style={styles.detailsGrid}>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Title</span>
              <span style={styles.detailValue}>{joinInfo.title}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Class</span>
              <span style={styles.detailValue}>{joinInfo.className}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.cardContainer}>
      <div className="glass-panel animate-fade-in" style={styles.card}>
        <h2 style={styles.title}>Join Class Assessment</h2>
        <p style={styles.subtitle}>
          Please enter your credentials to verify your enrollment in the target class and start the test.
        </p>

        <div style={styles.detailsGrid}>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Assessment</span>
            <span style={styles.detailValue}>{joinInfo?.title}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Class</span>
            <span style={styles.detailValue}>{joinInfo?.className}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Subject</span>
            <span style={styles.detailValue}>{joinInfo?.subjectName}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Questions</span>
            <span style={styles.detailValue}>{joinInfo?.questionsCount} Qs</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {submitError && <div style={styles.errorBanner}>{submitError}</div>}

          <Input
            label="Your Scholar ID / Admission No."
            placeholder="e.g. S101, SCH-1293"
            value={scholarNumber}
            onChange={(e) => setScholarNumber(e.target.value)}
            required
            disabled={submitting}
          />

          <Input
            label="Your Full Name (Registered)"
            placeholder="e.g. John Doe"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            required
            disabled={submitting}
          />

          <Button type="submit" loading={submitting} style={{ width: "100%", marginTop: "1rem" }}>
            Verify & Start Assessment
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function JoinAssessmentPage() {
  return (
    <Suspense fallback={
      <div style={styles.loadingWrapper}>
        <div className="spinner" style={{ marginBottom: "1rem" }}></div>
        <p style={{ color: "var(--text-secondary)" }}>Initializing...</p>
      </div>
    }>
      <JoinAssessmentForm />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loadingWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    width: "100vw",
    backgroundColor: "var(--bg-app)",
  },
  cardContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    width: "100vw",
    padding: "2rem",
    backgroundColor: "var(--bg-app)",
  },
  card: {
    width: "100%",
    maxWidth: "520px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-lg)",
    padding: "2.5rem",
    boxShadow: "var(--shadow-md)",
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
  },
  title: {
    fontSize: "1.6rem",
    fontWeight: 800,
    color: "var(--text-primary)",
    textAlign: "center",
    margin: 0,
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    textAlign: "center",
    margin: 0,
    lineHeight: "1.5",
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "0.8rem",
    backgroundColor: "var(--bg-surface-hover)",
    padding: "1rem 1.2rem",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border-color)",
    width: "100%",
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
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    width: "100%",
  },
  errorBanner: {
    padding: "0.8rem 1rem",
    backgroundColor: "var(--error-light)",
    color: "var(--error)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.85rem",
    fontWeight: 500,
    border: "1px solid rgba(239, 68, 68, 0.2)",
    width: "100%",
  },
  errorIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "var(--error-light)",
    color: "var(--error)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.8rem",
    fontWeight: "bold",
    margin: "0 auto",
  },
  warningIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "var(--warning-light)",
    color: "var(--warning)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.8rem",
    margin: "0 auto",
  },
};
