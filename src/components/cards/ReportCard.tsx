import React, { useState } from "react";
import interviewService from "@/services/interview.service";

interface ReportCardProps {
  reportId: string;
  studentName: string;
  score: number;
  grade: string;
  duration: string;
  accuracy: number;
  feedback?: string;
  evaluatedAnswers?: {
    question: string;
    studentAnswer: string;
    expectedAnswer: string;
    questionType: string;
    isCorrect: boolean;
    explanation?: string;
  }[];
  // Extended fields for detailed admin/student reports
  scoreCommunication?: number;
  scoreNumeracy?: number;
  scoreCreativity?: number;
  scoreEmotionalIq?: number;
  strengths?: string;
  improvements?: string;
  recommendation?: string;
  adminNote?: string;
  summary?: string;
  transcript?: { role: "ai" | "student"; text: string; question_category?: string }[];
  reportVersion?: string;
  requiresReview?: boolean;
  reviewReason?: string;
}

const SKILL_CONFIG = [
  { key: "scoreCommunication", label: "Communication", color: "var(--primary)" },
  { key: "scoreNumeracy", label: "Numeracy", color: "var(--secondary)" },
  { key: "scoreCreativity", label: "Creativity", color: "var(--accent)" },
  { key: "scoreEmotionalIq", label: "Emotional IQ", color: "var(--success)" },
] as const;

const REC_COLOR: Record<string, string> = {
  "Strongly Recommended": "var(--success)",
  "Recommended": "var(--primary)",
  "Needs Review": "var(--warning)",
};

