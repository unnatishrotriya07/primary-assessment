import StatCard from "@/components/cards/StatCard";
import PageHeader from "@/components/common/PageHeader";

export default function AdminDashboard() {
  return (
    <div style={styles.container}>
      <PageHeader 
        title="Admin Dashboard" 
        description="Overview of assessments, classes, student engagement and performance."
      />
      
      <div style={styles.grid}>
        <StatCard title="Total Classes" value="12" change="+2 this month" type="info" />
        <StatCard title="Active Students" value="348" change="+14% vs last week" type="success" />
        <StatCard title="Generated Questions" value="1,842" change="+120 today" type="warning" />
        <StatCard title="Assessments Conducted" value="56" change="4 active right now" type="primary" />
      </div>

      <div style={styles.sectionGrid}>
        <div className="card" style={styles.largeCard}>
          <h3>Recent Performance Trends</h3>
          <p style={{color: "var(--text-secondary)", marginTop: "1rem"}}>
            Detailed class and subject-wise analytics will appear here. Students have shown a 12% increase in math retention since utilizing AI-generated adaptive question pathways.
          </p>
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
};
