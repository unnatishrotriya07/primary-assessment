import LoginForm from "@/components/forms/LoginForm";

export default function LoginPage() {
  return (
    <main style={styles.container}>
      <div style={styles.glow}></div>
      <div className="glass-panel" style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title} className="gradient-text">Momentum Login</h1>
          <p style={styles.subtitle}>Enter your credentials to access your dashboard</p>
        </div>
        <LoginForm />
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
  glow: {
    position: "absolute",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0, 0, 0, 0) 70%)",
    zIndex: 0,
  },
  card: {
    width: "100%",
    maxWidth: "450px",
    padding: "2.5rem",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
  header: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: 800,
  },
  subtitle: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
  },
};
