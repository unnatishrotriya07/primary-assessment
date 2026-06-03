"use client";

import React from "react";

interface StudentAnswerFormProps {
  options: string[];
  selectedOption: string;
  onSelect: (option: string) => void;
}

export default function StudentAnswerForm({ options, selectedOption, onSelect }: StudentAnswerFormProps) {
  return (
    <div style={styles.container}>
      {options.map((option, idx) => {
        const isSelected = selectedOption === option;
        const letter = String.fromCharCode(65 + idx); // A, B, C, D...

        return (
          <button
            key={option}
            onClick={() => onSelect(option)}
            style={{
              ...styles.optionCard,
              borderColor: isSelected ? "var(--secondary)" : "var(--border-color)",
              backgroundColor: isSelected ? "var(--secondary-light)" : "var(--bg-surface)",
              boxShadow: isSelected ? "var(--shadow-md)" : "var(--shadow-sm)",
            }}
            className="interactive-element"
          >
            <div 
              style={{
                ...styles.letterBox,
                backgroundColor: isSelected ? "var(--secondary)" : "var(--bg-surface-hover)",
                color: isSelected ? "#ffffff" : "var(--text-secondary)",
              }}
            >
              {letter}
            </div>
            <span style={styles.text}>{option}</span>
          </button>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    width: "100%",
  },
  optionCard: {
    display: "flex",
    alignItems: "center",
    gap: "1.2rem",
    padding: "1rem 1.5rem",
    borderRadius: "var(--radius-md)",
    border: "1px solid",
    cursor: "pointer",
    textAlign: "left",
    transition: "all var(--transition-fast)",
  },
  letterBox: {
    width: "32px",
    height: "32px",
    borderRadius: "var(--radius-sm)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.9rem",
    transition: "all var(--transition-fast)",
  },
  text: {
    fontSize: "1rem",
    fontWeight: 500,
    color: "var(--text-primary)",
  },
};
