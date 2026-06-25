"use client";

import React, { useEffect, useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import interviewService, { InterviewReport } from "@/services/interview.service";

interface StudentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  interviewId: number | null;
}

const SKILL_CONFIG = [
  { key: "score_communication", label: "Communication", color: "var(--primary)" },
  { key: "score_numeracy", label: "Numeracy", color: "var(--secondary)" },
  { key: "score_creativity", label: "Creativity", color: "var(--accent)" },
  { key: "score_emotional_iq", label: "Emotional IQ", color: "var(--success)" },
] as const;

const REC_COLOR: Record<string, string> = {
  "Strongly Recommended": "var(--success)",
  "Recommended": "var(--primary)",
  "Needs Review": "var(--warning)",
};

export default function StudentReportModal({
  isOpen,
  onClose,
  interviewId,
}: StudentReportModalProps) {
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !interviewId) {
      setReport(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    interviewService.getReport(interviewId)
      .then((data) => {
        setReport(data);
      })
      .catch((err) => {
        console.error("Failed to fetch interview report", err);
        setError("Failed to load report. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, interviewId]);

  if (!interviewId) return null;

  // SVG ring calculation
  const score = report ? Math.round(report.overall_score ?? 0) : 0;
  const recColor = report ? (REC_COLOR[report.recommendation ?? ""] ?? "var(--primary)") : "var(--primary)";
  const r = 50;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={report ? `${report.student_name}'s Result Report` : "Loading Report..."}
      size="large"
    >
      <div style={styles.modalBody}>
        {loading ? (
          <div style={styles.center}>
            <div className="spinner" style={{ marginBottom: "1rem" }} />
            <p>Loading report card details...</p>
          </div>
        ) : error || !report ? (
          <div style={styles.center}>
            <p style={{ color: "var(--error)" }}>{error || "Report not found."}</p>
          </div>
        ) : (
          <div style={styles.scrollableContent}>
            {/* Header banner */}
            <div style={styles.reportHeader}>
              <div style={styles.reportEmoji}>
                {score >= 80 ? "🏆" : score >= 60 ? "🌟" : "👍"}
              </div>
              <h2 style={styles.reportTitle}>{report.grade} — Interview Complete!</h2>
              <p style={styles.reportSub}>Assessed Student: {report.student_name} 🎉</p>
              {report.assessment_title && (
                <p style={styles.assessmentTitle}>
                  {report.assessment_title}
                </p>
              )}
            </div>

            {/* Overall Score */}
            <div style={styles.body}>
              <div style={styles.ringWrap}>
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ margin: "0 auto" }}>
                  <circle cx="60" cy="60" r={r} fill="none" stroke="#f0f0f0" strokeWidth="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r={r}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="10"
                    strokeDasharray={`${dash} ${circ}`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                    style={{ transition: "stroke-dasharray 1.2s ease" }}
                  />
                  <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--text-primary)">
                    {score}
                  </text>
                  <text x="60" y="72" textAnchor="middle" fontSize="11" fill="#888">
                    / 100
                  </text>
                </svg>
                <p style={styles.ringLabel}>Overall Score</p>
                <p style={styles.ringName}>{report.student_name} ({report.student_class})</p>
              </div>

              {/* Skills progress grid */}
              <div style={styles.skillGrid}>
                {SKILL_CONFIG.map(({ key, label, color }) => {
                  const val = Math.round((report[key as keyof InterviewReport] as number) ?? 0);
                  return (
                    <div key={key} style={styles.skillCard}>
                      <p style={styles.skillLabel}>{label}</p>
                      <div style={styles.barTrack}>
                        <div style={{ ...styles.barFill, width: `${val}%`, background: color }} />
                      </div>
                      <p style={styles.skillScore}>
                        {val}<span style={styles.skillOf}>/100</span>
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              {report.summary && (
                <div style={styles.feedbackBox}>
                  <p style={styles.feedbackTitle}>📝 Summary</p>
                  <p style={styles.feedbackText}>{report.summary}</p>
                </div>
              )}

              {/* Strengths */}
              {report.strengths && (
                <div style={styles.feedbackBox}>
                  <p style={styles.feedbackTitle}>✨ Strengths</p>
                  <p style={styles.feedbackText}>{report.strengths}</p>
                </div>
              )}

              {/* Areas to Grow */}
              {report.improvements && (
                <div style={{ ...styles.feedbackBox, borderLeftColor: "var(--warning)", background: "var(--warning-light)" }}>
                  <p style={{ ...styles.feedbackTitle, color: "var(--warning)" }}>🌱 Areas to Grow</p>
                  <p style={styles.feedbackText}>{report.improvements}</p>
                </div>
              )}

              {/* Recommendations */}
              {report.recommendation && (
                <div
                  style={{
                    ...styles.feedbackBox,
                    borderLeftColor: recColor,
                    background: report.recommendation === "Needs Review" ? "var(--warning-light)" : "var(--success-light)",
                  }}
                >
                  <p style={{ ...styles.feedbackTitle, color: recColor }}>📋 Admission Note</p>
                  <p style={styles.feedbackText}>
                    <strong>{report.recommendation}</strong>
                    {report.admin_note && ` — ${report.admin_note}`}
                  </p>
                </div>
              )}

              {/* Detailed Q&A Report */}
              {report.evaluated_answers && report.evaluated_answers.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <h3 style={styles.sectionHeader}>
                    Detailed Q&A Report
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {report.evaluated_answers.map((item, idx) => (
                      <div key={idx} style={styles.qaCard}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)" }}>
                            Question {idx + 1} ({item.questionType === "mcq" ? "MCQ" : "TITA"})
                          </span>
                          <span
                            style={{
                              padding: "0.2rem 0.5rem",
                              borderRadius: "12px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              backgroundColor: item.isCorrect ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                              color: item.isCorrect ? "var(--success)" : "var(--error)",
                              border: item.isCorrect ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
                            }}
                          >
                            {item.isCorrect ? "Correct" : "Incorrect"}
                          </span>
                        </div>
                        <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                          {item.question}
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "0.25rem", fontSize: "0.85rem" }}>
                          <div style={{ flex: "1 1 200px" }}>
                            <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Student Answer:</span>{" "}
                            <span style={{ color: item.isCorrect ? "var(--success)" : "var(--error)" }}>
                              {item.studentAnswer || "(No answer)"}
                            </span>
                          </div>
                          <div style={{ flex: "1 1 200px" }}>
                            <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Expected Answer:</span>{" "}
                            <span style={{ color: "var(--text-primary)" }}>{item.expectedAnswer}</span>
                          </div>
                        </div>
                        {item.explanation && (
                          <p style={styles.explanationText}>
                            <strong>Feedback:</strong> {item.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={styles.footerActions}>
        <Button onClick={onClose} variant="secondary" style={{ width: "100%" }}>
          Close Report
        </Button>
      </div>
    </Modal>
  );
}

const styles: Record<string, React.CSSProperties> = {
  modalBody: {
    width: "100%",
    minWidth: "650px",
    maxWidth: "750px",
  },
  scrollableContent: {
    maxHeight: "550px",
    overflowY: "auto",
    paddingRight: "0.5rem",
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem",
    textAlign: "center",
  },
  reportHeader: {
    background: "linear-gradient(135deg, var(--primary-light), var(--secondary-light))",
    borderRadius: "var(--radius-md)",
    padding: "1.5rem",
    textAlign: "center",
    color: "var(--text-primary)",
    marginBottom: "1.2rem",
  },
  reportEmoji: { fontSize: 36 },
  reportTitle: {
    fontSize: "1.2rem",
    fontWeight: 700,
    marginTop: "0.4rem",
  },
  reportSub: {
    opacity: 0.85,
    fontSize: "0.85rem",
    marginTop: "0.2rem",
  },
  assessmentTitle: {
    color: "var(--text-secondary)",
    fontSize: "0.8rem",
    marginTop: "0.25rem",
    fontWeight: 600,
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  ringWrap: {
    textAlign: "center",
    marginBottom: "0.5rem",
  },
  ringLabel: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    marginTop: "0.25rem",
  },
  ringName: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginTop: "0.15rem",
  },
  skillGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.75rem",
  },
  skillCard: {
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    padding: "0.85rem",
  },
  skillLabel: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    marginBottom: "0.4rem",
  },
  barTrack: {
    height: 6,
    background: "#f0f0f0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: "0.4rem",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  skillScore: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  skillOf: {
    fontSize: "0.75rem",
    fontWeight: 400,
    color: "var(--text-secondary)",
  },
  feedbackBox: {
    background: "var(--secondary-light)",
    borderRadius: "var(--radius-sm)",
    padding: "0.85rem 1rem",
    borderLeft: "4px solid var(--secondary)",
  },
  feedbackTitle: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--primary)",
    marginBottom: "0.3rem",
  },
  feedbackText: {
    fontSize: "0.85rem",
    color: "var(--text-primary)",
    lineHeight: 1.5,
  },
  sectionHeader: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: "0.8rem",
  },
  qaCard: {
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    padding: "0.85rem 1rem",
    backgroundColor: "var(--bg-glass)",
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  explanationText: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    borderTop: "1px dashed var(--border-color)",
    paddingTop: "0.4rem",
    marginTop: "0.2rem",
    fontStyle: "italic",
    margin: 0,
  },
  footerActions: {
    marginTop: "1.2rem",
  },
};
