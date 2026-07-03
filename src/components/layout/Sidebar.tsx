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

  const isClassesActive =
    pathname.startsWith("/syllabus") ||
    pathname.startsWith("/classes") ||
    pathname.startsWith("/subjects") ||
    pathname.startsWith("/chapters");

  const displayNameText = isUserAdmin ? "Momentum" : schoolDisplayName;
  const userRoleTitle = () => {
    if (!user) return "";
    if (user.role === "admin" && !user.tenantId) return "Super Admin";
    if (user.role === "admin") return "Admin";
    if (user.role === "director") return "Director";
    if (user.role === "teacher") return "Teacher";
    return user.role;
  };

  const userAvatarChar = user?.name ? user.name.charAt(0).toUpperCase() : "A";

  return (
    <aside className={`sidebar-aside ${isOpen ? "open" : ""}`} style={styles.aside}>
      {/* Brand logo & product name at the top */}
      <div style={styles.logoSection}>
        <Link href="/dashboard" style={styles.logoLink} className="interactive-element" onClick={handleLinkClick}>
          <img src="/logo.png" alt="Momentum Logo" style={styles.logoImg} />
          <h2 style={styles.logoText}>{displayNameText}</h2>
        </Link>
        <span style={styles.schoolNameSub}>{displayNameText}</span>
      </div>

      {/* Primary Navigation */}
      <nav style={styles.nav}>
        {/* Home */}
        {isAllowed("/dashboard") && (
          <Link
            href="/dashboard"
            onClick={handleLinkClick}
            style={{
              ...styles.navLink,
              backgroundColor: pathname === "/dashboard" ? "var(--selected-bg)" : "transparent",
              color: pathname === "/dashboard" ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: pathname === "/dashboard" ? 500 : 400,
            }}
            className="interactive-element"
          >
            <span style={{ color: pathname === "/dashboard" ? "var(--primary)" : "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
              </svg>
            </span>
            Home
          </Link>
        )}

        {/* Classes */}
        {showSyllabus && (
          <Link
            href="/syllabus"
            onClick={handleLinkClick}
            style={{
              ...styles.navLink,
              backgroundColor: isClassesActive ? "var(--selected-bg)" : "transparent",
              color: isClassesActive ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: isClassesActive ? 500 : 400,
            }}
            className="interactive-element"
          >
            <span style={{ color: isClassesActive ? "var(--primary)" : "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </span>
            Classes
          </Link>
        )}

        {/* Assessments */}
        {isAllowed("/assessments") && (
          <Link
            href="/assessments"
            onClick={handleLinkClick}
            style={{
              ...styles.navLink,
              backgroundColor: pathname.startsWith("/assessments") ? "var(--selected-bg)" : "transparent",
              color: pathname.startsWith("/assessments") ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: pathname.startsWith("/assessments") ? 500 : 400,
            }}
            className="interactive-element"
          >
            <span style={{ color: pathname.startsWith("/assessments") ? "var(--primary)" : "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </span>
            Assessments
          </Link>
        )}

        {/* Students */}
        {isAllowed("/students") && (
          <Link
            href="/students"
            onClick={handleLinkClick}
            style={{
              ...styles.navLink,
              backgroundColor: pathname.startsWith("/students") ? "var(--selected-bg)" : "transparent",
              color: pathname.startsWith("/students") ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: pathname.startsWith("/students") ? 500 : 400,
            }}
            className="interactive-element"
          >
            <span style={{ color: pathname.startsWith("/students") ? "var(--primary)" : "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M9 21v-2a4 4 0 0 0-3-3.87" />
                <circle cx="9" cy="7" r="4" />
                <circle cx="17" cy="11" r="3" />
              </svg>
            </span>
            Students
          </Link>
        )}

        {/* Reports */}
        {isAllowed("/students") && (
          <Link
            href="/students"
            onClick={handleLinkClick}
            style={{
              ...styles.navLink,
              backgroundColor: "transparent",
              color: "var(--text-secondary)",
              fontWeight: 400,
            }}
            className="interactive-element"
          >
            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </span>
            Reports
          </Link>
        )}

        {/* Resources */}
        {isAllowed("/dashboard") && (
          <Link
            href="/dashboard"
            onClick={handleLinkClick}
            style={{
              ...styles.navLink,
              backgroundColor: "transparent",
              color: "var(--text-secondary)",
              fontWeight: 400,
            }}
            className="interactive-element"
          >
            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </span>
            Resources
          </Link>
        )}

        <div style={styles.divider} />

        {/* Secondary Navigation */}
        {/* Settings */}
        {showTeamSettings && (
          <Link
            href="/team"
            onClick={handleLinkClick}
            style={{
              ...styles.navLink,
              backgroundColor: pathname.startsWith("/team") ? "var(--selected-bg)" : "transparent",
              color: pathname.startsWith("/team") ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: pathname.startsWith("/team") ? 500 : 400,
            }}
            className="interactive-element"
          >
            <span style={{ color: pathname.startsWith("/team") ? "var(--primary)" : "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            Settings
          </Link>
        )}

        {/* Help */}
        <Link
          href="#"
          onClick={handleLinkClick}
          style={{
            ...styles.navLink,
            backgroundColor: "transparent",
            color: "var(--text-secondary)",
            fontWeight: 400,
          }}
          className="interactive-element"
        >
          <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          Help
        </Link>
      </nav>

      {/* Divider and User Profile Card */}
      <div style={styles.profileSection}>
        <div style={styles.divider} />
        {user && (
          <div style={styles.profileCard}>
            <div style={styles.profileAvatar}>
              {userAvatarChar}
            </div>
            <div style={styles.profileInfo}>
              <span style={styles.profileName} title={user.name}>{user.name || "User Account"}</span>
              <span style={styles.profileRoleSchool} title={`${userRoleTitle()} • ${displayNameText}`}>
                {userRoleTitle()} • {displayNameText}
              </span>
              <button onClick={handleLogout} style={styles.logoutBtn} className="interactive-element">
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  aside: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  logoSection: {
    display: "flex",
    flexDirection: "column",
    padding: "1.5rem 1.5rem 1rem 1.5rem",
    gap: "0.2rem",
  },
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
    margin: 0,
  },
  schoolNameSub: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    marginTop: "0.2rem",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    flexGrow: 1,
    overflowY: "auto",
    padding: "0.5rem 1rem",
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
    padding: "0.7rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.95rem",
    textDecoration: "none",
    transition: "all var(--transition-fast)",
  },
  profileSection: {
    display: "flex",
    flexDirection: "column",
    padding: "1rem 1.5rem 1.5rem 1.5rem",
    gap: "1rem",
  },
  profileCard: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.75rem",
    borderRadius: "10px",
    backgroundColor: "var(--bg-app)",
    border: "1px solid var(--border-color)",
    overflow: "hidden",
  },
  profileAvatar: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    backgroundColor: "var(--primary)",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: "1.1rem",
    flexShrink: 0,
  },
  profileInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    overflow: "hidden",
    flexGrow: 1,
  },
  profileName: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflow: "hidden",
  },
  profileRoleSchool: {
    fontSize: "0.7rem",
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflow: "hidden",
  },
  logoutBtn: {
    background: "none",
    border: "none",
    color: "var(--error)",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
    marginTop: "4px",
    textAlign: "left",
    width: "fit-content",
    transition: "color var(--transition-fast)",
  },
  divider: {
    height: "1px",
    backgroundColor: "var(--divider)",
    margin: "0.5rem 0",
  },
};
