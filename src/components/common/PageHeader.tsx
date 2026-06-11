import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="page-header-container">
      <div style={styles.textContainer}>
        <h1 style={styles.title}>{title}</h1>
        {description && <p style={styles.description}>{description}</p>}
      </div>
      {action && <div style={styles.actionContainer}>{action}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  textContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: 800,
    letterSpacing: "-0.03em",
  },
  description: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
  },
  actionContainer: {
    display: "flex",
    alignItems: "center",
  },
};
