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
          title="Dashboard"
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
          title="Dashboard"
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
        title="Academic Dashboard"
        description="Overview of student progress, recent activity, and tasks requiring academic attention."
        action={
          <a href="/assessments" style={styles.headerCta} className="interactive-element">
            Continue Today's Work
          </a>
        }
      />

      {/* Today's Summary */}
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>Today's Summary</h3>
      </div>
      <div style={styles.grid}>
        <StatCard title="Total Classes" value={stats.total_classes} />
        <StatCard title="Active Students" value={stats.active_students} />
        <StatCard title="Generated Questions" value={stats.generated_questions} />
        <StatCard title="Assessments Conducted" value={stats.assessments_conducted} />
      </div>

      <div className="dashboard-section-grid">
        <div style={styles.leftCol}>
          {/* Recent Activity */}
          <div className="card" style={{ ...styles.largeCard, marginBottom: "2rem" }}>
            <h3>Recent Activity</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              Most recent student assessment submissions and evaluations.
            </p>
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

          {/* Performance Snapshot */}
          <div className="card" style={styles.largeCard}>
            <h3>Performance Snapshot</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              Aggregate academic performance metrics across all school classes.
            </p>
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
          </div>
        </div>

        {/* Tasks Requiring Attention */}
        <div className="card" style={styles.sideCard}>
          <h3>Tasks Requiring Attention</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
            Action items requiring manual review or setup.
          </p>
          <div style={styles.tasksContainer}>
            <div style={styles.taskItem}>
              <div style={styles.taskIconPending}>Pending</div>
              <div style={styles.taskContent}>
                <span style={styles.taskTitle}>Oral Assessments Review</span>
                <span style={styles.taskDesc}>Grade 3-A English oral transcripts require manual grading verification.</span>
              </div>
            </div>
            <div style={styles.taskItem}>
              <div style={styles.taskIconPending}>Pending</div>
              <div style={styles.taskContent}>
                <span style={styles.taskTitle}>Syllabus Setup</span>
                <span style={styles.taskDesc}>Grade 2-B Science syllabus contains empty chapter content.</span>
              </div>
            </div>
            <div style={styles.taskItem}>
              <div style={styles.taskIconInfo}>Info</div>
              <div style={styles.taskContent}>
                <span style={styles.taskTitle}>Unscheduled Assessment</span>
                <span style={styles.taskDesc}>No assessment has been assigned to Grade 5 Math for this chapter.</span>
              </div>
            </div>
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
  headerCta: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--primary)",
    color: "#ffffff",
    padding: "0.5rem 1rem",
    borderRadius: "10px",
    fontWeight: 600,
    fontSize: "0.9rem",
    height: "40px",
    textDecoration: "none",
    transition: "background-color var(--transition-fast)",
  },
  sectionHeader: {
    marginTop: "1rem",
    marginBottom: "0.5rem",
  },
  sectionTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
  },
  leftCol: {
    display: "flex",
    flexDirection: "column",
  },
  tasksContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    marginTop: "1rem",
  },
  taskItem: {
    display: "flex",
    gap: "0.75rem",
    padding: "0.75rem",
    borderRadius: "10px",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-app)",
  },
  taskIconPending: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    color: "var(--warning)",
    fontSize: "0.7rem",
    fontWeight: 600,
    padding: "2px 6px",
    borderRadius: "999px",
    height: "20px",
    flexShrink: 0,
  },
  taskIconInfo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
    fontSize: "0.7rem",
    fontWeight: 600,
    padding: "2px 6px",
    borderRadius: "999px",
    height: "20px",
    flexShrink: 0,
  },
  taskContent: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  taskTitle: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  taskDesc: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    lineHeight: 1.3,
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
