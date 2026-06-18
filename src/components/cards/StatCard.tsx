import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
}

export default function StatCard({ title, value, change }: StatCardProps) {
  return (
    <div className="card" style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>{title}</span>
      </div>
      <div style={styles.value}>{value}</div>
      {change && <div style={styles.change}>{change}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  value: {
    fontSize: "2rem",
    fontWeight: 800,
    fontFamily: "var(--font-heading)",
    color: "var(--text-primary)",
    lineHeight: 1,
  },
  change: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    fontWeight: 500,
  },
};
