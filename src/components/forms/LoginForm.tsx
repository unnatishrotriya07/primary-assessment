"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "../common/Input";
import Button from "../common/Button";
import authService from "@/services/auth.service";
import { STORAGE_KEYS } from "@/utils/constants";
import { extractErrorMessage } from "@/utils/helpers";

export default function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "student">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);

    if (role === "admin") {
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
      setLoading(false);
      router.push("/assessment/session_demo_123");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={styles.roleContainer}>
        <button
          type="button"
          onClick={() => setRole("admin")}
          style={{
            ...styles.roleTab,
            borderColor: role === "admin" ? "var(--primary)" : "var(--border-color)",
            backgroundColor: role === "admin" ? "var(--primary-light)" : "transparent",
            color: role === "admin" ? "var(--primary)" : "var(--text-secondary)",
          }}
        >
          Administrator
        </button>
        <button
          type="button"
          onClick={() => setRole("student")}
          style={{
            ...styles.roleTab,
            borderColor: role === "student" ? "var(--secondary)" : "var(--border-color)",
            backgroundColor: role === "student" ? "var(--secondary-light)" : "transparent",
            color: role === "student" ? "var(--secondary)" : "var(--text-secondary)",
          }}
        >
          Student
        </button>
      </div>

      <Input
        label="Email Address"
        type="email"
        placeholder="you@school.edu"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <Button 
        type="submit" 
        variant={role === "admin" ? "primary" : "secondary"} 
        loading={loading}
        style={{ marginTop: "1rem" }}
      >
        Login as {role === "admin" ? "Admin" : "Student"}
      </Button>
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
  roleContainer: {
    display: "flex",
    gap: "1rem",
    width: "100%",
  },
  roleTab: {
    flexGrow: 1,
    padding: "0.6rem 1rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    textAlign: "center",
    transition: "all var(--transition-fast)",
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
};
