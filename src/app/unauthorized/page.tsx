"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/common/Button";

export default function UnauthorizedPage() {
  const router = useRouter();

  const handleBack = () => {
    // Navigate to dashboard or login
    router.push("/dashboard");
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.clear();
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    router.push("/login");
  };

  return (
    <main style={styles.container}>
      <div style={styles.glow}></div>
      <div className="glass-panel" style={styles.card}>
        <div style={styles.iconContainer}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div style={styles.header}>
          <h1 style={styles.title} className="gradient-text">Access Denied</h1>
          <p style={styles.subtitle}>
            You do not have the required permissions to view this section. Please contact your school administrator if you believe this is an error.
          </p>
        </div>
        <div style={styles.actions}>
          <Button onClick={handleBack} variant="primary">
            Back to Dashboard
          </Button>
          <Button onClick={handleLogout} variant="secondary">
            Logout
          </Button>
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
  glow: {
    position: "absolute",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, rgba(0, 0, 0, 0) 70%)",
    zIndex: 0,
  },
  card: {
    width: "100%",
    maxWidth: "500px",
    padding: "3rem",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "1.5rem",
  },
  iconContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    backgroundColor: "var(--error-light)",
    color: "var(--error)",
    marginBottom: "0.5rem",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: 800,
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    lineHeight: 1.6,
  },
  actions: {
    display: "flex",
    gap: "1rem",
    width: "100%",
    justifyContent: "center",
    marginTop: "0.5rem",
  },
};
