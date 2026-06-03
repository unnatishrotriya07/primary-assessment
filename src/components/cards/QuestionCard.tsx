import React from "react";

interface QuestionCardProps {
  questionNum: number;
  text: string;
}

export default function QuestionCard({ questionNum, text }: QuestionCardProps) {
  return (
    <div className="glass-panel" style={styles.card}>
      <div style={styles.header}>
        <span style={styles.number}>Question {questionNum}</span>
      </div>
      <p style={styles.text}>{text}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    boxShadow: "var(--shadow-md)",
  },
  header: {
    display: "flex",
    alignItems: "center",
  },
  number: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "var(--secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    backgroundColor: "var(--secondary-light)",
    padding: "0.25rem 0.6rem",
    borderRadius: "var(--radius-sm)",
  },
  text: {
    fontSize: "1.25rem",
    fontWeight: 600,
    lineHeight: 1.6,
    color: "var(--text-primary)",
    fontFamily: "var(--font-heading)",
  },
};
