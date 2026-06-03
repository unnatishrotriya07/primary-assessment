"use client";

import React, { useEffect, useState } from "react";
import chapterService from "@/services/chapter.service";
import subjectService from "@/services/subject.service";
import { ChapterData } from "@/types/chapter.types";

interface ChaptersTableProps {
  refreshTrigger?: number;
}

export default function ChaptersTable({ refreshTrigger = 0 }: ChaptersTableProps) {
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [subjectsMap, setSubjectsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchChapters = async () => {
    setLoading(true);
    setError("");
    try {
      const [chaptersData, subjectsData] = await Promise.all([
        chapterService.getAll(),
        subjectService.getAll(),
      ]);
      setChapters(chaptersData);
      
      const subMap: Record<string, string> = {};
      subjectsData.forEach((sub) => {
        subMap[sub.id] = sub.name;
      });
      setSubjectsMap(subMap);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load chapters.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChapters();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this chapter?")) return;
    try {
      await chapterService.delete(id);
      fetchChapters();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete chapter.");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
        <div className="spinner" style={{ marginBottom: "1rem" }}></div>
        Loading chapters...
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

  if (chapters.length === 0) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)" }}>
        No chapters found. Click "Add New Chapter" to create one.
      </div>
    );
  }

  return (
    <div style={styles.tableWrapper} className="card">
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            <th style={styles.th}>Chapter</th>
            <th style={styles.th}>Title</th>
            <th style={styles.th}>Subject</th>
            <th style={styles.th}>Questions Count</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {chapters.map((item) => (
            <tr key={item.id} style={styles.row}>
              <td style={{ ...styles.td, fontWeight: 700 }}>Ch {item.number}</td>
              <td style={{ ...styles.td, fontWeight: 600 }}>{item.title}</td>
              <td style={styles.td}>{subjectsMap[item.subjectId] || `Subject #${item.subjectId}`}</td>
              <td style={styles.td}>{item.questionsCount ?? 0} Items</td>
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
