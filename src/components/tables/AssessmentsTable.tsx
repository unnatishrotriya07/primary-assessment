"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import assessmentService from "@/services/assessment.service";
import subjectService from "@/services/subject.service";
import classService from "@/services/class.service";
import { AssessmentData } from "@/types/assessment.types";
import AssignAssessmentModal from "../forms/AssignAssessmentModal";

export default function AssessmentsTable() {
  const [assessments, setAssessments] = useState<AssessmentData[]>([]);
  const [subjectsMap, setSubjectsMap] = useState<Record<string, string>>({});
  const [classesMap, setClassesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentData | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const handleAssignClick = (assessment: AssessmentData) => {
    setSelectedAssessment(assessment);
    setIsAssignModalOpen(true);
  };

  const fetchAssessments = async () => {
    setLoading(true);
    setError("");
    try {
      const [assessmentsData, subjectsData, classesData] = await Promise.all([
        assessmentService.getAll(),
        subjectService.getAll(),
        classService.getAll(),
      ]);
      setAssessments(assessmentsData);

      const subMap: Record<string, string> = {};
      subjectsData.forEach((sub) => {
        subMap[sub.id] = sub.name;
      });
      setSubjectsMap(subMap);

      const clsMap: Record<string, string> = {};
      classesData.forEach((cls) => {
        clsMap[cls.id] = `${cls.name} (${cls.section})`;
      });
      setClassesMap(clsMap);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load assessments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
        <div className="spinner" style={{ marginBottom: "1rem" }}></div>
        Loading assessments...
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

  if (assessments.length === 0) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)" }}>
        No assessments configured.
      </div>
    );
  }

  return (
    <div style={styles.tableWrapper} className="card">
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            <th style={styles.th}>Assessment Title</th>
            <th style={styles.th}>Subject</th>
            <th style={styles.th}>Assigned Class</th>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {assessments.map((item) => (
            <tr key={item.id} style={styles.row}>
              <td style={{ ...styles.td, fontWeight: 600 }}>{item.title}</td>
              <td style={styles.td}>{subjectsMap[item.subjectId] || `Subject #${item.subjectId}`}</td>
              <td style={styles.td}>{classesMap[item.classId] || `Class #${item.classId}`}</td>
              <td style={styles.td}>{item.date || "N/A"}</td>
              <td style={styles.td}>
                <span 
                  style={{
                    ...styles.badge,
                    backgroundColor: 
                      item.status === "Active" ? "var(--warning-light)" : 
                      item.status === "Completed" ? "var(--success-light)" : "var(--bg-surface-hover)",
                    color: 
                      item.status === "Active" ? "var(--warning)" : 
                      item.status === "Completed" ? "var(--success)" : "var(--text-secondary)",
                  }}
                >
                  {item.status}
                </span>
              </td>
              <td style={styles.td}>
                <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
                  {item.status === "Completed" ? (
                    <Link href={`/reports/${item.id}`} style={styles.actionBtn}>
                      View Report
                    </Link>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleAssignClick(item)}
                        style={styles.assignBtn}
                      >
                        Assign Student
                      </button>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>| No report</span>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <AssignAssessmentModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        assessment={selectedAssessment}
        classNamePrefill={selectedAssessment ? (classesMap[selectedAssessment.classId] || "") : ""}
      />
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
    textDecoration: "none",
  },
  assignBtn: {
    color: "var(--primary)",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.9rem",
    backgroundColor: "transparent",
    border: "none",
    padding: 0,
    textDecoration: "none",
    transition: "color var(--transition-fast)",
  },
};
