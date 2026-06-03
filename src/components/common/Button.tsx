import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const getColors = () => {
    switch (variant) {
      case "secondary":
        return {
          bg: "var(--bg-surface-hover)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-color)",
          hoverBg: "var(--border-color)",
        };
      case "danger":
        return {
          bg: "var(--error)",
          color: "#ffffff",
          border: "none",
          hoverBg: "var(--error-light)",
        };
      case "success":
        return {
          bg: "var(--success)",
          color: "#ffffff",
          border: "none",
          hoverBg: "var(--success-light)",
        };
      case "primary":
      default:
        return {
          bg: "var(--primary)",
          color: "#ffffff",
          border: "none",
          hoverBg: "var(--primary-hover)",
        };
    }
  };

  const colors = getColors();

  const getPadding = () => {
    switch (size) {
      case "sm":
        return "0.4rem 0.8rem";
      case "lg":
        return "0.8rem 1.6rem";
      case "md":
      default:
        return "0.6rem 1.2rem";
    }
  };

  const getFontSize = () => {
    switch (size) {
      case "sm":
        return "0.85rem";
      case "lg":
        return "1.05rem";
      case "md":
      default:
        return "0.95rem";
    }
  };

  const buttonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: getPadding(),
    fontSize: getFontSize(),
    fontWeight: 600,
    backgroundColor: colors.bg,
    color: colors.color,
    border: colors.border,
    borderRadius: "var(--radius-sm)",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled || loading ? 0.6 : 1,
    transition: "all var(--transition-fast)",
    boxShadow: "var(--shadow-sm)",
    ...style,
  };

  return (
    <button style={buttonStyle} disabled={disabled || loading} {...props}>
      {loading && (
        <span style={styles.spinner} />
      )}
      {children}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  spinner: {
    width: "14px",
    height: "14px",
    border: "2px solid currentColor",
    borderTopColor: "transparent",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};
