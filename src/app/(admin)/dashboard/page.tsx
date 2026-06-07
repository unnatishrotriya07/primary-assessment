"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/cards/StatCard";
import PageHeader from "@/components/common/PageHeader";
import { dashboardService, DashboardStats } from "@/services/dashboard.service";

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardService.getStats()
      .then((data) => {
        setStats(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to fetch dashboard stats", err);
        setError("Could not load dashboard statistics. Please try again later.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <PageHeader 
          title="Admin Dashboard" 
          description="Overview of assessments, classes, student engagement and performance."
        />
        <div style={styles.loadingState}>
          <p>Loading dashboard metrics...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div style={styles.container}>
        <PageHeader 
          title="Admin Dashboard" 
          description="Overview of assessments, classes, student engagement and performance."
        />
        <div style={styles.errorState}>
          <p style={{ color: "var(--error)", fontWeight: 600 }}>{error || "An error occurred."}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader 
        title="Admin Dashboard" 
        description="Overview of assessments, classes, student engagement and performance."
      />
      
      <div style={styles.grid}>
        <StatCard title="Total Classes" value={stats.total_classes} type="info" />
        <StatCard title="Active Students" value={stats.active_students} type="success" />
        <StatCard title="Generated Questions" value={stats.generated_questions} type="warning" />
        <StatCard title="Assessments Conducted" value={stats.assessments_conducted} type="primary" />
      </div>

      <div style={styles.sectionGrid}>
        <div className="card" style={styles.largeCard}>
          <h3>Recent Performance Trends</h3>
          <div style={styles.performanceStats}>
            <div style={styles.perfItem}>
              <span style={styles.perfLabel}>Average Class Score</span>
              <span style={styles.perfValue}>{stats.average_score}%</span>
            </div>
            <div style={styles.perfItem}>
              <span style={styles.perfLabel}>Average Accuracy</span>
              <span style={styles.perfValue}>{stats.average_accuracy}%</span>
            </div>
          </div>
          
          <h4 style={{ marginTop: "2rem", marginBottom: "1rem" }}>Recent Student Submissions</h4>
          <div style={{ overflowX: "auto" }}>
            {stats.recent_activity && stats.recent_activity.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                    <th style={styles.th}>Student</th>
                    <th style={styles.th}>Class</th>
                    <th style={styles.th}>Score</th>
                    <th style={styles.th}>Accuracy</th>
                    <th style={styles.th}>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_activity.map((activity) => (
                    <tr key={activity.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={styles.td}>{activity.student_name}</td>
                      <td style={styles.td_secondary}>{activity.student_class}</td>
                      <td style={styles.td_bold}>{activity.score}%</td>
                      <td style={styles.td_secondary}>{activity.accuracy}%</td>
                      <td style={styles.td}>
                        <span style={{
                          backgroundColor: activity.grade === "A" || activity.grade === "B" ? "var(--success-light)" : "var(--warning-light)",
                          color: activity.grade === "A" || activity.grade === "B" ? "var(--success)" : "var(--warning)",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          fontWeight: 600,
                          fontSize: "0.85rem"
                        }}>
                          {activity.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: "var(--text-secondary)", marginTop: "1rem" }}>No student assessments completed yet.</p>
            )}
          </div>
        </div>

        <div className="card" style={styles.sideCard}>
          <h3>Quick Actions</h3>
          <div style={styles.actionsContainer}>
            <a href="/questions/generate" style={styles.actionBtn}>
              Create Questions with AI
            </a>
            <a href="/assessments" style={styles.actionBtnSecondary}>
              Manage Assessments
            </a>
            <a href="/classes" style={styles.actionBtnSecondary}>
              View Classes
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
    padding: "1rem 0",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.5rem",
  },
  sectionGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "1.5rem",
    marginTop: "1rem",
  },
  largeCard: {
    minHeight: "300px",
  },
  sideCard: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  performanceStats: {
    display: "flex",
    gap: "2rem",
    marginTop: "1.5rem",
    paddingBottom: "1.5rem",
    borderBottom: "1px solid var(--border-color)",
  },
  perfItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  perfLabel: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    fontWeight: 500,
  },
  perfValue: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  th: {
    padding: "0.75rem 0.5rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
  },
  td: {
    padding: "0.75rem 0.5rem",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
  },
  td_secondary: {
    padding: "0.75rem 0.5rem",
    color: "var(--text-secondary)",
    fontSize: "0.9rem",
  },
  td_bold: {
    padding: "0.75rem 0.5rem",
    color: "var(--text-primary)",
    fontWeight: 600,
    fontSize: "0.9rem",
  },
  actionsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.8rem",
    marginTop: "1rem",
  },
  actionBtn: {
    display: "block",
    backgroundColor: "var(--primary)",
    color: "#ffffff",
    padding: "0.8rem 1rem",
    borderRadius: "var(--radius-sm)",
    textAlign: "center",
    fontWeight: 600,
  },
  actionBtnSecondary: {
    display: "block",
    backgroundColor: "var(--bg-surface-hover)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-color)",
    padding: "0.8rem 1rem",
    borderRadius: "var(--radius-sm)",
    textAlign: "center",
    fontWeight: 600,
  },
  loadingState: {
    padding: "3rem",
    textAlign: "center",
    color: "var(--text-secondary)",
  },
  errorState: {
    padding: "3rem",
    textAlign: "center",
  },
};
