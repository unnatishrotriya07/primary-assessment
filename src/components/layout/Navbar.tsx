"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { STORAGE_KEYS } from "@/utils/constants";

interface NavbarProps {
  onMenuToggle?: () => void;
}

export default function Navbar({ onMenuToggle }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {}
      }

      const handleStorageUpdate = () => {
        const updated = localStorage.getItem(STORAGE_KEYS.USER);
        if (updated) {
          try {
            setUser(JSON.parse(updated));
          } catch (e) {}
        }
      };
      window.addEventListener("storage", handleStorageUpdate);
      return () => window.removeEventListener("storage", handleStorageUpdate);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    setDropdownOpen(false);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  };

  const getRoleTitle = () => {
    if (!user) return "Loading...";
    if (user.role === "admin" && !user.tenantId) return "Super Admin";
    if (user.role === "admin") return "Admin";
    if (user.role === "director") return "Director";
    if (user.role === "teacher") return "Teacher";
    return user.role;
  };

  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    const crumbs = [{ label: "Today", href: "/dashboard" }];
    
    if (parts.length === 0 || parts[0] === "dashboard") {
      return crumbs;
    }
    
    let activeParts = parts;
    if (activeParts[0] === "admin") {
      activeParts = activeParts.slice(1);
    }
    
    if (activeParts.length === 0) {
      return crumbs;
    }

    const firstSec = activeParts[0];

    if (firstSec === "syllabus" || firstSec === "classes" || firstSec === "subjects" || firstSec === "chapters") {
      crumbs.push({ label: "Administration", href: "/syllabus" });
      
      // Determine tab if visible in URL query
      let currentTab = "";
      if (typeof window !== "undefined") {
        currentTab = new URLSearchParams(window.location.search).get("tab") || "";
      }
      
      if (firstSec === "subjects" || currentTab === "subjects") {
        crumbs.push({ label: "Subjects", href: "/syllabus?tab=subjects" });
      } else if (firstSec === "chapters" || currentTab === "chapters") {
        crumbs.push({ label: "Chapters", href: "/syllabus?tab=chapters" });
      } else {
        crumbs.push({ label: "Classes", href: "/syllabus?tab=classes" });
      }
    } else if (firstSec === "assessments") {
      let currentTab = "";
      if (typeof window !== "undefined") {
        currentTab = new URLSearchParams(window.location.search).get("tab") || "";
      }
      
      if (currentTab === "questions") {
        crumbs.push({ label: "Administration", href: "/syllabus" });
        crumbs.push({ label: "Saved Questions", href: "/assessments?tab=questions" });
      } else {
        crumbs.push({ label: "Assessments", href: "/assessments" });
      }
    } else if (firstSec === "students") {
      crumbs.push({ label: "Students", href: "/students" });
    } else if (firstSec === "team") {
      crumbs.push({ label: "Administration", href: "/syllabus" });
      crumbs.push({ label: "Team", href: "/team" });
    } else if (firstSec === "school-settings") {
      crumbs.push({ label: "Administration", href: "/syllabus" });
      crumbs.push({ label: "School Settings", href: "/school-settings" });
    } else if (firstSec === "questions") {
      crumbs.push({ label: "Administration", href: "/syllabus" });
      crumbs.push({ label: "Saved Questions", href: "/assessments?tab=questions" });
    } else if (firstSec === "reports") {
      crumbs.push({ label: "Learning Insights", href: "/reports" });
      if (activeParts[1]) crumbs.push({ label: "Diagnostic Report", href: pathname });
    } else {
      crumbs.push({ label: firstSec.charAt(0).toUpperCase() + firstSec.slice(1), href: `/${firstSec}` });
    }
    
    return crumbs;
  };

  const isSuperAdmin = user?.role === "admin" && !user?.tenantId;
  const displayNameText = user?.schoolName || "Momentum Academy";
  const displayName = user?.name || "Admin Account";
  const displayRole = getRoleTitle();
  const avatarChar = displayName.charAt(0).toUpperCase();

  return (
    <header className="navbar-header" style={styles.header}>
      {/* Left side: Mobile Toggle & Breadcrumbs */}
      <div className="navbar-left" style={styles.left}>
        <button 
          onClick={onMenuToggle} 
          className="navbar-grid-btn interactive-element" 
          aria-label="Toggle Menu"
          style={styles.menuToggleBtn}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
        </button>

        {/* School Name */}
        {!isSuperAdmin && (
          <>
            <span style={styles.schoolNameHeader}>{displayNameText}</span>
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0 0.5rem" }}>|</span>
          </>
        )}

        {/* Breadcrumbs */}
        <div style={styles.breadcrumbs}>
          {getBreadcrumbs().map((crumb, idx, arr) => (
            <React.Fragment key={crumb.href + idx}>
              {idx > 0 && <span style={styles.breadcrumbSeparator}>&gt;</span>}
              <Link href={crumb.href} style={idx === arr.length - 1 ? styles.breadcrumbActive : styles.breadcrumbLink}>
                {crumb.label}
              </Link>
            </React.Fragment>
          ))}
        </div>
      </div>



      {/* Right side: Notification and Profile dropdown avatar */}
      <div className="navbar-right" style={styles.right}>
        {/* Notifications Bell button */}
        <button className="navbar-icon-btn interactive-element" aria-label="Notifications" style={styles.iconBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="navbar-badge" style={styles.badge} />
        </button>

        {/* User Profile dropdown */}
        <div className="navbar-profile-btn-container" ref={dropdownRef} style={styles.profileContainer}>
          <button 
            className="navbar-profile-avatar-btn interactive-element" 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            style={styles.avatarBtn}
          >
            <div className="navbar-profile-avatar" style={styles.avatar}>{avatarChar}</div>
          </button>

          {dropdownOpen && (
            <div className="navbar-profile-dropdown" role="menu" style={styles.dropdown}>
              {/* User details header inside dropdown */}
              <div className="navbar-profile-dropdown-header" style={styles.dropdownHeader}>
                <span className="navbar-profile-dropdown-name" style={styles.dropdownName}>{displayName}</span>
                <span className="navbar-profile-dropdown-role" style={styles.dropdownRole}>{displayRole}</span>
              </div>
              
              <Link 
                href="/dashboard" 
                className="navbar-dropdown-item" 
                onClick={() => setDropdownOpen(false)}
                role="menuitem"
                style={styles.dropdownItem}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
                  <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
                  <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
                </svg>
                Today
              </Link>
              
              <div style={styles.dropdownDivider} />
              
              <div 
                className="navbar-dropdown-item logout" 
                onClick={handleLogout}
                role="menuitem"
                style={{ ...styles.dropdownItem, ...styles.logoutItem }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  schoolNameHeader: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    fontFamily: "var(--font-sans)",
    letterSpacing: "-0.02em",
  },
  header: {
    display: "flex",
    height: "72px",
    backgroundColor: "var(--bg-surface)",
    borderBottom: "1px solid var(--border-color)",
    padding: "0 2rem",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  menuToggleBtn: {
    background: "none",
    border: "none",
    color: "var(--text-secondary)",
    cursor: "pointer",
    display: "none",
    padding: 0,
  },
  breadcrumbs: {
    display: "flex",
    alignItems: "center",
    fontSize: "0.9rem",
    fontWeight: 500,
    fontFamily: "var(--font-sans)",
  },
  breadcrumbLink: {
    color: "var(--text-secondary)",
    textDecoration: "none",
    transition: "color var(--transition-fast)",
  },
  breadcrumbActive: {
    color: "var(--text-primary)",
    pointerEvents: "none",
  },
  breadcrumbSeparator: {
    color: "var(--text-muted)",
    margin: "0 0.5rem",
    fontSize: "0.8rem",
  },
  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    maxWidth: "400px",
  },
  searchBar: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "var(--bg-app)",
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    height: "36px",
    width: "100%",
    padding: "0 0.8rem",
  },
  searchText: {
    color: "var(--text-muted)",
    fontSize: "0.85rem",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  iconBtn: {
    position: "relative",
    background: "none",
    border: "none",
    color: "var(--text-secondary)",
    cursor: "pointer",
    padding: "0.5rem",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background var(--transition-fast)",
  },
  badge: {
    position: "absolute",
    top: "6px",
    right: "6px",
    width: "8px",
    height: "8px",
    backgroundColor: "var(--error)",
    borderRadius: "50%",
  },
  profileContainer: {
    position: "relative",
  },
  avatarBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "var(--primary)",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: "1rem",
  },
  dropdown: {
    position: "absolute",
    top: "44px",
    right: 0,
    width: "220px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "12px",
    boxShadow: "var(--shadow-md)",
    padding: "0.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  dropdownHeader: {
    display: "flex",
    flexDirection: "column",
    padding: "0.5rem 0.75rem",
  },
  dropdownName: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  dropdownRole: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    marginTop: "2px",
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    padding: "0.5rem 0.75rem",
    borderRadius: "8px",
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    textDecoration: "none",
    transition: "background var(--transition-fast)",
    cursor: "pointer",
  },
  dropdownDivider: {
    height: "1px",
    backgroundColor: "var(--divider)",
    margin: "0.25rem 0",
  },
  logoutItem: {
    color: "var(--error)",
  },
  styles: {},
};
