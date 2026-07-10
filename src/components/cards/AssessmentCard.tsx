import React from "react";
import { isHindiText } from "@/utils/helpers";

interface AssessmentCardProps {
  title: string;
  subject: string;
  questionCount: number;
  difficulty: "easy" | "medium" | "hard";
  onSelect?: () => void;
}

export default function AssessmentCard({
  title,
  subject,
  questionCount,
  difficulty,
  onSelect,
}: AssessmentCardProps) {
  const isHindi = subject.toLowerCase() === "hindi" || isHindiText(title);

  return (
    <div className="card" style={styles.card} onClick={onSelect}>
      <div style={styles.header}>
        <span style={styles.subject} className={isHindi ? "font-hindi" : ""}>{subject}</span>
        <span 
          style={{
            ...styles.difficultyBadge,
            backgroundColor: 
              difficulty === "easy" ? "var(--success-light)" :
              difficulty === "medium" ? "var(--warning-light)" : "var(--error-light)",
            color:
              difficulty === "easy" ? "var(--success)" :
              difficulty === "medium" ? "var(--warning)" : "var(--error)",
          }}
        >
          {difficulty}
        </span>
      </div>
      <h3 style={styles.title} className={isHindi ? "font-hindi" : ""}>{title}</h3>
      <div style={styles.footer}>
        <span style={styles.count}>{questionCount} Questions</span>
        <button style={styles.btn} className="interactive-element">Start Assessment</button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    cursor: "pointer",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subject: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  difficultyBadge: {
    fontSize: "0.75rem",
    fontWeight: 700,
    padding: "0.2rem 0.5rem",
    borderRadius: "9999px",
    textTransform: "capitalize",
  },
  title: {
    fontSize: "1.2rem",
    fontWeight: 700,
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "0.5rem",
  },
  count: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    fontWeight: 500,
  },
  btn: {
    backgroundColor: "var(--primary)",
    color: "#ffffff",
    padding: "0.4rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
  },
};
