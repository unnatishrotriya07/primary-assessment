import React from "react";
import Button from "../common/Button";

interface QuestionStepperProps {
  current: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onSubmit: () => void;
  isSubmitted?: boolean;
}

export default function QuestionStepper({
  current,
  total,
  onNext,
  onPrev,
  onSubmit,
  isSubmitted = false,
}: QuestionStepperProps) {
  const isFirst = current === 0;
  const isLast = current === total - 1;

  return (
    <div style={styles.container}>
      <Button 
        variant="secondary" 
        onClick={onPrev} 
        disabled={isFirst || isSubmitted}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: "4px"}}>
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
        Previous
      </Button>

      <span style={styles.label}>
        Question {current + 1} of {total}
      </span>

      {isLast ? (
        <Button 
          variant="success" 
          onClick={onSubmit}
          disabled={isSubmitted}
        >
          Submit Answers
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginLeft: "4px"}}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </Button>
      ) : (
        <Button 
          variant="primary" 
          onClick={onNext}
          disabled={isSubmitted}
        >
          Next
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginLeft: "4px"}}>
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </Button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    padding: "1rem 1.5rem",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-sm)",
  },
  label: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
};
