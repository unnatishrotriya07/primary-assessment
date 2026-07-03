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
  const [isAdminExpanded, setIsAdminExpanded] = useState(false);
  const [currentTab, setCurrentTab] = useState("");
  const [localHovered, setLocalHovered] = useState(false);

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

  // Keep admin expanded if any admin page is active
  useEffect(() => {
    const isAdminPageActive =
      pathname.startsWith("/syllabus") ||
      pathname.startsWith("/classes") ||
      pathname.startsWith("/subjects") ||
      pathname.startsWith("/chapters") ||
      pathname.startsWith("/team") ||
      pathname.startsWith("/school-settings") ||
      (pathname.startsWith("/assessments") && currentTab === "questions");

    if (isAdminPageActive) {
      setIsAdminExpanded(true);
    }
  }, [pathname, currentTab]);

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

  const showAdminGroup = showSyllabus || showTeamSettings || isAllowed("/questions");

  const asideWidth = isHovered ? "260px" : "80px";

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

      {/* Primary Navigation */}
      <nav style={styles.nav}>
        {/* Today (Home) */}
        {isAllowed("/dashboard") && (
          <Link
            href="/dashboard"
            onClick={handleLinkClick}
            style={{
              ...styles.navLink,
              backgroundColor: pathname === "/dashboard" ? "var(--selected-bg)" : "transparent",
              color: pathname === "/dashboard" ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: pathname === "/dashboard" ? 500 : 400,
              justifyContent: isHovered ? "flex-start" : "center",
            }}
            className="interactive-element"
            title={!isHovered ? "Today" : undefined}
          >
            <span style={{ color: pathname === "/dashboard" ? "var(--primary)" : "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </span>
            {isHovered && "Today"}
          </Link>
        )}

        {/* Control Panel (Super Admin only) */}
        {isSuperAdmin && (
          <Link
            href="/control-panel"
            onClick={handleLinkClick}
            style={{
              ...styles.navLink,
              backgroundColor: pathname.startsWith("/control-panel") ? "var(--selected-bg)" : "transparent",
              color: pathname.startsWith("/control-panel") ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: pathname.startsWith("/control-panel") ? 500 : 400,
              justifyContent: isHovered ? "flex-start" : "center",
            }}
            className="interactive-element"
            title={!isHovered ? "Control Panel" : undefined}
          >
            <span style={{ color: pathname.startsWith("/control-panel") ? "var(--primary)" : "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            {isHovered && "Control Panel"}
          </Link>
        )}

        {/* Assessments */}
        {isAllowed("/assessments") && !isSuperAdmin && (
          <Link
            href="/assessments"
            onClick={handleLinkClick}
            style={{
              ...styles.navLink,
              backgroundColor: pathname.startsWith("/assessments") && currentTab !== "questions" ? "var(--selected-bg)" : "transparent",
              color: pathname.startsWith("/assessments") && currentTab !== "questions" ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: pathname.startsWith("/assessments") && currentTab !== "questions" ? 500 : 400,
              justifyContent: isHovered ? "flex-start" : "center",
            }}
            className="interactive-element"
            title={!isHovered ? "Assessments" : undefined}
          >
            <span style={{ color: pathname.startsWith("/assessments") && currentTab !== "questions" ? "var(--primary)" : "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
            </span>
            {isHovered && "Assessments"}
          </Link>
        )}

        {/* Students */}
        {isAllowed("/students") && !isSuperAdmin && (
          <Link
            href="/students"
            onClick={handleLinkClick}
            style={{
              ...styles.navLink,
              backgroundColor: pathname.startsWith("/students") ? "var(--selected-bg)" : "transparent",
              color: pathname.startsWith("/students") ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: pathname.startsWith("/students") ? 500 : 400,
              justifyContent: isHovered ? "flex-start" : "center",
            }}
            className="interactive-element"
            title={!isHovered ? "Students" : undefined}
          >
            <span style={{ color: pathname.startsWith("/students") ? "var(--primary)" : "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M9 21v-2a4 4 0 0 0-3-3.87" />
                <circle cx="9" cy="7" r="4" />
                <circle cx="17" cy="11" r="3" />
              </svg>
            </span>
            {isHovered && "Students"}
          </Link>
        )}

        {/* Learning Insights (Reports) */}
        {isAllowed("/students") && !isSuperAdmin && (
          <Link
            href="/reports"
            onClick={handleLinkClick}
            style={{
              ...styles.navLink,
              backgroundColor: pathname.startsWith("/reports") ? "var(--selected-bg)" : "transparent",
              color: pathname.startsWith("/reports") ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: pathname.startsWith("/reports") ? 500 : 400,
              justifyContent: isHovered ? "flex-start" : "center",
            }}
            className="interactive-element"
            title={!isHovered ? "Learning Insights" : undefined}
          >
            <span style={{ color: pathname.startsWith("/reports") ? "var(--primary)" : "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </span>
            {isHovered && "Learning Insights"}
          </Link>
        )}

        {/* Collapsible Administration Group */}
        {showAdminGroup && (
          <div>
            <button
              onClick={() => setIsAdminExpanded(!isAdminExpanded)}
              style={{
                ...styles.navLink,
                background: "none",
                border: "none",
                width: "100%",
                textAlign: "left",
                color: "var(--text-secondary)",
                fontWeight: 500,
                cursor: "pointer",
                justifyContent: isHovered ? "flex-start" : "center",
              }}
              className="interactive-element"
              title={!isHovered ? "Administration" : undefined}
            >
              <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="9" y1="9" x2="15" y2="9" />
                  <line x1="9" y1="13" x2="15" y2="13" />
                  <line x1="9" y1="17" x2="15" y2="17" />
                </svg>
              </span>
              {isHovered && "Administration"}
              {isHovered && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{
                    marginLeft: "auto",
                    transform: isAdminExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform var(--transition-fast)",
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              )}
            </button>

            {isHovered && isAdminExpanded && (
              <div style={styles.adminSubmenu}>
                {/* Boards */}
                {isSuperAdmin && (
                  <Link
                    href="/syllabus?tab=boards"
                    onClick={handleLinkClick}
                    style={{
                      ...styles.adminSubLink,
                      backgroundColor: pathname.startsWith("/syllabus") && currentTab === "boards" ? "var(--selected-bg)" : "transparent",
                      color: pathname.startsWith("/syllabus") && currentTab === "boards" ? "var(--primary)" : "var(--text-secondary)",
                    }}
                    className="interactive-element"
                  >
                    Boards
                  </Link>
                )}
                {/* Classes */}
                {isAllowed("/classes") && (
                  <Link
                    href="/syllabus?tab=classes"
                    onClick={handleLinkClick}
                    style={{
                      ...styles.adminSubLink,
                      backgroundColor: pathname.startsWith("/syllabus") && currentTab === "classes" ? "var(--selected-bg)" : "transparent",
                      color: pathname.startsWith("/syllabus") && currentTab === "classes" ? "var(--primary)" : "var(--text-secondary)",
                    }}
                    className="interactive-element"
                  >
                    Classes
                  </Link>
                )}

                {/* Subjects */}
                {isAllowed("/subjects") && (
                  <Link
                    href="/syllabus?tab=subjects"
                    onClick={handleLinkClick}
                    style={{
                      ...styles.adminSubLink,
                      backgroundColor: pathname.startsWith("/syllabus") && currentTab === "subjects" ? "var(--selected-bg)" : "transparent",
                      color: pathname.startsWith("/syllabus") && currentTab === "subjects" ? "var(--primary)" : "var(--text-secondary)",
                    }}
                    className="interactive-element"
                  >
                    Subjects
                  </Link>
                )}

                {/* Chapters */}
                {isAllowed("/chapters") && (
                  <Link
                    href="/syllabus?tab=chapters"
                    onClick={handleLinkClick}
                    style={{
                      ...styles.adminSubLink,
                      backgroundColor: pathname.startsWith("/syllabus") && currentTab === "chapters" ? "var(--selected-bg)" : "transparent",
                      color: pathname.startsWith("/syllabus") && currentTab === "chapters" ? "var(--primary)" : "var(--text-secondary)",
                    }}
                    className="interactive-element"
                  >
                    Chapters
                  </Link>
                )}

                {/* Saved Questions */}
                {isAllowed("/questions") && (
                  <Link
                    href="/assessments?tab=questions"
                    onClick={handleLinkClick}
                    style={{
                      ...styles.adminSubLink,
                      backgroundColor: pathname.startsWith("/assessments") && currentTab === "questions" ? "var(--selected-bg)" : "transparent",
                      color: pathname.startsWith("/assessments") && currentTab === "questions" ? "var(--primary)" : "var(--text-secondary)",
                    }}
                    className="interactive-element"
                  >
                    Saved Questions
                  </Link>
                )}

                {/* Team */}
                {showTeamSettings && (
                  <Link
                    href="/team"
                    onClick={handleLinkClick}
                    style={{
                      ...styles.adminSubLink,
                      backgroundColor: pathname.startsWith("/team") ? "var(--selected-bg)" : "transparent",
                      color: pathname.startsWith("/team") ? "var(--primary)" : "var(--text-secondary)",
                    }}
                    className="interactive-element"
                  >
                    Team
                  </Link>
                )}

                {/* School Settings */}
                {showSchoolSettings && (
                  <Link
                    href="/school-settings"
                    onClick={handleLinkClick}
                    style={{
                      ...styles.adminSubLink,
                      backgroundColor: pathname.startsWith("/school-settings") ? "var(--selected-bg)" : "transparent",
                      color: pathname.startsWith("/school-settings") ? "var(--primary)" : "var(--text-secondary)",
                    }}
                    className="interactive-element"
                  >
                    School Settings
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Divider and User Profile Card */}
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
  adminSubmenu: {
    display: "flex",
    flexDirection: "column",
    gap: "0.2rem",
    paddingLeft: "1rem",
    marginTop: "0.25rem",
    borderLeft: "1px solid var(--border-color)",
    marginLeft: "1.6rem",
  },
  adminSubLink: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    padding: "0.5rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.9rem",
    textDecoration: "none",
    transition: "all var(--transition-fast)",
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
