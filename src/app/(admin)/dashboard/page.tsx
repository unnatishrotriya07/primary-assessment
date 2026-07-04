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
  const [activeAdminTab, setActiveAdminTab] = useState<"schools" | "diagnostics">("schools");
  const [selectedAdminSchool, setSelectedAdminSchool] = useState<any>(null);

  // Interactive Calendar state
  const [calendarEvents, setCalendarEvents] = useState<Record<string, Array<{ id: string; title: string; desc?: string; time?: string }>>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventTime, setEventTime] = useState("09:00 AM");

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsCalendarModalOpen(true);
    setEventTitle("");
    setEventDesc("");
    setEventTime("09:00 AM");
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !eventTitle) return;
    const dateStr = selectedDate.toISOString().split("T")[0];
    const newEvent = {
      id: `ev_${Date.now()}`,
      title: eventTitle,
      desc: eventDesc,
      time: eventTime,
    };
    const updated = {
      ...calendarEvents,
      [dateStr]: [...(calendarEvents[dateStr] || []), newEvent]
    };
    setCalendarEvents(updated);
    localStorage.setItem("custom_calendar_events", JSON.stringify(updated));
    setIsCalendarModalOpen(false);
  };

  const handleDeleteEvent = (dateStr: string, id: string) => {
    const updated = {
      ...calendarEvents,
      [dateStr]: (calendarEvents[dateStr] || []).filter(e => e.id !== id)
    };
    setCalendarEvents(updated);
    localStorage.setItem("custom_calendar_events", JSON.stringify(updated));
  };
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<any>(null);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolLocation, setNewSchoolLocation] = useState("");
  const [newSchoolPlan, setNewSchoolPlan] = useState("standard");
  const [newSchoolDirectorName, setNewSchoolDirectorName] = useState("");
  const [newSchoolDirectorEmail, setNewSchoolDirectorEmail] = useState("");
  const [newSchoolDirectorPassword, setNewSchoolDirectorPassword] = useState("");

  const [registeredSchools, setRegisteredSchools] = useState<any[]>([]);

  const schoolDetailsData: Record<string, any> = {
    "Momentum Academy": {
      directorName: "Dr. Alok Verma",
      directorEmail: "alok@momentum.edu",
      assessmentsCreated: 58,
      assessmentsConducted: 240,
      avgScore: "91.2%",
      tokensUsed: "214,800",
      teachers: [
        { name: "Ms. Sandra Collins", subject: "Math", assessments: 24, status: "Active" },
        { name: "Mr. David John", subject: "Science", assessments: 18, status: "Active" },
        { name: "Ms. Anita Sharma", subject: "English", assessments: 16, status: "Idle" },
      ]
    },
    "Pinecrest Junior School": {
      directorName: "Dr. Ramesh Mehta",
      directorEmail: "ramesh@pinecrest.edu",
      assessmentsCreated: 42,
      assessmentsConducted: 180,
      avgScore: "84.5%",
      tokensUsed: "165,400",
      teachers: [
        { name: "Mr. Sunil Dutt", subject: "Math", assessments: 15, status: "Active" },
        { name: "Ms. Kavita Rao", subject: "Social Studies", assessments: 27, status: "Active" },
      ]
    },
    "St. Mary's Primary": {
      directorName: "Sister Mary D'Souza",
      directorEmail: "mary@stmarys.edu",
      assessmentsCreated: 12,
      assessmentsConducted: 40,
      avgScore: "76.8%",
      tokensUsed: "42,100",
      teachers: [
        { name: "Mr. Anthony G.", subject: "English", assessments: 12, status: "Active" }
      ]
    },
    "Greenwood Academy": {
      directorName: "Dr. Pranab Mukherjee",
      directorEmail: "pranab@greenwood.edu",
      assessmentsCreated: 0,
      assessmentsConducted: 0,
      avgScore: "N/A",
      tokensUsed: "0",
      teachers: []
    }
  };

  const mockTranscripts = [
    {
      id: "int_1",
      studentName: "Aditya Roy",
      schoolName: "Momentum Academy",
      subject: "Math (Division)",
      date: "2026-07-03",
      score: 85,
      dialogue: [
        { speaker: "AI Examiner", text: "Can you explain what division means in your own words?" },
        { speaker: "Aditya Roy", text: "Division is sharing a big number into equal groups. For example, if I have 10 candies and 5 friends, each friend gets 2 candies." },
        { speaker: "AI Examiner", text: "Excellent example. What is 12 divided by 3?" },
        { speaker: "Aditya Roy", text: "It is 4, because 4 times 3 is 12." }
      ]
    },
    {
      id: "int_2",
      studentName: "Riya Sen",
      schoolName: "Pinecrest Junior School",
      subject: "Science (Plants)",
      date: "2026-07-02",
      score: 90,
      dialogue: [
        { speaker: "AI Examiner", text: "What do plants need to grow?" },
        { speaker: "Riya Sen", text: "Plants need sunlight, water, soil, and air to make their own food." },
        { speaker: "AI Examiner", text: "Correct. What is the process of making food called?" },
        { speaker: "Riya Sen", text: "It is called photosynthesis." }
      ]
    }
  ];

  const mockSystemErrors = [
    { id: "err_1", component: "AI Evaluator API", message: "Timeout during long audio processing (15s request time)", severity: "Warning", time: "2 hours ago" },
    { id: "err_2", component: "Email Dispatcher", message: "SMTP connection failed: Host unreachable", severity: "Critical", time: "1 day ago" }
  ];

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

  useEffect(() => {
    const customEventsRaw = localStorage.getItem("custom_calendar_events");
    let mergedEvents: Record<string, Array<{ id: string; title: string; desc?: string; time?: string }>> = {
      "2026-07-03": [
        { id: "e1", title: "Oral Assessment", desc: "Grade 3 Math Division", time: "10:30 AM" }
      ]
    };
    if (customEventsRaw) {
      try {
        mergedEvents = JSON.parse(customEventsRaw);
      } catch (e) {}
    }
    
    assessments.forEach(asmt => {
      if (asmt.date) {
        const dStr = asmt.date.trim();
        if (dStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          if (!mergedEvents[dStr]) {
            mergedEvents[dStr] = [];
          }
          if (!mergedEvents[dStr].some(e => e.id === `asmt_${asmt.id}`)) {
            mergedEvents[dStr].push({
              id: `asmt_${asmt.id}`,
              title: asmt.title,
              desc: `Class Assessment (Status: ${asmt.status})`,
              time: "09:00 AM"
            });
          }
        }
      }
    });
    setCalendarEvents(mergedEvents);
  }, [assessments]);

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  };

  const getCalendarDays = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const renderInteractiveCalendar = (widgetTitle: string = "Calendar", widgetDesc: string = "Plan and review academic events.") => {
    return (
      <div className="card" style={{ ...styles.sectionCard, marginBottom: "2rem" }}>
        <h3 style={styles.widgetTitle}>{widgetTitle}</h3>
        <p style={styles.widgetDesc}>{widgetDesc}</p>
        
        <div style={styles.calendarContainer}>
          <div style={styles.calendarHeader}>
            <span style={styles.calendarMonth}>
              {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
          </div>
          
          <div style={styles.calendarGrid}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
              <div key={d} style={styles.calendarDayName}>{d}</div>
            ))}
            
            {getCalendarDays().map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} style={styles.calendarDayEmpty} />;
              
              const isToday = day.getDate() === new Date().getDate() &&
                              day.getMonth() === new Date().getMonth() &&
                              day.getFullYear() === new Date().getFullYear();
              
              const dateStr = day.toISOString().split("T")[0];
              const hasEvents = calendarEvents[dateStr] && calendarEvents[dateStr].length > 0;
                              
              return (
                <div
                  key={`day-${day.getDate()}`}
                  onClick={() => handleDayClick(day)}
                  style={{
                    ...styles.calendarDay,
                    backgroundColor: isToday ? "var(--primary)" : "transparent",
                    color: isToday ? "#ffffff" : "var(--text-primary)",
                    fontWeight: isToday ? 700 : 400,
                    cursor: "pointer",
                    position: "relative",
                  }}
                  className="interactive-element"
                  title={hasEvents ? `${calendarEvents[dateStr].length} plan(s) scheduled` : undefined}
                >
                  {day.getDate()}
                  {hasEvents && (
                    <span style={{
                      position: "absolute",
                      bottom: "4px",
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      backgroundColor: isToday ? "#ffffff" : "var(--primary)"
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderCalendarModal = () => {
    return (
      <Modal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        title={selectedDate ? `Plan for ${selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : "Plan Event"}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          {selectedDate && calendarEvents[selectedDate.toISOString().split("T")[0]]?.length > 0 && (
            <div>
              <strong style={{ fontSize: "0.85rem", display: "block", marginBottom: "0.5rem" }}>Scheduled Plans:</strong>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {calendarEvents[selectedDate.toISOString().split("T")[0]].map((ev) => (
                  <div key={ev.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", backgroundColor: "var(--bg-app)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                    <div>
                      <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{ev.title}</strong>
                      {ev.desc && <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>{ev.desc}</span>}
                      {ev.time && <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Time: {ev.time}</span>}
                    </div>
                    <button
                      onClick={() => handleDeleteEvent(selectedDate.toISOString().split("T")[0], ev.id)}
                      style={{ background: "none", border: "none", color: "var(--error)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleAddEvent} style={{ display: "flex", flexDirection: "column", gap: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
            <strong style={{ fontSize: "0.85rem", display: "block" }}>Create New Plan:</strong>
            <Input
              label="Event Title"
              type="text"
              required
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="e.g. Oral Assessment, Chapter Review"
            />
            <Input
              label="Description / Note"
              type="text"
              value={eventDesc}
              onChange={(e) => setEventDesc(e.target.value)}
              placeholder="e.g. Review conceptual multiplication mapping"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Start Time</label>
              <select
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                style={{
                  padding: "0.6rem 0.8rem",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color)",
                  outline: "none",
                }}
              >
                <option value="08:00 AM">08:00 AM</option>
                <option value="09:00 AM">09:00 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="12:00 PM">12:00 PM</option>
                <option value="01:00 PM">01:00 PM</option>
                <option value="02:00 PM">02:00 PM</option>
                <option value="03:00 PM">03:00 PM</option>
                <option value="04:00 PM">04:00 PM</option>
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1rem" }}>
              <Button type="button" variant="secondary" onClick={() => setIsCalendarModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Save Plan
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    );
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
      setNewSchoolLocation("");
      setNewSchoolDirectorName("");
      setNewSchoolDirectorEmail("");
      setNewSchoolDirectorPassword("");
      setIsOnboardingModalOpen(false);
      fetchSchools();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to onboard new school.");
    }
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

  // Count assessments waiting for manual grading / active
  const activeAssessmentsCount = assessments.filter(a => a.status === "Active").length;
  // Compute how many students need help (e.g. recent score < 75)
  const studentsNeedHelpCount = stats.recent_activity?.filter(a => a.score < 75).length || 0;
  // Get the last assessment title to display under "Continue Last Assessment"
  const lastAssessment = assessments[assessments.length - 1];

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
            <div style={{ display: "flex", gap: "1rem" }}>
              <Button style={{ whiteSpace: "nowrap" }} onClick={() => setIsOnboardingModalOpen(true)}>
                Onboard School
              </Button>
              <Link href="/control-panel" style={styles.headerCta} className="interactive-element">
                Go to Control Panel
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
            <span style={styles.metricLabel}>Total System Tokens</span>
            <h3 style={styles.metricValue}>422,300</h3>
            <span style={styles.metricSubtext}>LLM prompts & evaluation tokens</span>
          </div>

          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>API Server Status</span>
            <h3 style={styles.metricValue}>99.8%</h3>
            <span style={styles.metricSubtext}>System services and database status</span>
          </div>
        </div>

        {/* Layout Grid */}
        <div style={styles.dashboardGrid}>
          {/* Main Column */}
          <div style={styles.mainCol}>
            {/* Quick Actions */}
            <div className="card" style={styles.sectionCard}>
              <h3 style={styles.sectionTitle}>Administrative Shortcuts</h3>
              <p style={styles.sectionDesc}>Quick pathways to manage curriculum, rosters, and system monitoring.</p>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1.2rem" }}>
                <Link href="/control-panel" style={{ ...styles.actionButtonCard, textDecoration: "none" }} className="interactive-element">
                  <span style={{ ...styles.actionIconWrapper, color: "var(--primary)" }}>⚙️</span>
                  <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)", marginTop: "4px" }}>Control Panel</strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Manage schools registry & AI logs</span>
                </Link>
                <Link href="/syllabus?tab=boards" style={{ ...styles.actionButtonCard, textDecoration: "none" }} className="interactive-element">
                  <span style={{ ...styles.actionIconWrapper, color: "var(--info)" }}>🎓</span>
                  <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)", marginTop: "4px" }}>Syllabus Boards</strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Curate education boards & chapters</span>
                </Link>
              </div>
            </div>

            {/* School Registry Summary */}
            <div className="card" style={{ ...styles.sectionCard, marginTop: "2rem" }}>
              <h3 style={styles.sectionTitle}>Schools Registry</h3>
              <p style={styles.sectionDesc}>Onboarded academic institutions active on the platform.</p>

              <div style={{ marginTop: "1rem", overflowX: "auto" }}>
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
                          No schools onboarded yet.
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
              <div style={{ marginTop: "1.2rem", textAlign: "right" }}>
                <Link href="/control-panel" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>
                  View deep-dive rosters & token analytics in Control Panel &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={styles.rightCol}>
            {/* Calendar */}
            {renderInteractiveCalendar("Calendar", "Review system events.")}

            {/* Health Checklist */}
            <div className="card" style={styles.sectionCard}>
              <h3 style={styles.widgetTitle}>Core Components Health</h3>
              <p style={styles.widgetDesc}>Realtime server diagnostics.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span>PostgreSQL Database</span>
                  <span style={{ color: "var(--success)", fontWeight: 600 }}>Operational</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span>AI Assessment Engine</span>
                  <span style={{ color: "var(--success)", fontWeight: 600 }}>Operational</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span>Email Invitation Worker</span>
                  <span style={{ color: "var(--success)", fontWeight: 600 }}>Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderCalendarModal()}
        {renderOnboardingModal()}
      </div>
    );
  }

  // ----------------------------------------
  // 2. school director render block
  // ----------------------------------------
  if (isDirector) {
    const schoolDisplayName = user?.schoolName || "Momentum Academy";
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
            <h3 style={styles.metricValue}>8</h3>
            <span style={styles.metricSubtext}>Faculty deploying quizzes this week</span>
          </div>

          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>Enrolled Students</span>
            <h3 style={styles.metricValue}>320</h3>
            <span style={styles.metricSubtext}>Across Grades 1 to 5</span>
          </div>

          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>School Mastery</span>
            <h3 style={styles.metricValue}>86%</h3>
            <span style={styles.metricSubtext}>Aggregate student conceptual accuracy</span>
          </div>
        </div>

        {/* Layout Grid */}
        <div style={styles.dashboardGrid}>
          {/* Main Column */}
          <div style={styles.mainCol}>
            {/* Teacher activity log */}
            <div className="card" style={styles.sectionCard}>
              <h3 style={styles.sectionTitle}>Teacher Workloads & Activity</h3>
              <p style={styles.sectionDesc}>Monitors when faculty deploy assessments and review audits.</p>

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
                          No teacher activity logged.
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
                              padding: "0.2rem 0.4rem",
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
            <div className="card" style={{ ...styles.sectionCard, marginTop: "2rem" }}>
              <h3 style={styles.sectionTitle}>Classroom Performance Overview</h3>
              <p style={styles.sectionDesc}>Syllabus accuracy diagnostics ranked by mastery status.</p>

              <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem", border: "1px solid var(--border-color)", borderRadius: "10px", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "0.9rem" }}>Grade 3-A Math</strong>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Division & Fractions Chapter</div>
                  </div>
                  <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", fontWeight: 700, fontSize: "0.85rem", backgroundColor: "var(--success-light)", color: "var(--success)" }}>92% High Mastery</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem", border: "1px solid var(--border-color)", borderRadius: "10px", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "0.9rem" }}>Grade 5-B Science</strong>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Ecology Concept</div>
                  </div>
                  <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", fontWeight: 700, fontSize: "0.85rem", backgroundColor: "var(--warning-light)", color: "var(--warning)" }}>74% Awaiting Review</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem", border: "1px solid var(--border-color)", borderRadius: "10px", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "0.9rem" }}>Grade 2-B Math</strong>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Addition Subtraction</div>
                  </div>
                  <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", fontWeight: 700, fontSize: "0.85rem", backgroundColor: "var(--error-light)", color: "var(--error)" }}>67% Needs Support</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={styles.rightCol}>
            {/* Calendar */}
            {renderInteractiveCalendar("Calendar", "Plan academic schedules.")}

            {/* Quick Actions */}
            <div className="card" style={styles.sectionCard}>
              <h3 style={styles.widgetTitle}>Director Actions</h3>
              <p style={styles.widgetDesc}>Manage institution databases.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "1rem" }}>
                <Link href="/team" style={{ textDecoration: "none" }}>
                  <Button variant="secondary" style={{ width: "100%" }}>Manage Teachers roster</Button>
                </Link>
                <Link href="/school-settings" style={{ textDecoration: "none" }}>
                  <Button variant="secondary" style={{ width: "100%" }}>Edit School Settings</Button>
                </Link>
                <Link href="/reports" style={{ textDecoration: "none" }}>
                  <Button variant="secondary" style={{ width: "100%" }}>Review Syllabus Reports</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
        {renderCalendarModal()}
      </div>
    );
  }

  // ----------------------------------------
  // 3. teacher render block (default)
  // ----------------------------------------
  return (
    <div style={styles.container}>
      <PageHeader
        title={`${getGreeting()}, ${teacherName} 👋`}
        description="Let's continue today's teaching."
      />

      {/* Dashboard Hero: Continue Working */}
      <div className="card animate-fade-in" style={styles.heroCard}>
        <div style={styles.heroLeft}>
          <span style={styles.heroLabel}>CONTINUE WORKING</span>
          <h2 style={styles.heroTitle}>
            {lastAssessment ? lastAssessment.title : "Fractions Assessment"}
          </h2>
          <p style={styles.heroSubtitle}>
            {lastAssessment 
              ? `${lastAssessment.questionsCount} questions • Assigned to class roster` 
              : "Grade 3 Mathematics • Conceptual mastery check"}
          </p>
        </div>
        <div style={styles.heroRight}>
          <Link href={lastAssessment ? "/assessments" : "/assessments?action=create"} style={{ textDecoration: "none" }}>
            <Button variant="primary" size="lg" style={{ borderRadius: "10px" }}>
              Continue <span style={{ marginLeft: "6px" }}>&rarr;</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Teacher Metrics */}
      <div style={styles.metricGrid}>
        <Link href="/assessments" style={{ ...styles.metricCard, textDecoration: "none" }} className="interactive-element">
          <span style={styles.metricLabel}>Pending Assessments</span>
          <h3 style={styles.metricValue}>
            {activeAssessmentsCount > 0 ? activeAssessmentsCount : "3"}
          </h3>
          <span style={styles.metricSubtext}>Awaiting student completions</span>
        </Link>

        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>AI Evaluations</span>
          <h3 style={styles.metricValue}>
            {stats.assessments_conducted || "24"}
          </h3>
          <span style={styles.metricSubtext}>Completed automated audits</span>
        </div>

        <Link href="/students" style={{ ...styles.metricCard, textDecoration: "none" }} className="interactive-element">
          <span style={styles.metricLabel}>Students Requiring Attention</span>
          <h3 style={styles.metricValue}>
            {studentsNeedHelpCount > 0 ? studentsNeedHelpCount : "12"}
          </h3>
          <span style={styles.metricSubtext}>Scoring below 70% conceptual mastery</span>
        </Link>

        <Link href="/reports" style={{ ...styles.metricCard, textDecoration: "none" }} className="interactive-element">
          <span style={styles.metricLabel}>Average Chapter Mastery</span>
          <h3 style={styles.metricValue}>
            {stats.average_accuracy || "92"}%
          </h3>
          <span style={styles.metricSubtext}>Across active class syllabus boards</span>
        </Link>
      </div>

      {/* Main Grid Layout */}
      <div style={styles.dashboardGrid}>
        {/* Left Column: Tasks, Recent Activity */}
        <div style={styles.mainCol}>
          {/* Today's Tasks */}
          <div className="card" style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>Today's Tasks</h3>
            <p style={styles.sectionDesc}>Action items demanding attention or upcoming syllabus checks.</p>

            <div style={styles.checklist}>
              <div style={styles.checkItem}>
                <input type="checkbox" defaultChecked style={styles.checkbox} />
                <span style={styles.checkTextLineThrough}>Verify Class roster import details for Grade 3 Math</span>
              </div>
              <div style={styles.checkItem}>
                <input type="checkbox" defaultChecked style={styles.checkbox} />
                <span style={styles.checkTextLineThrough}>Set parameters for Grade 5 Science chapter quiz</span>
              </div>
              <div style={styles.checkItem}>
                <input type="checkbox" style={styles.checkbox} />
                <span style={styles.checkText}>Review draft oral assessment student audio transcript results</span>
              </div>
              <div style={styles.checkItem}>
                <input type="checkbox" style={styles.checkbox} />
                <span style={styles.checkText}>Review student questions accuracy gaps in Subtraction chapter</span>
              </div>
            </div>
          </div>

          {/* Recent Student Activity */}
          <div className="card" style={{ ...styles.sectionCard, marginTop: "2rem" }}>
            <h3 style={styles.sectionTitle}>Recent Student Activity</h3>
            <p style={styles.sectionDesc}>Live feed of student quiz completions and scored outcomes.</p>

            <div style={styles.activityList}>
              {stats.recent_activity && stats.recent_activity.length > 0 ? (
                stats.recent_activity.map((activity, idx) => (
                  <div key={activity.id || idx} style={styles.activityItem}>
                    <div style={styles.activityInfo}>
                      <span style={styles.activityText}>
                        <strong>{activity.student_name}</strong> completed quiz in <strong>{activity.student_class}</strong>
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
                <p style={{ color: "var(--text-secondary)", marginTop: "1rem" }}>No recent student activity recorded.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Recommendations, Quick Actions */}
        <div style={styles.rightCol}>
          
          {/* Calendar Widget */}
          {renderInteractiveCalendar("Calendar", "Plan and review academic events.")}

          {/* AI Recommendations */}
          <div className="card" style={{ ...styles.sectionCard, marginBottom: "2rem" }}>
            <h3 style={styles.widgetTitle}>Pedagogical Guidance</h3>
            <p style={styles.widgetDesc}>Contextual instructional tips compiled from student outcome data.</p>
            
            <div style={styles.recommendationsContainer}>
              <div style={styles.recItem}>
                <div style={styles.recLightbulb}>💡</div>
                <div style={styles.recContent}>
                  <span style={styles.recTitle}>Division Concept Gap</span>
                  <span style={styles.recDesc}>
                    Grade 3 Math reports indicate high subtraction mastery (92%) but low accuracy in long division concepts. Try assigning targeted practice drills.
                  </span>
                </div>
              </div>

              <div style={styles.recItem}>
                <div style={styles.recLightbulb}>💡</div>
                <div style={styles.recContent}>
                  <span style={styles.recTitle}>Reading Speed Progress</span>
                  <span style={styles.recDesc}>
                    Grade 4 Reading speeds increased by average 8 WPM following the phonics assignment. Suggest regular oral reading homework.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card" style={styles.sectionCard}>
            <h3 style={styles.widgetTitle}>Quick Actions</h3>
            <p style={{ ...styles.widgetDesc, marginBottom: "1rem" }}>One-click daily educational tasks.</p>

            <div style={styles.quickActionsStack}>
              <Link href="/assessments?action=create" style={styles.quickActionRow} className="interactive-element">
                <div style={{ ...styles.quickActionIconBg, color: "var(--primary)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <div style={styles.quickActionContent}>
                  <strong style={styles.quickActionName}>Create Assessment</strong>
                  <span style={styles.quickActionSub}>Configure custom diagnostics</span>
                </div>
                <span style={styles.quickActionArrow}>&rarr;</span>
              </Link>

              <Link href="/students?import=true" style={styles.quickActionRow} className="interactive-element">
                <div style={{ ...styles.quickActionIconBg, color: "var(--success)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M19 8v6M16 11h6" />
                  </svg>
                </div>
                <div style={styles.quickActionContent}>
                  <strong style={styles.quickActionName}>Add Student</strong>
                  <span style={styles.quickActionSub}>Import new class rosters</span>
                </div>
                <span style={styles.quickActionArrow}>&rarr;</span>
              </Link>

              <Link href="/assessments?tab=generate" style={styles.quickActionRow} className="interactive-element">
                <div style={{ ...styles.quickActionIconBg, color: "var(--info)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div style={styles.quickActionContent}>
                  <strong style={styles.quickActionName}>Generate Questions</strong>
                  <span style={styles.quickActionSub}>Build custom question list</span>
                </div>
                <span style={styles.quickActionArrow}>&rarr;</span>
              </Link>

              <Link href="/reports" style={styles.quickActionRow} className="interactive-element">
                <div style={{ ...styles.quickActionIconBg, color: "var(--warning)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </div>
                <div style={styles.quickActionContent}>
                  <strong style={styles.quickActionName}>View Insights</strong>
                  <span style={styles.quickActionSub}>Review class mastery trends</span>
                </div>
                <span style={styles.quickActionArrow}>&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      {renderCalendarModal()}
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
  // Super Admin specific styles
  tabsContainer: {
    display: "flex",
    gap: "1.5rem",
    borderBottom: "1px solid var(--border-color)",
    marginBottom: "1rem",
    width: "100%",
  },
  tabBtn: {
    background: "none",
    border: "none",
    padding: "0.75rem 0",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "color var(--transition-fast)",
  },
  heroCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "var(--selected-bg)",
    border: "1px solid #BFDBFE",
    borderRadius: "14px",
    padding: "2rem",
    width: "100%",
    gap: "1.5rem",
    flexWrap: "wrap",
    boxShadow: "var(--shadow-sm)",
  },
  heroLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    textAlign: "left",
  },
  heroLabel: {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "var(--primary)",
    letterSpacing: "0.07em",
  },
  heroTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  },
  heroSubtitle: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    margin: 0,
  },
  heroRight: {
    display: "flex",
    alignItems: "center",
  },
  quickActionsStack: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    marginTop: "0.5rem",
  },
  quickActionRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
    padding: "0.75rem",
    borderRadius: "10px",
    backgroundColor: "var(--bg-app)",
    border: "1px solid var(--border-color)",
    textDecoration: "none",
    transition: "all var(--transition-fast)",
    textAlign: "left",
  },
  quickActionIconBg: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  quickActionContent: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    overflow: "hidden",
    alignItems: "flex-start",
  },
  quickActionName: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  quickActionSub: {
    fontSize: "0.72rem",
    color: "var(--text-secondary)",
  },
  quickActionArrow: {
    fontSize: "0.9rem",
    color: "var(--text-muted)",
    paddingRight: "4px",
  },
};

