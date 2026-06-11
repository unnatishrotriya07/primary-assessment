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
        } catch (e) {}
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

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
        </svg>
      ),
    },
    {
      name: "Classes",
      path: "/classes",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
    {
      name: "Subjects",
      path: "/subjects",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      ),
    },
    {
      name: "Chapters",
      path: "/chapters",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ),
    },
    {
      name: "Question Bank",
      path: "/questions",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    {
      name: "Assessments",
      path: "/assessments",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
  ];

  // Filter items based on user allowed features
  const filteredMenuItems = menuItems.filter((item) => {
    if (!user) return true; // Show all until user loaded
    
    // Super-Admin can access everything
    if (user.role === "admin" && !user.tenantId) return true;
    
    // Map path to feature key
    const featureKey = item.path.replace("/", "");
    return user.allowedFeatures?.includes(featureKey);
  });

  // Add Team Settings for Super-Admin and Director roles
  const showTeamSettings = user && ((user.role === "admin" && !user.tenantId) || user.role === "director");
  
  const finalMenuItems = [...filteredMenuItems];
  if (showTeamSettings) {
    finalMenuItems.push({
      name: "Team Settings",
      path: "/team",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    });
  }

  const schoolDisplayName = user?.schoolName || "Momentum";

  return (
    <aside className={`sidebar-aside ${isOpen ? "open" : ""}`}>
      <Link href="/dashboard" style={styles.logoLink} className="interactive-element" onClick={handleLinkClick}>
        <img src="/logo.png" alt="School Logo" style={styles.logoImg} />
        <h2 style={styles.logoText} title={schoolDisplayName}>
          {schoolDisplayName.length > 12 ? schoolDisplayName.substring(0, 10) + "..." : schoolDisplayName}
        </h2>
      </Link>

      <nav style={styles.nav}>
        {finalMenuItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
          return (
            <Link
              key={item.name}
              href={item.path}
              onClick={handleLinkClick}
              style={{
                ...styles.navLink,
                backgroundColor: isActive ? "var(--primary-light)" : "transparent",
                color: isActive ? "var(--primary)" : "var(--text-secondary)",
                fontWeight: isActive ? 600 : 500,
              }}
              className="interactive-element"
            >
              <span style={{ color: isActive ? "var(--primary)" : "var(--text-muted)" }}>
                {item.icon}
              </span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div style={styles.footer}>
        <div style={styles.divider} />
        <button onClick={handleLogout} style={styles.logoutBtn} className="interactive-element">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: "220px",
    height: "100vh",
    position: "fixed",
    top: 0,
    left: 0,
    backgroundColor: "var(--glass-bg)",
    borderRight: "1px solid var(--glass-border)",
    backdropFilter: "var(--glass-backdrop)",
    WebkitBackdropFilter: "var(--glass-backdrop)",
    boxShadow: "var(--glass-shadow)",
    padding: "2rem 1.2rem",
    display: "flex",
    flexDirection: "column",
    gap: "2.5rem",
    zIndex: 10,
  },
  logoLink: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
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
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    flexGrow: 1,
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
    gap: "1.5rem",
  },
  divider: {
    height: "1px",
    backgroundColor: "var(--border-color)",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
    padding: "0.8rem 1rem",
    color: "var(--error)",
    fontSize: "0.95rem",
    textDecoration: "none",
    fontWeight: 600,
    background: "none",
    border: "none",
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
  },
};
