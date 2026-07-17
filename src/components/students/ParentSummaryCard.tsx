import React from "react";
import { JourneyAchievement } from "@/types/student.types";

interface ParentSummaryCardProps {
  summary: string;
  strengths: string[];
  improvements: string[];
  achievements: JourneyAchievement[];
}

export default function ParentSummaryCard({
  summary,
  strengths,
  improvements,
  achievements,
}: ParentSummaryCardProps) {
  // Helper to determine achievement badge colors
  const getBadgeStyles = (type: string) => {
    switch (type.toLowerCase()) {
      case "gold":
        return {
          bg: "#FEF3C7",
          color: "#92400E",
          border: "#FDE68A",
          title: "Gold Milestone",
        };
      case "silver":
        return {
          bg: "#F3F4F6",
          color: "#374151",
          border: "#E5E7EB",
          title: "Silver Milestone",
        };
      default:
        return {
          bg: "#EFF6FF",
          color: "#1E40AF",
          border: "#BFDBFE",
          title: "Bronze Milestone",
        };
    }
  };

  return (
    <div style={styles.cardContainer}>


      {/* Achievements / Badges Section */}
      {achievements.length > 0 && (
        <div style={styles.achievementsSection}>
          <h5 style={styles.subTitle}>Milestone Achievements</h5>
          <div style={styles.badgeGrid}>
            {achievements.map((ach) => {
              const meta = getBadgeStyles(ach.type);
              return (
                <div
                  key={ach.id}
                  style={{
                    ...styles.badgeCard,
                    backgroundColor: meta.bg,
                    borderColor: meta.border,
                  }}
                >
                  <div style={styles.badgeHeader}>
                    <span style={{ ...styles.badgeType, color: meta.color }}>
                      {meta.title}
                    </span>
                    <span style={styles.badgeDate}>{ach.date}</span>
                  </div>
                  <h6 style={{ ...styles.badgeName, color: meta.color }}>
                    {ach.title}
                  </h6>
                  <p style={{ ...styles.badgeDesc, color: meta.color }}>
                    {ach.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  cardContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  summarySection: {
    backgroundColor: "var(--selected-bg)",
    border: "1px solid var(--focus-ring)",
    borderRadius: "14px",
    padding: "20px",
  },
  summaryHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "10px",
  },
  summaryTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--primary)",
  },
  summaryText: {
    fontSize: "15px",
    lineHeight: "1.6",
    color: "var(--text-primary)",
  },
  achievementsSection: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  subTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
  },
  badgeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "16px",
  },
  badgeCard: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderRadius: "14px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    transition: "transform var(--transition-fast)",
  },
  badgeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeType: {
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  badgeDate: {
    fontSize: "11px",
    color: "var(--text-secondary)",
  },
  badgeName: {
    fontSize: "14px",
    fontWeight: 600,
    margin: 0,
  },
  badgeDesc: {
    fontSize: "12px",
    lineHeight: "1.4",
    margin: 0,
    opacity: 0.95,
  },
};
