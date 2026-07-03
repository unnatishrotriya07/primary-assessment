"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import assessmentService, { StudentAssessmentVerifyResponse } from "@/services/assessment.service";
import interviewService from "@/services/interview.service";
import Button from "@/components/common/Button";
import { extractErrorMessage } from "@/utils/helpers";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyData, setVerifyData] = useState<StudentAssessmentVerifyResponse | null>(null);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [authStep, setAuthStep] = useState<"list" | "input" | "loading" | "success">("list");
  const [typedEmail, setTypedEmail] = useState("");
  const [googleError, setGoogleError] = useState("");
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      setError("Missing token or email parameter in link. Please use the exact link sent to you.");
      setLoading(false);
      return;
    }
    assessmentService.verifyToken(token, email)
      .then((res) => {
        if (!res.valid) {
          setError(res.reason || "This assessment link is invalid or expired.");
        } else {
          setVerifyData(res);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to connect to the verification server. Please try again later.");
        setLoading(false);
      });
  }, [token, email]);

  const handleStartGoogleSignIn = () => {
    setAuthStep("list");
    setGoogleError("");
    setTypedEmail("");
    setShowGoogleModal(true);
  };

  const handleSelectAccount = async (selectedEmail: string) => {
    setGoogleError("");
    setAuthStep("loading");
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const expectedEmail = verifyData?.studentEmail || email;

    if (selectedEmail.trim().toLowerCase() !== expectedEmail.trim().toLowerCase()) {
      setAuthStep("list");
      setGoogleError(
        `Access denied. You signed in as '${selectedEmail}', but this assessment is assigned to '${expectedEmail}'. Please choose the correct Google account.`
      );
      return;
    }

    try {
      setAuthenticating(true);

      // ── START AI INTERVIEW ──────────────────────────────────────────────────
      // This calls POST /api/interviews/start
      // Creates the Interview row in the DB, returns interview_id + questions
      const interviewSession = await interviewService.start(token, expectedEmail);

      // Save to sessionStorage so the interview page loads instantly
      // without needing another API call
      sessionStorage.setItem(
        `interview_session_${interviewSession.interview_id}`,
        JSON.stringify(interviewSession)
      );

      setAuthStep("success");
      await new Promise((resolve) => setTimeout(resolve, 800));
      setShowGoogleModal(false);

      // Go to the AI interviewer page
      router.push(`/interview/${interviewSession.interview_id}`);
      // ── END CHANGE ──────────────────────────────────────────────────────────

    } catch (err: any) {
      setAuthStep("list");
      setGoogleError(
        extractErrorMessage(err, "Verification failed. The link may have been used or expired.")
      );
      setAuthenticating(false);
    }
  };

  const handleTypedEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedEmail.trim()) {
      setGoogleError("Please enter an email address.");
      return;
    }
    handleSelectAccount(typedEmail);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner" style={{ marginBottom: "1rem" }}></div>
        <h3 style={{ fontFamily: "var(--font-heading)" }}>Verifying assessment invitation...</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Please wait while we check your token validity.
        </p>
      </div>
    );
  }

  if (error || !verifyData) {
    return (
      <div style={styles.errorContainer} className="glass-panel animate-fade-in">
        <div style={styles.errorIcon}>✕</div>
        <h3 style={styles.errorTitle}>Access Denied</h3>
        <p style={styles.errorText}>{error || "This invitation is no longer active."}</p>
        <div style={styles.errorHelp}>
          <p>Common reasons for this error:</p>
          <ul style={styles.helpList}>
            <li>The link has expired (active for 24 hours from creation).</li>
            <li>The assessment has already been started or completed.</li>
            <li>The link parameters were copied incorrectly.</li>
          </ul>
        </div>
        <Button onClick={() => router.push("/")} variant="secondary" style={{ width: "100%" }}>
          Return to Portal
        </Button>
      </div>
    );
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.card} className="glass-panel">
        <div style={styles.badgeContainer}>
          <span style={styles.badge}>Secured Invitation</span>
        </div>
        <h2 style={styles.title} className="gradient-text">Verify Your Identity</h2>
        <p style={styles.subtitle}>
          Welcome! You have been invited to complete a short oral assessment.
        </p>

        <div style={styles.infoSection}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Assessment</span>
            <span style={styles.infoValue}>{verifyData.assessmentTitle}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Subject / Class</span>
            <span style={styles.infoValue}>
              {verifyData.subjectName} — {verifyData.className}
            </span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Assigned Student</span>
            <span style={styles.infoValue}>
              {verifyData.studentName} ({verifyData.studentEmail})
            </span>
          </div>
        </div>

        <div style={styles.ruleNotice}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ color: "var(--warning)", flexShrink: 0, marginTop: 2 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span style={styles.ruleText}>
            This single-use link is valid for <strong>24 hours</strong>. You will complete
            a short oral assessment. Please allow microphone access when prompted.
          </span>
        </div>

        <div style={styles.actionContainer}>
          <button style={styles.googleBtn} onClick={handleStartGoogleSignIn} className="interactive-element">
            <svg style={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.48 3.77v3.1h3.98c2.33-2.14 3.66-5.29 3.66-8.72z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.98-3.1c-1.1.74-2.52 1.18-3.98 1.18-3.07 0-5.67-2.08-6.6-4.88H1.32v3.2A11.99 11.99 0 0 0 12 24z" />
              <path fill="#FBBC05" d="M5.4 14.29a7.22 7.22 0 0 1 0-4.58V6.51H1.32a11.99 11.99 0 0 0 0 10.98l4.08-3.2z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.32 0 3.28 2.69 1.32 6.51l4.08 3.2c.93-2.8 3.53-4.96 6.6-4.96z" />
            </svg>
            Sign in with Google to Begin Assessment
          </button>
        </div>
      </div>

      {showGoogleModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.googleModal} className="animate-fade-in">
            <div style={styles.googleHeader}>
              <svg viewBox="0 0 24 24" width="32" height="32" style={{ marginBottom: "0.5rem" }}>
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.48 3.77v3.1h3.98c2.33-2.14 3.66-5.29 3.66-8.72z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.98-3.1c-1.1.74-2.52 1.18-3.98 1.18-3.07 0-5.67-2.08-6.6-4.88H1.32v3.2A11.99 11.99 0 0 0 12 24z" />
                <path fill="#FBBC05" d="M5.4 14.29a7.22 7.22 0 0 1 0-4.58V6.51H1.32a11.99 11.99 0 0 0 0 10.98l4.08-3.2z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.32 0 3.28 2.69 1.32 6.51l4.08 3.2c.93-2.8 3.53-4.96 6.6-4.96z" />
              </svg>
              <h3 style={styles.googleModalTitle}>Choose an account</h3>
              <p style={styles.googleModalSubtitle}>
                to continue to <strong style={{ color: "#3c4043" }}>Momentum</strong>
              </p>
            </div>

            {authStep === "loading" && (
              <div style={styles.googleLoadingContainer}>
                <div style={styles.googleSpinner}></div>
                <p style={styles.googleLoadingText}>Verifying with Google...</p>
              </div>
            )}

            {authStep === "success" && (
              <div style={styles.googleSuccessContainer}>
                <div style={styles.googleSuccessIcon}>✓</div>
                <p style={styles.googleSuccessText}>Starting your assessment...</p>
              </div>
            )}

            {authStep === "list" && (
              <div style={styles.googleContent}>
                {googleError && <div style={styles.googleErrorBanner}>{googleError}</div>}
                <div style={styles.accountList}>
                  <div
                    style={styles.accountItem}
                    onClick={() => handleSelectAccount(verifyData.studentEmail || email)}
                    className="interactive-element"
                  >
                    <div style={styles.avatar}>
                      {verifyData.studentName ? verifyData.studentName[0].toUpperCase() : "S"}
                    </div>
                    <div style={styles.accountDetails}>
                      <span style={styles.accountName}>{verifyData.studentName}</span>
                      <span style={styles.accountEmail}>{verifyData.studentEmail}</span>
                    </div>
                    <span style={styles.badgeSigned}>Assigned</span>
                  </div>
                  <div
                    style={styles.accountItem}
                    onClick={() => handleSelectAccount("other.student@gmail.com")}
                    className="interactive-element"
                  >
                    <div style={{ ...styles.avatar, backgroundColor: "#e2e8f0", color: "#64748b" }}>O</div>
                    <div style={styles.accountDetails}>
                      <span style={styles.accountName}>Other Student (Personal)</span>
                      <span style={styles.accountEmail}>other.student@gmail.com</span>
                    </div>
                  </div>
                </div>
                <button style={styles.useOtherBtn} onClick={() => setAuthStep("input")}>
                  Use another account
                </button>
              </div>
            )}

            {authStep === "input" && (
              <form onSubmit={handleTypedEmailSubmit} style={styles.googleInputForm}>
                {googleError && <div style={styles.googleErrorBanner}>{googleError}</div>}
                <p style={styles.inputInstructions}>Sign in using your Google Email</p>
                <input
                  type="email"
                  placeholder="Email or phone"
                  value={typedEmail}
                  onChange={(e) => setTypedEmail(e.target.value)}
                  style={styles.googleInput}
                  required
                  autoFocus
                />
                <div style={styles.googleFormActions}>
                  <button type="button" style={styles.googleBackBtn} onClick={() => setAuthStep("list")}>
                    Back
                  </button>
                  <button type="submit" style={styles.googleNextBtn}>Next</button>
                </div>
              </form>
            )}

            <div style={styles.googleFooter}>
              <span>Google will share your name and email with Momentum to verify your identity.</span>
              <button
                style={styles.cancelBtn}
                onClick={() => { if (!authenticating) setShowGoogleModal(false); }}
                disabled={authenticating}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentVerifyPage() {
  return (
    <Suspense fallback={
      <div style={styles.loadingContainer}>
        <div className="spinner" style={{ marginBottom: "1rem" }}></div>
        <h3 style={{ fontFamily: "var(--font-heading)" }}>Loading verification...</h3>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loadingContainer: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "var(--text-secondary)" },
  container: { maxWidth: "550px", margin: "3rem auto", padding: "0 1rem" },
  card: { padding: "2.5rem", boxShadow: "var(--shadow-lg)", textAlign: "center", borderRadius: "var(--radius-lg)" },
  badgeContainer: { marginBottom: "1rem" },
  badge: { display: "inline-block", padding: "0.25rem 0.75rem", borderRadius: "9999px", backgroundColor: "var(--primary-light)", color: "var(--primary)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" },
  title: { fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" },
  subtitle: { color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.5", marginBottom: "2rem" },
  infoSection: { backgroundColor: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "1.2rem", textAlign: "left", display: "flex", flexDirection: "column", gap: "0.8rem", marginBottom: "1.5rem" },
  infoRow: { display: "flex", flexDirection: "column", gap: "0.15rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.6rem" },
  infoLabel: { fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 },
  infoValue: { fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" },
  ruleNotice: { display: "flex", gap: "0.75rem", backgroundColor: "var(--warning-light)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "var(--radius-sm)", padding: "0.8rem 1rem", textAlign: "left", alignItems: "flex-start", marginBottom: "2rem" },
  ruleText: { fontSize: "0.8rem", color: "var(--warning)", lineHeight: "1.4" },
  actionContainer: { display: "flex", justifyContent: "center" },
  googleBtn: { display: "inline-flex", alignItems: "center", gap: "0.75rem", padding: "0.8rem 1.5rem", backgroundColor: "#ffffff", border: "1px solid #dadce0", borderRadius: "24px", color: "#3c4043", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 3px rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)", fontFamily: "var(--font-sans)" },
  googleIcon: { width: "18px", height: "18px" },
  errorContainer: { maxWidth: "500px", margin: "4rem auto", padding: "3rem 2rem", textAlign: "center", boxShadow: "var(--shadow-lg)", borderRadius: "var(--radius-lg)" },
  errorIcon: { width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "var(--error-light)", color: "var(--error)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", fontWeight: "bold", margin: "0 auto 1.5rem" },
  errorTitle: { fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" },
  errorText: { fontSize: "0.95rem", color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: "1.5" },
  errorHelp: { backgroundColor: "var(--bg-app)", padding: "1rem", borderRadius: "var(--radius-sm)", textAlign: "left", marginBottom: "2rem", fontSize: "0.85rem" },
  helpList: { paddingLeft: "1.2rem", marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.25rem", color: "var(--text-secondary)" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 },
  googleModal: { backgroundColor: "#ffffff", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", width: "100%", maxWidth: "450px", minHeight: "500px", padding: "2.5rem 2rem 1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#202124", boxSizing: "border-box" },
  googleHeader: { textAlign: "center", marginBottom: "1.5rem" },
  googleModalTitle: { fontSize: "1.5rem", fontWeight: 400, color: "#202124", marginTop: "0.5rem", marginBottom: "0.2rem" },
  googleModalSubtitle: { fontSize: "0.95rem", color: "#5f6368" },
  googleContent: { flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "1.2rem" },
  accountList: { display: "flex", flexDirection: "column", borderTop: "1px solid #dadce0", borderBottom: "1px solid #dadce0" },
  accountItem: { display: "flex", alignItems: "center", padding: "0.8rem 0.5rem", cursor: "pointer", borderBottom: "1px solid #f1f3f4", gap: "0.8rem", position: "relative" },
  avatar: { width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--primary)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: "0.95rem" },
  accountDetails: { display: "flex", flexDirection: "column", flexGrow: 1, overflow: "hidden" },
  accountName: { fontSize: "0.85rem", fontWeight: 600, color: "#3c4043" },
  accountEmail: { fontSize: "0.75rem", color: "#5f6368" },
  badgeSigned: { fontSize: "0.7rem", fontWeight: 600, color: "#188038", backgroundColor: "#e6f4ea", padding: "0.15rem 0.4rem", borderRadius: "4px" },
  useOtherBtn: { alignSelf: "flex-start", backgroundColor: "transparent", border: "none", color: "#1a73e8", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", padding: "0.25rem 0.5rem" },
  googleInputForm: { flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "1rem" },
  inputInstructions: { fontSize: "0.9rem", color: "#202124", marginBottom: "0.5rem", textAlign: "left" },
  googleInput: { width: "100%", padding: "1rem", fontSize: "1rem", border: "1px solid #dadce0", borderRadius: "4px", outline: "none", color: "#202124", boxSizing: "border-box" },
  googleFormActions: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem" },
  googleBackBtn: { backgroundColor: "transparent", border: "none", color: "#1a73e8", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", padding: "0.5rem 1rem", borderRadius: "4px" },
  googleNextBtn: { backgroundColor: "#1a73e8", border: "none", color: "#ffffff", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", padding: "0.5rem 1.25rem", borderRadius: "4px" },
  googleErrorBanner: { padding: "0.75rem 1rem", backgroundColor: "#fce8e6", color: "#c5221f", borderRadius: "4px", fontSize: "0.8rem", textAlign: "left", border: "1px solid #f5c2c2", lineHeight: "1.4" },
  googleLoadingContainer: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexGrow: 1, gap: "1rem" },
  googleSpinner: { width: "36px", height: "36px", border: "3px solid #f3f3f3", borderTop: "3px solid #1a73e8", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  googleLoadingText: { fontSize: "0.9rem", color: "#5f6368" },
  googleSuccessContainer: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexGrow: 1, gap: "0.5rem" },
  googleSuccessIcon: { width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#e6f4ea", color: "#137333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: "bold" },
  googleSuccessText: { fontSize: "0.95rem", fontWeight: 600, color: "#137333" },
  googleFooter: { fontSize: "0.75rem", color: "#5f6368", lineHeight: "1.4", marginTop: "1.5rem", borderTop: "1px solid #f1f3f4", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" },
  cancelBtn: { backgroundColor: "transparent", border: "none", color: "#5f6368", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", padding: "0.25rem 0.5rem" },
};