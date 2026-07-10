import React, { useState } from "react";
import { SubjectMastery } from "@/types/student.types";

interface SubjectMasteryCardProps {
  subject: SubjectMastery;
}

export default function SubjectMasteryCard({ subject }: SubjectMasteryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const chaptersCount = subject.chapters.length;
  const masteredCount = subject.chapters.filter((c) => c.status === "Mastered").length;
  
  // Calculate percentage of syllabus mastered
  const progressPercent = chaptersCount > 0 ? (masteredCount / chaptersCount) * 100 : 0;

  // Helper to determine status badge classes
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Mastered":
        return {
          bg: "var(--success-light)",
          color: "var(--success)",
          text: "Mastered",
        };
      case "In Progress":
        return {
          bg: "var(--warning-light)",
          color: "var(--warning)",
          text: "In Progress",
        };
      default:
        return {
          bg: "var(--bg-app)",
          color: "var(--text-secondary)",
          text: "Not Started",
        };
    }
  };

  return (
    <div style={styles.card} className="card">
      <div style={styles.cardHeader}>
        <div style={{ flex: 1, minWidth: 0, marginRight: "12px" }}>
          <span style={styles.subjectCode}>{subject.subjectCode}</span>
          <h4 
            style={{ 
              ...styles.subjectName, 
              overflow: "hidden", 
              textOverflow: "ellipsis", 
              whiteSpace: "nowrap" 
            }} 
            title={subject.subjectName}
          >
            {subject.subjectName}
          </h4>
        </div>
        <div style={{ ...styles.scoreContainer, flexShrink: 0, textAlign: "right" }}>
          <span style={styles.scoreLabel}>Subject Mastery</span>
          <span style={styles.scoreValue}>
            {subject.masteryScore !== null ? `${subject.masteryScore}%` : "—"}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={styles.progressSection}>
        <div style={styles.progressInfo}>
          <span style={styles.progressText}>
            {masteredCount} of {chaptersCount} Chapters Mastered
          </span>
          <span style={styles.progressPercentText}>{Math.round(progressPercent)}% Complete</span>
        </div>
        <div style={styles.progressBarBg}>
          <div
            style={{
              ...styles.progressBarFill,
              width: `${progressPercent}%`,
            }}
          />
        </div>
      </div>

      {/* Current and Suggested Next Chapter Row */}
      <div style={styles.chaptersRow}>
        <div style={styles.chapterBox}>
          <span style={styles.chapterBoxLabel}>Current Focus</span>
          <div style={styles.chapterBoxValue}>
            {subject.currentChapter ? (
              <>
                <span style={styles.chapterNum}>Ch {subject.currentChapter.number}:</span>
                <span style={styles.chapterTitleText} title={subject.currentChapter.title}>
                  {subject.currentChapter.title}
                </span>
              </>
            ) : (
              <span style={styles.emptyText}>Curriculum completed</span>
            )}
          </div>
        </div>

        <div style={styles.chapterBox}>
          <span style={styles.chapterBoxLabel}>Next Recommendation</span>
          <div style={styles.chapterBoxValue}>
            {subject.suggestedNextChapter ? (
              <>
                <span style={styles.chapterNum}>Ch {subject.suggestedNextChapter.number}:</span>
                <span style={styles.chapterTitleText} title={subject.suggestedNextChapter.title}>
                  {subject.suggestedNextChapter.title}
                </span>
              </>
            ) : (
              <span style={styles.emptyText}>None</span>
            )}
          </div>
        </div>
      </div>

      {/* Expand / Collapse Chapters List Toggle */}
      <button style={styles.expandBtn} onClick={() => setIsExpanded(!isExpanded)}>
        <span>{isExpanded ? "Hide Syllabus Details" : "View Syllabus Details"}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            marginLeft: "6px",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform var(--transition-fast)",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expandable Chapters List */}
      {isExpanded && (
        <div style={styles.chaptersList}>
          {subject.chapters.map((ch) => {
            const badge = getStatusBadge(ch.status);
            return (
              <div key={ch.id} style={styles.chapterItem}>
                <div style={styles.chapterMain}>
                  <span style={styles.chapterNumber}>Ch {ch.number}</span>
                  <span style={styles.chapterTitle}>{ch.title}</span>
                </div>
                <div style={styles.chapterStatusCol}>
                  {ch.score !== null && (
                    <span style={styles.chapterScore}>{ch.score}% Avg</span>
                  )}
                  <span
                    style={{
                      ...styles.badge,
                      backgroundColor: badge.bg,
                      color: badge.color,
                    }}
                  >
                    {badge.text}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  subjectCode: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--primary)",
    textTransform: "uppercase",
    backgroundColor: "var(--primary-light)",
    padding: "4px 8px",
    borderRadius: "999px",
    display: "inline-block",
    marginBottom: "6px",
  },
  subjectName: {
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
  },
  scoreContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  scoreLabel: {
    fontSize: "12px",
    color: "var(--text-secondary)",
  },
  scoreValue: {
    fontSize: "20px",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  progressSection: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  progressInfo: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
  },
  progressText: {
    fontWeight: 500,
    color: "var(--text-secondary)",
  },
  progressPercentText: {
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  progressBarBg: {
    width: "100%",
    height: "8px",
    backgroundColor: "var(--divider)",
    borderRadius: "999px",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "var(--primary)",
    borderRadius: "999px",
    transition: "width 0.3s ease",
  },
  chaptersRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    borderTop: "1px solid var(--divider)",
    borderBottom: "1px solid var(--divider)",
    padding: "12px 0",
  },
  chapterBox: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  chapterBoxLabel: {
    fontSize: "11px",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    fontWeight: 600,
    letterSpacing: "0.02em",
  },
  chapterBoxValue: {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  chapterNum: {
    color: "var(--primary)",
    fontWeight: 600,
  },
  chapterTitleText: {
    color: "var(--text-primary)",
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  emptyText: {
    color: "var(--text-muted)",
    fontSize: "13px",
    fontStyle: "italic",
  },
  expandBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    backgroundColor: "transparent",
    border: "none",
    color: "var(--primary)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    padding: "4px 0",
  },
  chaptersList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    backgroundColor: "var(--bg-app)",
    padding: "12px",
    borderRadius: "10px",
    maxHeight: "260px",
    overflowY: "auto",
  },
  chapterItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px",
    backgroundColor: "var(--bg-surface)",
    borderRadius: "8px",
    border: "1px solid var(--border-color)",
  },
  chapterMain: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    overflow: "hidden",
  },
  chapterNumber: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
  },
  chapterTitle: {
    fontSize: "13px",
    color: "var(--text-primary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  chapterStatusCol: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  chapterScore: {
    fontSize: "11px",
    color: "var(--text-secondary)",
    backgroundColor: "var(--divider)",
    padding: "2px 6px",
    borderRadius: "4px",
    fontWeight: 500,
  },
  badge: {
    fontSize: "11px",
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: "999px",
    whiteSpace: "nowrap",
  },
};
