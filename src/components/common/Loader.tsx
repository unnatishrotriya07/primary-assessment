import React from "react";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

export default function Loader({ size = "md", label }: LoaderProps) {
  const getDimensions = () => {
    switch (size) {
      case "sm":
        return "20px";
      case "lg":
        return "48px";
      case "md":
      default:
        return "32px";
    }
  };

  const dim = getDimensions();

  return (
    <div style={styles.container}>
      <div 
        style={{
          ...styles.spinner,
          width: dim,
          height: dim,
        }} 
      />
      {label && <span style={styles.label}>{label}</span>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.8rem",
    padding: "2rem",
  },
  spinner: {
    border: "3px solid var(--border-color)",
    borderTopColor: "var(--primary)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  label: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    fontWeight: 500,
  },
};
