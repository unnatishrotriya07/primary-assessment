import React, { useState } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
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
  const [hovered, setHovered] = useState(false);

  const getColors = () => {
    switch (variant) {
      case "secondary":
        return {
          bg: "var(--bg-surface)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-color)",
          hoverBg: "var(--bg-surface-hover)",
          hoverColor: "var(--text-primary)",
        };
      case "danger":
        return {
          bg: "var(--error)",
          color: "#ffffff",
          border: "1px solid var(--error)",
          hoverBg: "var(--primary-active)", // fallback or hover variation
          hoverColor: "#ffffff",
        };
      case "success":
        return {
          bg: "var(--success)",
          color: "#ffffff",
          border: "1px solid var(--success)",
          hoverBg: "var(--success-light)",
          hoverColor: "var(--success)",
        };
      case "ghost":
        return {
          bg: "transparent",
          color: "var(--text-secondary)",
          border: "1px solid transparent",
          hoverBg: "var(--bg-surface-hover)",
          hoverColor: "var(--text-primary)",
        };
      case "primary":
      default:
        return {
          bg: "var(--primary)",
          color: "#ffffff",
          border: "1px solid var(--primary)",
          hoverBg: "var(--primary-hover)",
          hoverColor: "#ffffff",
        };
    }
  };

  const colors = getColors();

  const getHeight = () => {
    switch (size) {
      case "sm":
        return "36px";
      case "lg":
        return "48px";
      case "md":
      default:
        return "40px";
    }
  };

  const getPadding = () => {
    switch (size) {
      case "sm":
        return "0 0.8rem";
      case "lg":
        return "0 1.6rem";
      case "md":
      default:
        return "0 1.2rem";
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
    height: getHeight(),
    padding: getPadding(),
    fontSize: getFontSize(),
    fontWeight: 600,
    backgroundColor: hovered && !disabled && !loading ? colors.hoverBg : colors.bg,
    color: hovered && !disabled && !loading ? colors.hoverColor : colors.color,
    border: colors.border,
    borderRadius: "var(--radius-sm)",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled || loading ? 0.6 : 1,
    transition: "all var(--transition-fast)",
    boxShadow: variant === "ghost" ? "none" : "var(--shadow-sm)",
    ...style,
  };

  return (
    <button
      style={buttonStyle}
      disabled={disabled || loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...props}
    >
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

