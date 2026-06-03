import React from "react";

interface ProgressTrackerProps {
  current: number;
  total: number;
  answersCount: number;
}

export default function ProgressTracker({ current, total, answersCount }: ProgressTrackerProps) {
  const percent = Math.round((answersCount / total) * 100);

  return (
    <div className="card" style={styles.card}>
      <div style={styles.header}>
        <span style={styles.label}>Progress: {answersCount} of {total} Answered</span>
        <span style={styles.pct}>{percent}% Completed</span>
      </div>

      <div style={styles.progressBg}>
        <div style={{ ...styles.progressFill, width: `${percent}%` }} />
      </div>

      <div style={styles.steps}>
        {Array.from({ length: total }).map((_, idx) => {
          const stepNum = idx + 1;
          const isActive = stepNum === current;
          const isAnswered = idx < answersCount; // Mock check

          return (
            <div 
              key={idx}
              style={{
                ...styles.dot,
                borderColor: isActive ? "var(--secondary)" : "var(--border-color)",
                backgroundColor: 
                  isActive ? "var(--secondary-light)" : 
                  isAnswered ? "var(--success-light)" : "var(--bg-app)",
                color: 
                  isActive ? "var(--secondary)" : 
                  isAnswered ? "var(--success)" : "var(--text-muted)",
                fontWeight: isActive || isAnswered ? 700 : 500,
              }}
            >
              {stepNum}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    width: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  pct: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "var(--secondary)",
  },
  progressBg: {
    height: "6px",
    backgroundColor: "var(--border-color)",
    borderRadius: "9999px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "var(--secondary)",
    transition: "width 0.3s ease-out",
  },
  steps: {
    display: "flex",
    gap: "0.6rem",
    marginTop: "0.5rem",
  },
  dot: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    border: "1px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.85rem",
    transition: "all var(--transition-fast)",
  },
};
