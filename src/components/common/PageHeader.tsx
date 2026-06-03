import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div style={styles.container}>
      <div style={styles.textContainer}>
        <h1 style={styles.title}>{title}</h1>
        {description && <p style={styles.description}>{description}</p>}
      </div>
      {action && <div style={styles.actionContainer}>{action}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
    paddingBottom: "1.5rem",
    borderBottom: "1px solid var(--border-color)",
    marginBottom: "1rem",
  },
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
