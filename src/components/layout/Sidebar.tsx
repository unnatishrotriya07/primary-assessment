"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/utils/constants";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isHovered?: boolean;
  onHoverChange?: (hovered: boolean) => void;
}

export default function Sidebar({ 
  isOpen = false, 
  onClose,
  isHovered: propsHovered,
  onHoverChange
}: SidebarProps) {
  const handleLinkClick = () => {
    if (onClose) onClose();
  };
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState("");
  const [localHovered, setLocalHovered] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  const isHovered = propsHovered !== undefined ? propsHovered : localHovered;

  const handleMouseEnter = () => {
    setLocalHovered(true);
    if (onHoverChange) onHoverChange(true);
  };

  const handleMouseLeave = () => {
    setLocalHovered(false);
    if (onHoverChange) onHoverChange(false);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) { }
      }

      const handleStorageChange = () => {
        const updated = localStorage.getItem(STORAGE_KEYS.USER);
        if (updated) {
          try {
            setUser(JSON.parse(updated));
          } catch (e) {}
        }
      };

      const handlePathChange = () => {
        const params = new URLSearchParams(window.location.search);
        setCurrentTab(params.get("tab") || "");
      };

      window.addEventListener("storage", handleStorageChange);
      window.addEventListener("popstate", handlePathChange);
      handlePathChange();

      return () => {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("popstate", handlePathChange);
      };
    }
  }, [pathname]);

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
  const showSchoolSettings = user && user.role === "director";
  const schoolDisplayName = user?.schoolName || "Momentum Academy";
  const isUserAdmin = user?.role === "admin";
  const isSuperAdmin = user?.role === "admin" && !user?.tenantId;

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

  const asideWidth = isHovered ? "260px" : "80px";

  // Helper function to check if active
  const isTabActive = (href: string, tabValue?: string) => {
    if (href === "/syllabus") {
      return pathname.startsWith("/syllabus");
    }
    if (tabValue) {
      return pathname.startsWith(href) && currentTab === tabValue;
    }
    // Specific case for Assessments with questions tab
    if (href === "/assessments" && pathname.startsWith("/assessments") && currentTab === "questions") {
      return false;
    }
    return pathname.startsWith(href) && !currentTab;
  };

  const renderNavLink = (id: string, href: string, label: string, iconSvg: React.ReactNode, tabVal?: string) => {
    const isActive = isTabActive(href, tabVal);
    const isLinkHovered = hoveredLink === id;

    return (
      <Link
        href={href}
        onClick={handleLinkClick}
        onMouseEnter={() => setHoveredLink(id)}
        onMouseLeave={() => setHoveredLink(null)}
        style={{
          ...styles.navLink,
          backgroundColor: isActive ? "var(--selected-bg)" : isLinkHovered ? "var(--bg-surface-hover)" : "transparent",
          color: isActive ? "var(--primary)" : isLinkHovered ? "var(--text-primary)" : "var(--text-secondary)",
          fontWeight: isActive ? 500 : 400,
          justifyContent: isHovered ? "flex-start" : "center",
        }}
        className="interactive-element"
        title={!isHovered ? label : undefined}
      >
        <span style={{ color: isActive ? "var(--primary)" : isLinkHovered ? "var(--text-primary)" : "var(--text-muted)", display: "flex", alignItems: "center" }}>
          {iconSvg}
        </span>
        {isHovered && label}
      </Link>
    );
  };

  return (
    <aside 
      className={`sidebar-aside ${isOpen ? "open" : ""}`} 
      style={{
        ...styles.aside,
        width: asideWidth,
        transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1), padding 0.2s ease-in-out",
        padding: isHovered ? "1.5rem 1rem" : "1.5rem 0.5rem",
        alignItems: isHovered ? "stretch" : "center",
        zIndex: 2000,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Brand logo & product name at the top */}
      <div style={{
        ...styles.logoSection,
        alignItems: isHovered ? "flex-start" : "center",
        padding: isHovered ? "1.5rem 1rem 1rem 1rem" : "1.5rem 0.2rem 1rem 0.2rem",
      }}>
        <Link href="/dashboard" style={styles.logoLink} className="interactive-element" onClick={handleLinkClick}>
          <img src="/logo.png" alt="Momentum Logo" style={styles.logoImg} />
          {isHovered && <h2 style={styles.logoText}>{displayNameText}</h2>}
        </Link>
      </div>

      {/* Navigation Groups */}
      <nav style={styles.nav}>
        {/* Section 1: Today, Assessments, Students, Insights */}
        {isAllowed("/dashboard") && renderNavLink(
          "today",
          "/dashboard",
          "Today",
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        )}

        {isSuperAdmin && renderNavLink(
          "control-panel",
          "/control-panel",
          "Control Panel",
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        )}

        {isAllowed("/assessments") && !isSuperAdmin && renderNavLink(
          "assessments",
          "/assessments",
          "Assessments",
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          </svg>
        )}

        {isAllowed("/students") && !isSuperAdmin && renderNavLink(
          "students",
          "/students",
          "Students",
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M9 21v-2a4 4 0 0 0-3-3.87" />
            <circle cx="9" cy="7" r="4" />
            <circle cx="17" cy="11" r="3" />
          </svg>
        )}

        {isAllowed("/students") && !isSuperAdmin && renderNavLink(
          "reports",
          "/reports",
          "Learning Insights",
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        )}

        {/* Section divider */}
        <div style={styles.divider} />

        {/* Section 2: Academics */}
        {(showSyllabus || isAllowed("/questions")) && (
          <>
            {isHovered ? (
              <div style={styles.sectionHeader}>Academics</div>
            ) : (
              <div style={{ height: "4px" }} />
            )}

            {showSyllabus && renderNavLink(
              "syllabus",
              "/syllabus",
              "Syllabus",
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            )}

            {isAllowed("/questions") && renderNavLink(
              "questions",
              "/assessments?tab=questions",
              "Question Library",
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>,
              "questions"
            )}

            {/* Section divider */}
            <div style={styles.divider} />
          </>
        )}

        {/* Section 3: Team & Settings */}
        {showTeamSettings && renderNavLink(
          "team",
          "/team",
          "Team",
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        )}

        {showSchoolSettings && renderNavLink(
          "settings",
          "/school-settings",
          "Settings",
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        )}
      </nav>

      {/* User Profile Card */}
      <div style={{
        ...styles.profileSection,
        padding: isHovered ? "1rem 1rem 1.5rem 1rem" : "1rem 0.2rem 1.5rem 0.2rem",
        alignItems: isHovered ? "stretch" : "center",
      }}>
        <div style={styles.divider} />
        {user && (
          <div style={{
            ...styles.profileCard,
            padding: isHovered ? "0.75rem" : "0.4rem",
            justifyContent: isHovered ? "flex-start" : "center",
            width: "100%",
          }}>
            <div style={styles.profileAvatar}>
              {userAvatarChar}
            </div>
            {isHovered && (
              <div style={styles.profileInfo}>
                <span style={styles.profileName} title={user.name}>{user.name || "User Account"}</span>
                <span style={styles.profileRoleSchool} title={`${userRoleTitle()} • ${displayNameText}`}>
                  {userRoleTitle()} • {displayNameText}
                </span>
                <button onClick={handleLogout} style={styles.logoutBtn} className="interactive-element">
                  Logout
                </button>
              </div>
            )}
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
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    flexGrow: 1,
    overflowY: "auto",
    padding: "0.5rem 0.2rem",
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
  sectionHeader: {
    fontSize: "0.7rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: "var(--text-muted)",
    padding: "0.8rem 0.8rem 0.3rem 0.8rem",
  },
  profileSection: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  profileCard: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
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

