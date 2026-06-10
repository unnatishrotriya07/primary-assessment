import React from "react";
import Button from "../common/Button";

interface ResultSummaryProps {
  id: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: string;
  feedback: string;
}

export default function ResultSummary({
  id,
  score,
  totalQuestions,
  correctAnswers,
  timeSpent,
  feedback,
}: ResultSummaryProps) {
  return (
    <div className="glass-panel" style={styles.container}>
      <div style={styles.iconCircle}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color: "var(--success)"}}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>

      <h2 style={styles.title}>Assessment Completed!</h2>
      <p style={styles.reference}>Reference ID: {id}</p>

      <div style={styles.divider} />

      <div style={styles.scoreRow}>
        <div style={styles.scoreBox}>
          <span style={styles.scoreVal}>{score}%</span>
          <span style={styles.scoreLabel}>Final Score</span>
        </div>

        <div style={styles.metrics}>
          <div style={styles.metric}>
            <span style={styles.metricTitle}>Correct Answers:</span>
            <span style={styles.metricValSub}>{correctAnswers} / {totalQuestions}</span>
          </div>
          <div style={styles.metric}>
            <span style={styles.metricTitle}>Time Spent:</span>
            <span style={styles.metricValSub}>{timeSpent}</span>
          </div>
        </div>
      </div>

      <div style={styles.feedbackBox}>
        <h4 style={styles.feedbackTitle}>Feedback & Guidance</h4>
        <p style={styles.feedbackText}>{feedback}</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "3rem 2rem",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1.2rem",
    maxWidth: "600px",
    margin: "0 auto",
  },
  iconCircle: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    backgroundColor: "var(--success-light)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: 800,
  },
  reference: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    marginTop: "-0.5rem",
  },
  divider: {
    height: "1px",
    backgroundColor: "var(--border-color)",
    width: "100%",
  },
  scoreRow: {
    display: "flex",
    gap: "2.5rem",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "1rem 0",
  },
  scoreBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "var(--bg-app)",
    border: "1px solid var(--border-color)",
    padding: "1.5rem",
    borderRadius: "var(--radius-md)",
    width: "150px",
  },
  scoreVal: {
    fontSize: "2.5rem",
    fontWeight: 800,
    color: "var(--success)",
    lineHeight: 1,
  },
  scoreLabel: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginTop: "0.4rem",
  },
  metrics: {
    display: "flex",
    flexDirection: "column",
    gap: "0.8rem",
    alignItems: "flex-start",
  },
  metric: {
    display: "flex",
    gap: "0.6rem",
  },
  metricTitle: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    fontWeight: 500,
  },
  metricValSub: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  feedbackBox: {
    backgroundColor: "var(--secondary-light)",
    border: "1px solid rgba(14, 165, 233, 0.2)",
    padding: "1.2rem",
    borderRadius: "var(--radius-md)",
    textAlign: "left",
    width: "100%",
  },
  feedbackTitle: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "var(--secondary)",
    marginBottom: "0.4rem",
  },
  feedbackText: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },
};