export default function ReportCard({
  reportId,
  studentName,
  score,
  grade,
  duration,
  accuracy,
  feedback,
  evaluatedAnswers,
  scoreCommunication,
  scoreNumeracy,
  scoreCreativity,
  scoreEmotionalIq,
  strengths,
  improvements,
  recommendation,
  adminNote,
  summary,
  transcript,
  reportVersion,
  requiresReview,
  reviewReason,
}: ReportCardProps) {
  const [showQA, setShowQA] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [localEvaluatedAnswers, setLocalEvaluatedAnswers] = useState<any[]>(evaluatedAnswers || []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [editedNote, setEditedNote] = useState(adminNote || "");

  React.useEffect(() => {
    if (evaluatedAnswers) {
      setLocalEvaluatedAnswers(evaluatedAnswers);
    }
  }, [evaluatedAnswers]);

  const updateLocalAnswer = (index: number, key: string, value: any) => {
    setLocalEvaluatedAnswers(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const handleApproveReview = async () => {
    setIsSubmittingReview(true);
    try {
      await interviewService.reviewReport(parseInt(reportId, 10), {
        evaluated_answers: localEvaluatedAnswers,
        admin_note: editedNote || adminNote
      });
      alert("Evaluation approved and report finalized successfully.");
      window.location.reload();
    } catch (err) {
      console.error("Failed to approve evaluation:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm("Are you sure you want to regenerate this report? This will re-run the AI evaluation pipeline using saved conversation messages.")) return;
    setIsRegenerating(true);
    try {
      await interviewService.regenerateReport(parseInt(reportId, 10));
      alert("Evaluation regeneration task has been enqueued. Please refresh the page in a few seconds.");
      window.location.reload();
    } catch (err) {
      console.error("Failed to regenerate report:", err);
      alert("Failed to trigger evaluation regeneration. Please check server connection.");
    } finally {
      setIsRegenerating(false);
    }
  };
  
  // Decide whether to render the basic report card or the premium detailed report card
  const isDetailed = scoreCommunication !== undefined;
  
  if (isDetailed) {
    const scoreVal = Math.round(score);
    const recColor = recommendation ? (REC_COLOR[recommendation] ?? "var(--primary)") : "var(--primary)";
    const r = 50;
    const circ = 2 * Math.PI * r;
    const dash = circ * (scoreVal / 100);

    return (
      <div className="card" style={styles.card}>
        <div style={styles.reportHeader}>
          <div style={styles.reportEmoji}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--success)", margin: "0 auto" }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 style={styles.reportTitle}>{grade} — Evaluation Complete!</h2>
          <p style={styles.reportSub}>Assessed Student: {studentName}</p>
          <span style={styles.id}>Report Reference: #{reportId}</span>
        </div>

        {/* Human Review Banner */}
        {requiresReview && (
          <div style={{
            backgroundColor: "#FEF3C7",
            border: "1px solid #F59E0B",
            borderRadius: "12px",
            padding: "1.25rem 1.5rem",
            margin: "1.5rem 1.5rem 0",
            textAlign: "left",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
          }}>
            <p style={{ margin: 0, fontWeight: 700, color: "#D97706", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              ⚠️ Human Review Required
            </p>
            <p style={{ margin: "0.25rem 0 0.5rem 0", fontSize: "0.88rem", color: "#78350F" }}>
              Reason: {reviewReason || "Low confidence in speech transcription or educational evaluation."}
            </p>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#B45309", lineHeight: "1.5" }}>
              Please review the conversation replay and question evaluations below. Correct any transcripts, toggle the correctness switch if the AI misgraded, and finalize this report.
            </p>
            <button
              onClick={handleApproveReview}
              disabled={isSubmittingReview}
              style={{
                marginTop: "0.75rem",
                padding: "0.45rem 1rem",
                backgroundColor: "var(--success)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(22,163,74,0.2)",
                transition: "background 0.15s"
              }}
            >
              {isSubmittingReview ? "Approving..." : "Approve Report"}
            </button>
          </div>
        )}

        <div style={styles.body}>
          <div style={styles.ringWrap}>
            <svg width="120" height="120" viewBox="0 0 120 120" style={{ margin: "0 auto" }}>
              <circle cx="60" cy="60" r={r} fill="none" stroke="#f0f0f0" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="10"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                style={{ transition: "stroke-dasharray 1.2s ease" }}
              />
              <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--text-primary)">
                {scoreVal}
              </text>
              <text x="60" y="72" textAnchor="middle" fontSize="11" fill="#888">
                / 100
              </text>
            </svg>
            <p style={styles.ringLabel}>Overall Score</p>
          </div>

          {/* Skills progress grid */}
          <div style={styles.skillGrid}>
            {SKILL_CONFIG.map(({ key, label, color }) => {
              const val = Math.round((({
                scoreCommunication,
                scoreNumeracy,
                scoreCreativity,
                scoreEmotionalIq
              })[key] as number) ?? 0);
              return (
                <div key={key} style={styles.skillCard}>
                  <p style={styles.skillLabel}>{label}</p>
                  <div style={styles.barTrack}>
                    <div style={{ ...styles.barFill, width: `${val}%`, background: color }} />
                  </div>
                  <p style={styles.skillScore}>
                    {val}<span style={styles.skillOf}>/100</span>
                  </p>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          {summary && (
            <div style={styles.feedbackBox}>
              <p style={styles.feedbackTitle}>Summary</p>
              <p style={styles.feedbackText}>{summary}</p>
            </div>
          )}

          {/* Strengths */}
          {strengths && (
            <div style={styles.feedbackBox}>
              <p style={styles.feedbackTitle}>Key Strengths</p>
              <p style={styles.feedbackText}>{strengths}</p>
            </div>
          )}

          {/* Areas to Grow */}
          {improvements && (
            <div style={{ ...styles.feedbackBox, borderLeftColor: "var(--warning)", background: "var(--warning-light)" }}>
              <p style={{ ...styles.feedbackTitle, color: "var(--warning)" }}>Development Areas</p>
              <p style={styles.feedbackText}>{improvements}</p>
            </div>
          )}

          {/* Recommendations */}
          {recommendation && (
            <div
              style={{
                ...styles.feedbackBox,
                borderLeftColor: recColor,
                background: recommendation === "Needs Review" ? "var(--warning-light)" : "var(--success-light)",
              }}
            >
              <p style={{ ...styles.feedbackTitle, color: recColor }}>Academic Note</p>
              <p style={styles.feedbackText}>
                <strong>{recommendation}</strong>
                {adminNote && ` — ${adminNote}`}
              </p>
            </div>
          )}

          {/* Collapsible Conversation Replay */}
          {transcript && transcript.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <button
                onClick={() => setShowReplay(!showReplay)}
                style={styles.collapseBtn}
              >
                {showReplay ? "Hide Conversation Replay" : "View Conversation Replay"}
              </button>
              
              {showReplay && (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  padding: "1.25rem",
                  backgroundColor: "#F8FAFC",
                  border: "1px solid var(--border-color)",
                  borderRadius: "10px",
                  marginTop: "1.2rem",
                  maxHeight: "450px",
                  overflowY: "auto"
                }}>
                  {transcript.map((turn, idx) => {
                    const isAi = turn.role === "ai";
                    return (
                      <div key={idx} style={{
                        alignSelf: isAi ? "flex-start" : "flex-end",
                        maxWidth: "80%",
                        backgroundColor: isAi ? "#ffffff" : "#EFF6FF",
                        color: "var(--text-primary)",
                        padding: "0.75rem 1rem",
                        borderRadius: "10px",
                        border: isAi ? "1px solid var(--border-color)" : "1px solid #BFDBFE",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                      }}>
                        <p style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: isAi ? "var(--text-secondary)" : "var(--primary)",
                          marginBottom: "0.25rem",
                          marginTop: 0
                        }}>
                          {isAi ? "Buddy (AI)" : studentName} {turn.question_category ? `• ${turn.question_category}` : ""}
                        </p>
                        <p style={{ fontSize: "0.9rem", margin: 0, lineHeight: "1.5" }}>{turn.text}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Collapsible Q&A Review */}
          {localEvaluatedAnswers && localEvaluatedAnswers.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <button
                onClick={() => setShowQA(!showQA)}
                style={styles.collapseBtn}
              >
                {showQA ? "Hide Detailed Q&A Review" : "View Detailed Q&A Review"}
              </button>
              
              {showQA && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.2rem" }}>
                  {localEvaluatedAnswers.map((item, idx) => {
                    const isEditing = editingIndex === idx;
                    return (
                      <div key={idx} style={styles.qaCard}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)" }}>
                            Question {idx + 1} ({item.questionType === "mcq" ? "MCQ" : "TITA"})
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {isEditing ? (
                              <select
                                value={item.isCorrect ? "true" : "false"}
                                onChange={(e) => updateLocalAnswer(idx, "isCorrect", e.target.value === "true")}
                                style={{
                                  padding: "0.2rem 0.5rem",
                                  borderRadius: "6px",
                                  border: "1px solid var(--border-color)",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  outline: "none"
                                }}
                              >
                                <option value="true">Correct</option>
                                <option value="false">Incorrect</option>
                              </select>
                            ) : (
                              <span
                                style={{
                                  padding: "0.2rem 0.5rem",
                                  borderRadius: "12px",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  backgroundColor: item.isCorrect ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                                  color: item.isCorrect ? "var(--success)" : "var(--error)",
                                  border: item.isCorrect ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
                                }}
                              >
                                {item.isCorrect ? "Correct" : "Incorrect"}
                              </span>
                            )}
                            
                            <button
                              onClick={() => setEditingIndex(isEditing ? null : idx)}
                              style={{
                                padding: "0.2rem 0.4rem",
                                backgroundColor: "transparent",
                                border: "1px solid var(--border-color)",
                                borderRadius: "6px",
                                fontSize: "0.7rem",
                                cursor: "pointer",
                                fontWeight: 500,
                                color: "var(--text-secondary)"
                              }}
                            >
                              {isEditing ? "Done" : "Edit"}
                            </button>
                          </div>
                        </div>
                        
                        <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", margin: "0.5rem 0 0" }}>
                          {item.question}
                        </p>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.75rem" }}>
                          {isEditing ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                                Edit Student Answer:
                              </label>
                              <input
                                type="text"
                                value={item.studentAnswer || ""}
                                onChange={(e) => updateLocalAnswer(idx, "studentAnswer", e.target.value)}
                                style={{
                                  padding: "0.4rem 0.75rem",
                                  borderRadius: "8px",
                                  border: "1px solid var(--border-color)",
                                  fontSize: "0.85rem",
                                  outline: "none",
                                  width: "100%",
                                  boxSizing: "border-box"
                                }}
                              />
                              
                              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                                Edit Feedback / Explanation:
                              </label>
                              <input
                                type="text"
                                value={item.explanation || ""}
                                onChange={(e) => updateLocalAnswer(idx, "explanation", e.target.value)}
                                style={{
                                  padding: "0.4rem 0.75rem",
                                  borderRadius: "8px",
                                  border: "1px solid var(--border-color)",
                                  fontSize: "0.85rem",
                                  outline: "none",
                                  width: "100%",
                                  boxSizing: "border-box"
                                }}
                              />
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.85rem" }}>
                              <div style={{ flex: "1 1 200px" }}>
                                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Student Answer:</span>{" "}
                                <span style={{ color: item.isCorrect ? "var(--success)" : "var(--error)" }}>
                                  {item.studentAnswer || "(No answer)"}
                                </span>
                              </div>
                              <div style={{ flex: "1 1 200px" }}>
                                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Expected Answer:</span>{" "}
                                <span style={{ color: "var(--text-primary)" }}>{item.expectedAnswer}</span>
                              </div>
                            </div>
                          )}
                          
                          {!isEditing && item.explanation && (
                            <p style={styles.explanationText}>
                              <strong>Feedback:</strong> {item.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div style={styles.footer}>
          <div style={styles.metaItem}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Completion Duration: {duration}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>
              v{reportVersion || "2.0.0"}
            </span>
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              style={{
                padding: "0.3rem 0.6rem",
                backgroundColor: "#ffffff",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                cursor: "pointer",
                transition: "all 0.15s"
              }}
            >
              {isRegenerating ? "Regenerating..." : "Regenerate Analysis"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Basic report card fallback
  return (
    <div className="card" style={styles.card}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.studentName}>{studentName}</h3>
          <span style={styles.id}>Report Reference: #{reportId}</span>
        </div>
        <div style={styles.gradeContainer}>
          <span style={styles.gradeLabel}>Grade</span>
          <span style={styles.grade}>{grade}</span>
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.grid}>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Total Score</span>
          <span style={styles.metricValue}>{score}%</span>
          <div style={styles.barBg}>
            <div style={{ ...styles.barFill, width: `${score}%`, backgroundColor: "var(--primary)" }} />
          </div>
        </div>

        <div style={styles.metric}>
          <span style={styles.metricLabel}>Accuracy Rate</span>
          <span style={styles.metricValue}>{accuracy}%</span>
          <div style={styles.barBg}>
            <div style={{ ...styles.barFill, width: `${accuracy}%`, backgroundColor: "var(--success)" }} />
          </div>
        </div>
      </div>

      {feedback && (
        <div style={styles.feedbackBoxFallback}>
          <h4 style={styles.feedbackTitleFallback}>Learning Insights</h4>
          <p style={styles.feedbackText}>{feedback}</p>
        </div>
      )}

      {evaluatedAnswers && evaluatedAnswers.length > 0 && (
        <div style={{ marginTop: "0.5rem" }}>
          <button
            onClick={() => setShowQA(!showQA)}
            style={styles.collapseBtn}
          >
            {showQA ? "Hide Detailed Q&A Review" : "View Detailed Q&A Review"}
          </button>
          
          {showQA && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.2rem" }}>
              {evaluatedAnswers.map((item, idx) => (
                <div key={idx} style={styles.qaCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)" }}>
                      Question {idx + 1} ({item.questionType === "mcq" ? "MCQ" : "TITA"})
                    </span>
                    <span style={{
                      padding: "0.2rem 0.5rem",
                      borderRadius: "12px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      backgroundColor: item.isCorrect ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                      color: item.isCorrect ? "var(--success)" : "var(--error)",
                      border: item.isCorrect ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
                    }}>
                      {item.isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                    {item.question}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "0.25rem", fontSize: "0.85rem" }}>
                    <div style={{ flex: "1 1 200px" }}>
                      <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Student's Answer:</span>{" "}
                      <span style={{ color: item.isCorrect ? "var(--success)" : "var(--error)" }}>
                        {item.studentAnswer || "(No answer)"}
                      </span>
                    </div>
                    <div style={{ flex: "1 1 200px" }}>
                      <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Expected Answer:</span>{" "}
                      <span style={{ color: "var(--text-primary)" }}>{item.expectedAnswer}</span>
                    </div>
                  </div>
                  {item.explanation && (
                    <p style={styles.explanationText}>
                      <strong>Feedback:</strong> {item.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={styles.footer}>
        <div style={styles.metaItem}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Completion Duration: {duration}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    width: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  reportHeader: {
    background: "var(--primary-light)",
    borderRadius: "var(--radius-md)",
    padding: "1.5rem",
    textAlign: "center",
    color: "var(--text-primary)",
    marginBottom: "0.5rem",
  },
  reportEmoji: { fontSize: 36 },
  reportTitle: {
    fontSize: "1.2rem",
    fontWeight: 700,
    marginTop: "0.4rem",
  },
  reportSub: {
    opacity: 0.85,
    fontSize: "0.85rem",
    marginTop: "0.2rem",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
  },
  ringWrap: {
    textAlign: "center",
  },
  ringLabel: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    marginTop: "0.25rem",
  },
  skillGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.75rem",
  },
  skillCard: {
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    padding: "0.85rem",
  },
  skillLabel: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    marginBottom: "0.4rem",
  },
  barTrack: {
    height: 6,
    background: "#f0f0f0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: "0.4rem",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  skillScore: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  skillOf: {
    fontSize: "0.75rem",
    fontWeight: 400,
    color: "var(--text-secondary)",
  },
  studentName: {
    fontSize: "1.3rem",
    fontWeight: 700,
  },
  id: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
  },
  gradeContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "var(--primary-light)",
    padding: "0.5rem 1rem",
    borderRadius: "var(--radius-sm)",
  },
  gradeLabel: {
    fontSize: "0.7rem",
    fontWeight: 700,
    textTransform: "uppercase",
    color: "var(--primary)",
  },
  grade: {
    fontSize: "1.5rem",
    fontWeight: 800,
    color: "var(--primary)",
  },
  divider: {
    height: "1px",
    backgroundColor: "var(--border-color)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "2rem",
  },
  metric: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  metricLabel: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    fontWeight: 600,
  },
  metricValue: {
    fontSize: "1.6rem",
    fontWeight: 800,
  },
  barBg: {
    height: "6px",
    backgroundColor: "var(--border-color)",
    borderRadius: "9999px",
    overflow: "hidden",
  },
  feedbackBox: {
    background: "var(--secondary-light)",
    borderRadius: "var(--radius-sm)",
    padding: "0.85rem 1rem",
    borderLeft: "4px solid var(--secondary)",
    textAlign: "left",
  },
  feedbackTitle: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--primary)",
    marginBottom: "0.3rem",
  },
  feedbackText: {
    fontSize: "0.85rem",
    color: "var(--text-primary)",
    lineHeight: 1.5,
  },
  feedbackBoxFallback: {
    backgroundColor: "var(--bg-app)",
    border: "1px solid var(--border-color)",
    padding: "1.2rem",
    borderRadius: "var(--radius-md)",
    textAlign: "left",
    width: "100%",
  },
  feedbackTitleFallback: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "var(--primary)",
    marginBottom: "0.4rem",
  },
  collapseBtn: {
    padding: "0.6rem 1.2rem",
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
    border: "1px solid rgba(139, 124, 251, 0.2)",
    borderRadius: "var(--radius-sm)",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    width: "100%",
    justifyContent: "center",
    fontSize: "0.9rem",
    transition: "all 0.2s"
  },
  qaCard: {
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    padding: "0.85rem 1rem",
    backgroundColor: "var(--bg-glass)",
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    textAlign: "left"
  },
  explanationText: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    borderTop: "1px dashed var(--border-color)",
    paddingTop: "0.4rem",
    marginTop: "0.2rem",
    fontStyle: "italic",
    margin: 0,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    marginTop: "0.5rem",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
  },
};
