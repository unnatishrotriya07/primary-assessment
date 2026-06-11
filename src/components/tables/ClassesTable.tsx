"use client";

import React, { useEffect, useState } from "react";
import classService from "@/services/class.service";
import { ClassData } from "@/types/class.types";
import { extractErrorMessage } from "@/utils/helpers";

interface ClassesTableProps {
  refreshTrigger?: number;
}

export default function ClassesTable({ refreshTrigger = 0 }: ClassesTableProps) {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const fetchClasses = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await classService.getAll();
      setClasses(data);
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to load classes."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [refreshTrigger]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("user_session");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.role === "admin" && !parsed.tenantId) {
            setIsSuperAdmin(true);
          }
        } catch (e) {}
      }
    }
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this class?")) return;
    try {
      await classService.delete(id);
      fetchClasses();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete class.");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
        <div className="spinner" style={{ marginBottom: "1rem" }}></div>
        Loading classes...
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

  if (classes.length === 0) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)" }}>
        No classes found. {isSuperAdmin ? 'Click "Add Class" to create one.' : ''}
      </div>
    );
  }

  return (
    <div style={styles.tableWrapper} className="card">
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            <th style={styles.th}>Class Name</th>
            <th style={styles.th}>Grade</th>
            <th style={styles.th}>Section</th>
            <th style={styles.th}>Students</th>
            {isSuperAdmin && <th style={styles.th}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {classes.map((item) => (
            <tr key={item.id} style={styles.row}>
              <td style={{ ...styles.td, fontWeight: 600 }}>{item.name}</td>
              <td style={styles.td}>{item.grade}</td>
              <td style={styles.td}>
                <span style={styles.sectionBadge}>{item.section}</span>
              </td>
              <td style={styles.td}>{item.studentsCount ?? 0}</td>
              {isSuperAdmin && (
                <td style={styles.td}>
                  <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                    <button style={styles.actionBtn} title="Edit">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                    <button style={styles.deleteBtn} onClick={() => handleDelete(item.id)} title="Delete">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        <line x1="10" x2="10" y1="11" y2="17" />
                        <line x1="14" x2="14" y1="11" y2="17" />
                      </svg>
                    </button>
                  </div>
                </td>
              )}
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
  sectionBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
    fontWeight: 700,
    fontSize: "0.8rem",
  },
  actionBtn: {
    color: "var(--primary)",
    cursor: "pointer",
    border: "none",
    background: "none",
    padding: "0.3rem",
    borderRadius: "var(--radius-sm)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s",
  },
  deleteBtn: {
    color: "var(--error)",
    cursor: "pointer",
    border: "none",
    background: "none",
    padding: "0.3rem",
    borderRadius: "var(--radius-sm)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s",
  },
};
