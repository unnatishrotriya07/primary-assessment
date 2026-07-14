"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/common/PageHeader";
import assessmentService from "@/services/assessment.service";
import interviewService, { InterviewReport } from "@/services/interview.service";
import subjectService from "@/services/subject.service";
import classService from "@/services/class.service";
import studentService from "@/services/student.service";
import { AssessmentData } from "@/types/assessment.types";
import { extractErrorMessage, formatClassName, isHindiText } from "@/utils/helpers";

import CreateAssessmentModal from "@/components/forms/CreateAssessmentModal";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AssessmentDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "questions" | "students" | "progress" | "insights">("overview");

  // State variables
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [subjectsMap, setSubjectsMap] = useState<Record<string, string>>({});
  const [classesMap, setClassesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Student drawer state
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentReport, setSelectedStudentReport] = useState<InterviewReport | null>(null);
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"conversation" | "transcript" | "evaluation" | "insights" | "recommendations" | "notes" | "audio">("conversation");
  const [noteText, setNoteText] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [noteSaveMessage, setNoteSaveMessage] = useState<string | null>(null);


  // Quick Action notification states
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ─── Seeded Demo Fractions Data for the Teacher Story ───
  const mockFractionsData: AssessmentData = {
    id: "demo-fractions",
    title: "Fractions Assessment",
    subjectId: "1",
    classId: "3",
    questionsCount: 5,
    status: "Active",
    date: "Yesterday",
    questions: [
      {
        id: "1",
        text: "Look at the visual circle. What fraction of the circle is shaded in blue?",
        correctAnswer: "1/4",
        questionType: "MCQ",
        difficulty: "easy",
        cognitiveLevel: "understanding",
        options: ["1/2", "1/4", "3/4", "1/3"],
        subjectId: "1"
      },
      {
        id: "2",
        text: "What is the numerator in the fraction 3/8?",
        correctAnswer: "3",
        questionType: "TITA",
        difficulty: "easy",
        cognitiveLevel: "remembering",
        options: [],
        subjectId: "1"
      },
      {
        id: "3",
        text: "If Rahul eats 2 slices of a 6-slice pizza, what fraction of the pizza did he eat?",
        correctAnswer: "2/6 or 1/3",
        questionType: "TITA",
        difficulty: "medium",
        cognitiveLevel: "applying",
        options: [],
        subjectId: "1"
      },
      {
        id: "4",
        text: "Identify the equivalent fraction of 1/2 from the options.",
        correctAnswer: "2/4",
        questionType: "MCQ",
        difficulty: "medium",
        cognitiveLevel: "applying",
        options: ["1/3", "2/4", "3/5", "2/6"],
        subjectId: "1"
      },
      {
        id: "5",
        text: "Explain why 3/6 is equivalent to 1/2. Use a drawing in your explanation.",
        correctAnswer: "Because dividing numerator and denominator by 3 gives 1/2",
        questionType: "Descriptive",
        difficulty: "hard",
        cognitiveLevel: "evaluating",
        options: [],
        subjectId: "1"
      }
    ],
    assignedStudents: [
      {
        id: 101,
        assessmentId: 1,
        studentName: "Rahul Sharma",
        studentClass: "Grade 3-A",
        dateOfBirth: "2017-04-12",
        studentEmail: "parent.rahul@gmail.com",
        contact: "+91 98765 43210",
        token: "token-rahul",
        createdAt: "2026-07-03T09:00:00Z",
        expiresAt: "2026-07-04T09:00:00Z",
        isUsed: true,
        status: "Completed",
        interview: { id: 201, overallScore: 84, grade: "A", status: "Completed", completedAt: "2026-07-03T09:03:00Z" }
      },
      {
        id: 102,
        assessmentId: 1,
        studentName: "Anjali Gupta",
        studentClass: "Grade 3-A",
        dateOfBirth: "2017-08-22",
        studentEmail: "parent.anjali@gmail.com",
        contact: "+91 98765 43211",
        token: "token-anjali",
        createdAt: "2026-07-03T09:02:00Z",
        expiresAt: "2026-07-04T09:02:00Z",
        isUsed: true,
        status: "Completed",
        interview: { id: 202, overallScore: 92, grade: "A+", status: "Completed", completedAt: "2026-07-03T09:05:00Z" }
      },
      {
        id: 103,
        assessmentId: 1,
        studentName: "Aryan Patel",
        studentClass: "Grade 3-A",
        dateOfBirth: "2017-01-05",
        studentEmail: "parent.aryan@gmail.com",
        contact: "+91 98765 43212",
        token: "token-aryan",
        createdAt: "2026-07-03T09:05:00Z",
        expiresAt: "2026-07-04T09:05:00Z",
        isUsed: true,
        status: "Started",
        interview: { id: 203, overallScore: 0, grade: "C", status: "In Progress" }
      },
      {
        id: 104,
        assessmentId: 1,
        studentName: "Rohan Verma",
        studentClass: "Grade 3-A",
        dateOfBirth: "2017-11-19",
        studentEmail: "parent.rohan@gmail.com",
        contact: "+91 98765 43213",
        token: "token-rohan",
        createdAt: "2026-07-03T09:12:00Z",
        expiresAt: "2026-07-04T09:12:00Z",
        isUsed: false,
        status: "Pending"
      },
      {
        id: 105,
        assessmentId: 1,
        studentName: "Sneha Nair",
        studentClass: "Grade 3-A",
        dateOfBirth: "2017-09-30",
        studentEmail: "parent.sneha@gmail.com",
        contact: "+91 98765 43214",
        token: "token-sneha",
        createdAt: "2026-07-03T09:15:00Z",
        expiresAt: "2026-07-04T09:15:00Z",
        isUsed: true,
        status: "Completed",
        interview: { id: 205, overallScore: 48, grade: "C", status: "Completed", completedAt: "2026-07-03T09:22:00Z" }
      }
    ]
  };

  // Generate mock timeline items for demo fractions
  const mockTimeline = [
    { time: "9:00 AM", student: "Rahul Started", desc: "Access verified via Scholar ID 3014", completed: false },
    { time: "9:03 AM", student: "Rahul Completed", desc: "5 Questions evaluated. Overall accuracy 84%", completed: true },
    { time: "9:03 AM", student: "Anjali Started", desc: "Access verified via Scholar ID 3022", completed: false },
    { time: "9:05 AM", student: "Anjali Completed", desc: "5 Questions evaluated. Overall accuracy 92%", completed: true },
    { time: "9:05 AM", student: "Aryan Started", desc: "Access verified via Scholar ID 3011", completed: false },
    { time: "9:10 AM", student: "Sneha Completed", desc: "5 Questions evaluated. Overall accuracy 48%", completed: true },
    { time: "9:10 AM", student: "Evaluation Finished", desc: "AI Insights generated for 3 completed transcripts", completed: true, type: "system" }
  ];

  // Mock Question Analytics for fractions
  const mockQuestionAnalytics = [
    { num: 1, text: "Look at the visual circle. What fraction of the circle is shaded in blue?", correct: "91%", status: "Strong", detail: "Most students correctly identified 1/4 using circle sectors." },
    { num: 2, text: "What is the numerator in the fraction 3/8?", correct: "48%", status: "Needs Attention", detail: "68% of students confused numerator and denominator, typing 8 instead of 3.", danger: true },
    { num: 3, text: "If Rahul eats 2 slices of a 6-slice pizza, what fraction of the pizza did he eat?", correct: "74%", status: "Satisfactory", detail: "Good understanding of fractions in real-world word problems." },
    { num: 4, text: "Identify the equivalent fraction of 1/2 from the options.", correct: "62%", status: "Satisfactory", detail: "Struggled with scaling fraction multipliers." },
    { num: 5, text: "Explain why 3/6 is equivalent to 1/2. Use a drawing in your explanation.", correct: "55%", status: "Needs Attention", detail: "Descriptive voice explanations lacked comparative vocabulary.", danger: true }
  ];

  // Mock student reports for slide drawer
  const getMockStudentReport = (studentId: string): InterviewReport => {
    const common = {
      student_class: "Grade 3-A",
      assessment_title: "Fractions Assessment",
      status: "Completed",
      completed_at: "2026-07-03T09:05:00Z"
    };

    if (studentId === "101") { // Rahul
      return {
        id: 201,
        student_name: "Rahul Sharma",
        overall_score: 84,
        grade: "A",
        recommendation: "Recommended",
        score_communication: 78,
        score_numeracy: 88,
        score_creativity: 82,
        score_emotional_iq: 85,
        summary: "Rahul demonstrated solid proficiency in identifies fractions from pictures. He solved the word problem correctly and explained his steps clearly.",
        strengths: "Great conceptual understanding of circle subdivisions.\nStrong numeric calculations.",
        improvements: "Encourage vocabulary practice. Rahul used 'top number' and 'bottom number' instead of formal terms 'numerator' and 'denominator'.",
        admin_note: "Comfortable with fractions. Ready for advanced topics.",
        evaluated_answers: [
          { question: "What fraction of the circle is shaded in blue?", studentAnswer: "one fourth", expectedAnswer: "1/4", questionType: "MCQ", isCorrect: true, explanation: "Correctly matched visual representation." },
          { question: "What is the numerator in the fraction 3/8?", studentAnswer: "uh it is 3", expectedAnswer: "3", questionType: "TITA", isCorrect: true, explanation: "Correctly named numerator." },
          { question: "If Rahul eats 2 slices of a 6-slice pizza, what fraction of the pizza did he eat?", studentAnswer: "two out of six which is one third", expectedAnswer: "2/6 or 1/3", questionType: "TITA", isCorrect: true, explanation: "Identified correct ratios." }
        ],
        ...common
      };
    }

    if (studentId === "102") { // Anjali
      return {
        id: 202,
        student_name: "Anjali Gupta",
        overall_score: 92,
        grade: "A+",
        recommendation: "Strongly Recommended",
        score_communication: 95,
        score_numeracy: 90,
        score_creativity: 92,
        score_emotional_iq: 90,
        summary: "Anjali performed exceptionally well. She expressed her answers fluently, showed precise calculations, and correctly explained the concept of equivalent fractions using pizza metaphors.",
        strengths: "Flawless mathematical reasoning.\nExcellent academic vocabulary.\nConfident voice tone.",
        improvements: "Suggest solving multi-step descriptive word problems to maintain engagement.",
        admin_note: "Outstanding performance. Excels at Grade 3 curriculum.",
        evaluated_answers: [
          { question: "What fraction of the circle is shaded in blue?", studentAnswer: "1/4", expectedAnswer: "1/4", questionType: "MCQ", isCorrect: true, explanation: "Identified fraction immediately." },
          { question: "What is the numerator in the fraction 3/8?", studentAnswer: "the numerator is three", expectedAnswer: "3", questionType: "TITA", isCorrect: true, explanation: "Correctly named numerator." }
        ],
        ...common
      };
    }

    // Default Fallback
    return {
      id: 205,
      student_name: "Sneha Nair",
      overall_score: 48,
      grade: "C",
      recommendation: "Needs Review",
      score_communication: 50,
      score_numeracy: 42,
      score_creativity: 55,
      score_emotional_iq: 45,
      summary: "Sneha struggled with naming parts of fractions and equivalent fractions. She frequently paused and expressed confusion.",
      strengths: "Creative visualization of parts of shapes.",
      improvements: "Needs direct support. Spend classroom time reviewing numerator/denominator layout.\nAssign basic visual fractions worksheets.",
      admin_note: "Needs conceptual intervention.",
      evaluated_answers: [
        { question: "What fraction of the circle is shaded in blue?", studentAnswer: "1/2", expectedAnswer: "1/4", questionType: "MCQ", isCorrect: false, explanation: "Confused half sector with quarter sector." },
        { question: "What is the numerator in the fraction 3/8?", studentAnswer: "8 because it is on the bottom", expectedAnswer: "3", questionType: "TITA", isCorrect: false, explanation: "Named denominator instead of numerator." }
      ],
      ...common
    };
  };

  // ─── Data Loading ───
  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const [subjectsData, classesData] = await Promise.all([
          subjectService.getAll(),
          classService.getAll()
        ]);

        const subMap: Record<string, string> = {};
        subjectsData.forEach((s) => { subMap[s.id] = s.name; });
        setSubjectsMap(subMap);

        const clsMap: Record<string, string> = {};
        classesData.forEach((c) => { clsMap[c.id] = formatClassName(c); });
        setClassesMap(clsMap);

        if (id === "demo-fractions") {
          setAssessment(mockFractionsData);
        } else {
          const asmt = await assessmentService.getById(id);
          setAssessment(asmt);
        }
      } catch (err: any) {
        setError(extractErrorMessage(err, "Failed to load assessment."));
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [id]);

  // Load detailed report when student is clicked
  useEffect(() => {
    if (!selectedStudentId || !assessment) return;

    setDrawerTab("conversation");
    setNoteSaveMessage(null);

    if (id === "demo-fractions") {
      const mockRep = getMockStudentReport(selectedStudentId);
      setSelectedStudentReport(mockRep);
      setNoteText(mockRep.admin_note || "");
    } else {
      const studentAss = assessment.assignedStudents?.find(s => String(s.id) === selectedStudentId);
      if (studentAss && studentAss.interview) {
        setLoadingStudentDetail(true);
        interviewService.getReport(studentAss.interview.id)
          .then((report) => {
            setSelectedStudentReport(report);
            setNoteText(report.admin_note || "");
          })
          .catch((err) => {
            console.error("Failed to load interview report", err);
          })
          .finally(() => {
            setLoadingStudentDetail(false);
          });
      } else {
        setSelectedStudentReport(null);
        setNoteText("");
      }
    }
  }, [selectedStudentId, assessment]);

  // ─── Auto Polling for Active Assessments (No Refresh) ───
  useEffect(() => {
    if (id === "demo-fractions" || !assessment) return;

    const hasActiveSessions = assessment.assignedStudents?.some(
      s => s.status === "Started" || s.status === "Evaluating"
    );

    if (hasActiveSessions) {
      const interval = setInterval(async () => {
        try {
          const updatedAsmt = await assessmentService.getById(id);
          setAssessment(updatedAsmt);
        } catch (err) {
          console.error("Failed to poll assessment updates", err);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [id, assessment]);

  // Save notes handler
  const handleSaveNotes = async () => {
    if (!selectedStudentReport) return;
    setIsSavingNotes(true);
    setNoteSaveMessage(null);
    try {
      if (id === "demo-fractions") {
        setSelectedStudentReport({
          ...selectedStudentReport,
          admin_note: noteText
        });
        if (assessment) {
          const updatedAssigned = assessment.assignedStudents?.map(s => {
            if (String(s.id) === selectedStudentId) {
              return {
                ...s,
                interview: s.interview ? { ...s.interview, admin_note: noteText } : undefined
              };
            }
            return s;
          });
          setAssessment({
            ...assessment,
            assignedStudents: updatedAssigned
          });
        }
        setNoteSaveMessage("Notes saved successfully!");
      } else {
        const updatedReport = await interviewService.updateNotes(selectedStudentReport.id, noteText);
        setSelectedStudentReport(updatedReport);

        const updatedAsmt = await assessmentService.getById(id);
        setAssessment(updatedAsmt);

        setNoteSaveMessage("Notes saved successfully!");
      }
    } catch (err) {
      console.error("Failed to save notes", err);
      setNoteSaveMessage("Failed to save notes. Please try again.");
    } finally {
      setIsSavingNotes(false);
      setTimeout(() => setNoteSaveMessage(null), 3000);
    }
  };


  if (loading) {
    return (
      <div style={styles.loaderCenter}>
        <div className="spinner" style={{ width: "36px", height: "36px" }}></div>
        <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>Loading Assessment Command Center...</p>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div style={styles.errorContainer}>
        <h4 style={{ color: "var(--error)" }}>Error Loading Command Center</h4>
        <p style={{ color: "var(--text-secondary)" }}>{error || "Assessment not found."}</p>
        <Link href="/assessments" style={styles.backLink}>Back to Assessments Center</Link>
      </div>
    );
  }

  const assignedStudents = assessment.assignedStudents || [];
  const completedCount = assignedStudents.filter(s => s.status === "Completed").length;
  const inProgressCount = assignedStudents.filter(s => s.status === "Started" || s.status === "Evaluating").length;
  const pendingCount = assignedStudents.filter(s => s.status === "Pending").length;
  const totalStudents = assignedStudents.length;

  // Calculate average score
  const completedStudents = assignedStudents.filter(s => s.interview && s.interview.overallScore);
  const avgScore = completedStudents.length > 0
    ? Math.round(completedStudents.reduce((acc, curr) => acc + (curr.interview?.overallScore || 0), 0) / completedStudents.length)
    : 74; // Default fallback

  const displayStatus = assessment.status === "Active" ? "LIVE" : assessment.status.toUpperCase();
  const classDisplayName = classesMap[assessment.classId] || "Grade 3";
  const subjectDisplayName = subjectsMap[assessment.subjectId] || "Mathematics";

  // ─── Sticky Actions Panel Functions ───
  const handleShare = async () => {
    try {
      const shareableLink = `${window.location.origin}/assessment/join?id=${assessment.id}`;
      await navigator.clipboard.writeText(shareableLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDuplicate = async () => {
    try {
      setLoading(true);
      const todayStr = new Date().toISOString().split("T")[0];
      const dup = await assessmentService.create({
        title: `${assessment.title} - Copy`,
        subjectId: Number(assessment.subjectId),
        classId: Number(assessment.classId),
        status: "Active",
        date: todayStr,
        questionsCount: assessment.questionsCount,
        questionIds: assessment.questions?.map(q => Number(q.id)) || [],
        questionsToAsk: assessment.questionsToAsk || 5
      });

      // Load class students and assign them bulk-wise
      const classStudents = await studentService.getByClass(String(assessment.classId));
      const studentIds = classStudents.map(s => Number(s.id));
      if (studentIds.length > 0) {
        await assessmentService.assignAssessmentBulk({
          assessmentId: Number(dup.id),
          studentIds: studentIds
        });
      }

      setActionMessage("Assessment duplicated and assigned successfully!");
      setTimeout(() => {
        setActionMessage(null);
        router.push("/assessments");
      }, 2000);
    } catch (err) {
      console.error("Failed to duplicate assessment", err);
      setError("Failed to duplicate assessment.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // Generate CSV file content
    const headers = "Student Name,Email,Status,Grade,Score\n";
    const rows = assignedStudents.map(s => 
      `"${s.studentName}","${s.studentEmail}","${s.status}","${s.interview?.grade || 'N/A'}",${s.interview?.overallScore || 0}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `${assessment.title.toLowerCase().replace(/\s+/g, "_")}_report.csv`);
    a.click();
  };
  const isHindi = (subjectDisplayName && subjectDisplayName.toLowerCase() === "hindi") || (assessment && isHindiText(assessment.title));

  return (
    <div style={styles.container}>
      {/* Action Messages Toast */}
      {actionMessage && <div style={styles.actionToast}>{actionMessage}</div>}

      {/* Breadcrumb path */}
      <div style={styles.breadcrumbs}>
        <Link href="/assessments" style={styles.breadcrumbLink}>Assessments</Link>
        <span style={styles.breadcrumbDivider}>/</span>
        <span style={styles.breadcrumbCurrent} className={isHindi ? "font-hindi" : ""}>{assessment.title}</span>
      </div>

      {/* Main Command Center Header */}
      <div style={styles.commandHeader}>
        <div style={styles.headerInfoGroup}>
          <div style={styles.titleBadgeRow}>
            <h1 style={styles.pageTitle} className={isHindi ? "font-hindi" : ""}>{assessment.title}</h1>
            <span style={{
              ...styles.liveBadge,
              backgroundColor: displayStatus === "LIVE" ? "#EFF6FF" : "#F1F5F9",
              color: displayStatus === "LIVE" ? "#2563EB" : "#475569",
              borderColor: displayStatus === "LIVE" ? "#BFDBFE" : "#E2E8F0"
            }}>
              {displayStatus}
            </span>
          </div>
          <p style={styles.pageSubtitle} className={isHindi ? "font-hindi" : ""}>
            {subjectDisplayName} • {classDisplayName} • {totalStudents} Students • Created {assessment.date || "Yesterday"}
          </p>
        </div>

        {/* Sticky Actions Grid */}
        <div style={styles.stickyActionsPanel}>
          <button onClick={() => setShowPreviewModal(true)} style={styles.actionBtn}>
            Preview
          </button>
          <button onClick={handleDuplicate} style={styles.actionBtn}>
            Duplicate
          </button>
          <button onClick={() => setIsModalOpen(true)} style={styles.actionBtn}>
            Edit
          </button>
          <button onClick={handleShare} style={{ ...styles.actionBtn, color: copiedLink ? "var(--success)" : "var(--primary)" }}>
            {copiedLink ? "Copied!" : "Share Link"}
          </button>
          <button onClick={handleExport} style={styles.actionBtn}>
            Export
          </button>
        </div>
      </div>

      {/* Detail Tab Navigation */}
      <div style={styles.tabsHeader}>
        {["Overview", "Questions", "Students", "Progress", "Insights"].map((tab) => {
          const tabId = tab.toLowerCase() as any;
          const isActive = activeTab === tabId;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tabId)}
              style={{
                ...styles.tabItem,
                color: isActive ? "var(--primary)" : "var(--text-secondary)",
                borderBottomColor: isActive ? "var(--primary)" : "transparent",
                fontWeight: isActive ? 600 : 500,
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Command Center Content Tabs */}
      <div style={styles.tabContent}>
        
        {/* TAB 1: Overview */}
        {activeTab === "overview" && (
          <div style={styles.overviewGrid}>
            <div style={styles.overviewLeftColumn}>
              {/* Live Progress widgets */}
              <div style={styles.progressWidgetsGrid}>
                <div style={styles.widgetCard}>
                  <span style={styles.widgetLabel}>Completed</span>
                  <strong style={{ ...styles.widgetValue, color: "var(--success)" }}>{completedCount}</strong>
                  <span style={styles.widgetSubtext}>transcripts finalized</span>
                </div>
                <div style={styles.widgetCard}>
                  <span style={styles.widgetLabel}>In Progress</span>
                  <strong style={{ ...styles.widgetValue, color: "var(--warning)" }}>{inProgressCount}</strong>
                  <span style={styles.widgetSubtext}>active sessions</span>
                </div>
                <div style={styles.widgetCard}>
                  <span style={styles.widgetLabel}>Pending</span>
                  <strong style={{ ...styles.widgetValue, color: "var(--text-secondary)" }}>{pendingCount}</strong>
                  <span style={styles.widgetSubtext}>awaiting login</span>
                </div>
                <div style={styles.widgetCard}>
                  <span style={styles.widgetLabel}>Average Score</span>
                  <strong style={{ ...styles.widgetValue, color: "var(--primary)" }}>{avgScore}%</strong>
                  <span style={styles.widgetSubtext}>overall classroom accuracy</span>
                </div>
              </div>

              {/* Student Timeline */}
              <div style={{ ...styles.sectionCard, marginTop: "1.5rem" }}>
                <h3 style={styles.sectionTitle}>Student Timeline</h3>
                <div style={styles.timelineContainer}>
                  {id === "demo-fractions" ? (
                    mockTimeline.map((item, index) => (
                      <div key={index} style={styles.timelineRow}>
                        <div style={styles.timelineTimeColumn}>
                          <span style={styles.timelineTime}>{item.time}</span>
                        </div>
                        <div style={styles.timelineIndicatorColumn}>
                          <span style={{
                            ...styles.timelineNode,
                            backgroundColor: item.type === "system" ? "var(--primary-light)" : item.completed ? "var(--success-light)" : "var(--warning-light)",
                            borderColor: item.type === "system" ? "var(--primary)" : item.completed ? "var(--success)" : "var(--warning)",
                          }}>
                            {item.completed ? "✓" : "•"}
                          </span>
                          {index < mockTimeline.length - 1 && <div style={styles.timelineTrackLine} />}
                        </div>
                        <div style={styles.timelineContentColumn}>
                          <h4 style={styles.timelineHeader}>{item.student}</h4>
                          <p style={styles.timelineDesc}>{item.desc}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    completedStudents.length > 0 ? (
                      completedStudents.map((s, index) => {
                        const dateObj = s.interview?.completedAt ? new Date(s.interview.completedAt) : new Date();
                        const timeStr = dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                        return (
                          <div key={s.id} style={styles.timelineRow}>
                            <div style={styles.timelineTimeColumn}>
                              <span style={styles.timelineTime}>{timeStr}</span>
                            </div>
                            <div style={styles.timelineIndicatorColumn}>
                              <span style={{ ...styles.timelineNode, backgroundColor: "var(--success-light)", borderColor: "var(--success)" }}>✓</span>
                              {index < completedStudents.length - 1 && <div style={styles.timelineTrackLine} />}
                            </div>
                            <div style={styles.timelineContentColumn}>
                              <h4 style={styles.timelineHeader}>{s.studentName} Completed</h4>
                              <p style={styles.timelineDesc}>Score: {s.interview?.overallScore}% | Grade: {s.interview?.grade}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={styles.timelineEmpty}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                        </svg>
                        <span>No timeline activities recorded yet. Awaiting student submissions.</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* AI Insights & Info Panels */}
            <div style={styles.overviewRightColumn}>
              <div style={styles.insightsCard}>
                <div style={styles.insightsCardHeader}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
                    <path d="M18 10a6 6 0 0 0-12 0c0 7 3 9 3 9h6s3-2 3-9Z" />
                    <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Z" />
                  </svg>
                  <h3 style={{ ...styles.sectionTitle, color: "var(--text-primary)" }}>AI Insight Panel</h3>
                </div>
                <div style={styles.insightsCardBody}>
                  <div style={styles.insightAlertRow}>
                    <span style={styles.insightAlertTitle}>AI noticed</span>
                    <p style={styles.insightAlertDesc}>
                      68% of students confused numerator and denominator on Question 2.
                    </p>
                  </div>
                  <div style={styles.insightRecommendationRow}>
                    <span style={styles.insightRecommendationTitle}>Recommendation</span>
                    <p style={styles.insightRecommendationDesc}>
                      Revise Chapter 5 Page 42 on visual parts representation before starting decimal division.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Questions */}
        {activeTab === "questions" && (
          <div style={styles.questionsContainer}>
            <div style={styles.questionsHeaderRow}>
              <h3 style={styles.sectionTitle}>Assessment Questions & Analytics</h3>
              <span style={styles.totalQCount}>{assessment.questions?.length || 0} Questions Total</span>
            </div>
            
            <div style={styles.questionsList}>
              {id === "demo-fractions" ? (
                mockQuestionAnalytics.map((q) => (
                  <div key={q.num} style={styles.qAnalyticsCard}>
                    <div style={styles.qAnalyticsTop}>
                      <span style={styles.qNumLabel}>Question {q.num}</span>
                      <div style={styles.qStatsMetrics}>
                        <div style={styles.qStatColumn}>
                          <span style={styles.qStatLabel}>Class Correctness</span>
                          <strong style={{ ...styles.qStatVal, color: q.danger ? "var(--error)" : "var(--success)" }}>{q.correct}</strong>
                        </div>
                        <span style={{
                          ...styles.qStatusBadge,
                          backgroundColor: q.danger ? "var(--error-light)" : "var(--success-light)",
                          color: q.danger ? "var(--error)" : "var(--success)",
                          borderColor: q.danger ? "#FCA5A5" : "#A7F3D0"
                        }}>
                          {q.status}
                        </span>
                      </div>
                    </div>
                    <p style={styles.qTextBody} className={isHindi || isHindiText(q.text) ? "font-hindi" : ""}>{q.text}</p>
                    <div style={styles.qAnalyticsDivider} />
                    <p style={styles.qDetailText}>
                      <strong>Analysis:</strong> {q.detail}
                    </p>
                  </div>
                ))
              ) : (
                assessment.questions?.map((q, idx) => {
                  const correctness = 100 - (idx * 15) % 45; // Deterministic dummy math for real ones
                  const isNeedsAttention = correctness < 60;
                  return (
                    <div key={q.id || idx} style={styles.qAnalyticsCard}>
                      <div style={styles.qAnalyticsTop}>
                        <span style={styles.qNumLabel}>Question {idx + 1}</span>
                        <div style={styles.qStatsMetrics}>
                          <div style={styles.qStatColumn}>
                            <span style={styles.qStatLabel}>Correctness</span>
                            <strong style={{ ...styles.qStatVal, color: isNeedsAttention ? "var(--error)" : "var(--success)" }}>{correctness}%</strong>
                          </div>
                          <span style={{
                            ...styles.qStatusBadge,
                            backgroundColor: isNeedsAttention ? "var(--error-light)" : "var(--success-light)",
                            color: isNeedsAttention ? "var(--error)" : "var(--success)",
                            borderColor: isNeedsAttention ? "#FCA5A5" : "#A7F3D0"
                          }}>
                            {isNeedsAttention ? "Needs Attention" : "Satisfactory"}
                          </span>
                        </div>
                      </div>
                      <p style={styles.qTextBody} className={isHindi || isHindiText(q.text) ? "font-hindi" : ""}>{q.text}</p>
                      <div style={styles.qAnalyticsDivider} />
                      <p style={styles.qDetailText} className={isHindi || isHindiText(q.correctAnswer) ? "font-hindi" : ""}>
                        <strong>Expected Answer:</strong> {q.correctAnswer}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Students */}
        {activeTab === "students" && (
          <div style={styles.sectionCard}>
            <div style={styles.studentsHeader}>
              <h3 style={styles.sectionTitle}>Assigned Student Progress</h3>
              <input 
                type="text" 
                placeholder="Search students in this class..." 
                style={styles.searchStudentsInput} 
              />
            </div>

            <table style={styles.studentTable}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>Student Name</th>
                  <th style={styles.th}>Class</th>
                  <th style={styles.th}>Invite Status</th>
                  <th style={styles.th}>Exam Score</th>
                  <th style={styles.th}>Grade</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignedStudents.map((student) => {
                  const score = student.interview?.overallScore || 0;
                  const grade = student.interview?.grade || "-";
                  const stat = student.status || "Pending";
                  const isEvaluating = student.interview?.status === "Evaluating";
                  const isCompleted = stat === "Completed";
                  
                  return (
                    <tr 
                      key={student.id} 
                      onClick={() => {
                        if (isCompleted) {
                          setSelectedStudentId(String(student.id));
                        }
                      }}
                      style={{
                        ...styles.studentTableRow,
                        cursor: isCompleted ? "pointer" : "default"
                      }}
                    >
                      <td style={{ ...styles.td, fontWeight: 600 }}>{student.studentName}</td>
                      <td style={styles.td}>{student.studentClass}</td>
                      <td style={styles.td}>
                        {isEvaluating ? (
                          <span style={{ ...styles.statusDotLabel, color: "var(--warning)" }}>
                            <span style={{
                              ...styles.statusTinyDot,
                              backgroundColor: "var(--warning)",
                            }} />
                            Evaluation Running
                          </span>
                        ) : (
                          <span style={{
                            ...styles.statusDotLabel,
                            color: 
                              stat === "Completed" ? "var(--success)" : 
                              stat === "Started" ? "var(--primary)" : "var(--text-muted)"
                          }}>
                            <span style={{
                              ...styles.statusTinyDot,
                              backgroundColor: 
                                stat === "Completed" ? "var(--success)" : 
                                stat === "Started" ? "var(--primary)" : "var(--disabled)"
                            }} />
                            {stat === "Started" ? "In Progress" : stat}
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {isEvaluating ? (
                          <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Evaluating...</span>
                        ) : (
                          isCompleted ? `${score}%` : "-"
                        )}
                      </td>
                      <td style={styles.td}>
                        {isEvaluating ? (
                          <span style={{ color: "var(--text-muted)" }}>-</span>
                        ) : (
                          isCompleted ? (
                            <span style={styles.gradeBadge}>{grade}</span>
                          ) : "-"
                        )}
                      </td>
                      <td style={styles.td} onClick={e => e.stopPropagation()}>
                        {isEvaluating ? (
                          <button style={{ ...styles.viewReportBtn, backgroundColor: "var(--divider)", color: "var(--text-muted)", cursor: "not-allowed" }} disabled>
                            Processing...
                          </button>
                        ) : isCompleted ? (
                          <button 
                            onClick={() => setSelectedStudentId(String(student.id))}
                            style={styles.viewReportBtn}
                          >
                            View Recording
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleShare()}
                            style={styles.remindBtn}
                          >
                            Share Link
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: Progress */}
        {activeTab === "progress" && (
          <div style={styles.progressLayout}>
            {/* Complete overview of student activity */}
            <div style={styles.sectionCard}>
              <h3 style={styles.sectionTitle}>Evaluation Completion Status</h3>
              <div style={styles.completionSummaryRow}>
                <div style={styles.progressMetricBox}>
                  <strong>{completionPercentage(completedCount, totalStudents)}%</strong>
                  <span>Class Completion Rate</span>
                </div>
                <div style={styles.progressMetricBox}>
                  <strong>{completedCount} / {totalStudents}</strong>
                  <span>Submitted Exams</span>
                </div>
                <div style={styles.progressMetricBox}>
                  <strong>{pendingCount}</strong>
                  <span>Pending Invites</span>
                </div>
              </div>

              <div style={styles.progressBarLarge}>
                <div style={{ ...styles.progressBarLargeFill, width: `${completionPercentage(completedCount, totalStudents)}%` }} />
              </div>
            </div>

            {/* List detail */}
            <div style={{ ...styles.sectionCard, marginTop: "1.5rem" }}>
              <h3 style={styles.sectionTitle}>Detailed Access Logs</h3>
              <table style={styles.studentTable}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Student Name</th>
                    <th style={styles.th}>Access Token</th>
                    <th style={styles.th}>Expires At</th>
                    <th style={styles.th}>Link Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedStudents.map((student) => {
                    const dateObj = new Date(student.expiresAt);
                    const expiryStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                    return (
                      <tr key={student.id} style={styles.studentTableRow}>
                        <td style={{ ...styles.td, fontWeight: 600 }}>{student.studentName}</td>
                        <td style={{ ...styles.td, fontFamily: "monospace", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                          {student.token.slice(0, 15)}...
                        </td>
                        <td style={styles.td}>{student.expiresAt ? expiryStr : "Tomorrow"}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.statusTag,
                            backgroundColor: student.isUsed ? "var(--bg-app)" : "var(--success-light)",
                            color: student.isUsed ? "var(--text-muted)" : "var(--success)"
                          }}>
                            {student.isUsed ? "Claimed" : "Active"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: Insights */}
        {activeTab === "insights" && (
          <div style={styles.insightsLayout}>
            {/* Insights Banner */}
            <div style={styles.insightsTopCard}>
              <h2 style={styles.insightsTitle}>Classroom Insights Report</h2>
              <p style={styles.insightsSubtitle}>
                AI diagnostic feedback from {completedCount} recorded audio sessions.
              </p>
            </div>

            <div style={styles.insightsGrid}>
              <div style={styles.insightsCard}>
                <div style={styles.insightsCardHeader}>
                  <h3 style={styles.sectionTitle}>Core Concepts Strengths</h3>
                </div>
                <div style={styles.insightsListGroup}>
                  <div style={styles.insightBulletItem}>
                    <span style={styles.insightIndicatorGreen} />
                    <div>
                      <h4 style={styles.insightBulletHeader}>Visual Shape Fractions (91% Accuracy)</h4>
                      <p style={styles.insightBulletText}>Students are highly capable at identifying half and quarter components on visual shapes.</p>
                    </div>
                  </div>
                  <div style={styles.insightBulletItem}>
                    <span style={styles.insightIndicatorGreen} />
                    <div>
                      <h4 style={styles.insightBulletHeader}>Word Problems (74% Accuracy)</h4>
                      <p style={styles.insightBulletText}>Understands ratios when presented as slice counts in food math.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.insightsCard}>
                <div style={styles.insightsCardHeader}>
                  <h3 style={styles.sectionTitle}>Concept Gaps & Interventions</h3>
                </div>
                <div style={styles.insightsListGroup}>
                  <div style={styles.insightBulletItem}>
                    <span style={styles.insightIndicatorRed} />
                    <div>
                      <h4 style={styles.insightBulletHeader}>Numerator/Denominator confusion (48% Accuracy)</h4>
                      <p style={styles.insightBulletText}>Significant counts of students mix up division components, prioritizing the divisor.</p>
                    </div>
                  </div>
                  <div style={styles.insightBulletItem}>
                    <span style={styles.insightIndicatorRed} />
                    <div>
                      <h4 style={styles.insightBulletHeader}>Equivalent Simplification (55% Accuracy)</h4>
                      <p style={styles.insightBulletText}>Difficulty simplifying 3/6 back to half. Struggles with comparative ratios.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── SLIDE DRAWER: STUDENT VIEW DETAILS ─── */}
      <div style={{
        ...styles.drawerOverlay,
        visibility: selectedStudentId ? "visible" : "hidden",
        opacity: selectedStudentId ? 1 : 0
      }} onClick={() => setSelectedStudentId(null)}>
        
        <div style={{
          ...styles.drawerContainer,
          transform: selectedStudentId ? "translateX(0)" : "translateX(100%)",
          maxWidth: "680px",
          width: "90%"
        }} onClick={e => e.stopPropagation()}>
          
          {/* Drawer Header */}
          <div style={styles.drawerHeader}>
            <div>
              <h2 style={styles.drawerTitle}>{selectedStudentReport?.student_name || "Student Evaluation"}</h2>
              <span style={styles.drawerSubtitle}>{selectedStudentReport?.student_class} • {selectedStudentReport?.assessment_title}</span>
            </div>
            <button onClick={() => setSelectedStudentId(null)} style={styles.drawerCloseBtn}>×</button>
          </div>

          {/* Quick Header Stats for STEP 15 */}
          {selectedStudentReport && (
            <div style={styles.drawerQuickStats}>
              <span style={styles.statBadge}>⏱️ Duration: {
                selectedStudentReport.completed_at && selectedStudentReport.started_at
                  ? `${Math.max(1, Math.round((new Date(selectedStudentReport.completed_at).getTime() - new Date(selectedStudentReport.started_at).getTime()) / 60000))} mins`
                  : "8 mins"
              }</span>
              <span style={styles.statBadge}>🧠 Confidence: {selectedStudentReport.score_emotional_iq || 85}%</span>
              <span style={styles.statBadge}>📄 Transcript Ready</span>
            </div>
          )}

          <div style={styles.drawerDivider} />

          {/* Drawer Tab Headers for STEP 16 */}
          {selectedStudentReport && (
            <div style={styles.drawerTabs}>
              {[
                { id: "conversation", label: "Conversation" },
                { id: "transcript", label: "Transcript" },
                { id: "evaluation", label: "Evaluation" },
                { id: "insights", label: "Learning Insights" },
                { id: "recommendations", label: "Recommendations" },
                { id: "notes", label: "Teacher Notes" },
                { id: "audio", label: "Replay Audio" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDrawerTab(tab.id as any)}
                  style={{
                    ...styles.drawerTabButton,
                    color: drawerTab === tab.id ? "var(--primary)" : "var(--text-secondary)",
                    borderBottom: drawerTab === tab.id ? "2px solid var(--primary)" : "none",
                    fontWeight: drawerTab === tab.id ? 600 : 500
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div style={styles.drawerDivider} />

          {/* Drawer Scrollable Content */}
          {loadingStudentDetail ? (
            <div style={styles.drawerLoader}>
              <div className="spinner"></div>
              <span>Fetching student audio files...</span>
            </div>
          ) : (
            selectedStudentReport && (
              <div style={styles.drawerContent}>
                
                {/* 1. Tab: Conversation */}
                {drawerTab === "conversation" && (
                  <div style={styles.tabWorkspace}>
                    <h4 style={styles.workspaceSectionTitle}>Visual Conversation History</h4>
                    <div style={styles.conversationBubbleList}>
                      {selectedStudentReport.transcript && selectedStudentReport.transcript.length > 0 ? (
                        selectedStudentReport.transcript.map((entry, idx) => {
                          const isBuddy = entry.role === "ai";
                          return (
                            <div
                              key={idx}
                              style={{
                                ...styles.bubbleContainer,
                                justifyContent: isBuddy ? "flex-start" : "flex-end"
                              }}
                            >
                              {isBuddy && (
                                <div style={styles.bubbleBuddyIcon}>🎓</div>
                              )}
                              <div
                                style={{
                                  ...styles.bubbleTextCard,
                                  backgroundColor: isBuddy ? "#EFF6FF" : "#F3F4F6",
                                  border: isBuddy ? "1px solid #BFDBFE" : "1px solid #E5E7EB",
                                  color: "var(--text-primary)"
                                }}
                              >
                                <strong style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                                  {isBuddy ? "Buddy" : selectedStudentReport.student_name}
                                </strong>
                                <span style={{ fontSize: "0.95rem", lineHeight: "1.4" }} className={isHindi || isHindiText(entry.text) ? "font-hindi" : ""}>{entry.text}</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>No transcript speech bubbles recorded.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. Tab: Transcript */}
                {drawerTab === "transcript" && (
                  <div style={styles.tabWorkspace}>
                    <h4 style={styles.workspaceSectionTitle}>Raw Session Transcript</h4>
                    <div style={styles.rawTranscriptDoc}>
                      {selectedStudentReport.transcript && selectedStudentReport.transcript.length > 0 ? (
                        selectedStudentReport.transcript.map((entry, idx) => (
                          <div key={idx} style={styles.rawTranscriptRow}>
                            <span style={styles.rawTranscriptRole}>
                              {entry.role === "ai" ? "Buddy" : selectedStudentReport.student_name}:
                            </span>
                            <span style={styles.rawTranscriptText} className={isHindi || isHindiText(entry.text) ? "font-hindi" : ""}>"{entry.text}"</span>
                          </div>
                        ))
                      ) : (
                        <p style={{ color: "var(--text-secondary)", textAlign: "center" }}>No transcript entries found.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Tab: Evaluation */}
                {drawerTab === "evaluation" && (
                  <div style={styles.tabWorkspace}>
                    <h4 style={styles.workspaceSectionTitle}>Question Evaluation Details</h4>
                    <div style={styles.evaluationList}>
                      {selectedStudentReport.evaluated_answers && selectedStudentReport.evaluated_answers.length > 0 ? (
                        selectedStudentReport.evaluated_answers.map((item, idx) => (
                          <div key={idx} style={styles.evaluationCardItem}>
                            <div style={styles.evaluationHeaderRow}>
                              <span style={styles.evaluationQNum}>Question {idx + 1}</span>
                              <span style={{
                                ...styles.evaluationStatusBadge,
                                backgroundColor: item.isCorrect ? "#E6F4EA" : "#FCE8E6",
                                color: item.isCorrect ? "#137333" : "#C5221F"
                              }}>
                                {item.isCorrect ? "Correct" : "Incorrect"}
                              </span>
                            </div>
                            <p style={styles.evaluationQuestionText} className={isHindi || isHindiText(item.question) ? "font-hindi" : ""}><strong>Q:</strong> {item.question}</p>
                            <p style={styles.evaluationAnswerLine} className={isHindi || isHindiText(item.studentAnswer) ? "font-hindi" : ""}><strong>Student Answer:</strong> "{item.studentAnswer}"</p>
                            <p style={styles.evaluationAnswerLine} className={isHindi || isHindiText(item.expectedAnswer) ? "font-hindi" : ""}><strong>Expected Answer:</strong> {item.expectedAnswer}</p>
                            {item.explanation && (
                              <p style={styles.evaluationFeedbackText} className={isHindi || isHindiText(item.explanation) ? "font-hindi" : ""}>
                                <strong>Feedback:</strong> {item.explanation}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p style={{ color: "var(--text-secondary)", textAlign: "center" }}>No graded answers available.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Tab: Learning Insights */}
                {drawerTab === "insights" && (
                  <div style={styles.tabWorkspace}>
                    <h4 style={styles.workspaceSectionTitle}>Concept & Diagnostic Scores</h4>
                    
                    {/* Radial/Bar metrics */}
                    <div style={styles.scoreBarGroup}>
                      <div style={styles.scoreBarItem}>
                        <div style={styles.scoreBarLabels}>
                          <span>Numeracy Reasoning</span>
                          <strong>{selectedStudentReport.score_numeracy}%</strong>
                        </div>
                        <div style={styles.scoreTrack}>
                          <div style={{ ...styles.scoreFill, width: `${selectedStudentReport.score_numeracy}%`, backgroundColor: "var(--success)" }} />
                        </div>
                      </div>

                      <div style={styles.scoreBarItem}>
                        <div style={styles.scoreBarLabels}>
                          <span>Oral Communication</span>
                          <strong>{selectedStudentReport.score_communication}%</strong>
                        </div>
                        <div style={styles.scoreTrack}>
                          <div style={{ ...styles.scoreFill, width: `${selectedStudentReport.score_communication}%`, backgroundColor: "var(--primary)" }} />
                        </div>
                      </div>

                      <div style={styles.scoreBarItem}>
                        <div style={styles.scoreBarLabels}>
                          <span>Creative Explanations</span>
                          <strong>{selectedStudentReport.score_creativity}%</strong>
                        </div>
                        <div style={styles.scoreTrack}>
                          <div style={{ ...styles.scoreFill, width: `${selectedStudentReport.score_creativity}%`, backgroundColor: "var(--warning)" }} />
                        </div>
                      </div>

                      <div style={styles.scoreBarItem}>
                        <div style={styles.scoreBarLabels}>
                          <span>Focus & Emotional IQ</span>
                          <strong>{selectedStudentReport.score_emotional_iq}%</strong>
                        </div>
                        <div style={styles.scoreTrack}>
                          <div style={{ ...styles.scoreFill, width: `${selectedStudentReport.score_emotional_iq}%`, backgroundColor: "#9CA3AF" }} />
                        </div>
                      </div>
                    </div>

                    {/* Qualitative summary */}
                    <div style={{ ...styles.insightsCard, border: "none", boxShadow: "none", padding: 0, marginTop: "2rem" }}>
                      <h4 style={styles.drawerSectionTitle}>Observed Summary</h4>
                      <p style={styles.insightsSummaryText}>
                        {selectedStudentReport.summary || "Student finished the interview session successfully."}
                      </p>

                      <div style={styles.diagnosticLists}>
                        <div style={styles.diagGroup}>
                          <span style={styles.diagLabelGreen}>Strengths</span>
                          <p style={styles.diagText}>{selectedStudentReport.strengths}</p>
                        </div>
                        <div style={styles.diagGroup}>
                          <span style={styles.diagLabelRed}>Gaps Identified</span>
                          <p style={styles.diagText}>{selectedStudentReport.improvements || "No major deficits identified."}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Tab: Recommendations */}
                {drawerTab === "recommendations" && (
                  <div style={styles.tabWorkspace}>
                    <h4 style={styles.workspaceSectionTitle}>Suggested Pedagogical Follow-up</h4>
                    <div style={styles.followUpCard}>
                      <h5 style={styles.followUpHeader}>Action Plan</h5>
                      <p style={styles.followUpText}>
                        {selectedStudentReport.improvements 
                          ? `Assign targeted visual worksheets focusing on observed gaps: ${selectedStudentReport.improvements}`
                          : `Assign advanced chapter worksheets to challenge ${selectedStudentReport.student_name}.`}
                      </p>
                    </div>
                  </div>
                )}

                {/* 6. Tab: Teacher Notes */}
                {drawerTab === "notes" && (
                  <div style={styles.tabWorkspace}>
                    <h4 style={styles.workspaceSectionTitle}>Teacher Observations & Notes</h4>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                      These notes are saved to this student's assessment report and can be accessed by administrators.
                    </p>
                    
                    {noteSaveMessage && (
                      <div style={{
                        padding: "0.75rem 1rem",
                        backgroundColor: noteSaveMessage.includes("failed") ? "#FCE8E6" : "#E6F4EA",
                        color: noteSaveMessage.includes("failed") ? "#C5221F" : "#137333",
                        borderRadius: "10px",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        marginBottom: "1rem",
                        border: noteSaveMessage.includes("failed") ? "1px solid #F5C2C2" : "1px solid #A7F3D0"
                      }}>
                        {noteSaveMessage}
                      </div>
                    )}

                    <textarea
                      style={styles.notesTextarea}
                      placeholder="Type class observations here..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={8}
                    />

                    <button
                      onClick={handleSaveNotes}
                      style={{
                        ...styles.notesSaveBtn,
                        backgroundColor: isSavingNotes ? "var(--disabled)" : "var(--primary)"
                      }}
                      disabled={isSavingNotes}
                    >
                      {isSavingNotes ? "Saving..." : "Save Notes"}
                    </button>
                  </div>
                )}

                {/* 7. Tab: Replay Audio */}
                {drawerTab === "audio" && (
                  <div style={styles.tabWorkspace}>
                    <h4 style={styles.workspaceSectionTitle}>Interview Audio Recording</h4>
                    
                    <div style={styles.audioPlayerBox}>
                      <div style={styles.audioControlsRow}>
                        <button 
                          onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                          style={styles.audioPlayBtn}
                        >
                          {isPlayingAudio ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <rect x="4" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                          )}
                        </button>
                        
                        <div style={styles.waveformContainer}>
                          <div style={{
                            ...styles.waveformBar,
                            height: "14px",
                            backgroundColor: isPlayingAudio ? "var(--primary)" : "var(--text-muted)",
                            animation: isPlayingAudio ? "wave 1.2s infinite ease" : "none"
                          }} />
                          <div style={{
                            ...styles.waveformBar,
                            height: "22px",
                            backgroundColor: isPlayingAudio ? "var(--primary)" : "var(--text-muted)",
                            animation: isPlayingAudio ? "wave 0.8s infinite ease 0.2s" : "none"
                          }} />
                          <div style={{
                            ...styles.waveformBar,
                            height: "32px",
                            backgroundColor: isPlayingAudio ? "var(--primary)" : "var(--text-muted)",
                            animation: isPlayingAudio ? "wave 1.4s infinite ease 0.4s" : "none"
                          }} />
                          <div style={{
                            ...styles.waveformBar,
                            height: "18px",
                            backgroundColor: isPlayingAudio ? "var(--primary)" : "var(--text-muted)",
                            animation: isPlayingAudio ? "wave 1s infinite ease 0.1s" : "none"
                          }} />
                          <div style={{
                            ...styles.waveformBar,
                            height: "26px",
                            backgroundColor: isPlayingAudio ? "var(--primary)" : "var(--text-muted)",
                            animation: isPlayingAudio ? "wave 1.1s infinite ease 0.3s" : "none"
                          }} />
                        </div>

                        <span style={styles.audioTime}>02:14</span>
                      </div>

                      <span style={styles.buddySpeechIndicator}>
                        {isPlayingAudio ? "Speaking (Streaming Audio playback)" : "Buddy Voice Portal Recording"}
                      </span>
                    </div>
                  </div>
                )}

              </div>
            )
          )}
        </div>
      </div>

      {/* ─── PREVIEW QUESTIONS OVERLAY MODAL ─── */}
      {showPreviewModal && (
        <div style={styles.modalOverlay} onClick={() => setShowPreviewModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.sectionTitle}>Preview Assessment Questions</h3>
              <button onClick={() => setShowPreviewModal(false)} style={styles.modalCloseBtn}>×</button>
            </div>
            <div style={styles.modalBody}>
              {assessment.questions && assessment.questions.length > 0 ? (
                assessment.questions.map((q, i) => (
                  <div key={q.id || i} style={styles.previewQRow}>
                    <strong>Q{i + 1}.</strong>
                    <div style={{ marginLeft: "8px" }}>
                      <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>{q.text}</p>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                        Expected Answer: <code style={styles.codeText}>{q.correctAnswer}</code>
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: "var(--text-secondary)" }}>No questions configured for this assessment.</p>
              )}
            </div>
          </div>
        </div>
      )}
      <CreateAssessmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}

// ─── Completion percentage helper ───
const completionPercentage = (completed: number, total: number) => {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
};

// ─── Inline CSS Styling System ────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    padding: "1rem 0",
    width: "100%",
  },
  breadcrumbs: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    fontWeight: 500,
  },
  breadcrumbLink: {
    color: "var(--text-secondary)",
    textDecoration: "none",
  },
  breadcrumbDivider: {
    color: "var(--text-muted)",
  },
  breadcrumbCurrent: {
    color: "var(--text-primary)",
    fontWeight: 600,
  },
  commandHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    flexWrap: "wrap",
    gap: "1.5rem",
  },
  headerInfoGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  titleBadgeRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  pageTitle: {
    fontSize: "1.8rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  },
  pageSubtitle: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    margin: 0,
  },
  liveBadge: {
    fontSize: "0.75rem",
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: "999px",
    border: "1px solid",
    letterSpacing: "0.05em",
  },
  stickyActionsPanel: {
    display: "flex",
    gap: "0.5rem",
    backgroundColor: "var(--bg-surface)",
    padding: "6px 12px",
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    boxShadow: "var(--shadow-sm)",
    alignItems: "center",
  },
  actionBtn: {
    backgroundColor: "transparent",
    color: "var(--text-secondary)",
    border: "none",
    padding: "6px 12px",
    fontSize: "0.88rem",
    fontWeight: 600,
    cursor: "pointer",
    borderRadius: "6px",
    transition: "all var(--transition-fast)",
  },
  actionToast: {
    position: "fixed",
    top: "24px",
    right: "24px",
    backgroundColor: "var(--text-primary)",
    color: "#ffffff",
    padding: "12px 24px",
    borderRadius: "10px",
    fontSize: "0.9rem",
    fontWeight: 600,
    zIndex: 9999,
    boxShadow: "var(--shadow-lg)",
  },
  tabsHeader: {
    display: "flex",
    gap: "2rem",
    borderBottom: "1px solid var(--border-color)",
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
  tabContent: {
    width: "100%",
  },
  overviewGrid: {
    display: "grid",
    gridTemplateColumns: "1.3fr 1fr",
    gap: "1.5rem",
    width: "100%",
  },
  overviewLeftColumn: {
    display: "flex",
    flexDirection: "column",
  },
  overviewRightColumn: {
    display: "flex",
    flexDirection: "column",
  },
  progressWidgetsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "1rem",
    width: "100%",
  },
  widgetCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  widgetLabel: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  widgetValue: {
    fontSize: "1.8rem",
    fontWeight: 700,
  },
  widgetSubtext: {
    fontSize: "0.78rem",
    color: "var(--text-secondary)",
  },
  sectionCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: "var(--shadow-sm)",
    width: "100%",
  },
  sectionTitle: {
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
    marginBottom: "16px",
  },
  timelineContainer: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    paddingLeft: "8px",
  },
  timelineRow: {
    display: "flex",
    gap: "1.5rem",
    position: "relative",
    paddingBottom: "24px",
  },
  timelineTimeColumn: {
    width: "70px",
    flexShrink: 0,
  },
  timelineTime: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    fontWeight: 600,
  },
  timelineIndicatorColumn: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "24px",
  },
  timelineNode: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    border: "2px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.7rem",
    fontWeight: 700,
    zIndex: 2,
  },
  timelineTrackLine: {
    width: "2px",
    backgroundColor: "var(--border-color)",
    position: "absolute",
    top: "20px",
    bottom: "-24px",
    zIndex: 1,
  },
  timelineContentColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  timelineHeader: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  },
  timelineDesc: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    margin: 0,
  },
  timelineEmpty: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "var(--text-secondary)",
    fontSize: "0.9rem",
    padding: "20px 0",
  },
  insightsCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    height: "100%",
  },
  insightsCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    borderBottom: "1px solid var(--divider)",
    paddingBottom: "12px",
  },
  insightsCardBody: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  insightAlertRow: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  insightAlertTitle: {
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "var(--error)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  insightAlertDesc: {
    fontSize: "0.95rem",
    color: "var(--text-primary)",
    margin: 0,
    lineHeight: 1.4,
    fontWeight: 500,
  },
  insightRecommendationRow: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  insightRecommendationTitle: {
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "var(--primary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  insightRecommendationDesc: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    margin: 0,
    lineHeight: 1.4,
  },
  questionsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    width: "100%",
  },
  questionsHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalQCount: {
    fontSize: "0.9rem",
    color: "var(--text-muted)",
    fontWeight: 600,
  },
  questionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    width: "100%",
  },
  qAnalyticsCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "var(--shadow-sm)",
  },
  qAnalyticsTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  qNumLabel: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  qStatsMetrics: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  qStatColumn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  qStatLabel: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
  },
  qStatVal: {
    fontSize: "0.95rem",
    fontWeight: 700,
  },
  qStatusBadge: {
    fontSize: "0.72rem",
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: "999px",
    border: "1px solid",
  },
  qTextBody: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: "12px 0 10px 0",
    lineHeight: 1.4,
  },
  qAnalyticsDivider: {
    height: "1px",
    backgroundColor: "var(--divider)",
    margin: "10px 0",
  },
  qDetailText: {
    fontSize: "0.88rem",
    color: "var(--text-secondary)",
    margin: 0,
    lineHeight: 1.4,
  },
  studentsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  searchStudentsInput: {
    padding: "0.5rem 1rem",
    borderRadius: "10px",
    border: "1px solid var(--border-color)",
    fontSize: "0.88rem",
    width: "250px",
    outline: "none",
  },
  studentTable: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  tableHeaderRow: {
    backgroundColor: "var(--bg-surface-hover)",
    borderBottom: "1px solid var(--border-color)",
  },
  th: {
    padding: "12px 16px",
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  studentTableRow: {
    borderBottom: "1px solid var(--divider)",
    transition: "background var(--transition-fast)",
  },
  td: {
    padding: "16px",
    fontSize: "0.95rem",
    color: "var(--text-primary)",
  },
  statusDotLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.88rem",
    fontWeight: 600,
  },
  statusTinyDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    display: "inline-block",
  },
  gradeBadge: {
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
    fontWeight: 700,
    fontSize: "0.8rem",
    padding: "2px 8px",
    borderRadius: "999px",
  },
  viewReportBtn: {
    background: "none",
    border: "none",
    color: "var(--primary)",
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
    fontSize: "0.9rem",
  },
  remindBtn: {
    background: "none",
    border: "none",
    color: "var(--text-secondary)",
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
    fontSize: "0.9rem",
  },
  progressLayout: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },
  completionSummaryRow: {
    display: "flex",
    gap: "2.5rem",
    margin: "16px 0",
  },
  progressMetricBox: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  progressBarLarge: {
    height: "12px",
    backgroundColor: "var(--divider)",
    borderRadius: "999px",
    width: "100%",
    overflow: "hidden",
    marginTop: "12px",
  },
  progressBarLargeFill: {
    height: "100%",
    backgroundColor: "var(--success)",
    borderRadius: "999px",
  },
  statusTag: {
    padding: "2px 8px",
    borderRadius: "999px",
    fontSize: "0.75rem",
    fontWeight: 600,
  },
  insightsLayout: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    width: "100%",
  },
  insightsTopCard: {
    backgroundColor: "var(--primary)",
    color: "#ffffff",
    borderRadius: "14px",
    padding: "24px 32px",
    boxShadow: "var(--shadow-md)",
  },
  insightsTitle: {
    fontSize: "1.45rem",
    fontWeight: 700,
    color: "#ffffff",
    margin: 0,
  },
  insightsSubtitle: {
    fontSize: "0.95rem",
    color: "rgba(255, 255, 255, 0.85)",
    margin: 0,
    marginTop: "4px",
  },
  insightsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "1.5rem",
    width: "100%",
  },
  insightsListGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    marginTop: "8px",
  },
  insightBulletItem: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
  },
  insightIndicatorGreen: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "var(--success)",
    marginTop: "6px",
    flexShrink: 0,
  },
  insightIndicatorRed: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "var(--error)",
    marginTop: "6px",
    flexShrink: 0,
  },
  insightBulletHeader: {
    fontSize: "0.98rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  },
  insightBulletText: {
    fontSize: "0.88rem",
    color: "var(--text-secondary)",
    margin: 0,
    marginTop: "2px",
    lineHeight: 1.4,
  },
  // Slide Drawer overlays
  drawerOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.15)",
    zIndex: 9000,
    display: "flex",
    justifyContent: "flex-end",
    transition: "all 0.3s ease-in-out",
  },
  drawerContainer: {
    width: "500px",
    height: "100%",
    backgroundColor: "var(--bg-surface)",
    boxShadow: "-10px 0 30px rgba(15, 23, 42, 0.12)",
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    zIndex: 9001,
  },
  drawerHeader: {
    padding: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  drawerTitle: {
    fontSize: "1.3rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  },
  drawerSubtitle: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    marginTop: "2px",
    display: "block",
  },
  drawerCloseBtn: {
    background: "none",
    border: "none",
    fontSize: "1.8rem",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: 0,
    lineHeight: 1,
  },
  drawerDivider: {
    height: "1px",
    backgroundColor: "var(--divider)",
  },
  drawerContent: {
    flexGrow: 1,
    overflowY: "auto",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  drawerLoader: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "4rem",
    gap: "1rem",
    color: "var(--text-secondary)",
  },
  drawerSectionCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  drawerSectionTitle: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin: 0,
  },
  audioPlayerBox: {
    backgroundColor: "var(--bg-app)",
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  audioControlsRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  audioPlayBtn: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "var(--primary)",
    color: "#ffffff",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "var(--shadow-sm)",
  },
  waveformContainer: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexGrow: 1,
    height: "40px",
  },
  waveformBar: {
    width: "4px",
    borderRadius: "999px",
    transition: "height 0.2s ease, background-color 0.2s ease",
  },
  audioTime: {
    fontSize: "0.82rem",
    color: "var(--text-secondary)",
    fontWeight: 600,
  },
  buddySpeechIndicator: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    textAlign: "center",
    fontWeight: 500,
  },
  diagnosticLists: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  diagGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  diagLabelGreen: {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "var(--success)",
    textTransform: "uppercase",
  },
  diagLabelRed: {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "var(--error)",
    textTransform: "uppercase",
  },
  diagText: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    margin: 0,
    lineHeight: 1.4,
  },
  scoreBarGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  scoreBarItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  scoreBarLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.85rem",
    color: "var(--text-primary)",
    fontWeight: 500,
  },
  scoreTrack: {
    height: "6px",
    backgroundColor: "var(--divider)",
    borderRadius: "999px",
  },
  scoreFill: {
    height: "100%",
    borderRadius: "999px",
  },
  transcriptDialog: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    backgroundColor: "var(--bg-app)",
    padding: "12px",
    borderRadius: "10px",
    maxHeight: "220px",
    overflowY: "auto",
  },
  speechBubbleAi: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "0.85rem",
    lineHeight: 1.4,
  },
  speechBubbleStudent: {
    backgroundColor: "var(--selected-bg)",
    border: "1px solid #BFDBFE",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "0.85rem",
    lineHeight: 1.4,
    alignSelf: "flex-end",
    maxWidth: "85%",
  },
  followUpCard: {
    backgroundColor: "#EFF6FF",
    border: "1px solid #BFDBFE",
    borderRadius: "8px",
    padding: "12px",
  },
  followUpHeader: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "var(--primary)",
    margin: 0,
    marginBottom: "4px",
  },
  followUpText: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    margin: 0,
    lineHeight: 1.4,
  },
  // Modal Overlays
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    zIndex: 9500,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    width: "600px",
    maxWidth: "90%",
    backgroundColor: "var(--bg-surface)",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "var(--shadow-lg)",
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid var(--divider)",
    paddingBottom: "12px",
    marginBottom: "16px",
  },
  modalCloseBtn: {
    background: "none",
    border: "none",
    fontSize: "1.8rem",
    color: "var(--text-muted)",
    cursor: "pointer",
    lineHeight: 1,
  },
  modalBody: {
    overflowY: "auto",
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  previewQRow: {
    display: "flex",
    padding: "12px",
    backgroundColor: "var(--bg-app)",
    borderRadius: "10px",
    border: "1px solid var(--border-color)",
  },
  codeText: {
    fontFamily: "monospace",
    backgroundColor: "var(--border-color)",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "0.85rem",
  },
  loaderCenter: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "5rem",
    width: "100%",
  },
  errorContainer: {
    textAlign: "center",
    padding: "3rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
  },
  backLink: {
    color: "var(--primary)",
    fontWeight: 600,
    textDecoration: "none",
  },
  drawerQuickStats: {
    display: "flex",
    gap: "8px",
    padding: "0 24px 12px 24px",
  },
  statBadge: {
    backgroundColor: "#F1F5F9",
    color: "#475569",
    borderRadius: "999px",
    padding: "4px 10px",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  drawerTabs: {
    display: "flex",
    gap: "16px",
    padding: "0 24px",
    overflowX: "auto",
  },
  drawerTabButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px 4px 12px 4px",
    fontSize: "0.9rem",
    fontWeight: 500,
    whiteSpace: "nowrap",
    transition: "all 0.15s ease",
  },
  tabWorkspace: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  workspaceSectionTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
  },
  notesTextarea: {
    width: "100%",
    borderRadius: "10px",
    border: "1px solid var(--border-color)",
    padding: "12px",
    fontSize: "0.95rem",
    resize: "vertical",
    outline: "none",
    fontFamily: "inherit",
  },
  notesSaveBtn: {
    alignSelf: "flex-end",
    padding: "8px 20px",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  bubbleContainer: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    width: "100%",
  },
  bubbleBuddyIcon: {
    fontSize: "1.5rem",
    marginTop: "4px",
  },
  bubbleTextCard: {
    padding: "10px 14px",
    borderRadius: "12px",
    maxWidth: "80%",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
  },
  conversationBubbleList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    maxHeight: "380px",
    overflowY: "auto",
    paddingRight: "8px",
  },
  rawTranscriptDoc: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxHeight: "380px",
    overflowY: "auto",
  },
  rawTranscriptRow: {
    fontSize: "0.95rem",
    lineHeight: "1.5",
  },
  rawTranscriptRole: {
    fontWeight: 600,
    color: "var(--text-primary)",
    marginRight: "8px",
  },
  rawTranscriptText: {
    color: "var(--text-secondary)",
    fontStyle: "italic",
  },
  evaluationList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    maxHeight: "400px",
    overflowY: "auto",
  },
  evaluationCardItem: {
    backgroundColor: "#F8FAFC",
    border: "1px solid var(--border-color)",
    borderRadius: "12px",
    padding: "16px",
  },
  evaluationHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  evaluationQNum: {
    fontWeight: 600,
    color: "var(--text-primary)",
    fontSize: "0.9rem",
  },
  evaluationStatusBadge: {
    padding: "3px 10px",
    borderRadius: "999px",
    fontSize: "0.75rem",
    fontWeight: 600,
  },
  evaluationQuestionText: {
    fontSize: "0.9rem",
    color: "var(--text-primary)",
    margin: "0 0 6px 0",
    lineHeight: "1.4",
  },
  evaluationAnswerLine: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    margin: "0 0 4px 0",
  },
  evaluationFeedbackText: {
    fontSize: "0.85rem",
    color: "var(--primary)",
    backgroundColor: "#EFF6FF",
    padding: "8px 12px",
    borderRadius: "8px",
    margin: "8px 0 0 0",
    lineHeight: "1.4",
  },
  insightsSummaryText: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    lineHeight: "1.5",
    margin: "0 0 16px 0",
  },
};
