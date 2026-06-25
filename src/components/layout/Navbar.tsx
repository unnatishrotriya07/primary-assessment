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
    if (user.role === "admin" && !user.tenantId) return "Super Administrator";
    if (user.role === "admin") return "School Admin";
    if (user.role === "director") return "School Director";
    if (user.role === "teacher") return "Teacher";
    return user.role;
  };

  const isUserAdmin = user?.role === "admin";
  const displayNameText = isUserAdmin ? "Momentum" : (user?.schoolName || "Momentum Academy");
  const displayName = user?.name || "Admin Account";
  const displayRole = getRoleTitle();
  const avatarChar = displayName.charAt(0).toUpperCase();

  return (
    <header className="navbar-header">
      {/* Left side: Mobile Toggle, Brand Logo & Brand Name */}
      <div className="navbar-left">
        {/* Mobile grid menu button toggle */}
        <button 
          onClick={onMenuToggle} 
          className="navbar-grid-btn interactive-element" 
          aria-label="Toggle Menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
        </button>

        {/* Brand Logo & Brand Name (Product or School Name role-based) */}
        <Link href="/dashboard" className="navbar-logo-link interactive-element">
          <img src="/logo.png" alt="School Logo" className="navbar-logo-img" />
          <span className="navbar-logo-text" title={displayNameText}>
            {displayNameText.length > 24 ? displayNameText.substring(0, 22) + "..." : displayNameText}
          </span>
        </Link>
      </div>

      {/* Right side: Chat, Notification, and Profile dropdown avatar */}
      <div className="navbar-right">
        {/* Chat / Mail Icon button */}
        <button className="navbar-icon-btn interactive-element" aria-label="Chat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        {/* Notifications Bell button */}
        <button className="navbar-icon-btn interactive-element" aria-label="Notifications">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="navbar-badge" />
        </button>

        {/* User Profile Dropper */}
        <div className="navbar-profile-btn-container" ref={dropdownRef}>
          <button 
            className="navbar-profile-avatar-btn interactive-element" 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="navbar-profile-avatar">{avatarChar}</div>
          </button>

          {dropdownOpen && (
            <div className="navbar-profile-dropdown" role="menu">
              {/* User details header inside dropdown */}
              <div className="navbar-profile-dropdown-header">
                <span className="navbar-profile-dropdown-name">{displayName}</span>
                <span className="navbar-profile-dropdown-role">{displayRole}</span>
              </div>
              
              <Link 
                href="/dashboard" 
                className="navbar-dropdown-item" 
                onClick={() => setDropdownOpen(false)}
                role="menuitem"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
                  <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
                </svg>
                Dashboard
              </Link>
              
              <div 
                className="navbar-dropdown-item logout" 
                onClick={handleLogout}
                role="menuitem"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
