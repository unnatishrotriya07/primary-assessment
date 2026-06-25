"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/utils/constants";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const handleLinkClick = () => {
    if (onClose) onClose();
  };
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) { }
      }
    }
  }, []);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClose) onClose();
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  };

  // Check if a path is allowed based on user permissions
  const isAllowed = (path: string) => {
    if (!user) return true; // Show until user loaded
    if ((user.role === "admin" && !user.tenantId) || user.role === "director") return true;
    const featureKey = path.replace("/", "");
    return user.allowedFeatures?.includes(featureKey);
  };

  const showSyllabus = isAllowed("/classes") || isAllowed("/subjects") || isAllowed("/chapters");
  const showTeamSettings = user && ((user.role === "admin" && !user.tenantId) || user.role === "director");
  const schoolDisplayName = user?.schoolName || "Momentum Academy";
  const isUserAdmin = user?.role === "admin";

  const isSyllabusActive =
    pathname.startsWith("/syllabus") ||
    pathname.startsWith("/classes") ||
    pathname.startsWith("/subjects") ||
    pathname.startsWith("/chapters");

  const displayNameText = isUserAdmin ? "Momentum" : (user?.schoolName || "Momentum Academy");

  return (
    <aside className={`sidebar-aside ${isOpen ? "open" : ""}`}>
      {/* Brand logo & product name at the top */}
      <Link href="/dashboard" style={styles.logoLink} className="interactive-element" onClick={handleLinkClick}>
        <img src="/logo.png" alt="Momentum Logo" style={styles.logoImg} />
        <h2 style={styles.logoText} title={displayNameText}>{displayNameText}</h2>
      </Link>

      {/* Navigation links */}
      <nav style={styles.nav}>
        {/* Dashboard */}
        {isAllowed("/dashboard") && (
          <Link
            href="/dashboard"
            onClick={handleLinkClick}
            style={{
              ...styles.navLink,
              backgroundColor: pathname === "/dashboard" ? "var(--primary-light)" : "transparent",
              color: pathname === "/dashboard" ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: pathname === "/dashboard" ? 600 : 500,
            }}
            className="interactive-element"
          >
            <span style={{ color: pathname === "/dashboard" ? "var(--primary)" : "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
              </svg>
            </span>
            Dashboard
          </Link>
        )}

        {/* Students */}
        {isAllowed("/students") && (
          <Link
            href="/students"
            onClick={handleLinkClick}
            style={{
              ...styles.navLink,
              backgroundColor: pathname.startsWith("/students") ? "var(--primary-light)" : "transparent",
              color: pathname.startsWith("/students") ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: pathname.startsWith("/students") ? 600 : 500,
            }}
            className="interactive-element"
          >
            <span style={{ color: pathname.startsWith("/students") ? "var(--primary)" : "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M9 21v-2a4 4 0 0 0-3-3.87" />
                <circle cx="9" cy="7" r="4" />
                <circle cx="17" cy="11" r="3" />
              </svg>
            </span>
            Students
          </Link>
        )}

        {/* Syllabus Link */}
        {showSyllabus && (
          <Link
            href="/syllabus"
            onClick={handleLinkClick}
            style={{
              ...styles.navLink,
              backgroundColor: isSyllabusActive ? "var(--primary-light)" : "transparent",
              color: isSyllabusActive ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: isSyllabusActive ? 600 : 500,
            }}
            className="interactive-element"
          >
            <span style={{ color: isSyllabusActive ? "var(--primary)" : "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </span>
            Syllabus
          </Link>
        )}

        {/* Assessments & Questions */}
        {isAllowed("/assessments") && (
          <Link
            href="/assessments"
            onClick={handleLinkClick}
            style={{
              ...styles.navLink,
              backgroundColor: pathname.startsWith("/assessments") ? "var(--primary-light)" : "transparent",
              color: pathname.startsWith("/assessments") ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: pathname.startsWith("/assessments") ? 600 : 500,
            }}
            className="interactive-element"
          >
            <span style={{ color: pathname.startsWith("/assessments") ? "var(--primary)" : "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </span>
            Assessments & Questions
          </Link>
        )}

        {/* Team */}
        {showTeamSettings && (
          <Link
            href="/team"
            onClick={handleLinkClick}
            style={{
              ...styles.navLink,
              backgroundColor: pathname.startsWith("/team") ? "var(--primary-light)" : "transparent",
              color: pathname.startsWith("/team") ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: pathname.startsWith("/team") ? 600 : 500,
            }}
            className="interactive-element"
          >
            <span style={{ color: pathname.startsWith("/team") ? "var(--primary)" : "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            Team
          </Link>
        )}
      </nav>

      {/* Bottom Footer Section */}
      <div style={styles.footer}>
        <div style={styles.divider} />

        {/* Sidebar Bottom Logout button (Collapse style matching mockup) */}
        <button onClick={handleLogout} style={styles.sidebarLogoutBtn} className="interactive-element">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "0.8rem", color: "var(--text-muted)" }}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Logout</span>
        </button>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  logoLink: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
    textDecoration: "none",
  },
  logoImg: {
    width: "32px",
    height: "32px",
    objectFit: "contain",
  },
  logoText: {
    fontSize: "1.2rem",
    fontWeight: 800,
    fontFamily: "var(--font-heading)",
    color: "var(--text-primary)",
    letterSpacing: "-0.025em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "140px",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    flexGrow: 1,
    overflowY: "auto",
    paddingRight: "0.2rem",
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
    padding: "0.8rem 1rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.95rem",
    textDecoration: "none",
    transition: "all var(--transition-fast)",
  },
  footer: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    marginTop: "auto",
  },
  sidebarLogoutBtn: {
    display: "flex",
    alignItems: "center",
    padding: "0.8rem 1rem",
    color: "var(--text-secondary)",
    fontSize: "0.95rem",
    textDecoration: "none",
    background: "none",
    border: "none",
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
    transition: "all var(--transition-fast)",
    borderRadius: "var(--radius-sm)",
  },
  divider: {
    height: "1px",
    backgroundColor: "var(--border-color)",
  },
};
