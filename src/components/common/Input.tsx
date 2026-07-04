import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, style, ...props }: InputProps) {
  return (
    <div style={styles.container}>
      {label && (
        <label style={styles.label}>
          {label}
          {props.required && <span className="required-asterisk">*</span>}
        </label>
      )}
      <input 
        style={{
          ...styles.input,
          borderColor: error ? "var(--error)" : "var(--border-color)",
          boxShadow: error ? "0 0 0 1px var(--error)" : "none",
          ...style
        }} 
        {...props} 
      />
      {error && <span style={styles.errorText}>{error}</span>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    width: "100%",
  },
  label: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  input: {
    padding: "0.7rem 1rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
  },
  errorText: {
    fontSize: "0.8rem",
    color: "var(--error)",
    fontWeight: 500,
  },
};
