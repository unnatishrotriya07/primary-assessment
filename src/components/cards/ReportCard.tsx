import React, { useState } from "react";

interface ReportCardProps {
  reportId: string;
  studentName: string;
  score: number;
  grade: string;
  duration: string;
  accuracy: number;
  feedback?: string;
  evaluatedAnswers?: {
    question: string;
    studentAnswer: string;
    expectedAnswer: string;
    questionType: string;
    isCorrect: boolean;
    explanation?: string;
  }[];
}

export default function ReportCard({
  reportId,
  studentName,
  score,
  grade,
  duration,
  accuracy,
  feedback,
  evaluatedAnswers,
}: ReportCardProps) {
  const [showQA, setShowQA] = useState(false);
  return (
    <div className="card" style={styles.card}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.studentName}>{studentName}</h3>
          <span style={styles.id}>Report Reference: #{reportId}</span>
        </div>
        <div style={styles.gradeContainer}>
          <span style={styles.gradeLabel}>Grade</span>
          <span style={styles.grade}>{grade}</span>
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.grid}>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Total Score</span>
          <span style={styles.metricValue}>{score}%</span>
          <div style={styles.barBg}>
            <div style={{ ...styles.barFill, width: `${score}%`, backgroundColor: "var(--primary)" }} />
          </div>
        </div>

        <div style={styles.metric}>
          <span style={styles.metricLabel}>Accuracy Rate</span>
          <span style={styles.metricValue}>{accuracy}%</span>
          <div style={styles.barBg}>
            <div style={{ ...styles.barFill, width: `${accuracy}%`, backgroundColor: "var(--success)" }} />
          </div>
        </div>
      </div>

      {feedback && (
        <div style={styles.feedbackBox}>
          <h4 style={styles.feedbackTitle}>AI Feedback & Guidance</h4>
          <p style={styles.feedbackText}>{feedback}</p>
        </div>
      )}

      {evaluatedAnswers && evaluatedAnswers.length > 0 && (
        <div style={{ marginTop: "0.5rem" }}>
          <button
            onClick={() => setShowQA(!showQA)}
            style={{
              padding: "0.6rem 1.2rem",
              backgroundColor: "var(--primary-light)",
              color: "var(--primary)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              borderRadius: "var(--radius-sm)",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              width: "100%",
              justifyContent: "center",
              fontSize: "0.9rem",
              transition: "all 0.2s"
            }}
          >
            {showQA ? "Hide Detailed Q&A Review" : "View Detailed Q&A Review"}
          </button>
          
          {showQA && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.2rem" }}>
              {evaluatedAnswers.map((item, idx) => (
                <div key={idx} style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)",
                  padding: "1rem",
                  backgroundColor: "var(--bg-glass)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  textAlign: "left"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)" }}>
                      Question {idx + 1} ({item.questionType === "mcq" ? "MCQ" : "TITA"})
                    </span>
                    <span style={{
                      padding: "0.2rem 0.5rem",
                      borderRadius: "12px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      backgroundColor: item.isCorrect ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                      color: item.isCorrect ? "var(--success)" : "var(--error)",
                      border: item.isCorrect ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
                    }}>
                      {item.isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                    {item.question}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "0.25rem", fontSize: "0.85rem" }}>
                    <div style={{ flex: "1 1 200px" }}>
                      <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Student's Answer:</span>{" "}
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
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", borderTop: "1px dashed var(--border-color)", paddingTop: "0.5rem", marginTop: "0.25rem", fontStyle: "italic", margin: 0 }}>
                      <strong>Feedback:</strong> {item.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={styles.footer}>
        <div style={styles.metaItem}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Completion Duration: {duration}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    width: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  studentName: {
    fontSize: "1.3rem",
    fontWeight: 700,
  },
  id: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
  },
  gradeContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "var(--primary-light)",
    padding: "0.5rem 1rem",
    borderRadius: "var(--radius-sm)",
  },
  gradeLabel: {
    fontSize: "0.7rem",
    fontWeight: 700,
    textTransform: "uppercase",
    color: "var(--primary)",
  },
  grade: {
    fontSize: "1.5rem",
    fontWeight: 800,
    color: "var(--primary)",
  },
  divider: {
    height: "1px",
    backgroundColor: "var(--border-color)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "2rem",
  },
  metric: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  metricLabel: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    fontWeight: 600,
  },
  metricValue: {
    fontSize: "1.6rem",
    fontWeight: 800,
  },
  barBg: {
    height: "6px",
    backgroundColor: "var(--border-color)",
    borderRadius: "9999px",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    marginTop: "0.5rem",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
  },
  feedbackBox: {
    backgroundColor: "var(--bg-app)",
    border: "1px solid var(--border-color)",
    padding: "1.2rem",
    borderRadius: "var(--radius-md)",
    textAlign: "left",
    width: "100%",
  },
  feedbackTitle: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "var(--primary)",
    marginBottom: "0.4rem",
  },
  feedbackText: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },
};
