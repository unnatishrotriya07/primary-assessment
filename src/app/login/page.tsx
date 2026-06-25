"use client";

import Link from "next/link";
import LoginForm from "@/components/forms/LoginForm";

export default function LoginPage() {
  return (
    <main className="auth-split-container">
      {/* Left Visual Branding Pane - Hidden on Mobile */}
      <div className="auth-split-visual">
        <div className="auth-glow-overlay"></div>
        
        {/* Top left brand icon */}
        <Link href="/" style={styles.brandContainer}>
          <div style={styles.logoBadge}>M</div>
          <span style={styles.brandText}>Momentum</span>
        </Link>

        {/* Visual Content and Platform Selling Points */}
        <div className="auth-visual-content">
          <h2 style={styles.visualTitle}>Assess with Confidence, Teach with Clarity</h2>
          <p style={styles.visualSubtitle}>
            Unifying student adaptive testing, proctoring controls, and curriculum insights under a secure, single-tenant architecture.
          </p>

          {/* Mini Highlights Grid */}
          <div style={styles.highlightsGrid}>
            <div style={styles.highlightCard}>
              <div style={styles.highlightIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <h5 style={styles.highlightCardTitle}>Multi-Tenant Privacy</h5>
                <p style={styles.highlightCardDesc}>Fully isolated databases secure all academic records.</p>
              </div>
            </div>

            <div style={styles.highlightCard}>
              <div style={styles.highlightIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <h5 style={styles.highlightCardTitle}>Proctored Environments</h5>
                <p style={styles.highlightCardDesc}>Windows monitoring and proctor logs are loaded dynamically.</p>
              </div>
            </div>
          </div>

          {/* Glowing Badge */}
          <div style={styles.trustBadge}>
            <span style={styles.activeDot}></span>
            Trusted by over 12 primary school districts
          </div>
        </div>
      </div>

      {/* Right Form Pane */}
      <div className="auth-split-form-panel">
        <div style={styles.formContainer}>
          {/* Mobile brand presentation */}
          <div style={styles.mobileBrandHeader}>
            <div style={styles.logoBadge}>M</div>
            <h3 style={styles.mobileBrandText}>Momentum</h3>
          </div>

          <div style={styles.formHeader}>
            <h1 style={styles.formTitle} className="gradient-text">Welcome Back</h1>
            <p style={styles.formSubtitle}>Sign in to your school console or access your assessment</p>
          </div>

          <LoginForm />

          <div style={styles.formFooter}>
            <span style={styles.footerText}>Need to set up a new school tenant? </span>
            <Link href="/signup" style={styles.registerLink} className="interactive-element">
              Register here
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  brandContainer: {
    position: "absolute",
    top: "3rem",
    left: "4rem",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    textDecoration: "none",
    color: "#ffffff",
    zIndex: 10,
  },
  logoBadge: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    backdropFilter: "blur(8px)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: "1.2rem",
  },
  brandText: {
    fontFamily: "var(--font-heading)",
    fontSize: "1.35rem",
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },
  visualTitle: {
    fontSize: "2.4rem",
    fontWeight: 800,
    marginBottom: "1rem",
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
  },
  visualSubtitle: {
    fontSize: "1.1rem",
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 1.6,
    marginBottom: "3rem",
  },
  highlightsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    textAlign: "left",
    marginBottom: "3.5rem",
  },
  highlightCard: {
    display: "flex",
    gap: "1rem",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "14px",
    padding: "1.2rem",
    backdropFilter: "blur(12px)",
  },
  highlightIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  highlightCardTitle: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "0.2rem",
  },
  highlightCardDesc: {
    fontSize: "0.85rem",
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 1.4,
  },
  trustBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    padding: "0.4rem 1rem",
    borderRadius: "9999px",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#ffffff",
  },
  activeDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "var(--secondary)",
    display: "inline-block",
  },
  formContainer: {
    width: "100%",
    maxWidth: "400px",
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
  mobileBrandHeader: {
    display: "none",
    alignItems: "center",
    gap: "0.5rem",
    justifyContent: "center",
    marginBottom: "-0.5rem",
  },
  mobileBrandText: {
    fontSize: "1.2rem",
    fontWeight: 800,
  },
  formHeader: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  formTitle: {
    fontSize: "2rem",
    fontWeight: 800,
  },
  formSubtitle: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    lineHeight: 1.4,
  },
  formFooter: {
    textAlign: "center",
    fontSize: "0.85rem",
    marginTop: "0.5rem",
  },
  footerText: {
    color: "var(--text-secondary)",
  },
  registerLink: {
    color: "var(--primary)",
    fontWeight: 700,
  },
};
