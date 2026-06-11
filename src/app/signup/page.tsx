"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import authService from "@/services/auth.service";
import { extractErrorMessage } from "@/utils/helpers";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !schoolName) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await authService.signup({
        name,
        email,
        password,
        schoolName,
      });
      setSuccess(`School registered successfully! Unique ID: ${response.tenantId}. Redirecting to login...`);
      // Clear form
      setName("");
      setEmail("");
      setPassword("");
      setSchoolName("");
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to register school. Email might be already in use."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.container}>
      <div style={styles.glow}></div>
      <div className="glass-panel" style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title} className="gradient-text">School Registration</h1>
          <p style={styles.subtitle}>Register your school and create a Director account</p>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {success && <div style={styles.successBanner}>{success}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <Input
            label="School Name"
            type="text"
            placeholder="e.g. Greenwood High School"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            disabled={loading}
          />

          <Input
            label="Director Name"
            type="text"
            placeholder="e.g. John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />

          <Input
            label="Director Email"
            type="email"
            placeholder="director@school.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          <Button 
            type="submit" 
            variant="primary" 
            loading={loading}
            style={{ marginTop: "1rem" }}
          >
            Register School
          </Button>
        </form>

        <div style={styles.footer}>
          <span style={styles.footerText}>Already have an account? </span>
          <Link href="/login" style={styles.link} className="interactive-element">
            Login
          </Link>
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
    width: "450px",
    height: "450px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0, 0, 0, 0) 70%)",
    zIndex: 0,
  },
  card: {
    width: "100%",
    maxWidth: "500px",
    padding: "2.5rem",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  header: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    marginBottom: "0.5rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: 800,
  },
  subtitle: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    width: "100%",
  },
  errorBanner: {
    padding: "0.8rem 1rem",
    backgroundColor: "var(--error-light)",
    color: "var(--error)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.85rem",
    fontWeight: 500,
    border: "1px solid rgba(239, 68, 68, 0.2)",
  },
  successBanner: {
    padding: "0.8rem 1rem",
    backgroundColor: "var(--success-light)",
    color: "var(--success)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.85rem",
    fontWeight: 500,
    border: "1px solid rgba(16, 185, 129, 0.2)",
  },
  footer: {
    textAlign: "center",
    fontSize: "0.9rem",
    marginTop: "0.5rem",
  },
  footerText: {
    color: "var(--text-secondary)",
  },
  link: {
    color: "var(--primary)",
    fontWeight: 600,
    textDecoration: "none",
  },
};
