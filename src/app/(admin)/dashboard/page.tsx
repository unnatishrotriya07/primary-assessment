"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import { dashboardService, DashboardStats } from "@/services/dashboard.service";
import assessmentService from "@/services/assessment.service";
import { AssessmentData } from "@/types/assessment.types";
import { STORAGE_KEYS } from "@/utils/constants";
import Link from "next/link";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import Input from "@/components/common/Input";
import { controlPanelService } from "@/services/controlPanel.service";

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [assessments, setAssessments] = useState<AssessmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState("Teacher");
  const [user, setUser] = useState<any>(null);

  // Super Admin states
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolDirectorName, setNewSchoolDirectorName] = useState("");
  const [newSchoolDirectorEmail, setNewSchoolDirectorEmail] = useState("");
  const [newSchoolDirectorPassword, setNewSchoolDirectorPassword] = useState("");
  const [registeredSchools, setRegisteredSchools] = useState<any[]>([]);

  const fetchSchools = () => {
    controlPanelService.getSchools()
      .then((res) => {
        setRegisteredSchools(Array.isArray(res) ? res : (res as any)?.data || []);
      })
      .catch((err) => {
        console.error("Failed to load schools", err);
      });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      if (stored) {
        try {
          const parsedUser = JSON.parse(stored);
          setUser(parsedUser);
          if (parsedUser.name) {
            setTeacherName(parsedUser.name);
          }
        } catch (e) {}
      }
    }

    dashboardService.getStats()
      .then((res) => {
        setStats(res);
      })
      .catch((err) => {
        console.error("Failed to fetch dashboard stats", err);
        setError("Could not load dashboard information. Please try again later.");
      })
      .finally(() => {
        setLoading(false);
      });

    assessmentService.getAll()
      .then((res) => {
        setAssessments(res);
      })
      .catch((err) => {
        console.error("Failed to fetch assessments", err);
      });
  }, []);

  useEffect(() => {
    const isSuperAdmin = user?.role === "admin" && !user?.tenantId;
    if (isSuperAdmin) {
      fetchSchools();
    }
  }, [user]);

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  };

  const handleOnboardSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName || !newSchoolDirectorEmail || !newSchoolDirectorPassword) return;
    
    try {
      await controlPanelService.createSchool({
        schoolName: newSchoolName.trim(),
        name: newSchoolDirectorName.trim() || "School Director",
        email: newSchoolDirectorEmail.trim(),
        password: newSchoolDirectorPassword
      });
      setNewSchoolName("");
      setNewSchoolDirectorName("");
      setNewSchoolDirectorEmail("");
      setNewSchoolDirectorPassword("");
      setIsOnboardingModalOpen(false);
      fetchSchools();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to onboard new school.");
    }
  };

  const renderOnboardingModal = () => {
    return (
      <Modal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        title="Onboard New School"
      >
        <form onSubmit={handleOnboardSchool} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <Input
            label="School Name"
            type="text"
            required
            value={newSchoolName}
            onChange={(e) => setNewSchoolName(e.target.value)}
            placeholder="e.g. Pinecrest Junior School"
          />
          <Input
            label="Director Full Name"
            type="text"
            required
            value={newSchoolDirectorName}
            onChange={(e) => setNewSchoolDirectorName(e.target.value)}
            placeholder="e.g. Dr. Ramesh Mehta"
          />
          <Input
            label="Director Email Address"
            type="email"
            required
            value={newSchoolDirectorEmail}
            onChange={(e) => setNewSchoolDirectorEmail(e.target.value)}
            placeholder="director@school.edu"
          />
          <Input
            label="Director Account Password"
            type="password"
            required
            value={newSchoolDirectorPassword}
            onChange={(e) => setNewSchoolDirectorPassword(e.target.value)}
            placeholder="••••••••"
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1rem" }}>
            <Button type="button" variant="secondary" onClick={() => setIsOnboardingModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Onboard School
            </Button>
          </div>
        </form>
      </Modal>
    );
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <PageHeader
          title="Today"
          description="Overview of student progress, recent activity, and tasks requiring academic attention."
        />
        <div style={styles.loadingState}>
          <div className="spinner" style={{ marginBottom: "1rem" }}></div>
          <p>Preparing your workspace dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div style={styles.container}>
        <PageHeader
          title="Today"
          description="Overview of student progress, recent activity, and tasks requiring academic attention."
        />
        <div style={styles.errorState}>
          <p style={{ color: "var(--error)", fontWeight: 600 }}>{error || "An error occurred."}</p>
        </div>
      </div>
    );
  }

  // Role Checks
  const isSuperAdmin = user?.role === "admin" && !user?.tenantId;
  const isDirector = user?.role === "director";
  const isTeacher = user?.role === "teacher" || (!isSuperAdmin && !isDirector);

  // Count active assessments
  const activeAssessments = assessments.filter(a => a.status === "Active");
  const activeAssessmentsCount = activeAssessments.length;
  // Compute how many students need help (e.g. recent score < 75)
  const studentsNeedHelpCount = stats.recent_activity?.filter(a => a.score < 75).length || 0;
  // Get last assessment
  const lastAssessment = activeAssessments[0] || assessments[assessments.length - 1];

  // ----------------------------------------
  // 1. platform super admin render block
  // ----------------------------------------
  if (isSuperAdmin) {
    return (
      <div style={styles.container}>
        <PageHeader
          title="Platform Control Center"
          description="System metrics, multi-tenant diagnostics, and active school licenses."
          action={
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <Button onClick={() => setIsOnboardingModalOpen(true)}>
                + Onboard School
              </Button>
              <Link href="/control-panel" style={styles.headerSecondaryCta} className="interactive-element">
                Control Panel
              </Link>
            </div>
          }
        />

        {/* Super Admin Metrics */}
        <div style={styles.metricGrid}>
          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>Active Tenants</span>
            <h3 style={styles.metricValue}>{registeredSchools.length}</h3>
            <span style={styles.metricSubtext}>Onboarded academic institutions</span>
          </div>

          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>System Evaluations</span>
            <h3 style={styles.metricValue}>{stats.assessments_conducted ?? 0}</h3>
            <span style={styles.metricSubtext}>Completed student evaluations</span>
          </div>

          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>API Server Status</span>
            <h3 style={{ ...styles.metricValue, color: "var(--success)" }}>Operational</h3>
            <span style={styles.metricSubtext}>System services and database active</span>
          </div>
        </div>

        {/* Schools Registry Summary */}
        <div className="card" style={styles.sectionCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3 style={styles.sectionTitle}>Schools Registry</h3>
              <p style={styles.sectionDesc}>Academic institutions currently active on the platform.</p>
            </div>
            <Link href="/control-panel" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>
              View in Control Panel &rarr;
            </Link>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>School Name</th>
                  <th style={styles.th}>Tenant ID</th>
                  <th style={styles.th}>Director Email</th>
                  <th style={styles.th}>Users</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {registeredSchools.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ ...styles.td, textAlign: "center", color: "var(--text-secondary)", padding: "2rem" }}>
                      No schools onboarded yet. Click "Onboard School" above to get started.
                    </td>
                  </tr>
                ) : (
                  registeredSchools.map((s, idx) => (
                    <tr key={s.id || idx} style={styles.tableRow}>
                      <td style={styles.td}><strong>{s.name}</strong></td>
                      <td style={styles.td_secondary}>{s.tenant_id || s.tenantId}</td>
                      <td style={styles.td_secondary}>{s.director_email || s.directorEmail || "N/A"}</td>
                      <td style={styles.td_secondary}>
                        {s.users_count !== undefined ? s.users_count : (s.users || 1)} users
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete school "${s.name}"? This will delete all its data.`)) {
                              controlPanelService.deleteSchool(s.id)
                                .then(() => {
                                  fetchSchools();
                                })
                                .catch(err => {
                                  alert(err.response?.data?.detail || "Failed to delete school.");
                                });
                            }
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--error)",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            padding: 0
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {renderOnboardingModal()}
      </div>
    );
  }

  // ----------------------------------------
  // 2. school director render block
  // ----------------------------------------
  if (isDirector) {
    const schoolDisplayName = user?.schoolName || "Proctors Academy";
    return (
      <div style={styles.container}>
        <PageHeader
          title={`Welcome back, ${teacherName}`}
          description={`Overall diagnostics and operational metrics for ${schoolDisplayName}.`}
          action={
            <Link href="/reports" style={styles.headerCta} className="interactive-element">
              View School Insights
            </Link>
          }
        />

        {/* Director Metrics */}
        <div style={styles.metricGrid}>
          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>Active Teachers</span>
            <h3 style={styles.metricValue}>{stats.active_teachers ?? 0}</h3>
            <span style={styles.metricSubtext}>Faculty deploying assessments this week</span>
          </div>

          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>Enrolled Students</span>
            <h3 style={styles.metricValue}>{stats.active_students ?? 0}</h3>
            <span style={styles.metricSubtext}>Across configured classes</span>
          </div>

          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>School Mastery</span>
            <h3 style={styles.metricValue}>{stats.average_accuracy ? `${stats.average_accuracy}%` : "0%"}</h3>
            <span style={styles.metricSubtext}>Aggregate conceptual understanding</span>
          </div>
        </div>

        {/* Teacher activity log */}
        <div className="card" style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>Teacher Workloads & Activity</h3>
          <p style={styles.sectionDesc}>Monitors when faculty deploy assessments and review student progress.</p>

          <div style={{ marginTop: "1.2rem", overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>Teacher Name</th>
                  <th style={styles.th}>Course Class</th>
                  <th style={styles.th}>Recent Action</th>
                  <th style={styles.th}>Time</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {!stats.teacher_workloads || stats.teacher_workloads.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ ...styles.td, textAlign: "center", color: "var(--text-secondary)", padding: "2rem" }}>
                      No teacher activity logged yet.
                    </td>
                  </tr>
                ) : (
                  stats.teacher_workloads.map((tw, idx) => (
                    <tr key={idx} style={styles.tableRow}>
                      <td style={styles.td}><strong>{tw.name}</strong></td>
                      <td style={styles.td_secondary}>{tw.course_class}</td>
                      <td style={styles.td_secondary}>{tw.recent_action}</td>
                      <td style={styles.td_secondary}>{tw.time}</td>
                      <td style={styles.td}>
                        <span style={{
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          backgroundColor: tw.status === "Active" ? "var(--success-light)" : "var(--divider)",
                          color: tw.status === "Active" ? "var(--success)" : "var(--text-secondary)",
                          fontWeight: 600
                        }}>
                          {tw.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Class performance diagnostics */}
        <div className="card" style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>Classroom Performance Overview</h3>
          <p style={styles.sectionDesc}>Syllabus accuracy diagnostics ranked by mastery status.</p>

          <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {!stats.class_performance || stats.class_performance.length === 0 ? (
              <div style={{ padding: "1.5rem", color: "var(--text-secondary)", fontSize: "0.85rem", textAlign: "center", border: "1px dashed var(--border-color)", borderRadius: "10px", gridColumn: "1 / -1" }}>
                No class performance metrics available. Conduct assessments to see results.
              </div>
            ) : (
              stats.class_performance.map((cp, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "1rem", border: "1px solid var(--border-color)", borderRadius: "10px", alignItems: "center", backgroundColor: "var(--bg-app)" }}>
                  <div>
                    <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>{cp.class_name}</strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>{cp.topic}</div>
                  </div>
                  <span style={{
                    padding: "0.25rem 0.6rem",
                    borderRadius: "4px",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    backgroundColor: cp.color_type === "success" ? "var(--success-light)" : cp.color_type === "warning" ? "var(--warning-light)" : "var(--error-light)",
                    color: cp.color_type === "success" ? "var(--success)" : cp.color_type === "warning" ? "var(--warning)" : "var(--error)"
                  }}>
                    {cp.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // 3. teacher render block (default)
  // ----------------------------------------
  return (
    <div style={styles.container}>
      <PageHeader
        title={`${getGreeting()}, ${teacherName}`}
        description="Overview of student progress, recent activity, and tasks requiring academic attention."
        action={
          <Link href="/assessments?action=create" style={{ textDecoration: "none" }}>
            <Button variant="primary">
              + Create Assessment
            </Button>
          </Link>
        }
      />

      {/* Slim Active Assessment Banner (Only when active assessment exists) */}
      {lastAssessment && (
        <div style={styles.activeBanner}>
          <div style={styles.activeBannerLeft}>
            <span style={styles.activeBannerDot} />
            <span style={styles.activeBannerLabel}>Active Assessment:</span>
            <strong style={styles.activeBannerTitle}>{lastAssessment.title}</strong>
            <span style={styles.activeBannerMeta}>
              {lastAssessment.questionsCount} Questions • {lastAssessment.assignedStudents?.length || 0} Students Assigned
            </span>
          </div>
          <Link href={`/assessments/${lastAssessment.id}`} style={styles.activeBannerLink}>
            View Assessment &rarr;
          </Link>
        </div>
      )}

      {/* Teacher 3-Stat Metrics Grid */}
      <div style={styles.metricGrid}>
        <Link href="/assessments" style={{ ...styles.metricCard, textDecoration: "none" }} className="interactive-element">
          <span style={styles.metricLabel}>Pending Assessments</span>
          <h3 style={styles.metricValue}>
            {activeAssessmentsCount}
          </h3>
          <span style={styles.metricSubtext}>Awaiting student completions</span>
        </Link>

        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Completed Evaluations</span>
          <h3 style={styles.metricValue}>
            {stats.assessments_conducted ?? 0}
          </h3>
          <span style={styles.metricSubtext}>Total evaluations evaluated</span>
        </div>

        <Link href="/students" style={{ ...styles.metricCard, textDecoration: "none" }} className="interactive-element">
          <span style={styles.metricLabel}>Students Requiring Attention</span>
          <h3 style={{ ...styles.metricValue, color: studentsNeedHelpCount > 0 ? "var(--warning)" : "var(--text-primary)" }}>
            {studentsNeedHelpCount}
          </h3>
          <span style={styles.metricSubtext}>Scoring below 70% conceptual mastery</span>
        </Link>
      </div>

      {/* Main Grid Layout: Recent Activity (Left) + Tasks Checklist (Right) */}
      <div style={styles.dashboardGrid}>
        {/* Left Column: Recent Student Activity */}
        <div style={styles.mainCol}>
          <div className="card" style={styles.sectionCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <h3 style={styles.sectionTitle}>Recent Student Activity</h3>
              <Link href="/reports" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>
                View All &rarr;
              </Link>
            </div>
            <p style={styles.sectionDesc}>Live feed of completed student evaluations and scored outcomes.</p>

            <div style={styles.activityList}>
              {stats.recent_activity && stats.recent_activity.length > 0 ? (
                stats.recent_activity.map((activity, idx) => (
                  <div key={activity.id || idx} style={styles.activityItem}>
                    <div style={styles.activityInfo}>
                      <span style={styles.activityText}>
                        <strong>{activity.student_name}</strong> completed evaluation in <strong>{activity.student_class}</strong>
                      </span>
                      <span style={styles.activityMeta}>
                        Accuracy: {activity.accuracy}% • Mastery: {activity.score}%
                      </span>
                    </div>
                    <span style={{
                      ...styles.activityGrade,
                      backgroundColor: activity.grade === "A" || activity.grade === "B" ? "var(--success-light)" : "var(--warning-light)",
                      color: activity.grade === "A" || activity.grade === "B" ? "var(--success)" : "var(--warning)",
                    }}>
                      Grade {activity.grade}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  No recent student evaluations recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Getting Started / Tasks Requiring Attention */}
        <div style={styles.rightCol}>
          <div className="card" style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>Getting Started</h3>
            <p style={styles.sectionDesc}>Key steps to set up curriculum and assess students.</p>

            <div style={styles.checklist}>
              <div style={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={stats.total_classes > 0}
                  readOnly
                  style={styles.checkbox}
                />
                <Link href="/syllabus" style={stats.total_classes > 0 ? styles.checkTextLineThrough : styles.checkText}>
                  Set up classroom syllabus under Syllabus
                </Link>
              </div>

              <div style={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={(stats.active_students ?? 0) > 0}
                  readOnly
                  style={styles.checkbox}
                />
                <Link href="/students" style={(stats.active_students ?? 0) > 0 ? styles.checkTextLineThrough : styles.checkText}>
                  Import students into class rosters
                </Link>
              </div>

              <div style={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={assessments.length > 0}
                  readOnly
                  style={styles.checkbox}
                />
                <Link href="/assessments?action=create" style={assessments.length > 0 ? styles.checkTextLineThrough : styles.checkText}>
                  Create your first chapter assessment
                </Link>
              </div>

              <div style={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={(stats.assessments_conducted ?? 0) > 0}
                  readOnly
                  style={styles.checkbox}
                />
                <Link href="/reports" style={(stats.assessments_conducted ?? 0) > 0 ? styles.checkTextLineThrough : styles.checkText}>
                  Review student learning insights and mastery
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "2.5rem",
    width: "100%",
  },
  headerCta: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--primary)",
    color: "#FFFFFF",
    padding: "0.6rem 1.2rem",
    borderRadius: "10px",
    fontSize: "0.95rem",
    fontWeight: 600,
    textDecoration: "none",
    boxShadow: "var(--shadow-sm)",
    transition: "background var(--transition-fast)",
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "1.5rem",
    width: "100%",
  },
  metricCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    transition: "transform var(--transition-fast), border-color var(--transition-fast)",
  },
  metricLabel: {
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "uppercase",
    color: "var(--text-secondary)",
    letterSpacing: "0.05em",
  },
  metricValue: {
    fontSize: "2rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: "0.25rem 0",
    fontFamily: "var(--font-sans)",
  },
  metricSubtext: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
  },
  dashboardGrid: {
    display: "flex",
    gap: "2rem",
    flexWrap: "wrap",
    width: "100%",
  },
  mainCol: {
    flex: 2,
    minWidth: "320px",
    display: "flex",
    flexDirection: "column",
  },
  rightCol: {
    flex: 1,
    minWidth: "280px",
    display: "flex",
    flexDirection: "column",
  },
  sectionCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "1.8rem",
    boxShadow: "var(--shadow-sm)",
  },
  sectionTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  },
  sectionDesc: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    margin: "4px 0 0 0",
  },
  checklist: {
    display: "flex",
    flexDirection: "column",
    gap: "0.8rem",
    marginTop: "1.2rem",
  },
  checkItem: {
    display: "flex",
    gap: "0.8rem",
    alignItems: "center",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
  },
  checkText: {
    fontSize: "0.85rem",
    color: "var(--text-primary)",
  },
  checkTextLineThrough: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    textDecoration: "line-through",
  },
  continueCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "var(--bg-app)",
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    padding: "1rem",
    marginTop: "1.2rem",
    gap: "1rem",
    flexWrap: "wrap",
  },
  continueCardDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  continueTitle: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  continueSub: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
  },
  activityList: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    marginTop: "1.2rem",
  },
  activityItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid var(--divider)",
    paddingBottom: "0.75rem",
    gap: "1rem",
  },
  activityInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    flex: 1,
  },
  activityText: {
    fontSize: "0.85rem",
    color: "var(--text-primary)",
  },
  activityMeta: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
  },
  activityGrade: {
    padding: "0.2rem 0.5rem",
    borderRadius: "4px",
    fontWeight: 600,
    fontSize: "0.8rem",
    flexShrink: 0,
  },
  recommendationsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
  },
  recItem: {
    display: "flex",
    gap: "0.8rem",
    padding: "1rem",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--bg-app)",
  },
  recLightbulb: {
    fontSize: "1.2rem",
    flexShrink: 0,
  },
  recContent: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  recTitle: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  recDesc: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    lineHeight: 1.4,
  },
  quickActionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
    gap: "1rem",
  },
  actionButtonCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    padding: "1rem 0.5rem",
    backgroundColor: "var(--bg-app)",
    textDecoration: "none",
    textAlign: "center",
    transition: "background-color var(--transition-fast), border-color var(--transition-fast)",
  },
  actionIconWrapper: {
    fontSize: "1.25rem",
    fontWeight: "bold",
  },
  actionBtnLabel: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  loadingState: {
    padding: "4rem",
    textAlign: "center",
    color: "var(--text-secondary)",
  },
  errorState: {
    padding: "4rem",
    textAlign: "center",
  },
  widgetTitle: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  },
  widgetDesc: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    margin: "2px 0 0 0",
  },
  calendarContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    marginTop: "1rem",
  },
  calendarHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  calendarMonth: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  calendarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "0.5rem",
    textAlign: "center",
  },
  calendarDayName: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--text-muted)",
    paddingBottom: "0.25rem",
  },
  calendarDay: {
    fontSize: "0.85rem",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
  },
  calendarDayEmpty: {
    height: "32px",
  },
  // Table styles
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.85rem",
    textAlign: "left",
  },
  tableHeaderRow: {
    borderBottom: "1px solid var(--border-color)",
  },
  th: {
    padding: "0.6rem 0.8rem",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-secondary)",
    fontWeight: 600,
  },
  tableRow: {
    borderBottom: "1px solid var(--divider)",
  },
  td: {
    padding: "0.6rem 0.8rem",
    color: "var(--text-primary)",
    verticalAlign: "middle",
  },
  td_secondary: {
    padding: "0.6rem 0.8rem",
    color: "var(--text-secondary)",
    verticalAlign: "middle",
  },
  headerSecondaryCta: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-color)",
    padding: "0.6rem 1.2rem",
    borderRadius: "10px",
    fontSize: "0.95rem",
    fontWeight: 600,
    textDecoration: "none",
    boxShadow: "var(--shadow-sm)",
    transition: "all var(--transition-fast)",
  },
  activeBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "var(--selected-bg)",
    border: "1px solid #BFDBFE",
    borderRadius: "10px",
    padding: "0.85rem 1.25rem",
    gap: "1rem",
    flexWrap: "wrap",
  },
  activeBannerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  activeBannerDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "var(--primary)",
    display: "inline-block",
  },
  activeBannerLabel: {
    fontSize: "0.8rem",
    fontWeight: 600,
    textTransform: "uppercase",
    color: "var(--primary)",
    letterSpacing: "0.04em",
  },
  activeBannerTitle: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  activeBannerMeta: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
  },
  activeBannerLink: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--primary)",
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
};

