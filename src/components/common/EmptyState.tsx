import React from "react";
import Button from "./Button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export default function EmptyState({ title, description, actionText, onAction, icon }: EmptyStateProps) {
  return (
    <div className="card" style={styles.container}>
      <div style={styles.iconContainer}>
        {icon || (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
            <path d="M9 12h6"/>
            <path d="M12 9v6"/>
          </svg>
        )}
      </div>
      <h3 style={styles.title}>{title}</h3>
      <p style={styles.description}>{description}</p>
      {actionText && onAction && (
        <Button onClick={onAction} variant="primary" size="md" style={{ marginTop: "0.5rem" }}>
          {actionText}
        </Button>
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
    padding: "4rem 2rem",
    gap: "1rem",
    backgroundColor: "var(--bg-surface)",
    border: "1px dashed var(--border-color)",
    borderRadius: "var(--radius-md)",
    boxShadow: "none",
  },
  iconContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "64px",
    height: "64px",
    borderRadius: "14px",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-muted)",
    marginBottom: "0.5rem",
  },
  title: {
    fontSize: "1.15rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
  },
  description: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    maxWidth: "360px",
    lineHeight: 1.6,
    margin: "0 0 0.5rem 0",
  },
};

