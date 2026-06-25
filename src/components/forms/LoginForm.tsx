"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "../common/Button";
import authService from "@/services/auth.service";
import { STORAGE_KEYS } from "@/utils/constants";
import { extractErrorMessage } from "@/utils/helpers";

export default function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "student">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleQuickFill = () => {
    setEmail("director_test@example.com");
    setPassword("password123");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (role === "admin") {
      if (!email || !password) {
        setError("Please fill in both email and password.");
        return;
      }
      setLoading(true);

      try {
        const response = await authService.login({ email, password });
        localStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
        document.cookie = `token=${response.token}; path=/; max-age=86400; SameSite=Lax`;
        router.push("/dashboard");
      } catch (err: any) {
        setError(extractErrorMessage(err, "Invalid email or password."));
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      // Wait briefly for a polished feedback transition before redirecting
      setTimeout(() => {
        setLoading(false);
        router.push("/assessment/session_demo_123");
      }, 500);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Segmented control with sliding slider capsule background */}
      <div className={`segmented-control ${role === "admin" ? "admin-selected" : "student-selected"}`}>
        <div className="segmented-control-slider" />
        <button
          type="button"
          className="segmented-control-option option-admin"
          onClick={() => setRole("admin")}
        >
          Console Admin
        </button>
        <button
          type="button"
          className="segmented-control-option option-student"
          onClick={() => setRole("student")}
        >
          Student
        </button>
      </div>

      {role === "admin" ? (
        <>
          {/* Email input with SVG icon */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <div className="input-with-icon-wrapper">
              <span className="input-icon-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                type="email"
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                style={styles.inputField}
                required
              />
            </div>
          </div>

          {/* Password input with SVG icon and password reveal toggle */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div className="input-with-icon-wrapper">
              <span className="input-icon-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={styles.inputField}
                required
              />
              <button
                type="button"
                className="input-reveal-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            style={styles.actionBtn}
          >
            Login as Admin
          </Button>

          {/* Quick-fill helper for evaluators */}
          <div onClick={handleQuickFill} style={styles.demoBanner} className="interactive-element">
            <span style={styles.demoHeading}>💡 Quick-Fill Demo Account</span>
            <div style={styles.demoCredentials}>
              <div>Email: <strong style={{ color: "var(--primary)" }}>director_test@example.com</strong></div>
              <div>Password: <strong style={{ color: "var(--primary)" }}>password123</strong></div>
            </div>
            <span style={styles.demoClickNotice}>Click anywhere on this box to autofill</span>
          </div>
        </>
      ) : (
        <div style={styles.studentPane}>
          <div style={styles.studentInfoBox}>
            <div style={styles.studentIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
              </svg>
            </div>
            <h4 style={styles.studentTitle}>Ready to Test?</h4>
            <p style={styles.studentDesc}>
              Students can directly launch their adaptive proctored primary evaluation session below.
            </p>
          </div>

          <Button
            type="submit"
            variant="secondary"
            loading={loading}
            style={{ ...styles.actionBtn, backgroundColor: "var(--secondary)", color: "#ffffff", borderColor: "var(--secondary-hover)" }}
          >
            Launch Assessment Session
          </Button>
        </div>
      )}
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    width: "100%",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    width: "100%",
  },
  label: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "var(--text-secondary)",
  },
  inputField: {
    padding: "0.75rem 1rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    width: "100%",
    transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
  },
  actionBtn: {
    marginTop: "0.6rem",
    padding: "0.75rem 1.5rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "1rem",
    fontWeight: 700,
  },
  errorBanner: {
    padding: "0.8rem 1rem",
    backgroundColor: "var(--error-light)",
    color: "var(--error)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.85rem",
    fontWeight: 600,
    border: "1px solid rgba(239, 68, 68, 0.2)",
  },
  demoBanner: {
    padding: "1rem",
    backgroundColor: "var(--primary-light)",
    border: "1px solid rgba(139, 124, 251, 0.2)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    marginTop: "0.5rem",
  },
  demoHeading: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "var(--primary)",
  },
  demoCredentials: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    display: "flex",
    flexDirection: "column",
    gap: "0.15rem",
  },
  demoClickNotice: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    fontStyle: "italic",
    textAlign: "right",
    marginTop: "0.2rem",
  },
  studentPane: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    animation: "fadeIn 0.25s ease-out forwards",
  },
  studentInfoBox: {
    border: "1px dashed var(--secondary)",
    backgroundColor: "var(--secondary-light)",
    borderRadius: "var(--radius-sm)",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "0.6rem",
  },
  studentIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "rgba(125, 201, 255, 0.2)",
    color: "var(--secondary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  studentTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  studentDesc: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },
};
