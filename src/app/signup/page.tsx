"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/common/Button";
import authService from "@/services/auth.service";
import { extractErrorMessage } from "@/utils/helpers";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [schoolName, setSchoolName] = useState("");
  const [schoolType, setSchoolType] = useState("primary");
  const [studentCount, setStudentCount] = useState("100-500");
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedTenantId, setGeneratedTenantId] = useState("");
  const [copied, setCopied] = useState(false);

  const handleNextStep = () => {
    setError("");
    if (step === 1) {
      if (!schoolName.trim()) {
        setError("Please enter your school name.");
        return;
      }
      setStep(2);
    }
  };

  const handlePrevStep = () => {
    setError("");
    setStep(1);
  };

  const handleCopyTenant = () => {
    if (generatedTenantId) {
      navigator.clipboard.writeText(generatedTenantId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await authService.signup({
        name,
        email,
        password,
        schoolName,
      });

      // Save generated tenant ID for Step 3
      setGeneratedTenantId(response.tenantId || "Unknown ID");
      setStep(3);
      
      // Auto-redirect after 15 seconds as a fallback
      setTimeout(() => {
        router.push("/login");
      }, 15000);
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to register school. Email might be already in use."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-split-container">
      {/* Left Visual Branding Pane */}
      <div className="auth-split-visual">
        <div className="auth-glow-overlay"></div>
        
        <Link href="/" style={styles.brandContainer}>
          <div style={styles.logoBadge}>M</div>
          <span style={styles.brandText}>Momentum</span>
        </Link>

        <div className="auth-visual-content">
          <h2 style={styles.visualTitle}>Create Your School Workspace</h2>
          <p style={styles.visualSubtitle}>
            Consolidate your classes, structure syllabi, compile cognitive assessments, and view student progress indices.
          </p>

          {/* Vertical wizard guidelines map */}
          <div style={styles.wizardGuide}>
            <div style={styles.guideStep}>
              <div style={{
                ...styles.guideLine,
                borderColor: step >= 2 ? "var(--secondary)" : "rgba(255, 255, 255, 0.2)"
              }} />
              <div style={{
                ...styles.guideDot,
                backgroundColor: step >= 1 ? "var(--secondary)" : "rgba(255, 255, 255, 0.2)",
                boxShadow: step === 1 ? "0 0 12px var(--secondary)" : "none"
              }}>
                1
              </div>
              <div style={styles.guideTextContainer}>
                <span style={styles.guideStepTitle}>School Details</span>
                <p style={styles.guideStepDesc}>Establish your school's unique identity.</p>
              </div>
            </div>

            <div style={styles.guideStep}>
              <div style={{
                ...styles.guideLine,
                borderColor: step >= 3 ? "var(--secondary)" : "rgba(255, 255, 255, 0.2)"
              }} />
              <div style={{
                ...styles.guideDot,
                backgroundColor: step >= 2 ? "var(--secondary)" : "rgba(255, 255, 255, 0.2)",
                boxShadow: step === 2 ? "0 0 12px var(--secondary)" : "none"
              }}>
                2
              </div>
              <div style={styles.guideTextContainer}>
                <span style={styles.guideStepTitle}>Director Credentials</span>
                <p style={styles.guideStepDesc}>Register your master admin account.</p>
              </div>
            </div>

            <div style={styles.guideStep}>
              <div style={{
                ...styles.guideDot,
                backgroundColor: step >= 3 ? "var(--secondary)" : "rgba(255, 255, 255, 0.2)",
                boxShadow: step === 3 ? "0 0 12px var(--secondary)" : "none"
              }}>
                3
              </div>
              <div style={styles.guideTextContainer}>
                <span style={styles.guideStepTitle}>Workspace Allocation</span>
                <p style={styles.guideStepDesc}>Secure your generated school tenant code.</p>
              </div>
            </div>
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

          {/* Stepper Progress bar visual */}
          <div className="wizard-progress">
            <div className="wizard-progress-bar-fill" style={{ width: `${((step - 1) / 2) * 100}%` }} />
            <div className={`wizard-step ${step >= 1 ? (step > 1 ? "completed" : "active") : ""}`}>1</div>
            <div className={`wizard-step ${step >= 2 ? (step > 2 ? "completed" : "active") : ""}`}>2</div>
            <div className={`wizard-step ${step >= 3 ? "completed" : ""}`}>3</div>
          </div>

          <div style={styles.formHeader}>
            <h1 style={styles.formTitle} className="gradient-text">
              {step === 1 && "School Identity"}
              {step === 2 && "Director Account"}
              {step === 3 && "Registration Successful!"}
            </h1>
            <p style={styles.formSubtitle}>
              {step === 1 && "Let's start with your organization details"}
              {step === 2 && "Setup your credentials to access the console"}
              {step === 3 && "Your workspace is ready. Save your tenant ID."}
            </p>
          </div>

          {error && <div style={styles.errorBanner}>{error}</div>}

          {/* STEP 1: School Identity details */}
          {step === 1 && (
            <div style={styles.wizardPane}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>School Name</label>
                <div className="input-with-icon-wrapper">
                  <span className="input-icon-left">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. Greenwood High School"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    style={styles.inputField}
                    required
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>School Level</label>
                  <select
                    value={schoolType}
                    onChange={(e) => setSchoolType(e.target.value)}
                    style={styles.selectField}
                  >
                    <option value="primary">Primary School</option>
                    <option value="middle">Middle School</option>
                    <option value="high">High School</option>
                    <option value="k12">K-12 Academy</option>
                  </select>
                </div>

                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Student Count</label>
                  <select
                    value={studentCount}
                    onChange={(e) => setStudentCount(e.target.value)}
                    style={styles.selectField}
                  >
                    <option value="under100">Under 100</option>
                    <option value="100-500">100 - 500</option>
                    <option value="500-1000">500 - 1000</option>
                    <option value="over1000">1000+ Students</option>
                  </select>
                </div>
              </div>

              <Button
                type="button"
                variant="primary"
                onClick={handleNextStep}
                style={styles.actionBtn}
              >
                Continue to Account Setup
              </Button>
            </div>
          )}

          {/* STEP 2: Director Credentials form */}
          {step === 2 && (
            <form onSubmit={handleSubmit} style={styles.wizardPane}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Director Name</label>
                <div className="input-with-icon-wrapper">
                  <span className="input-icon-left">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    style={styles.inputField}
                    required
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Director Email</label>
                <div className="input-with-icon-wrapper">
                  <span className="input-icon-left">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    placeholder="director@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    style={styles.inputField}
                    required
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Password</label>
                  <div className="input-with-icon-wrapper">
                    <span className="input-icon-left">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  </div>
                </div>

                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Confirm Password</label>
                  <div className="input-with-icon-wrapper">
                    <span className="input-icon-left">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      style={styles.inputField}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "-0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.textBtn}
                >
                  {showPassword ? "Hide Passwords" : "Show Passwords"}
                </button>
              </div>

              <div style={styles.wizardActions}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handlePrevStep}
                  disabled={loading}
                  style={styles.halfBtn}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  style={styles.halfBtn}
                >
                  Register School
                </Button>
              </div>
            </form>
          )}

          {/* STEP 3: Successful Workspace Allocation */}
          {step === 3 && (
            <div style={styles.wizardPane} className="animate-fade-in">
              <div style={styles.successIconBox}>
                <div style={styles.successIcon}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>

              <div style={styles.tenantBox}>
                <span style={styles.tenantLabel}>Generated Tenant ID</span>
                <div style={styles.tenantIdWrapper}>
                  <span style={styles.tenantIdValue}>{generatedTenantId}</span>
                  <button
                    type="button"
                    onClick={handleCopyTenant}
                    style={{
                      ...styles.copyBtn,
                      backgroundColor: copied ? "var(--success-light)" : "var(--bg-app)",
                      color: copied ? "var(--success)" : "var(--text-secondary)",
                      borderColor: copied ? "var(--success)" : "var(--border-color)"
                    }}
                  >
                    {copied ? "Copied!" : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
                <p style={styles.tenantInstructions}>
                  Save this Tenant ID. Teachers and proctors must supply this code to link their accounts and classrooms to your school database.
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                onClick={() => router.push("/login")}
                style={styles.actionBtn}
              >
                Go to console login
              </Button>
            </div>
          )}

          {step !== 3 && (
            <div style={styles.formFooter}>
              <span style={styles.footerText}>Already have a school tenant? </span>
              <Link href="/login" style={styles.loginLink} className="interactive-element">
                Login here
              </Link>
            </div>
          )}
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
    marginBottom: "3.5rem",
  },
  wizardGuide: {
    display: "flex",
    flexDirection: "column",
    textAlign: "left",
    gap: "0rem",
  },
  guideStep: {
    display: "flex",
    gap: "1.2rem",
    position: "relative",
    paddingBottom: "2rem",
  },
  guideDot: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.85rem",
    fontWeight: 800,
    color: "#ffffff",
    zIndex: 5,
    flexShrink: 0,
  },
  guideLine: {
    position: "absolute",
    top: "28px",
    left: "13px",
    bottom: 0,
    borderLeft: "2px solid",
    zIndex: 1,
  },
  guideTextContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.2rem",
    marginTop: "2px",
  },
  guideStepTitle: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "#ffffff",
  },
  guideStepDesc: {
    fontSize: "0.85rem",
    color: "rgba(255, 255, 255, 0.75)",
  },
  formContainer: {
    width: "100%",
    maxWidth: "420px",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
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
    marginBottom: "0.5rem",
  },
  formTitle: {
    fontSize: "1.8rem",
    fontWeight: 800,
  },
  formSubtitle: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    lineHeight: 1.4,
  },
  wizardPane: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    width: "100%",
    animation: "fadeIn 0.25s ease-out forwards",
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
  selectField: {
    padding: "0.75rem 1rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    width: "100%",
    outline: "none",
    transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
  },
  formRow: {
    display: "flex",
    gap: "1rem",
    width: "100%",
  },
  actionBtn: {
    padding: "0.75rem 1.5rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "1rem",
    fontWeight: 700,
    marginTop: "0.5rem",
  },
  wizardActions: {
    display: "flex",
    gap: "1rem",
    marginTop: "0.5rem",
    width: "100%",
  },
  halfBtn: {
    flex: 1,
    padding: "0.75rem 1.5rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "1rem",
    fontWeight: 700,
  },
  textBtn: {
    color: "var(--primary)",
    fontSize: "0.8rem",
    fontWeight: 700,
    cursor: "pointer",
    background: "transparent",
    border: "none",
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
  successIconBox: {
    display: "flex",
    justifyContent: "center",
    margin: "1rem 0 0.5rem",
  },
  successIcon: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    backgroundColor: "var(--success-light)",
    color: "var(--success)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 20px rgba(16, 185, 129, 0.15)",
  },
  tenantBox: {
    backgroundColor: "var(--bg-app)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.6rem",
    textAlign: "center",
  },
  tenantLabel: {
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  tenantIdWrapper: {
    display: "flex",
    width: "100%",
    gap: "0.5rem",
    alignItems: "center",
    justifyContent: "center",
  },
  tenantIdValue: {
    fontSize: "1.6rem",
    fontWeight: 800,
    color: "var(--primary)",
    letterSpacing: "0.02em",
  },
  copyBtn: {
    padding: "0.5rem",
    borderRadius: "6px",
    border: "1px solid",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all var(--transition-fast)",
  },
  tenantInstructions: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    lineHeight: 1.5,
    marginTop: "0.4rem",
  },
  formFooter: {
    textAlign: "center",
    fontSize: "0.85rem",
    marginTop: "0.5rem",
  },
  footerText: {
    color: "var(--text-secondary)",
  },
  loginLink: {
    color: "var(--primary)",
    fontWeight: 700,
  },
};
