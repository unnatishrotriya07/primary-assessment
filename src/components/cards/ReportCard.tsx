import React from "react";

interface ReportCardProps {
  reportId: string;
  studentName: string;
  score: number;
  grade: string;
  duration: string;
  accuracy: number;
  feedback?: string;
}

export default function ReportCard({
  reportId,
  studentName,
  score,
  grade,
  duration,
  accuracy,
  feedback,
}: ReportCardProps) {
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
