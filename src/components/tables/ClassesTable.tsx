"use client";

import React, { useEffect, useState } from "react";
import classService from "@/services/class.service";
import { ClassData } from "@/types/class.types";

interface ClassesTableProps {
  refreshTrigger?: number;
}

export default function ClassesTable({ refreshTrigger = 0 }: ClassesTableProps) {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchClasses = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await classService.getAll();
      setClasses(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load classes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [refreshTrigger]);

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
        No classes found. Click "Add New Class" to create one.
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
            <th style={styles.th}>Actions</th>
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
