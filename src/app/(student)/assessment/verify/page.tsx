"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import assessmentService, { StudentAssessmentVerifyResponse } from "@/services/assessment.service";
import interviewService from "@/services/interview.service";
import Button from "@/components/common/Button";
import { extractErrorMessage, isHindiText } from "@/utils/helpers";


function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyData, setVerifyData] = useState<StudentAssessmentVerifyResponse | null>(null);
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

  const handleStartLearning = async () => {
    setAuthenticating(true);
    setError(null);
    const expectedEmail = verifyData?.studentEmail || email;
    try {
      // Direct start without Gmail/Google picker modal
      const interviewSession = await interviewService.start(token, expectedEmail);

      // Save to sessionStorage so the interview page loads instantly
      sessionStorage.setItem(
        `interview_session_${interviewSession.interview_id}`,
        JSON.stringify(interviewSession)
      );

      // Go to the AI interviewer page
      router.push(`/interview/${interviewSession.interview_id}`);
    } catch (err: any) {
      setError(
        extractErrorMessage(err, "Verification failed. The link may have been used or expired.")
      );
      setAuthenticating(false);
    }
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
        {/* School Logo Area */}
        <div style={styles.schoolHeader}>
          <span style={styles.schoolLogoIcon}>🎓</span>
          <span style={styles.schoolLogoText}>Momentum Academy</span>
        </div>

        {/* Large Buddy Illustration */}
        <div style={styles.buddyIllustrationContainer}>
          <svg width="140" height="140" viewBox="0 0 100 100" style={styles.buddySvg}>
            {/* Soft glowing backdrop */}
            <circle cx="50" cy="50" r="45" fill="#EFF6FF" />
            
            {/* Body / Face */}
            <circle cx="50" cy="55" r="28" fill="#BFDBFE" stroke="#2563EB" strokeWidth="2.5" />
            
            {/* Graduation Cap */}
            <path d="M22 38 L50 24 L78 38 L50 52 Z" fill="#1E3A8A" stroke="#1E40AF" strokeWidth="2" />
            <rect x="47" y="38" width="6" height="15" fill="#1E3A8A" />
            <circle cx="50" cy="53" r="3.5" fill="#F59E0B" />
            
            {/* Cap Tassel */}
            <path d="M70 38 L78 48 L78 53" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
            <circle cx="78" cy="54" r="2" fill="#F59E0B" />
            
            {/* Eyes */}
            <ellipse cx="41" cy="53" rx="2.5" ry="4" fill="#1E3A8A" />
            <ellipse cx="59" cy="53" rx="2.5" ry="4" fill="#1E3A8A" />
            
            {/* Rosy Cheeks */}
            <circle cx="35" cy="59" r="3.5" fill="#F87171" opacity="0.65" />
            <circle cx="65" cy="59" r="3.5" fill="#F87171" opacity="0.65" />
            
            {/* Smile */}
            <path d="M44 61 Q50 67 56 61" fill="none" stroke="#1E3A8A" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Warm Welcome Content */}
        {(() => {
          const isHindi = verifyData 
            ? (verifyData.subjectName?.toLowerCase() === "hindi" || isHindiText(verifyData.assessmentTitle) || isHindiText(verifyData.studentName))
            : false;
          return (
            <>
              <h2 style={styles.welcomeGreeting} className={isHindi ? "font-hindi" : ""}>👋 Hi {verifyData.studentName || "there"}!</h2>
              <p style={styles.invitationText} className={isHindi ? "font-hindi" : ""}>
                Your teacher has invited you to have a learning conversation with Buddy.
              </p>

              {/* Assessment Details Box */}
              <div style={styles.detailsBox}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Today's Topic</span>
                  <strong style={styles.detailValue} className={isHindi ? "font-hindi" : ""}>{verifyData.assessmentTitle || verifyData.subjectName || "Fractions"}</strong>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Estimated Time</span>
                  <strong style={styles.detailValue}>10 minutes</strong>
                </div>
              </div>
            </>
          );
        })()}

        {/* Info notice */}
        <p style={styles.readyText}>Press Start when you're ready.</p>

        {/* Primary CTA */}
        <div style={styles.actionContainer}>
          <button 
            style={styles.startBtn} 
            onClick={handleStartLearning} 
            className="interactive-element"
            disabled={authenticating}
          >
            {authenticating ? "Starting..." : "Start Learning"}
          </button>
        </div>
      </div>
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
  loadingContainer: { display: "flex", flexDirection: "column", alignItems: "center", minHeight: "60vh", color: "var(--text-secondary)", justifyContent: "center" },
  container: { maxWidth: "520px", margin: "4rem auto", padding: "0 1.5rem" },
  card: { padding: "3rem 2.5rem", boxShadow: "0 10px 30px rgba(15,23,42,0.06)", textAlign: "center", borderRadius: "16px", backgroundColor: "#ffffff", border: "1px solid #E5E7EB" },
  schoolHeader: { display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "2rem" },
  schoolLogoIcon: { fontSize: "1.2rem" },
  schoolLogoText: { fontSize: "0.85rem", fontWeight: 600, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" },
  buddyIllustrationContainer: { display: "flex", justifyContent: "center", marginBottom: "2rem" },
  buddySvg: { overflow: "visible" },
  welcomeGreeting: { fontSize: "1.8rem", fontWeight: 700, color: "#111827", marginBottom: "0.75rem", fontFamily: "var(--font-heading), system-ui" },
  invitationText: { fontSize: "1.05rem", color: "#6B7280", lineHeight: "1.6", marginBottom: "2.5rem" },
  detailsBox: { backgroundColor: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem", textAlign: "left" },
  detailRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  detailLabel: { fontSize: "0.9rem", color: "#6B7280", fontWeight: 500 },
  detailValue: { fontSize: "1rem", color: "#2563EB", fontWeight: 600 },
  readyText: { fontSize: "0.9rem", color: "#9CA3AF", marginBottom: "1.5rem" },
  actionContainer: { display: "flex", justifyContent: "center" },
  startBtn: { width: "100%", padding: "1rem 2rem", backgroundColor: "#2563EB", border: "none", borderRadius: "10px", color: "#ffffff", fontSize: "1.05rem", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 6px -1px rgba(37,99,235,0.2)", transition: "background 0.2s ease" },
  errorContainer: { maxWidth: "500px", margin: "4rem auto", padding: "3rem 2rem", textAlign: "center", boxShadow: "var(--shadow-lg)", borderRadius: "var(--radius-lg)" },
  errorIcon: { width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "var(--error-light)", color: "var(--error)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", fontWeight: "bold", margin: "0 auto 1.5rem" },
  errorTitle: { fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" },
  errorText: { fontSize: "0.95rem", color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: "1.5" },
  errorHelp: { backgroundColor: "var(--bg-app)", padding: "1rem", borderRadius: "var(--radius-sm)", textAlign: "left", marginBottom: "2rem", fontSize: "0.85rem" },
  helpList: { paddingLeft: "1.2rem", marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.25rem", color: "var(--text-secondary)" }
};