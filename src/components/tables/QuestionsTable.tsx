"use client";

import React, { useEffect, useState } from "react";
import questionService from "@/services/question.service";
import subjectService from "@/services/subject.service";
import { QuestionData } from "@/types/question.types";

interface QuestionsTableProps {
  refreshTrigger?: number;
}

export default function QuestionsTable({ refreshTrigger = 0 }: QuestionsTableProps) {
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [subjectsMap, setSubjectsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("");
  const [selectedSessionFilter, setSelectedSessionFilter] = useState("");

  const fetchQuestions = async () => {
    setLoading(true);
    setError("");
    try {
      const [questionsData, subjectsData] = await Promise.all([
        questionService.getAll(),
        subjectService.getAll(),
      ]);
      setQuestions(questionsData);
      
      const subMap: Record<string, string> = {};
      subjectsData.forEach((sub) => {
        subMap[sub.id] = sub.name;
      });
      setSubjectsMap(subMap);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load questions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      await questionService.delete(id);
      fetchQuestions();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete question.");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
        <div className="spinner" style={{ marginBottom: "1rem" }}></div>
        Loading questions...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", color: "var(--error)", backgroundColor: "var(--error-light)", borderRadius: "var(--radius-md)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
        {error}
      </div>
    );
  }

  const uniqueSessions = Array.from(new Set(questions.map((q) => q.session).filter(Boolean))) as string[];

  const filteredQuestions = questions.filter((item) => {
    const matchesSubject = !selectedSubjectFilter || String(item.subjectId) === selectedSubjectFilter;
    const matchesSession = !selectedSessionFilter || item.session === selectedSessionFilter;
    return matchesSubject && matchesSession;
  });

  if (questions.length === 0) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)" }}>
        No questions found. Click "Generate via AI" or create a question.
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.filterBar} className="card">
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Filter by Subject</label>
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="">All Subjects</option>
            {Object.entries(subjectsMap).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Filter by Session</label>
          <select
            value={selectedSessionFilter}
            onChange={(e) => setSelectedSessionFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="">All Sessions</option>
            {uniqueSessions.map((session) => (
              <option key={session} value={session}>
                {session}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.tableWrapper} className="card">
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.th}>Question Prompt</th>
              <th style={styles.th}>Subject</th>
              <th style={styles.th}>Difficulty</th>
              <th style={styles.th}>Cognitive Level</th>
              <th style={styles.th}>Session</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuestions.map((item) => (
              <tr key={item.id} style={styles.row}>
                <td style={{ ...styles.td, fontWeight: 500, maxWidth: "300px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {item.text}
                </td>
                <td style={styles.td}>{subjectsMap[item.subjectId] || `Subject #${item.subjectId}`}</td>
                <td style={styles.td}>
                  <span 
                    style={{
                      ...styles.badge,
                      backgroundColor: 
                        item.difficulty === "easy" ? "var(--success-light)" : 
                        item.difficulty === "medium" ? "var(--warning-light)" : "var(--error-light)",
                      color: 
                        item.difficulty === "easy" ? "var(--success)" : 
                        item.difficulty === "medium" ? "var(--warning)" : "var(--error)",
                    }}
                  >
                    {item.difficulty}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={styles.cognitiveTag}>{item.cognitiveLevel}</span>
                </td>
                <td style={styles.td}>
                  {item.session ? (
                    <span style={styles.sessionTag}>{item.session}</span>
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>—</span>
                  )}
                </td>
                <td style={styles.td}>
                  <button style={styles.actionBtn}>Edit</button>
                  <button style={styles.deleteBtn} onClick={() => handleDelete(item.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    width: "100%",
  },
  filterBar: {
    display: "flex",
    gap: "1.5rem",
    padding: "1rem 1.5rem",
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
    flex: 1,
    maxWidth: "250px",
  },
  filterLabel: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  filterSelect: {
    padding: "0.5rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.85rem",
    outline: "none",
    cursor: "pointer",
  },
  sessionTag: {
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    color: "rgb(139, 92, 246)",
    padding: "0.2rem 0.6rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  tableWrapper: {
    padding: 0,
    overflowX: "auto",
    border: "1px solid var(--border-color)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  headerRow: {
    backgroundColor: "var(--bg-surface-hover)",
    borderBottom: "1px solid var(--border-color)",
  },
  th: {
    padding: "1rem 1.5rem",
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  row: {
    borderBottom: "1px solid var(--border-color)",
    transition: "background-color var(--transition-fast)",
  },
  td: {
    padding: "1rem 1.5rem",
    fontSize: "0.95rem",
    color: "var(--text-primary)",
  },
  badge: {
    display: "inline-flex",
    padding: "0.2rem 0.6rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "capitalize",
  },
  cognitiveTag: {
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
    padding: "0.2rem 0.6rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.8rem",
    fontWeight: 600,
    textTransform: "capitalize",
  },
  actionBtn: {
    color: "var(--primary)",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.9rem",
    border: "none",
    background: "none",
    padding: 0,
  },
  deleteBtn: {
    color: "var(--error)",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.9rem",
    border: "none",
    background: "none",
    padding: 0,
    marginLeft: "1rem",
  },
};
