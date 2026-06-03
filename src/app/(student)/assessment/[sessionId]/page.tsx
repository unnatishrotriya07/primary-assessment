"use client";

import { use, useState, useEffect } from "react";
import ProgressTracker from "@/components/student/ProgressTracker";
import QuestionCard from "@/components/cards/QuestionCard";
import StudentAnswerForm from "@/components/forms/StudentAnswerForm";
import QuestionStepper from "@/components/student/QuestionStepper";
import assessmentService from "@/services/assessment.service";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

interface BackendQuestion {
  id: number | string;
  text: string;
  options: string[];
  difficulty: string;
  cognitive_level?: string;
  cognitiveLevel?: string;
}

export default function AssessmentSessionPage({ params }: PageProps) {
  const { sessionId } = use(params);
  
  const [questions, setQuestions] = useState<BackendQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [actualSessionId, setActualSessionId] = useState(sessionId);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Check if we have the session response in sessionStorage (from token verification)
    const cachedSession = typeof window !== "undefined" ? sessionStorage.getItem(`asmt_session_${sessionId}`) : null;
    if (cachedSession) {
      try {
        const res = JSON.parse(cachedSession);
        setQuestions(res.assessment?.questions || []);
        setActualSessionId(res.sessionId || sessionId);
        setLoading(false);
        return;
      } catch (err) {
        console.error("Failed to parse cached session data", err);
      }
    }

    // Fallback: Parse assessment ID from sessionId and start a new session
    let assessmentId = 1;
    const parts = sessionId.split("_");
    if (parts.length > 1) {
      const parsed = parseInt(parts[1], 10);
      if (!isNaN(parsed)) {
        assessmentId = parsed;
      }
    }

    assessmentService.startSession(assessmentId.toString())
      .then((res) => {
        setQuestions(res.assessment.questions || []);
        setActualSessionId(res.sessionId || sessionId);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to start assessment session", err);
        setError("Could not load assessment. Please ensure an active assessment exists.");
        setLoading(false);
      });
  }, [sessionId]);

  const handleSelectOption = (val: string) => {
    if (questions.length > 0) {
      setAnswers({
        ...answers,
        [questions[currentIdx].id.toString()]: val,
      });
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await assessmentService.submitAnswers({
        sessionId: actualSessionId,
        answers,
      });
      // Redirect to student result page with report ID returned by backend
      window.location.href = `/result/${res.resultId}`;
    } catch (err: any) {
      console.error("Failed to submit answers", err);
      setError("Failed to submit answers. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner" style={{ marginBottom: "1rem" }}></div>
        <p>Loading assessment questions...</p>
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div style={styles.errorContainer}>
        <h3 style={{ color: "var(--danger)" }}>Error</h3>
        <p style={{ margin: "1rem 0" }}>{error}</p>
        <button onClick={() => window.location.href = "/"} style={styles.exitBtn}>
          Return to Portal
        </button>
      </div>
    );
  }

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIdx];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.info}>
          <h2 style={styles.title}>Mathematics Assessment</h2>
          <p style={styles.sub}>Session ID: {actualSessionId}</p>
        </div>
        <div style={styles.timer}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: "6px"}}>
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          28:45 remaining
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={styles.trackerContainer}>
        <ProgressTracker current={currentIdx + 1} total={totalQuestions} answersCount={Object.keys(answers).length} />
      </div>

      <div style={styles.cardContainer}>
        <QuestionCard 
          questionNum={currentIdx + 1} 
          text={currentQuestion?.text || ""} 
        />
      </div>

      <div style={styles.formContainer}>
        <StudentAnswerForm 
          options={currentQuestion?.options || []}
          selectedOption={answers[currentQuestion?.id?.toString()] || ""}
          onSelect={handleSelectOption}
        />
      </div>

      <div style={styles.stepperContainer}>
        <QuestionStepper 
          current={currentIdx} 
          total={totalQuestions} 
          onNext={handleNext} 
          onPrev={handlePrev}
          isSubmitted={submitting}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "2rem 1rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "50vh",
    color: "var(--text-secondary)",
  },
  errorContainer: {
    maxWidth: "500px",
    margin: "4rem auto",
    padding: "2.5rem",
    textAlign: "center",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-md)",
  },
  exitBtn: {
    padding: "0.6rem 1.2rem",
    backgroundColor: "var(--primary)",
    color: "#ffffff",
    border: "none",
    borderRadius: "var(--radius-sm)",
    fontWeight: 600,
    cursor: "pointer",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: 700,
  },
  sub: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
  },
  timer: {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: "var(--warning-light)",
    color: "var(--warning)",
    padding: "0.5rem 1rem",
    borderRadius: "9999px",
    fontWeight: 600,
    fontSize: "0.9rem",
    border: "1px solid rgba(245, 158, 11, 0.2)",
  },
  trackerContainer: {
    width: "100%",
  },
  cardContainer: {
    width: "100%",
  },
  formContainer: {
    width: "100%",
  },
  stepperContainer: {
    width: "100%",
    marginTop: "1rem",
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
