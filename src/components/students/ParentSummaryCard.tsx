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

      {/* Strengths & Improvements Lists */}
      <div style={styles.listsGrid}>
        {/* Strengths */}
        <div style={styles.listCol}>
          <div style={styles.listHeader}>
            <div style={styles.iconCircleSuccess}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h5 style={styles.subTitle}>Key Strengths & Mastery Areas</h5>
          </div>
          <ul style={styles.ul}>
            {strengths.length === 0 ? (
              <li style={{ ...styles.li, color: "var(--text-secondary)", opacity: 0.7 }}>
                No strengths compiled yet. Complete assessments to analyze student mastery areas.
              </li>
            ) : (
              strengths.map((str, idx) => (
                <li key={idx} style={styles.li}>
                  <span style={styles.bulletSuccess}>•</span>
                  {str}
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Improvements */}
        <div style={styles.listCol}>
          <div style={styles.listHeader}>
            <div style={styles.iconCircleWarning}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <h5 style={styles.subTitle}>Syllabus Practice Focus Areas</h5>
          </div>
          <ul style={styles.ul}>
            {improvements.length === 0 ? (
              <li style={{ ...styles.li, color: "var(--text-secondary)", opacity: 0.7 }}>
                No focus areas identified yet. Complete assessments to locate learning gaps.
              </li>
            ) : (
              improvements.map((imp, idx) => (
                <li key={idx} style={styles.li}>
                  <span style={styles.bulletWarning}>•</span>
                  {imp}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
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
  listsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "24px",
  },
  listCol: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "var(--shadow-sm)",
  },
  listHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
  },
  iconCircleSuccess: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "var(--success-light)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleWarning: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "var(--warning-light)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  ul: {
    listStyleType: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  li: {
    fontSize: "14px",
    color: "var(--text-secondary)",
    lineHeight: "1.5",
    display: "flex",
    alignItems: "flex-start",
  },
  bulletSuccess: {
    color: "#16A34A",
    fontWeight: "bold",
    marginRight: "8px",
    fontSize: "16px",
    lineHeight: "1",
  },
  bulletWarning: {
    color: "#F59E0B",
    fontWeight: "bold",
    marginRight: "8px",
    fontSize: "16px",
    lineHeight: "1",
  },
};
