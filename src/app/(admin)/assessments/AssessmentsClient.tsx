"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import QuestionsTable from "@/components/tables/QuestionsTable";
import QuestionGeneratorForm from "@/components/forms/QuestionGeneratorForm";
import Button from "@/components/common/Button";
import CreateAssessmentModal from "@/components/forms/CreateAssessmentModal";
import assessmentService from "@/services/assessment.service";
import subjectService from "@/services/subject.service";
import classService from "@/services/class.service";
import { AssessmentData } from "@/types/assessment.types";
import { STORAGE_KEYS } from "@/utils/constants";
import { extractErrorMessage, formatClassName, isHindiText } from "@/utils/helpers";


export default function AssessmentsClient() {
  const [activeTab, setActiveTab] = useState("workspace");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Data loading states
  const [assessments, setAssessments] = useState<AssessmentData[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classesMap, setClassesMap] = useState<Record<string, string>>({});
  const [subjectsMap, setSubjectsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("Priya");

  // Search & filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [activeStateFilter, setActiveStateFilter] = useState("All"); // All, Live, Upcoming, Completed, Needs Review
  const [copiedAsmtId, setCopiedAsmtId] = useState<string | null>(null);

  // Fetch teacher's name
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      if (stored) {
        try {
          const userObj = JSON.parse(stored);
          if (userObj && userObj.name) {
            // Get first name or full name
            const firstName = userObj.name.split(" ")[0];
            setUserName(firstName);
          }
        } catch (e) {}
      }
    }
  }, []);

  // Sync tab from URL if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "questions" || tab === "generate") {
        setActiveTab(tab);
      } else {
        setActiveTab("workspace");
      }

      const action = params.get("action");
      if (action === "create") {
        setIsModalOpen(true);
        const url = new URL(window.location.href);
        url.searchParams.delete("action");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.pushState({}, "", url.toString());
    }
  };

  const handleCreateSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Load data from backend
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [assessmentsData, subjectsData, classesData] = await Promise.all([
        assessmentService.getAll(),
        subjectService.getAll(),
        classService.getAll(),
      ]);

      setAssessments(assessmentsData);
      setClasses(classesData);
      setSubjects(subjectsData);

      const subMap: Record<string, string> = {};
      subjectsData.forEach((sub) => {
        subMap[sub.id] = sub.name;
      });
      setSubjectsMap(subMap);

      const clsMap: Record<string, string> = {};
      classesData.forEach((cls) => {
        clsMap[cls.id] = formatClassName(cls);
      });
      setClassesMap(clsMap);
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to load workspace data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  // Translate DB status to User-Friendly Display Status
  const getDisplayStatus = (item: AssessmentData): "Live" | "Upcoming" | "Completed" => {
    if (item.status === "Active") return "Live";
    if (item.status === "Completed") return "Completed";
    if (item.status === "Scheduled") return "Upcoming";
    return (item.status as any) || "Live";
  };

  const handleCopyShareableLink = async (e: React.MouseEvent, assessmentId: string) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const shareableLink = `${window.location.origin}/assessment/join?id=${assessmentId}`;
      await navigator.clipboard.writeText(shareableLink);
      setCopiedAsmtId(assessmentId);
      setTimeout(() => setCopiedAsmtId(null), 2000);
    } catch (err) {
      console.error("Failed to copy shareable link", err);
    }
  };

  // One-Search + Filtering Algorithm
  const filteredAssessments = assessments.filter((item) => {
    const displayStatus = getDisplayStatus(item);

    // 1. State Filter Check
    if (activeStateFilter !== "All") {
      if (activeStateFilter === "Needs Review") {
        // Needs review if completed but average score is below 60%
        const completedStudentAssessments = item.assignedStudents?.filter(s => s.status === "Completed");
        if (!completedStudentAssessments || completedStudentAssessments.length === 0) return false;
        
        const sumScores = completedStudentAssessments.reduce((acc, curr) => acc + (curr.interview?.overallScore || 0), 0);
        const avg = sumScores / completedStudentAssessments.length;
        if (avg >= 60) return false;
      } else if (displayStatus !== activeStateFilter) {
        return false;
      }
    }

    // 2. Search Term Check (Searches titles, subjects, classes, student names, and questions)
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();

    // Check title
    if (item.title.toLowerCase().includes(term)) return true;

    // Check subject/class
    const subjectName = subjectsMap[item.subjectId] || "";
    const className = classesMap[item.classId] || "";
    if (subjectName.toLowerCase().includes(term) || className.toLowerCase().includes(term)) return true;

    // Check questions text
    if (item.questions?.some(q => q.text.toLowerCase().includes(term))) return true;

    // Check assigned students
    if (item.assignedStudents?.some(s => s.studentName.toLowerCase().includes(term) || s.studentEmail.toLowerCase().includes(term))) return true;

    return false;
  });

  // Calculate live numbers for the primary "Active" card
  const getLiveStats = () => {
    // Find the first Active (Live) assessment in DB or fall back to a mock Fractions assessment
    const activeAssessment = assessments.find(item => getDisplayStatus(item) === "Live");

    if (activeAssessment) {
      const studentsCount = activeAssessment.assignedStudents?.length || 0;
      const completed = activeAssessment.assignedStudents?.filter(s => s.status === "Completed").length || 0;
      const inProgress = activeAssessment.assignedStudents?.filter(s => s.status === "Started" || s.status === "Evaluating").length || 0;
      const pending = activeAssessment.assignedStudents?.filter(s => s.status === "Pending").length || 0;

      return {
        id: activeAssessment.id,
        title: activeAssessment.title,
        studentsCount,
        completed,
        inProgress,
        pending,
        exists: true
      };
    }

    return null;
  };

  const liveStats = getLiveStats();

  const getHeaderDescription = () => {
    if (activeTab === "workspace") {
      return "Assessments Control Center. Monitor live student evaluations and access curriculum workflows.";
    }
    if (activeTab === "questions") {
      return "Browse, filter, and inspect existing assessment questions.";
    }
    return "Configure topic, difficulty, cognitive level, and generate classroom-ready questions automatically.";
  };

  const getHeaderAction = () => {
    if (activeTab === "workspace") {
      return (
        <Button onClick={() => setIsModalOpen(true)} variant="primary">
          + Create Assessment
        </Button>
      );
    }
    if (activeTab === "questions") {
      return (
        <Button onClick={() => handleTabChange("generate")} variant="primary">
          Generate Questions
        </Button>
      );
    }
    return undefined;
  };

  const tabs = [
    { id: "workspace", label: "Assessment Workspace" },
    { id: "questions", label: "Question Library" },
    { id: "generate", label: "AI Generator" },
  ];

  // Helper for rendering small search matches on cards
  const renderSearchMatchInfo = (item: AssessmentData) => {
    if (!searchTerm) return null;
    const term = searchTerm.toLowerCase();

    // Student match
    const matchingStudent = item.assignedStudents?.find(s => s.studentName.toLowerCase().includes(term));
    if (matchingStudent) {
      return (
        <div style={styles.searchMatchBadge}>
          Matched Student: <strong>{matchingStudent.studentName}</strong>
        </div>
      );
    }

    // Question match
    const matchingQuestion = item.questions?.find(q => q.text.toLowerCase().includes(term));
    if (matchingQuestion) {
      return (
        <div style={styles.searchMatchBadge}>
          Matched Question: <em>"{matchingQuestion.text.slice(0, 45)}..."</em>
        </div>
      );
    }

    return null;
  };

  // Section divisions for the grid
  const liveAssessments = filteredAssessments.filter(item => getDisplayStatus(item) === "Live");
  const upcomingAssessments = filteredAssessments.filter(item => getDisplayStatus(item) === "Upcoming");
  const completedAssessments = filteredAssessments.filter(item => getDisplayStatus(item) === "Completed");

  // Recently Generated: Top 3 newest assessments by creation time
  const recentlyGenerated = [...filteredAssessments]
    .sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      return dateB.localeCompare(dateA);
    })
    .slice(0, 3);



  return (
    <div style={styles.container}>
      <PageHeader 
        title="Assessment Center" 
        description={getHeaderDescription()}
        action={getHeaderAction()}
      />

      {/* Persistent Top Tabs Navigation */}
      <div style={styles.tabsHeader}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                ...styles.tabItem,
                color: isActive ? "var(--primary)" : "var(--text-secondary)",
                borderBottomColor: isActive ? "var(--primary)" : "transparent",
                fontWeight: isActive ? 600 : 500,
              }}
              className="interactive-element"
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={styles.content}>
        {activeTab === "workspace" && (
          <div className="animate-fade-in" style={styles.workspaceWrapper}>
            {/* Top Workspace Bar (Welcome & Hero Widgets) */}
            {assessments.length > 0 && (
              <div style={styles.workspaceHero}>
                {/* Left Welcome and Live Tracker Card */}
                <div style={styles.liveAssessmentCard}>
                  <div style={styles.liveCardHeader}>
                    <div>
                      <h2 style={styles.greetingTitle}>Good Morning {userName} 👋</h2>
                      <p style={styles.greetingSubtitle}>Here is today's active evaluation progress.</p>
                    </div>
                    {liveStats && (
                      <span style={styles.livePulseTag}>
                        <span style={styles.pulseDot}></span>
                        LIVE MONITOR
                      </span>
                    )}
                  </div>
                  
                  <div style={styles.liveDivider} />

                  {liveStats ? (
                    <>
                      <div style={styles.liveStatsDetails}>
                        <div style={styles.liveStatsMain}>
                          <h3 style={styles.liveAsmtTitle}>{liveStats.title}</h3>
                          <span style={styles.liveAsmtStudents}>{liveStats.studentsCount} Students Assigned</span>
                        </div>

                        <div style={styles.liveStatsBreakdown}>
                          <div style={styles.statCountItem}>
                            <span style={styles.statCountLabel}>Completed</span>
                            <strong style={{ ...styles.statCountVal, color: "var(--success)" }}>{liveStats.completed}</strong>
                          </div>
                          <div style={styles.statCountItem}>
                            <span style={styles.statCountLabel}>In Progress</span>
                            <strong style={{ ...styles.statCountVal, color: "var(--warning)" }}>{liveStats.inProgress}</strong>
                          </div>
                          <div style={styles.statCountItem}>
                            <span style={styles.statCountLabel}>Pending</span>
                            <strong style={{ ...styles.statCountVal, color: "var(--text-secondary)" }}>{liveStats.pending}</strong>
                          </div>
                        </div>
                      </div>

                      <div style={styles.liveDivider} />

                      <div style={styles.liveCardFooter}>
                        <Link 
                          href={`/assessments/${liveStats.id}`} 
                          style={styles.liveProgressBtn}
                        >
                          View Live Progress
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ ...styles.liveStatsDetails, padding: "1.2rem", textAlign: "center", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <h4 style={{ ...styles.liveAsmtTitle, fontSize: "0.95rem", color: "var(--text-secondary)" }}>No Active Evaluation</h4>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                          Deploy one of your scheduled assessments from the list below to begin live evaluation monitoring.
                        </p>
                      </div>
                      <div style={styles.liveDivider} />
                      <div style={{ ...styles.liveCardFooter, justifyContent: "center" }}>
                        <button 
                          onClick={() => setIsModalOpen(true)} 
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--primary)",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          + Create Assessment
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Right Columns: Next Assessment and AI Insight */}
                <div style={styles.heroSideColumns}>
                  {/* Next Assessment Panel */}
                  {(() => {
                    const upcomingAsmt = assessments.find(item => getDisplayStatus(item) === "Upcoming");
                    return upcomingAsmt ? (
                      <div style={styles.sidePanelCard}>
                        <div style={styles.sidePanelHeader}>
                          <span style={styles.sidePanelLabel}>Next Assessment</span>
                          <span style={styles.sidePanelTag}>Upcoming</span>
                        </div>
                        <h4 style={styles.sidePanelTitle}>{upcomingAsmt.title}</h4>
                        <p style={styles.sidePanelDesc}>
                          Configured for {subjectsMap[upcomingAsmt.subjectId] || "Curriculum"}. Class: {classesMap[upcomingAsmt.classId] || "Grade"}.
                        </p>
                        <Link href={`/assessments/${upcomingAsmt.id}`} style={{ ...styles.sidePanelActionBtn, textDecoration: "none", display: "inline-block", textAlign: "center" }}>
                          View Details
                        </Link>
                      </div>
                    ) : (
                      <div style={styles.sidePanelCard}>
                        <div style={styles.sidePanelHeader}>
                          <span style={styles.sidePanelLabel}>Schedule Next Unit</span>
                        </div>
                        <h4 style={styles.sidePanelTitle}>Plan Next Assessment</h4>
                        <p style={styles.sidePanelDesc}>Create a scheduled oral evaluation or written diagnostic for any grade.</p>
                        <button 
                          onClick={() => setIsModalOpen(true)} 
                          style={styles.sidePanelActionBtn}
                        >
                          Create Assessment
                        </button>
                      </div>
                    );
                  })()}

                  {/* Recent AI Insight Panel */}
                  {(() => {
                    const completedAsmt = assessments.find(item => getDisplayStatus(item) === "Completed");
                    const hasReports = assessments.some(item => 
                      item.assignedStudents?.some(s => s.status === "Completed")
                    );

                    return hasReports ? (
                      <div style={styles.sidePanelCard}>
                        <div style={styles.sidePanelHeader}>
                          <span style={styles.sidePanelLabel}>Recent AI Insight</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
                            <path d="M18 10a6 6 0 0 0-12 0c0 7 3 9 3 9h6s3-2 3-9Z" />
                            <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Z" />
                          </svg>
                        </div>
                        <h4 style={styles.sidePanelTitle}>
                          {completedAsmt ? completedAsmt.title : "Equivalent Fractions"}
                        </h4>
                        <p style={{ ...styles.sidePanelDesc, color: "var(--text-primary)", fontWeight: 500 }}>
                          "Students demonstrated strong progress. Focus reinforcing foundational chapter exercises."
                        </p>
                        <span style={styles.insightRecommendation}>
                          Recommendation: Plan a follow-up review for this unit.
                        </span>
                      </div>
                    ) : (
                      <div style={styles.sidePanelCard}>
                        <div style={styles.sidePanelHeader}>
                          <span style={styles.sidePanelLabel}>Learning Insights</span>
                        </div>
                        <h4 style={styles.sidePanelTitle}>Diagnostics Insight</h4>
                        <p style={styles.sidePanelDesc}>
                          Detailed performance reports and conceptual learning recommendations will compile here automatically once students finish tests.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Filter and Search Bar */}
            <div style={styles.filterSection}>
              <div style={styles.searchContainer}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={styles.searchIcon}>
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search assessments, questions, students, or insights..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={styles.searchInput}
                />
              </div>

              {/* State Filter Buttons */}
              <div style={styles.stateFilterRow}>
                {["All", "Live", "Upcoming", "Completed", "Needs Review"].map((state) => {
                  const isActive = activeStateFilter === state;
                  return (
                    <button
                      key={state}
                      onClick={() => setActiveStateFilter(state)}
                      style={{
                        ...styles.stateFilterBtn,
                        backgroundColor: isActive ? "var(--primary)" : "var(--bg-surface)",
                        color: isActive ? "#ffffff" : "var(--text-secondary)",
                        borderColor: isActive ? "var(--primary)" : "var(--border-color)",
                        fontWeight: isActive ? 600 : 500,
                      }}
                    >
                      {state}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Workspace Sections */}
            <div style={styles.sectionsContainer}>
              {loading ? (
                <div style={styles.loaderCenter}>
                  <div className="spinner" style={{ width: "36px", height: "36px" }}></div>
                  <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>Loading assessments workspace...</p>
                </div>
              ) : (
                <>
                  {/* Section 1: Today's Active Assessments */}
                  {liveAssessments.length > 0 && (
                    <div style={styles.workspaceSection}>
                      <h3 style={styles.sectionTitle}>Today's Active Assessments</h3>
                      <div style={styles.cardsGrid}>
                        {liveAssessments.map(item => (
                          <AssessmentGridCard 
                            key={item.id} 
                            item={item} 
                            subjectsMap={subjectsMap}
                            classesMap={classesMap}
                            displayStatus="Live"
                            copiedAsmtId={copiedAsmtId}
                            onCopyShare={handleCopyShareableLink}
                            searchMatch={renderSearchMatchInfo(item)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 2: Upcoming Assessments */}
                  {upcomingAssessments.length > 0 && (
                    <div style={styles.workspaceSection}>
                      <h3 style={styles.sectionTitle}>Upcoming Assessments</h3>
                      <div style={styles.cardsGrid}>
                        {upcomingAssessments.map(item => (
                          <AssessmentGridCard 
                            key={item.id} 
                            item={item} 
                            subjectsMap={subjectsMap}
                            classesMap={classesMap}
                            displayStatus="Upcoming"
                            copiedAsmtId={copiedAsmtId}
                            onCopyShare={handleCopyShareableLink}
                            searchMatch={renderSearchMatchInfo(item)}
                          />
                        ))}
                      </div>
                    </div>
                  )}



                  {/* Section 4: Completed Assessments */}
                  {completedAssessments.length > 0 && (
                    <div style={styles.workspaceSection}>
                      <h3 style={styles.sectionTitle}>Completed Assessments</h3>
                      <div style={styles.cardsGrid}>
                        {completedAssessments.map(item => (
                          <AssessmentGridCard 
                            key={item.id} 
                            item={item} 
                            subjectsMap={subjectsMap}
                            classesMap={classesMap}
                            displayStatus="Completed"
                            copiedAsmtId={copiedAsmtId}
                            onCopyShare={handleCopyShareableLink}
                            searchMatch={renderSearchMatchInfo(item)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty State if all filtered lists are empty */}
                  {filteredAssessments.length === 0 && (
                    <div style={styles.emptyStateContainer}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                      <h4 style={styles.emptyStateTitle}>No assessments found</h4>
                      <p style={styles.emptyStateDesc}>Try expanding your search query or removing the active filters.</p>
                    </div>
                  )}

                  {/* Section 5: Recently Generated */}
                  {recentlyGenerated.length > 0 && (
                    <div style={styles.workspaceSection}>
                      <h3 style={styles.sectionTitle}>Recently Generated</h3>
                      <div style={styles.cardsGrid}>
                        {recentlyGenerated.map(item => (
                          <AssessmentGridCard 
                            key={item.id} 
                            item={item} 
                            subjectsMap={subjectsMap}
                            classesMap={classesMap}
                            displayStatus={getDisplayStatus(item)}
                            copiedAsmtId={copiedAsmtId}
                            onCopyShare={handleCopyShareableLink}
                            searchMatch={renderSearchMatchInfo(item)}
                          />
                        ))}
                      </div>
                    </div>
                  )}


                </>
              )}
            </div>
          </div>
        )}

        {activeTab === "questions" && (
          <div className="animate-fade-in">
            <QuestionsTable />
          </div>
        )}

        {activeTab === "generate" && (
          <div className="animate-fade-in" style={styles.generatorWrapper}>
            <div className="glass-panel" style={styles.formContainer}>
              <QuestionGeneratorForm />
            </div>
          </div>
        )}
      </div>

      <CreateAssessmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}

// ─── Sub-Component for Assessment Workspace Card ─────────────────────────────
interface AssessmentGridCardProps {
  item: AssessmentData;
  subjectsMap: Record<string, string>;
  classesMap: Record<string, string>;
  displayStatus: "Live" | "Upcoming" | "Completed";
  copiedAsmtId: string | null;
  onCopyShare: (e: React.MouseEvent, id: string) => void;
  searchMatch?: React.ReactNode;
}

function AssessmentGridCard({
  item,
  subjectsMap,
  classesMap,
  displayStatus,
  copiedAsmtId,
  onCopyShare,
  searchMatch
}: AssessmentGridCardProps) {
  const isCopied = copiedAsmtId === item.id;
  const totalStudents = item.assignedStudents?.length || 0;
  
  // Calculate completion percentage
  const completedCount = item.assignedStudents?.filter(s => s.status === "Completed").length || 0;
  const completionPercentage = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;

  // Semantic Status Color Styling
  const getStatusBadgeStyle = () => {
    switch (displayStatus) {
      case "Live":
        return { bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" };
      case "Completed":
        return { bg: "#DCFCE7", color: "#16A34A", border: "#BBF7D0" };
      case "Upcoming":
        return { bg: "#FEF3C7", color: "#D97706", border: "#FDE68A" };
    }
  };

  const badgeStyle = getStatusBadgeStyle();

  const isHindi = (subjectsMap[item.subjectId]?.toLowerCase() === "hindi") || isHindiText(item.title);

  return (
    <Link href={`/assessments/${item.id}`} style={styles.asmtCardLink}>
      <div style={styles.asmtCard} className="card">
        <div style={styles.asmtCardHeader}>
          <span style={styles.asmtSubject} className={isHindi ? "font-hindi" : ""}>
            {subjectsMap[item.subjectId] || "Mathematics"} • {classesMap[item.classId] || "Grade 3"}
          </span>
          <span style={{
            ...styles.statusBadge,
            backgroundColor: badgeStyle.bg,
            color: badgeStyle.color,
            borderColor: badgeStyle.border
          }}>
            {displayStatus.toUpperCase()}
          </span>
        </div>

        <h4 style={styles.asmtCardTitle} className={isHindi ? "font-hindi" : ""}>{item.title}</h4>

        {searchMatch}

        <div style={styles.asmtDetailsRow}>
          <span>{item.questionsCount} Questions</span>
          <span>{totalStudents} Students</span>
        </div>

        {/* Completion Progress Bar */}
        {totalStudents > 0 && (
          <div style={styles.asmtProgressGroup}>
            <div style={styles.asmtProgressLabels}>
              <span>Progress</span>
              <span>{completedCount}/{totalStudents} ({completionPercentage}%)</span>
            </div>
            <div style={styles.asmtProgressBar}>
              <div style={{
                ...styles.asmtProgressFill,
                width: `${completionPercentage}%`,
                backgroundColor: displayStatus === "Completed" ? "var(--success)" : "var(--primary)"
              }} />
            </div>
          </div>
        )}

        <div style={styles.asmtCardDivider} />

        <div style={styles.asmtCardActions}>
          <span style={styles.asmtCardDate}>{item.date || "Today"}</span>
          <div style={{ display: "flex", gap: "0.5rem" }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={(e) => onCopyShare(e, item.id)}
              style={{
                ...styles.cardActionBtn,
                color: isCopied ? "var(--success)" : "var(--primary)"
              }}
            >
              {isCopied ? "Copied!" : "Copy Join Link"}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Inline CSS Styling System ────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    padding: "1rem 0",
    width: "100%",
  },
  tabsHeader: {
    display: "flex",
    gap: "2rem",
    borderBottom: "1px solid var(--border-color)",
    marginBottom: "0.5rem",
    width: "100%",
  },
  tabItem: {
    padding: "0.8rem 0",
    borderBottom: "2px solid transparent",
    fontSize: "0.95rem",
    cursor: "pointer",
    background: "none",
    borderLeft: "none",
    borderRight: "none",
    borderTop: "none",
    transition: "all var(--transition-fast)",
  },
  content: {
    width: "100%",
  },
  workspaceWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "2.5rem",
    width: "100%",
  },
  workspaceHero: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: "1.5rem",
    width: "100%",
  },
  liveAssessmentCard: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: "var(--shadow-sm)",
    justifyContent: "space-between",
  },
  liveCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greetingTitle: {
    fontSize: "1.4rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  },
  greetingSubtitle: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    marginTop: "2px",
  },
  livePulseTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "var(--error-light)",
    color: "var(--error)",
    fontSize: "0.75rem",
    fontWeight: 700,
    padding: "4px 8px",
    borderRadius: "999px",
    letterSpacing: "0.05em",
  },
  pulseDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "var(--error)",
    display: "inline-block",
    animation: "pulse 1.5s infinite ease-in-out",
  },
  liveDivider: {
    height: "1px",
    backgroundColor: "var(--divider)",
    margin: "16px 0",
  },
  liveStatsDetails: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "1.5rem",
  },
  liveStatsMain: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  liveAsmtTitle: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  },
  liveAsmtStudents: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
  },
  liveStatsBreakdown: {
    display: "flex",
    gap: "1.5rem",
  },
  statCountItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  statCountLabel: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    fontWeight: 600,
    letterSpacing: "0.05em",
  },
  statCountVal: {
    fontSize: "1.3rem",
    fontWeight: 700,
    marginTop: "4px",
  },
  liveCardFooter: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "8px",
  },
  liveProgressBtn: {
    backgroundColor: "var(--primary)",
    color: "#ffffff",
    padding: "0.5rem 1.2rem",
    borderRadius: "10px",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none",
    transition: "background var(--transition-fast)",
  },
  heroSideColumns: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  sidePanelCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "16px 20px",
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    justifyContent: "center",
  },
  sidePanelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sidePanelLabel: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  sidePanelTag: {
    backgroundColor: "var(--warning-light)",
    color: "var(--warning)",
    fontSize: "0.7rem",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: "999px",
  },
  sidePanelTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  },
  sidePanelDesc: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    margin: 0,
    lineHeight: 1.4,
  },
  sidePanelActionBtn: {
    backgroundColor: "transparent",
    color: "var(--primary)",
    border: "1px solid var(--primary)",
    borderRadius: "10px",
    padding: "6px 12px",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    width: "fit-content",
    marginTop: "4px",
    transition: "all var(--transition-fast)",
  },
  insightRecommendation: {
    fontSize: "0.8rem",
    color: "var(--primary)",
    fontWeight: 600,
    marginTop: "2px",
  },
  filterSection: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1.5rem",
    flexWrap: "wrap",
    width: "100%",
  },
  searchContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    flex: "1 1 350px",
    maxWidth: "500px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
  },
  searchIcon: {
    position: "absolute",
    left: "14px",
    color: "var(--text-muted)",
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    padding: "0.75rem 1rem 0.75rem 2.75rem",
    border: "none",
    background: "transparent",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    outline: "none",
    borderRadius: "10px",
  },
  stateFilterRow: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap",
  },
  stateFilterBtn: {
    padding: "0.5rem 1rem",
    borderRadius: "10px",
    border: "1px solid",
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  sectionsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "3rem",
    width: "100%",
  },
  workspaceSection: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    width: "100%",
  },
  sectionTitle: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  },
  curatedBadge: {
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
    fontSize: "0.7rem",
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: "999px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "1.5rem",
    width: "100%",
  },
  asmtCardLink: {
    textDecoration: "none",
    color: "inherit",
    display: "block",
  },
  asmtCard: {
    display: "flex",
    flexDirection: "column",
    padding: "20px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    boxShadow: "var(--shadow-sm)",
    transition: "transform var(--transition-fast), box-shadow var(--transition-fast)",
    cursor: "pointer",
    minHeight: "220px",
  },
  asmtCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  asmtSubject: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    fontWeight: 600,
  },
  statusBadge: {
    fontSize: "0.7rem",
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: "999px",
    border: "1px solid",
  },
  asmtCardTitle: {
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: "12px 0 6px 0",
    lineHeight: 1.3,
  },
  searchMatchBadge: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    backgroundColor: "var(--selected-bg)",
    padding: "4px 8px",
    borderRadius: "6px",
    marginTop: "4px",
    borderLeft: "3px solid var(--primary)",
  },
  asmtDetailsRow: {
    display: "flex",
    gap: "1rem",
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    marginTop: "8px",
    fontWeight: 500,
  },
  asmtProgressGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginTop: "16px",
  },
  asmtProgressLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    fontWeight: 500,
  },
  asmtProgressBar: {
    height: "6px",
    backgroundColor: "var(--divider)",
    borderRadius: "999px",
    width: "100%",
    overflow: "hidden",
  },
  asmtProgressFill: {
    height: "100%",
    borderRadius: "999px",
  },
  asmtCardDivider: {
    height: "1px",
    backgroundColor: "var(--divider)",
    margin: "16px 0 12px 0",
    marginTop: "auto",
  },
  asmtCardActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  asmtCardDate: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    fontWeight: 500,
  },
  cardActionBtn: {
    background: "none",
    border: "none",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
    transition: "color var(--transition-fast)",
  },
  suggestedCard: {
    display: "flex",
    flexDirection: "column",
    padding: "20px",
    backgroundColor: "var(--bg-surface)",
    border: "1px dashed var(--border-color)",
    borderRadius: "14px",
    boxShadow: "none",
    minHeight: "180px",
  },
  sugHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  sugSubject: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    fontWeight: 600,
  },
  sugCount: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    fontWeight: 500,
  },
  sugTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: "12px 0 4px 0",
  },
  sugDescription: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    margin: "0 0 16px 0",
    lineHeight: 1.4,
  },
  sugCreateBtn: {
    backgroundColor: "transparent",
    color: "var(--primary)",
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    padding: "6px 12px",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    width: "fit-content",
    marginTop: "auto",
    transition: "all var(--transition-fast)",
  },
  loaderCenter: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "4rem",
    width: "100%",
  },
  emptyStateContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem",
    border: "1px dashed var(--border-color)",
    borderRadius: "14px",
    backgroundColor: "var(--bg-surface)",
    textAlign: "center",
    gap: "8px",
  },
  emptyStateTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  },
  emptyStateDesc: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    margin: 0,
  },
  generatorWrapper: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
  },
  formContainer: {
    padding: "2rem",
    width: "100%",
    maxWidth: "800px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface)",
    boxShadow: "var(--shadow-sm)",
  },
};
