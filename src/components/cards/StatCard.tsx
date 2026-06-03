import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  type?: "primary" | "success" | "warning" | "info";
}

export default function StatCard({ title, value, change, type = "primary" }: StatCardProps) {
  const getBadgeColor = () => {
    switch (type) {
      case "success":
        return { bg: "var(--success-light)", text: "var(--success)" };
      case "warning":
        return { bg: "var(--warning-light)", text: "var(--warning)" };
      case "info":
        return { bg: "var(--secondary-light)", text: "var(--secondary)" };
      case "primary":
      default:
        return { bg: "var(--primary-light)", text: "var(--primary)" };
    }
  };

  const badgeColors = getBadgeColor();

  return (
    <div className="card" style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>{title}</span>
        <span 
          style={{
            ...styles.indicator,
            backgroundColor: badgeColors.bg,
            color: badgeColors.text,
          }}
        >
          {type}
        </span>
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
  indicator: {
    fontSize: "0.7rem",
    fontWeight: 700,
    textTransform: "uppercase",
    padding: "0.15rem 0.4rem",
    borderRadius: "4px",
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
