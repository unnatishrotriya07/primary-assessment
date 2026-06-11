import Link from "next/link";

export default function Home() {
  return (
    <main style={styles.container}>
      <div style={styles.glow1}></div>
      <div style={styles.glow2}></div>

      <div className="glass-panel" style={styles.heroCard}>
        <div style={styles.badge}>
          <span style={styles.badgeDot}></span>
          Next-Generation Testing
        </div>
        <h1 style={styles.title}>
          Welcome to <span className="gradient-text">Momentum</span>
        </h1>
        <p style={styles.subtitle}>
          The unified primary assessment platform. Secure, adaptive, and detailed evaluation for students with comprehensive administrative analytics.
        </p>

        <div style={styles.grid}>
          <div className="card" style={{ ...styles.selectionCard, maxWidth: "480px", margin: "0 auto", width: "100%" }}>
            <div style={styles.iconContainerAdmin}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 style={styles.cardTitle}>Admin & Teacher Console</h3>
            <p style={styles.cardDescription}>Manage classes, subjects, generate AI questions, and view performance reports.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", width: "100%" }}>
              <Link href="/login?role=admin" style={{ ...styles.btn, ...styles.adminBtn }} className="interactive-element">
                Console Login
              </Link>
              <Link href="/signup" style={{ ...styles.btn, ...styles.studentBtn, backgroundColor: "transparent", color: "var(--primary)", border: "1px solid var(--primary)", boxShadow: "none" }} className="interactive-element">
                Register a School Tenant
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    position: "relative",
    overflow: "hidden",
  },
  glow1: {
    position: "absolute",
    top: "10%",
    left: "15%",
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0, 0, 0, 0) 70%)",
    zIndex: 0,
  },
  glow2: {
    position: "absolute",
    bottom: "10%",
    right: "15%",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, rgba(0, 0, 0, 0) 70%)",
    zIndex: 0,
  },
  heroCard: {
    width: "100%",
    maxWidth: "800px",
    padding: "3rem",
    textAlign: "center",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1.5rem",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
    padding: "0.4rem 1rem",
    borderRadius: "9999px",
    fontSize: "0.85rem",
    fontWeight: 600,
    border: "1px solid rgba(99, 102, 241, 0.2)",
  },
  badgeDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "var(--primary)",
    display: "inline-block",
  },
  title: {
    fontSize: "3rem",
    fontWeight: 800,
    lineHeight: 1.2,
    margin: "0.5rem 0",
  },
  subtitle: {
    fontSize: "1.1rem",
    color: "var(--text-secondary)",
    maxWidth: "600px",
    marginBottom: "1.5rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "2rem",
    width: "100%",
    marginTop: "1rem",
  },
  selectionCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    textAlign: "left",
    gap: "1rem",
    height: "100%",
  },
  iconContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "48px",
    height: "48px",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--secondary-light)",
    color: "var(--secondary)",
  },
  iconContainerAdmin: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "48px",
    height: "48px",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
  },
  cardTitle: {
    fontSize: "1.25rem",
    fontWeight: 700,
  },
  cardDescription: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    flexGrow: 1,
    lineHeight: 1.6,
  },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "0.8rem 1.5rem",
    borderRadius: "var(--radius-sm)",
    fontWeight: 600,
    fontSize: "0.95rem",
    textAlign: "center",
    boxShadow: "var(--shadow-sm)",
    textDecoration: "none",
  },
  studentBtn: {
    backgroundColor: "var(--secondary)",
    color: "#ffffff",
  },
  adminBtn: {
    backgroundColor: "var(--primary)",
    color: "#ffffff",
  },
};
