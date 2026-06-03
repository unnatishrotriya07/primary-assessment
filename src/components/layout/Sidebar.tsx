"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

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

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logoContainer}>
        <span style={styles.logoDot}></span>
        <h2 style={styles.logoText}>Momentum</h2>
      </div>

      <nav style={styles.nav}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
          return (
            <Link
              key={item.name}
              href={item.path}
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
        <Link href="/" style={styles.logoutBtn} className="interactive-element">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </Link>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: "260px",
    height: "100vh",
    position: "fixed",
    top: 0,
    left: 0,
    backgroundColor: "var(--bg-surface)",
    borderRight: "1px solid var(--border-color)",
    padding: "2rem 1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "2.5rem",
    zIndex: 10,
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
  },
  logoDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
  },
  logoText: {
    fontSize: "1.4rem",
    fontWeight: 800,
    fontFamily: "var(--font-heading)",
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
  },
};
