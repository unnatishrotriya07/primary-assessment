"use client";

import React from "react";

export default function Navbar() {
  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <div style={styles.searchContainer}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color: "var(--text-muted)"}}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Quick search..." style={styles.searchInput} />
        </div>
      </div>

      <div style={styles.right}>
        <button style={styles.iconBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span style={styles.badge} />
        </button>

        <div style={styles.divider} />

        <div style={styles.profile}>
          <div style={styles.avatar}>A</div>
          <div style={styles.profileInfo}>
            <span style={styles.name}>Admin Account</span>
            <span style={styles.role}>Super Administrator</span>
          </div>
        </div>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    height: "70px",
    backgroundColor: "var(--glass-bg)",
    borderBottom: "1px solid var(--glass-border)",
    backdropFilter: "var(--glass-backdrop)",
    WebkitBackdropFilter: "var(--glass-backdrop)",
    boxShadow: "var(--glass-shadow)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 2rem",
    position: "sticky",
    top: 0,
    zIndex: 5,
  },
  left: {
    display: "flex",
    alignItems: "center",
  },
  searchContainer: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    backgroundColor: "var(--bg-app)",
    border: "1px solid var(--border-color)",
    padding: "0.5rem 1rem",
    borderRadius: "var(--radius-sm)",
    width: "280px",
  },
  searchInput: {
    width: "100%",
    fontSize: "0.9rem",
    color: "var(--text-primary)",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "1.2rem",
  },
  iconBtn: {
    position: "relative",
    cursor: "pointer",
    color: "var(--text-secondary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: "1px",
    right: "1px",
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "var(--error)",
  },
  divider: {
    width: "1px",
    height: "24px",
    backgroundColor: "var(--border-color)",
  },
  profile: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.95rem",
  },
  profileInfo: {
    display: "flex",
    flexDirection: "column",
  },
  name: {
    fontSize: "0.9rem",
    fontWeight: 600,
    lineHeight: 1.2,
  },
  role: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
  },
};
