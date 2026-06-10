import Link from "next/link";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Link href="/" style={styles.logoLink} className="interactive-element">
          <img src="/logo.png" alt="Momentum Logo" style={styles.logoImg} />
          <span style={styles.logoText}>Momentum Student Portal</span>
        </Link>
        <div style={styles.right}>
          <Link href="/" style={styles.exitLink} className="interactive-element">
            Exit Portal
          </Link>
        </div>
      </header>

      <main style={styles.content}>
        {children}
      </main>

      <footer style={styles.footer}>
        <p>© 2026 Momentum. Secure Testing Environment.</p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "transparent",
  },
  header: {
    height: "65px",
    backgroundColor: "var(--glass-bg)",
    borderBottom: "1px solid var(--glass-border)",
    backdropFilter: "var(--glass-backdrop)",
    WebkitBackdropFilter: "var(--glass-backdrop)",
    boxShadow: "var(--glass-shadow)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 2rem",
  },
  logoLink: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    textDecoration: "none",
  },
  logoImg: {
    width: "24px",
    height: "24px",
    objectFit: "contain",
  },
  logoText: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  right: {
    display: "flex",
    alignItems: "center",
  },
  exitLink: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--error)",
    textDecoration: "none",
  },
  content: {
    flexGrow: 1,
    padding: "2rem 1rem",
  },
  footer: {
    padding: "1rem",
    textAlign: "center",
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    borderTop: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface)",
  },
};
