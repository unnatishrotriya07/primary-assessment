"use client";

import React, { useEffect, useState } from "react";
import subjectService from "@/services/subject.service";
import { SubjectData } from "@/types/subject.types";

interface SubjectsTableProps {
  refreshTrigger?: number;
}

export default function SubjectsTable({ refreshTrigger = 0 }: SubjectsTableProps) {
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSubjects = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await subjectService.getAll();
      setSubjects(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load subjects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this subject?")) return;
    try {
      await subjectService.delete(id);
      fetchSubjects();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete subject.");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
        <div className="spinner" style={{ marginBottom: "1rem" }}></div>
        Loading subjects...
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

  if (subjects.length === 0) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)" }}>
        No subjects found. Click "Add New Subject" to create one.
      </div>
    );
  }

  return (
    <div style={styles.tableWrapper} className="card">
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            <th style={styles.th}>Subject Name</th>
            <th style={styles.th}>Code</th>
            <th style={styles.th}>Chapters</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((item) => (
            <tr key={item.id} style={styles.row}>
              <td style={{ ...styles.td, fontWeight: 600 }}>{item.name}</td>
              <td style={styles.td}>{item.code}</td>
              <td style={styles.td}>{item.chaptersCount ?? 0} Chapters</td>
              <td style={styles.td}>
                <span 
                  style={{
                    ...styles.badge,
                    backgroundColor: item.status === "Active" ? "var(--success-light)" : "var(--bg-surface-hover)",
                    color: item.status === "Active" ? "var(--success)" : "var(--text-secondary)",
                  }}
                >
                  {item.status}
                </span>
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
  );
}

const styles: Record<string, React.CSSProperties> = {
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
