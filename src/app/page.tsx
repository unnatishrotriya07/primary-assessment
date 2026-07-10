"use client";

import Link from "next/link";
import React, { useState } from "react";

export default function Home() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <main style={styles.container}>
      {/* Background Glowing Ambient Orbs */}
      <div style={styles.glow1}></div>
      <div style={styles.glow2}></div>
      <div style={styles.glow3}></div>

      {/* Sleek Glassmorphic Top Navigation Header */}
      <header className="glass-panel" style={styles.navHeader}>
        <div style={styles.navBrand}>
          <div style={styles.logoBadge}>M</div>
          <span style={styles.brandName}>Momentum</span>
        </div>
        <nav className="landing-nav-links" style={styles.navLinks}>
          <a href="#features" style={styles.navLink}>Platform Features</a>
          <a href="#how-it-works" style={styles.navLink}>How It Works</a>
          <a href="#faq" style={styles.navLink}>FAQ</a>
        </nav>
        <div style={styles.navActions}>
          <Link href="/login" style={styles.navBtnLogin} className="interactive-element">
            Sign In
          </Link>
          <Link href="/signup" style={styles.navBtnSignup} className="interactive-element">
            Register School
          </Link>
        </div>
      </header>

      {/* Hero Presentation Section */}
      <section style={styles.heroSection}>
        <div style={styles.heroBadge}>
          <span style={styles.heroBadgeDot}></span>
          Next-Generation Primary Assessment
        </div>
        <h1 style={styles.heroTitle}>
          Empower Learning with <span className="gradient-text">Adaptive Evaluation</span>
        </h1>
        <p style={styles.heroSubtitle}>
          The unified evaluation platform for schools. Secure proctoring, automated question generation, and real-time student analytics.
        </p>

        <div style={styles.heroCTAs}>
          <Link href="/signup" style={{ ...styles.btn, ...styles.btnPrimary }} className="interactive-element">
            Get Started (Register School)
          </Link>
          <Link href="/login" style={{ ...styles.btn, ...styles.btnSecondary }} className="interactive-element">
            Console Login
          </Link>
        </div>

        {/* Live CSS Interactive Dashboard Preview Mockup */}
        <div style={styles.mockupWrapper}>
          <div className="mockup-container">
            <div className="mockup-header">
              <span className="mockup-dot red"></span>
              <span className="mockup-dot yellow"></span>
              <span className="mockup-dot green"></span>
              <div className="mockup-address">https://console.momentum.edu/dashboard</div>
              <div style={styles.mockupStatus}>
                <span style={styles.liveIndicatorDot}></span>
                Live System Preview
              </div>
            </div>
            <div className="mockup-content" style={styles.mockupContentGrid}>
              {/* Mockup Sidebar */}
              <div style={styles.mockupSidebar}>
                <div style={styles.mockupSidebarLogo}>
                  <div style={styles.logoBadgeSmall}>M</div>
                  <span>Momentum</span>
                </div>
                <div style={{ ...styles.mockupSidebarItem, ...styles.mockupSidebarActive }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="9" />
                    <rect x="14" y="3" width="7" height="5" />
                    <rect x="14" y="12" width="7" height="9" />
                    <rect x="3" y="16" width="7" height="5" />
                  </svg>
                  Dashboard
                </div>
                <div style={styles.mockupSidebarItem}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                  Classes & Students
                </div>
                <div style={styles.mockupSidebarItem}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  Assessments
                </div>
                <div style={styles.mockupSidebarItem}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                  Analytics Reports
                </div>
              </div>

              {/* Mockup Dashboard Main Content */}
              <div style={styles.mockupMain}>
                <div style={styles.mockupDashboardHeader}>
                  <div>
                    <h4 style={styles.mockupSectionTitle}>Evaluation Dashboard</h4>
                    <p style={styles.mockupSectionSubtitle}>Greenwood High School Console</p>
                  </div>
                  <div style={styles.tenantBadge}>Tenant: GHS-591</div>
                </div>

                {/* Dashboard Stats */}
                <div style={styles.mockupStatsGrid}>
                  <div style={styles.mockupStatCard}>
                    <span style={styles.mockupStatLabel}>Active Sessions</span>
                    <span style={styles.mockupStatVal}>03</span>
                    <span style={{ ...styles.mockupStatChange, color: "var(--success)" }}>● Proctoring active</span>
                  </div>
                  <div style={styles.mockupStatCard}>
                    <span style={styles.mockupStatLabel}>Average Accuracy</span>
                    <span style={styles.mockupStatVal}>84.5%</span>
                    <span style={{ ...styles.mockupStatChange, color: "var(--primary)" }}>+2.4% this week</span>
                  </div>
                  <div style={styles.mockupStatCard}>
                    <span style={styles.mockupStatLabel}>Tests Completed</span>
                    <span style={styles.mockupStatVal}>148</span>
                    <span style={{ ...styles.mockupStatChange, color: "var(--text-muted)" }}>12 schools total</span>
                  </div>
                </div>

                {/* Dashboard Visualization Graph representation */}
                <div style={styles.mockupGraphCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={styles.mockupCardLabel}>Class Progress Index</span>
                    <span style={styles.mockupCardLabel}>Past 5 Days</span>
                  </div>
                  <div style={styles.chartBarsContainer}>
                    <div style={styles.chartBarWrapper}>
                      <div style={{ ...styles.chartBarFill, height: "45%" }}></div>
                      <span style={styles.chartBarLabel}>Mon</span>
                    </div>
                    <div style={styles.chartBarWrapper}>
                      <div style={{ ...styles.chartBarFill, height: "60%" }}></div>
                      <span style={styles.chartBarLabel}>Tue</span>
                    </div>
                    <div style={styles.chartBarWrapper}>
                      <div style={{ ...styles.chartBarFill, height: "78%" }}></div>
                      <span style={styles.chartBarLabel}>Wed</span>
                    </div>
                    <div style={styles.chartBarWrapper}>
                      <div style={{ ...styles.chartBarFill, height: "68%" }}></div>
                      <span style={styles.chartBarLabel}>Thu</span>
                    </div>
                    <div style={styles.chartBarWrapper}>
                      <div style={{ ...styles.chartBarFill, height: "92%", background: "var(--primary)" }}></div>
                      <span style={styles.chartBarLabel}>Fri</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Value Grid Section */}
      <section id="features" style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionPreTitle}>Platform Highlights</span>
          <h2 style={styles.sectionTitle}>Designed for Directors, Built for Learning</h2>
          <p style={styles.sectionSubtitle}>Everything your institution needs to configure, run, and score primary school assessments.</p>
        </div>

        <div style={styles.featuresGrid}>
          <div className="card" style={styles.featureCard}>
            <div style={styles.featureIconContainer}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <h3 style={styles.featureCardTitle}>Adaptive Testing Engine</h3>
            <p style={styles.featureCardDesc}>Questions dynamically adapt in difficulty based on each student's response history to prevent assessment anxiety and build confidence.</p>
          </div>

          <div className="card" style={styles.featureCard}>
            <div style={styles.featureIconContainer}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <h3 style={styles.featureCardTitle}>Automated Question Generation</h3>
            <p style={styles.featureCardDesc}>Generate curriculum-compliant English, Math, and Science items instantly. Teachers can verify, edit, and assign them with one click.</p>
          </div>

          <div className="card" style={styles.featureCard}>
            <div style={styles.featureIconContainer}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 style={styles.featureCardTitle}>Secure Classroom Proctoring</h3>
            <p style={styles.featureCardDesc}>Voice guidance and automated proctoring alerts make running assessments simple, preventing student distractions while securing exam results.</p>
          </div>

          <div className="card" style={styles.featureCard}>
            <div style={styles.featureIconContainer}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <h3 style={styles.featureCardTitle}>Comprehensive School Reports</h3>
            <p style={styles.featureCardDesc}>Directors get aggregated performance views, class-by-class comparisons, and actionable insights to guide curricula and resource planning.</p>
          </div>
        </div>
      </section>

      {/* Trust & Process Step Walkthrough Section */}
      <section id="how-it-works" style={styles.sectionDark}>
        <div style={styles.sectionHeader}>
          <span style={{ ...styles.sectionPreTitle, color: "var(--primary)" }}>Simple Execution</span>
          <h2 style={styles.sectionTitle}>Assessments Made Easy in 3 Steps</h2>
          <p style={styles.sectionSubtitle}>How Momentum operates to give you instant value.</p>
        </div>

        <div style={styles.stepsGrid}>
          <div style={styles.stepItem}>
            <div style={styles.stepNumber}>1</div>
            <h4 style={styles.stepTitle}>Register School Tenant</h4>
            <p style={styles.stepDesc}>Create a secure workspace, configure classrooms, and invite teachers in under five minutes.</p>
          </div>
          <div style={styles.stepItem}>
            <div style={styles.stepNumber}>2</div>
            <h4 style={styles.stepTitle}>Run Interactive Sessions</h4>
            <p style={styles.stepDesc}>Students open their test session using their designated classroom links, proctored in real time.</p>
          </div>
          <div style={styles.stepItem}>
            <div style={styles.stepNumber}>3</div>
            <h4 style={styles.stepTitle}>Analyze Detailed Results</h4>
            <p style={styles.stepDesc}>Instantly receive student scores, response metrics, and diagnostic indicators on your panel.</p>
          </div>
        </div>
      </section>

      {/* FAQ Details Accordion Section */}
      <section id="faq" style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionPreTitle}>Common Inquiries</span>
          <h2 style={styles.sectionTitle}>Frequently Asked Questions</h2>
          <p style={styles.sectionSubtitle}>Answers to key integration and assessment queries.</p>
        </div>

        <div style={styles.faqContainer}>
          <details className="faq-details" open>
            <summary className="faq-summary">How does the school tenant system work?</summary>
            <div className="faq-answer">
              Every school receives a dedicated tenant partition. This isolates student records, teacher dashboards, and testing data. School directors manage the workspace and allocate teacher permissions dynamically.
            </div>
          </details>

          <details className="faq-details">
            <summary className="faq-summary">Is the automated question generator aligned with national curricula?</summary>
            <div className="faq-answer">
              Yes, our question builder maps items directly to specific curricula guidelines (e.g. CBSE, CCSS, Cambridge). Teachers can review and modify any generated items before they are assigned to an assessment.
            </div>
          </details>

          <details className="faq-details">
            <summary className="faq-summary">How does student proctoring operate?</summary>
            <div className="faq-answer">
              Student sessions include proctoring alerts. The system monitors window focus, voice interactions, and assessment pacing. Teachers receive live visual indicators on their dashboards if a student wanders off-task.
            </div>
          </details>
        </div>
      </section>

      {/* Premium Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerTop}>
          <div>
            <div style={styles.navBrand}>
              <div style={styles.logoBadge}>M</div>
              <span style={styles.brandName}>Momentum</span>
            </div>
            <p style={styles.footerBrandText}>Next-generation adaptive assessment solutions for primary education. Designed with care and security.</p>
          </div>
          <div style={styles.footerLinksGroup}>
            <span style={styles.footerLinksTitle}>Product</span>
            <a href="#features" style={styles.footerLink}>Features</a>
            <a href="#how-it-works" style={styles.footerLink}>How it Works</a>
            <Link href="/login" style={styles.footerLink}>Console Login</Link>
          </div>
          <div style={styles.footerLinksGroup}>
            <span style={styles.footerLinksTitle}>Security</span>
            <a href="#" style={styles.footerLink}>Data Isolation</a>
            <a href="#" style={styles.footerLink}>Privacy Policy</a>
            <a href="#" style={styles.footerLink}>Terms of Service</a>
          </div>
        </div>
        <div style={styles.footerBottom}>
          <span>© {new Date().getFullYear()} Momentum. All rights reserved.</span>
          <span>Designed for modern classrooms.</span>
        </div>
      </footer>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    position: "relative",
    overflow: "hidden",
    paddingTop: "110px",
  },
  glow1: {
    position: "absolute",
    top: "-10%",
    left: "-10%",
    width: "600px",
    height: "600px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(139, 124, 251, 0.12) 0%, rgba(0, 0, 0, 0) 70%)",
    zIndex: 0,
    pointerEvents: "none",
  },
  glow2: {
    position: "absolute",
    top: "40%",
    right: "-10%",
    width: "700px",
    height: "700px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(125, 201, 255, 0.12) 0%, rgba(0, 0, 0, 0) 70%)",
    zIndex: 0,
    pointerEvents: "none",
  },
  glow3: {
    position: "absolute",
    bottom: "-10%",
    left: "20%",
    width: "600px",
    height: "600px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255, 176, 103, 0.08) 0%, rgba(0, 0, 0, 0) 70%)",
    zIndex: 0,
    pointerEvents: "none",
  },
  navHeader: {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "90%",
    maxWidth: "1200px",
    height: "64px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 2rem",
    zIndex: 1000,
    border: "1px solid rgba(139, 124, 251, 0.15)",
    boxShadow: "0 8px 30px rgba(139, 124, 251, 0.06)",
  },
  navBrand: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  logoBadge: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "var(--primary)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: "1.1rem",
  },
  logoBadgeSmall: {
    width: "24px",
    height: "24px",
    borderRadius: "6px",
    background: "var(--primary)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: "0.85rem",
  },
  brandName: {
    fontFamily: "var(--font-heading)",
    fontSize: "1.25rem",
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },
  navLinks: {
    display: "flex",
    gap: "2.5rem",
  },
  navLink: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    transition: "color var(--transition-fast)",
  },
  navActions: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  navBtnLogin: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    padding: "0.5rem 1rem",
  },
  navBtnSignup: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#ffffff",
    backgroundColor: "var(--primary)",
    padding: "0.5rem 1.2rem",
    borderRadius: "9999px",
    boxShadow: "var(--shadow-sm)",
    transition: "all var(--transition-fast)",
  },
  heroSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "4rem 2rem 6rem",
    position: "relative",
    zIndex: 10,
    maxWidth: "900px",
    margin: "0 auto",
  },
  heroBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
    padding: "0.5rem 1.2rem",
    borderRadius: "9999px",
    fontSize: "0.85rem",
    fontWeight: 700,
    border: "1px solid rgba(139, 124, 251, 0.2)",
    marginBottom: "1.5rem",
  },
  heroBadgeDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "var(--primary)",
    display: "inline-block",
  },
  heroTitle: {
    fontSize: "3.5rem",
    fontWeight: 800,
    lineHeight: 1.15,
    letterSpacing: "-0.03em",
    marginBottom: "1.5rem",
  },
  heroSubtitle: {
    fontSize: "1.2rem",
    color: "var(--text-secondary)",
    lineHeight: 1.6,
    maxWidth: "680px",
    marginBottom: "2.5rem",
  },
  heroCTAs: {
    display: "flex",
    gap: "1.2rem",
    marginBottom: "4.5rem",
    width: "100%",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.9rem 2rem",
    borderRadius: "var(--radius-sm)",
    fontWeight: 700,
    fontSize: "1rem",
    textDecoration: "none",
    boxShadow: "var(--shadow-md)",
  },
  btnPrimary: {
    backgroundColor: "var(--primary)",
    color: "#ffffff",
  },
  btnSecondary: {
    backgroundColor: "var(--bg-surface)",
    color: "var(--primary)",
    border: "1px solid var(--border-color)",
  },
  mockupWrapper: {
    width: "100%",
    maxWidth: "850px",
    padding: "0.5rem",
    borderRadius: "20px",
    background: "rgba(255, 255, 255, 0.4)",
    border: "1px solid rgba(255, 255, 255, 0.5)",
    boxShadow: "0 30px 60px rgba(139, 124, 251, 0.08)",
  },
  mockupStatus: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  liveIndicatorDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "var(--success)",
    display: "inline-block",
    boxShadow: "0 0 8px var(--success)",
    animation: "pulse-glow 1.5s infinite",
  },
  mockupContentGrid: {
    display: "flex",
    minHeight: "360px",
    padding: 0,
  },
  mockupSidebar: {
    width: "180px",
    backgroundColor: "var(--bg-app)",
    borderRight: "1px solid var(--border-color)",
    padding: "1rem 0.8rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  mockupSidebarLogo: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: 800,
    fontSize: "0.85rem",
    marginBottom: "1rem",
    paddingLeft: "0.4rem",
  },
  mockupSidebarItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "0.5rem 0.6rem",
    borderRadius: "6px",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    cursor: "default",
  },
  mockupSidebarActive: {
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
  },
  mockupMain: {
    flex: 1,
    padding: "1.2rem 1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    textAlign: "left",
  },
  mockupDashboardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  mockupSectionTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
  },
  mockupSectionSubtitle: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
  tenantBadge: {
    backgroundColor: "var(--secondary-light)",
    color: "var(--text-primary)",
    padding: "0.3rem 0.6rem",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: 700,
    border: "1px solid rgba(125, 201, 255, 0.2)",
  },
  mockupStatsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1rem",
  },
  mockupStatCard: {
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    padding: "0.8rem",
    backgroundColor: "var(--bg-app)",
    display: "flex",
    flexDirection: "column",
  },
  mockupStatLabel: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    fontWeight: 600,
  },
  mockupStatVal: {
    fontSize: "1.4rem",
    fontWeight: 800,
    margin: "2px 0",
  },
  mockupStatChange: {
    fontSize: "0.65rem",
    fontWeight: 600,
  },
  mockupGraphCard: {
    border: "1px solid var(--border-color)",
    borderRadius: "12px",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
  },
  mockupCardLabel: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  chartBarsContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: "100px",
    padding: "0.5rem 0.5rem 0",
    borderBottom: "1px solid var(--border-color)",
  },
  chartBarWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "12%",
  },
  chartBarFill: {
    width: "100%",
    backgroundColor: "var(--border-color)",
    borderRadius: "4px 4px 0 0",
    transition: "height 0.8s ease-out",
  },
  chartBarLabel: {
    fontSize: "0.65rem",
    color: "var(--text-muted)",
    marginTop: "4px",
    fontWeight: 600,
  },
  section: {
    padding: "6rem 4rem",
    maxWidth: "1200px",
    margin: "0 auto",
    zIndex: 10,
    position: "relative",
  },
  sectionDark: {
    padding: "6rem 4rem",
    backgroundColor: "rgba(139, 124, 251, 0.03)",
    borderTop: "1px solid var(--border-color)",
    borderBottom: "1px solid var(--border-color)",
    zIndex: 10,
    position: "relative",
  },
  sectionHeader: {
    textAlign: "center",
    marginBottom: "4rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  sectionPreTitle: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "var(--primary)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: "0.5rem",
  },
  sectionTitle: {
    fontSize: "2.2rem",
    fontWeight: 800,
    marginBottom: "1rem",
    letterSpacing: "-0.02em",
  },
  sectionSubtitle: {
    fontSize: "1.05rem",
    color: "var(--text-secondary)",
    maxWidth: "600px",
    lineHeight: 1.5,
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "2rem",
  },
  featureCard: {
    padding: "2.2rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "1rem",
    textAlign: "left",
  },
  featureIconContainer: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  featureCardTitle: {
    fontSize: "1.25rem",
    fontWeight: 700,
  },
  featureCardDesc: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    lineHeight: 1.6,
  },
  stepsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "3rem",
    maxWidth: "1100px",
    margin: "0 auto",
  },
  stepItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "1rem",
  },
  stepNumber: {
    width: "54px",
    height: "54px",
    borderRadius: "50%",
    backgroundColor: "var(--primary)",
    color: "#ffffff",
    fontSize: "1.3rem",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 20px rgba(139, 124, 251, 0.3)",
  },
  stepTitle: {
    fontSize: "1.2rem",
    fontWeight: 700,
    marginTop: "0.5rem",
  },
  stepDesc: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    lineHeight: 1.6,
    maxWidth: "320px",
  },
  faqContainer: {
    maxWidth: "750px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  footer: {
    backgroundColor: "var(--bg-surface)",
    borderTop: "1px solid var(--border-color)",
    padding: "4rem 4rem 2rem",
  },
  footerTop: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: "4rem",
    paddingBottom: "3rem",
    borderBottom: "1px solid var(--border-color)",
  },
  footerBrandText: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    lineHeight: 1.6,
    marginTop: "1rem",
    maxWidth: "320px",
  },
  footerLinksGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.8rem",
  },
  footerLinksTitle: {
    fontSize: "0.9rem",
    fontWeight: 700,
    textTransform: "uppercase",
    color: "var(--text-primary)",
    letterSpacing: "0.05em",
    marginBottom: "0.4rem",
  },
  footerLink: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    transition: "color var(--transition-fast)",
  },
  footerBottom: {
    maxWidth: "1200px",
    margin: "2rem auto 0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    flexWrap: "wrap",
    gap: "1rem",
  },
};
