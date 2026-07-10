import React from "react";
import { JourneyTimelineEvent } from "@/types/student.types";

interface LearningJourneyTimelineProps {
  timeline: JourneyTimelineEvent[];
}

export default function LearningJourneyTimeline({ timeline }: LearningJourneyTimelineProps) {
  if (!timeline || timeline.length === 0) {
    return (
      <div style={styles.emptyTimeline}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: "0.8rem" }}>
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        <h5>Learning Journey Empty</h5>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
          No learning history or milestones registered yet for this scholar.
        </p>
      </div>
    );
  }

  // Reverse timeline to show most recent events at the top
  const sortedEvents = [...timeline].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div style={styles.timelineContainer}>
      <div style={styles.line} />
      
      {sortedEvents.map((event, index) => {
        const isMilestone = event.type === "milestone";

        return (
          <div key={index} style={styles.eventRow}>
            {/* Timeline dot / icon indicator */}
            <div style={styles.indicatorContainer}>
              {isMilestone ? (
                <div style={styles.milestoneDot}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
              ) : (
                <div style={styles.assessmentDot}>
                  <div style={styles.innerDot} />
                </div>
              )}
            </div>

            {/* Event Content Card */}
            <div style={styles.card} className="card">
              <div style={styles.cardHeader}>
                <div>
                  <h4 style={styles.eventTitle}>{event.title}</h4>
                  <span style={styles.eventDate}>{event.date}</span>
                </div>
                {!isMilestone && event.grade && (
                  <span style={styles.gradeBadge}>
                    Grade {event.grade}
                  </span>
                )}
              </div>

              <p style={styles.eventDesc}>{event.description}</p>

              {/* Display sub-scores if this is a detailed voice evaluation */}
              {!isMilestone && event.subscores && Object.keys(event.subscores).length > 0 && (
                <div style={styles.subscoresSection}>
                  <span style={styles.subscoresTitle}>Evaluation Skills Profile</span>
                  <div style={styles.subscoresGrid}>
                    {event.subscores.numeracy !== undefined && (
                      <div style={styles.subscoreItem}>
                        <span style={styles.subscoreLabel}>Numeracy:</span>
                        <div style={styles.scoreBarBg}>
                          <div style={{ ...styles.scoreBarFill, width: `${event.subscores.numeracy}%`, backgroundColor: "var(--success)" }} />
                        </div>
                        <span style={styles.subscoreVal}>{Math.round(event.subscores.numeracy)}%</span>
                      </div>
                    )}
                    {event.subscores.communication !== undefined && (
                      <div style={styles.subscoreItem}>
                        <span style={styles.subscoreLabel}>Speech Clarity:</span>
                        <div style={styles.scoreBarBg}>
                          <div style={{ ...styles.scoreBarFill, width: `${event.subscores.communication}%`, backgroundColor: "var(--primary)" }} />
                        </div>
                        <span style={styles.subscoreVal}>{Math.round(event.subscores.communication)}%</span>
                      </div>
                    )}
                    {event.subscores.creativity !== undefined && (
                      <div style={styles.subscoreItem}>
                        <span style={styles.subscoreLabel}>Creative EQ:</span>
                        <div style={styles.scoreBarBg}>
                          <div style={{ ...styles.scoreBarFill, width: `${event.subscores.creativity}%`, backgroundColor: "var(--info)" }} />
                        </div>
                        <span style={styles.subscoreVal}>{Math.round(event.subscores.creativity)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Display achievements unlocked during this event */}
              {!isMilestone && event.achievements && event.achievements.length > 0 && (
                <div style={styles.achievementsRow}>
                  {event.achievements.map((ach, idx) => (
                    <span key={idx} style={styles.achievementBadge}>
                      🏆 {ach}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  timelineContainer: {
    position: "relative",
    paddingLeft: "32px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  line: {
    position: "absolute",
    left: "14px",
    top: "8px",
    bottom: "8px",
    width: "2px",
    backgroundColor: "var(--border-color)",
    zIndex: 1,
  },
  eventRow: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  indicatorContainer: {
    position: "absolute",
    left: "-32px",
    width: "30px",
    display: "flex",
    justifyContent: "center",
    zIndex: 2,
    top: "16px",
  },
  milestoneDot: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "var(--accent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  assessmentDot: {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    backgroundColor: "var(--bg-surface)",
    border: "2.5px solid var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  innerDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "var(--primary)",
  },
  card: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eventTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
  },
  eventDate: {
    fontSize: "12px",
    color: "var(--text-secondary)",
  },
  gradeBadge: {
    fontSize: "11px",
    fontWeight: 700,
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
    padding: "4px 10px",
    borderRadius: "999px",
    textTransform: "uppercase",
  },
  eventDesc: {
    fontSize: "13.5px",
    lineHeight: "1.5",
    color: "var(--text-secondary)",
    margin: 0,
  },
  subscoresSection: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    borderTop: "1px solid var(--divider)",
    paddingTop: "12px",
    marginTop: "4px",
  },
  subscoresTitle: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.02em",
  },
  subscoresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "10px",
  },
  subscoreItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  subscoreLabel: {
    fontSize: "12px",
    color: "var(--text-secondary)",
    width: "80px",
    whiteSpace: "nowrap",
  },
  scoreBarBg: {
    flex: 1,
    height: "6px",
    backgroundColor: "var(--divider)",
    borderRadius: "999px",
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: "999px",
  },
  subscoreVal: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--text-primary)",
    width: "32px",
    textAlign: "right",
  },
  achievementsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "4px",
  },
  achievementBadge: {
    fontSize: "11px",
    fontWeight: 600,
    backgroundColor: "#FDF2F8",
    color: "#C2185B",
    border: "1px solid #FBCFE8",
    padding: "3px 8px",
    borderRadius: "999px",
  },
  emptyTimeline: {
    backgroundColor: "var(--bg-surface)",
    border: "1px dashed var(--border-color)",
    borderRadius: "14px",
    padding: "48px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
};
