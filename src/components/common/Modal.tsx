import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "medium" | "large";
}

export default function Modal({ isOpen, onClose, title, children, size = "medium" }: ModalProps) {
  if (!isOpen) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    (e.currentTarget as any)._mouseDownTarget = e.target;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const mouseDownTarget = (e.currentTarget as any)._mouseDownTarget;
    if (e.target === e.currentTarget && mouseDownTarget === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="modal-overlay"
      style={styles.overlay} 
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <div 
        className="modal-content"
        style={{
          ...styles.content,
          maxWidth: size === "large" ? "800px" : "500px",
        }}
      >
        <div style={styles.header}>
          {title && <h3 style={styles.title}>{title}</h3>}
          <button style={styles.closeBtn} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div style={styles.body}>
          {children}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.65)", // Premium dark translucent background
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    overflowY: "auto",
    padding: "2rem 1rem",
  },
  content: {
    width: "100%",
    maxWidth: "500px",
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    boxShadow: "var(--shadow-lg)",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    margin: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: "1.3rem",
    fontWeight: 700,
  },
  closeBtn: {
    cursor: "pointer",
    color: "var(--text-secondary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.2rem",
    borderRadius: "50%",
    transition: "background-color var(--transition-fast)",
  },
  body: {
    width: "100%",
  },
};
