import React from "react";
import Button from "./Button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export default function EmptyState({ title, description, actionText, onAction }: EmptyStateProps) {
  return (
    <div className="card" style={styles.container}>
      <div style={styles.iconContainer}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>
        </svg>
      </div>
      <h3 style={styles.title}>{title}</h3>
      <p style={styles.description}>{description}</p>
      {actionText && onAction && (
        <Button onClick={onAction}>{actionText}</Button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "3rem 2rem",
    gap: "1rem",
  },
  iconContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    backgroundColor: "var(--bg-surface-hover)",
    color: "var(--text-muted)",
  },
  title: {
    fontSize: "1.2rem",
    fontWeight: 700,
  },
  description: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    maxWidth: "400px",
    lineHeight: 1.6,
  },
};
