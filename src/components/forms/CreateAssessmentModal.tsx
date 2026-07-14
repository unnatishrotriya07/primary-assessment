"use client";

import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Button from "../common/Button";
import classService from "@/services/class.service";
import subjectService from "@/services/subject.service";
import chapterService from "@/services/chapter.service";
import questionService from "@/services/question.service";
import assessmentService, { StudentAssessmentResponse } from "@/services/assessment.service";
import studentService from "@/services/student.service";
import { ClassData } from "@/types/class.types";
import { SubjectData } from "@/types/subject.types";
import { ChapterData } from "@/types/chapter.types";
import { QuestionData } from "@/types/question.types";
import { StudentData } from "@/types/student.types";
import { extractErrorMessage, formatClassName, isHindiText } from "@/utils/helpers";


interface CreateAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type WizardStep = "curriculum" | "preparing" | "review" | "assignment" | "success";

export default function CreateAssessmentModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateAssessmentModalProps) {
  const [step, setStep] = useState<WizardStep>("curriculum");

  // Dropdown data
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  
  // Selections
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<number | "">("");

  // AI preparation progress states
  const [prepStep, setPrepStep] = useState(0);
  const [forceRegenerate, setForceRegenerate] = useState(false);

  // Draft questions list
  const [draftQuestions, setDraftQuestions] = useState<QuestionData[]>([]);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // Student details & Assignment state
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentsSearch, setStudentsSearch] = useState("");
  const [assignMode, setAssignMode] = useState<"class" | "students">("class");
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [questionsToAsk, setQuestionsToAsk] = useState<number>(5);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Created assessment information
  const [createdAssessmentId, setCreatedAssessmentId] = useState<number | null>(null);
  const [successData, setSuccessData] = useState<StudentAssessmentResponse[] | null>(null);
  
  // Clipboard copy feedback states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedClassLink, setCopiedClassLink] = useState(false);

  // Loading & error alerts
  const [loading, setLoading] = useState(false);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);
  const [error, setError] = useState("");

  const selectedSub = subjects.find(s => String(s.id) === String(selectedSubjectId));
  const isHindi = selectedSub?.name?.toLowerCase() === "hindi" || isHindiText(assessmentTitle);


  const prepMessages = [
    "Reading chapter...",
    "Understanding concepts...",
    "Selecting Bloom's taxonomy...",
    "Balancing question difficulty...",
    "Preparing classroom-ready questions..."
  ];

  // Setup / Reset wizard on open
  useEffect(() => {
    if (isOpen) {
      setStep("curriculum");
      setSelectedClassId("");
      setSelectedSubjectId("");
      setSelectedChapterId("");
      setQuestionCount(25);
      setDraftQuestions([]);
      setAssessmentTitle("");
      setStudents([]);
      setSelectedStudentIds([]);
      setCreatedAssessmentId(null);
      setSuccessData(null);
      setError("");
      setPrepStep(0);
      setForceRegenerate(false);
      setAssignMode("class");
      setShowAdvanced(false);
      setQuestionsToAsk(5);

      setLoadingCurriculum(true);
      classService.getAll()
        .then((res) => setClasses(res))
        .catch((err) => console.error("Failed to load classes", err))
        .finally(() => setLoadingCurriculum(false));
    }
  }, [isOpen]);

  // Load subjects & students when class is selected
  useEffect(() => {
    if (selectedClassId) {
      subjectService.getAll(selectedClassId)
        .then((res) => {
          setSubjects(res);
          setSelectedSubjectId("");
          setChapters([]);
          setSelectedChapterId("");
        })
        .catch((err) => console.error("Failed to load subjects", err));

      studentService.getByClass(selectedClassId)
        .then((res) => {
          setStudents(res);
          setSelectedStudentIds(res.map(s => Number(s.id)));
        })
        .catch((err) => console.error("Failed to load students", err));
    } else {
      setSubjects([]);
      setSelectedSubjectId("");
      setChapters([]);
      setSelectedChapterId("");
      setStudents([]);
      setSelectedStudentIds([]);
    }
  }, [selectedClassId]);

  // Load chapters when subject is selected
  useEffect(() => {
    if (selectedSubjectId) {
      chapterService.getBySubject(selectedSubjectId)
        .then((res) => {
          setChapters(res);
          setSelectedChapterId("");
        })
        .catch((err) => console.error("Failed to load chapters", err));

      const matchedSub = subjects.find(s => String(s.id) === selectedSubjectId);
      if (matchedSub) {
        setAssessmentTitle(`${matchedSub.name} Quiz`);
      }
    } else {
      setChapters([]);
      setSelectedChapterId("");
    }
  }, [selectedSubjectId, subjects]);

  // Step 2 Background AI Generation & Cache Check
  useEffect(() => {
    if (step === "preparing") {
      setPrepStep(0);
      setError("");
      
      let apiResolved = false;
      let apiError: any = null;
      let apiQuestions: any[] = [];
      
      const startWorkflow = async () => {
        try {
          // If not forcing regeneration, inspect cache for existing questions
          let existing: any[] = [];
          if (!forceRegenerate) {
            existing = await questionService.getAll({
              classId: selectedClassId,
              subjectId: selectedSubjectId,
              chapterId: selectedChapterId
            });
          }

          if (existing && existing.length > 0) {
            apiQuestions = existing;
          } else {
            // Infer session identifier
            const matchedSub = subjects.find((s) => String(s.id) === selectedSubjectId);
            const matchedCh = chapters.find((ch) => String(ch.id) === selectedChapterId);
            const subName = matchedSub ? matchedSub.name : "";
            const chNum = matchedCh ? matchedCh.number : "";
            const chTitle = matchedCh ? matchedCh.title : "";
            
            const now = new Date();
            const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const session = `${subName} - Ch ${chNum}: ${chTitle} - ${dateStr}`;

            const generated = await questionService.generateAIQuestions({
              classId: selectedClassId || undefined,
              subjectId: selectedSubjectId,
              chapterId: selectedChapterId,
              difficulty: "medium", // Inferred
              cognitiveLevel: "applying", // Inferred
              count: questionCount || 5,
              regenerate: true,
              previewOnly: true,
              session: session,
              questionType: "tita", // Inferred TITA format
            });

            apiQuestions = generated.map(q => ({
              ...q,
              id: "draft_" + Math.random().toString(36).substring(2, 9)
            }));
          }
        } catch (err: any) {
          apiError = err;
        } finally {
          apiResolved = true;
        }
      };

      startWorkflow();

      // Sequential animation timer
      let currentStep = 0;
      const interval = setInterval(() => {
        if (currentStep < 4) {
          currentStep += 1;
          setPrepStep(currentStep);
        } else {
          // Reached step 4. Wait for background api thread
          if (apiResolved) {
            clearInterval(interval);
            if (apiError) {
              setError(extractErrorMessage(apiError, "Question generation failed."));
              setStep("curriculum");
            } else {
              setDraftQuestions(apiQuestions);
              // Setup default Title
              const matchedSub = subjects.find(s => String(s.id) === selectedSubjectId);
              const subName = matchedSub ? matchedSub.name : "Assessment";
              const matchedCh = chapters.find((ch) => String(ch.id) === selectedChapterId);
              const chTitle = matchedCh ? ` - Ch ${matchedCh.number}` : "";
              setAssessmentTitle(`${subName}${chTitle} Quiz`);
              setStep("review");
            }
          }
        }
      }, 1200);

      return () => {
        clearInterval(interval);
      };
    }
  }, [step, selectedClassId, selectedSubjectId, selectedChapterId, subjects, chapters, forceRegenerate]);

  // Proceed to Step 2 AI Preparation Screen
  const handleCurriculumContinue = () => {
    if (!selectedClassId || !selectedSubjectId || !selectedChapterId) {
      setError("Please select a Class, Subject, and Chapter to continue.");
      return;
    }
    setError("");
    setStep("preparing");
  };

  // Add a manual custom question
  const handleAddCustomQuestion = () => {
    const newQ: QuestionData = {
      id: "draft_" + Math.random().toString(36).substring(2, 9),
      text: "",
      options: [],
      correctAnswer: "",
      questionType: "tita",
      difficulty: "medium",
      cognitiveLevel: "applying",
      subjectId: selectedSubjectId,
      chapterId: selectedChapterId || undefined,
      classId: selectedClassId || undefined,
      generatedBy: "manual",
      session: assessmentTitle,
    };
    setDraftQuestions((prev) => [...prev, newQ]);
  };

  // Delete draft question card
  const handleDeleteDraftQuestion = (index: number) => {
    setDraftQuestions((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Reorder question items
  const handleMoveQuestion = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === draftQuestions.length - 1) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    setDraftQuestions(prev => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[newIndex];
      list[newIndex] = temp;
      return list;
    });
  };

  // Regenerate a single question via AI call
  const handleRegenerateSingleQuestion = async (index: number) => {
    const q = draftQuestions[index];
    setRegeneratingIndex(index);
    setError("");

    try {
      const newQs = await questionService.generateAIQuestions({
        classId: selectedClassId || undefined,
        subjectId: selectedSubjectId,
        chapterId: selectedChapterId,
        difficulty: "medium",
        cognitiveLevel: "applying",
        count: 1,
        regenerate: true,
        previewOnly: true,
        session: assessmentTitle,
        questionType: q.questionType || "tita",
      });

      if (newQs && newQs.length > 0) {
        setDraftQuestions(prev =>
          prev.map((item, idx) => (idx === index ? { ...newQs[0], id: "draft_" + Math.random().toString(36).substring(2, 9) } : item))
        );
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to regenerate single question."));
    } finally {
      setRegeneratingIndex(null);
    }
  };

  // Trigger full questions regeneration
  const handleRegenerateAll = () => {
    setForceRegenerate(true);
    setStep("preparing");
  };

  // Save reviewed questions and pre-create Assessment in DB to generate URL link
  const handleReviewContinue = async () => {
    if (draftQuestions.length === 0) {
      setError("Please add or generate at least one question.");
      return;
    }

    // Question input validation
    for (let i = 0; i < draftQuestions.length; i++) {
      const q = draftQuestions[i];
      if (!q.text.trim()) {
        setError(`Question ${i + 1} text is empty.`);
        return;
      }
      if (!q.correctAnswer || !q.correctAnswer.trim()) {
        setError(`Question ${i + 1} expected answer is empty.`);
        return;
      }
    }

    setError("");
    setLoading(true);

    try {
      // Find out if any questions need saving (have draft_ ID keys)
      const needsSaving = draftQuestions.some(q => String(q.id).startsWith("draft_"));
      let savedIds: number[] = [];

      if (needsSaving) {
        // Batch save draft items
        const savedRes = await questionService.batchSave({
          questions: draftQuestions.map((q) => ({
            text: q.text,
            options: [],
            correctAnswer: q.correctAnswer,
            questionType: "tita",
            difficulty: q.difficulty || "medium",
            cognitiveLevel: q.cognitiveLevel || "applying",
            classId: selectedClassId ? parseInt(selectedClassId, 10) : undefined,
            subjectId: parseInt(selectedSubjectId, 10),
            chapterId: selectedChapterId ? parseInt(selectedChapterId, 10) : undefined,
            generatedBy: q.generatedBy || "manual",
            session: q.session || assessmentTitle,
          })),
          clearExisting: false,
          chapterId: selectedChapterId,
          difficulty: "medium",
          cognitiveLevel: "applying",
        });
        savedIds = savedRes.map(q => Number(q.id));
      } else {
        savedIds = draftQuestions.map(q => Number(q.id));
      }

      // Pre-fill total questions to ask
      setQuestionsToAsk(savedIds.length);
      // Pre-save to local session variable for fallback logic
      (window as any)._wizardQuestionIds = savedIds;

      // Create the active assessment
      const todayStr = new Date().toISOString().split("T")[0];
      const createdAssessment = await assessmentService.create({
        title: assessmentTitle.trim() || `${subjects.find(s => String(s.id) === selectedSubjectId)?.name || "Subject"} Assessment`,
        subjectId: Number(selectedSubjectId),
        classId: Number(selectedClassId),
        status: "Active",
        date: todayStr,
        questionsCount: savedIds.length,
        questionIds: savedIds,
        questionsToAsk: savedIds.length,
      });

      const newAssessmentId = Number(createdAssessment.id);
      setCreatedAssessmentId(newAssessmentId);

      // Automatically assign to all students of the class
      const targetStudentIds = students.map(s => Number(s.id));
      if (targetStudentIds.length === 0) {
        setError("This class has no students. Please add students to the class before assigning assessments.");
        return;
      }

      const res = await assessmentService.assignAssessmentBulk({
        assessmentId: newAssessmentId,
        studentIds: targetStudentIds,
      });

      setSuccessData(res);
      setStep("success");
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to save selected questions."));
    } finally {
      setLoading(false);
    }
  };

  // Assign students & finish workflow
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const targetStudentIds = assignMode === "class" 
      ? students.map(s => Number(s.id))
      : selectedStudentIds;

    if (targetStudentIds.length === 0) {
      setError("Please select at least one student.");
      return;
    }

    setLoading(true);

    try {
      const res = await assessmentService.assignAssessmentBulk({
        assessmentId: createdAssessmentId!,
        studentIds: targetStudentIds,
      });

      setSuccessData(res);
      setStep("success");
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to assign assessment."));
    } finally {
      setLoading(false);
    }
  };

  // Clipboard copy routines
  const copyToClipboard = async (text: string, isAll = false, isClass = false, studentId: string | null = null) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isAll) {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
      } else if (isClass) {
        setCopiedClassLink(true);
        setTimeout(() => setCopiedClassLink(false), 2000);
      } else if (studentId) {
        setCopiedId(studentId);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  const copyAllLinks = () => {
    if (!successData) return;
    const allLinksText = successData.map(sa => `${sa.studentName}: ${sa.assessmentLink}`).join("\n");
    copyToClipboard(allLinksText, true);
  };

  // Filter students based on search string
  const filteredStudents = students.filter(s => {
    const q = studentsSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  // Calculate difficulty counts for metrics
  const getDifficultyMetrics = () => {
    let easy = 0, med = 0, hard = 0;
    draftQuestions.forEach((q) => {
      const diff = (q.difficulty || "medium").toLowerCase();
      if (diff === "easy") easy++;
      else if (diff === "hard") hard++;
      else med++;
    });
    return { easy, med, hard };
  };

  const difficultyMetrics = getDifficultyMetrics();

  const getStepTitle = () => {
    switch (step) {
      case "curriculum":
        return "Create New Assessment";
      case "preparing":
        return "Preparing Assessment";
      case "review":
        return "Review and Customize Questions";
      case "assignment":
        return "Setup Assessment Access";
      case "success":
        return "Success";
    }
  };

  const getStepSize = () => {
    if (step === "review" || step === "assignment" || step === "success") {
      return "large";
    }
    return "medium";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getStepTitle()}
      size={getStepSize()}
    >
      {/* Wizard Horizontal Step Indicator */}
      {step !== "success" && step !== "preparing" && (
        <div style={styles.indicatorContainer}>
          <div style={styles.indicatorRow}>
            <div style={styles.indicatorNode}>
              <div style={{
                ...styles.indicatorCircle,
                backgroundColor: step === "curriculum" ? "var(--primary)" : "var(--primary-light)",
                color: step === "curriculum" ? "#ffffff" : "var(--primary)",
              }}>
                {step !== "curriculum" ? "✓" : "1"}
              </div>
              <span style={{ ...styles.indicatorLabel, color: step === "curriculum" ? "var(--text-primary)" : "var(--text-secondary)" }}>
                Curriculum
              </span>
            </div>
            <div style={{ ...styles.indicatorLine, backgroundColor: step !== "curriculum" ? "var(--primary)" : "var(--border-color)" }} />
            
            <div style={styles.indicatorNode}>
              <div style={{
                ...styles.indicatorCircle,
                backgroundColor: step === "review" ? "var(--primary)" : (step === "assignment" ? "var(--primary-light)" : "var(--bg-app)"),
                color: step === "review" ? "#ffffff" : (step === "assignment" ? "var(--primary)" : "var(--text-muted)"),
                borderColor: step === "review" || step === "assignment" ? "transparent" : "var(--border-color)",
              }}>
                {step === "assignment" ? "✓" : "2"}
              </div>
              <span style={{ ...styles.indicatorLabel, color: step === "review" ? "var(--text-primary)" : "var(--text-secondary)" }}>
                Review
              </span>
            </div>
            <div style={{ ...styles.indicatorLine, backgroundColor: step === "assignment" ? "var(--primary)" : "var(--border-color)" }} />
            
            <div style={styles.indicatorNode}>
              <div style={{
                ...styles.indicatorCircle,
                backgroundColor: step === "assignment" ? "var(--primary)" : "var(--bg-app)",
                color: step === "assignment" ? "#ffffff" : "var(--text-muted)",
                borderColor: step === "assignment" ? "transparent" : "var(--border-color)",
              }}>
                3
              </div>
              <span style={{ ...styles.indicatorLabel, color: step === "assignment" ? "var(--text-primary)" : "var(--text-secondary)" }}>
                Assign
              </span>
            </div>
          </div>
        </div>
      )}

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* STEP 1: Curriculum Dropdown Fields Only */}
      {step === "curriculum" && (
        <div style={styles.stepContainer}>
          {loadingCurriculum ? (
            <div style={styles.loaderCenter}>
              <div className="spinner" style={{ width: "32px", height: "32px" }}></div>
              <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>Loading school records...</p>
            </div>
          ) : (
            <div style={styles.formFlow}>
              <div style={styles.inputGroup}>
                <label style={styles.fieldLabel}>Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  style={styles.selectInput}
                >
                  <option value="">Choose class...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {formatClassName(c)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.fieldLabel}>Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  disabled={!selectedClassId}
                  style={{
                    ...styles.selectInput,
                    opacity: !selectedClassId ? 0.6 : 1,
                    cursor: !selectedClassId ? "not-allowed" : "pointer"
                  }}
                >
                  <option value="">Choose subject...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.fieldLabel}>Chapter</label>
                <select
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  disabled={!selectedSubjectId}
                  style={{
                    ...styles.selectInput,
                    opacity: !selectedSubjectId ? 0.6 : 1,
                    cursor: !selectedSubjectId ? "not-allowed" : "pointer"
                  }}
                >
                  <option value="">Choose chapter...</option>
                  {chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      Chapter {ch.number}: {ch.title}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.fieldLabel}>Number of Questions to Generate</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  placeholder="5"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value === "" ? "" : parseInt(e.target.value, 10) || "")}
                  style={styles.formTextInput}
                />
              </div>

              <div style={styles.footerPanel}>
                <Button variant="ghost" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleCurriculumContinue} disabled={!selectedChapterId}>
                  Continue
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: AI Preparation Loader & Messages */}
      {step === "preparing" && (
        <div style={styles.preparingWrapper}>
          <div style={styles.breathOuterCircle}>
            <div style={styles.breathInnerCircle}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          
          <h4 style={styles.preparingTitle}>Preparing Assessment</h4>
          <p style={styles.preparingSubtitle}>
            Building high-fidelity questions from the reference curriculum.
          </p>

          <div style={styles.statusStepper}>
            {prepMessages.map((msg, index) => {
              const isDone = index < prepStep;
              const isActive = index === prepStep;
              return (
                <div key={index} style={{
                  ...styles.statusStepRow,
                  opacity: isDone || isActive ? 1 : 0.4
                }}>
                  <div style={styles.statusDotWrapper}>
                    {isDone ? (
                      <span style={styles.statusDoneIcon}>✓</span>
                    ) : isActive ? (
                      <span style={styles.statusPulseDot} />
                    ) : (
                      <span style={styles.statusPendingDot} />
                    )}
                  </div>
                  <span style={{
                    ...styles.statusStepText,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "var(--primary)" : "var(--text-secondary)"
                  }}>
                    {msg}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={styles.horizontalProgressBar}>
            <div style={{
              ...styles.progressBarProgress,
              width: `${(prepStep / 4) * 100}%`
            }} />
          </div>
        </div>
      )}

      {/* STEP 3: Beautiful Questions Review */}
      {step === "review" && (
        <div style={styles.wizardContentFlex}>
          {/* Metrics Summary Banner */}
          <div style={styles.reviewSummaryBanner}>
            <div style={styles.summaryMetricItem}>
              <span style={styles.summaryMetricLabel}>Question Count</span>
              <strong style={styles.summaryMetricVal}>{draftQuestions.length} Questions</strong>
            </div>
            
            <div style={styles.summaryMetricItem}>
              <span style={styles.summaryMetricLabel}>Difficulty Distribution</span>
              <div style={styles.metricDifficultyRow}>
                {difficultyMetrics.easy > 0 && <span style={styles.diffBadgeEasy}>{difficultyMetrics.easy} Easy</span>}
                {difficultyMetrics.med > 0 && <span style={styles.diffBadgeMed}>{difficultyMetrics.med} Medium</span>}
                {difficultyMetrics.hard > 0 && <span style={styles.diffBadgeHard}>{difficultyMetrics.hard} Hard</span>}
                {difficultyMetrics.easy === 0 && difficultyMetrics.med === 0 && difficultyMetrics.hard === 0 && (
                  <span style={styles.diffBadgeMed}>Medium</span>
                )}
              </div>
            </div>

            <div style={styles.summaryMetricItem}>
              <span style={styles.summaryMetricLabel}>Question Formats</span>
              <strong style={styles.summaryMetricVal}>Short Answer (TITA)</strong>
            </div>

            <div style={styles.summaryMetricItem}>
              <span style={styles.summaryMetricLabel}>Estimated Completion Time</span>
              <strong style={styles.summaryMetricVal}>{draftQuestions.length * 3} mins</strong>
            </div>
          </div>

          {/* List of Questions */}
          <div style={styles.questionsScrollWrapper}>
            {draftQuestions.length === 0 ? (
              <div style={styles.emptyQuestions}>
                <p>No questions generated yet. Click "+ Add Custom Question" to write one manually.</p>
              </div>
            ) : (
              draftQuestions.map((q, idx) => {
                const isRegenerating = regeneratingIndex === idx;
                return (
                  <div key={q.id || idx} style={styles.questionReviewCard}>
                    <div style={styles.qCardTop}>
                      <span style={styles.questionIndexLabel}>Question {idx + 1}</span>
                      
                      <div style={styles.qCardControls}>
                        <button
                          type="button"
                          onClick={() => handleMoveQuestion(idx, "up")}
                          disabled={idx === 0}
                          style={{
                            ...styles.qMoveBtn,
                            opacity: idx === 0 ? 0.3 : 1,
                            cursor: idx === 0 ? "not-allowed" : "pointer"
                          }}
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveQuestion(idx, "down")}
                          disabled={idx === draftQuestions.length - 1}
                          style={{
                            ...styles.qMoveBtn,
                            opacity: idx === draftQuestions.length - 1 ? 0.3 : 1,
                            cursor: idx === draftQuestions.length - 1 ? "not-allowed" : "pointer"
                          }}
                          title="Move Down"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRegenerateSingleQuestion(idx)}
                          disabled={isRegenerating}
                          style={styles.qRegenBtn}
                          title="Regenerate Single Question"
                        >
                          {isRegenerating ? "Regenerating..." : "Regenerate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDraftQuestion(idx)}
                          style={styles.qDeleteBtn}
                          title="Delete Question"
                        >
                          🗑
                        </button>
                      </div>
                    </div>

                    <div style={styles.qCardInputRow}>
                      <label style={styles.qCardInnerLabel}>Question Text</label>
                      <textarea
                        value={q.text}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftQuestions(prev => prev.map((item, i) => i === idx ? { ...item, text: val } : item));
                        }}
                        style={styles.cardTextarea}
                        placeholder="Type question content..."
                        className={isHindi || isHindiText(q.text) ? "font-hindi" : ""}
                        required
                      />
                    </div>

                    <div style={styles.qCardInputRow}>
                      <label style={styles.qCardInnerLabel}>Expected Correct Answer</label>
                      <textarea
                        value={q.correctAnswer}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftQuestions(prev => prev.map((item, i) => i === idx ? { ...item, correctAnswer: val } : item));
                        }}
                        style={styles.cardTextarea}
                        placeholder="Specify expected student response..."
                        className={isHindi || isHindiText(q.correctAnswer) ? "font-hindi" : ""}
                        required
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Assessment Title & Questions to Ask Configuration */}
          <div style={styles.reviewConfigCard}>
            <div style={styles.reviewConfigRow}>
              <div style={{ ...styles.inputGroup, flex: 2 }}>
                <label style={styles.fieldLabel}>Assessment Title</label>
                <input
                  type="text"
                  required
                  value={assessmentTitle}
                  onChange={(e) => setAssessmentTitle(e.target.value)}
                  style={styles.formTextInput}
                  className={isHindi ? "font-hindi" : ""}
                  placeholder="e.g. Science Chapter 1 Assessment"
                />
              </div>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.fieldLabel}>Questions to Ask Each Student</label>
                <input
                  type="number"
                  min={1}
                  max={draftQuestions.length}
                  value={questionsToAsk}
                  onChange={(e) => setQuestionsToAsk(parseInt(e.target.value, 10) || 5)}
                  style={styles.formTextInput}
                />
              </div>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.4rem", display: "block" }}>
              Each student will be asked a randomized subset of {questionsToAsk} questions out of the {draftQuestions.length} questions in the pool.
            </span>
          </div>

          <div style={styles.reviewCardFooter}>
            <div style={{ display: "flex", gap: "0.8rem" }}>
              <Button variant="ghost" onClick={handleAddCustomQuestion}>
                + Add Question
              </Button>
              <Button variant="ghost" onClick={handleRegenerateAll} style={{ color: "var(--text-secondary)" }}>
                🔄 Regenerate All
              </Button>
            </div>
            <div style={{ display: "flex", gap: "0.8rem" }}>
              <Button variant="ghost" onClick={() => setStep("curriculum")}>
                Back
              </Button>
              <Button onClick={handleReviewContinue} loading={loading}>
                Create Assessment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Assignment Configuration */}
      {step === "assignment" && (
        <form onSubmit={handleAssignSubmit} style={styles.wizardContentFlex}>
          <div style={styles.assignmentLayoutRow}>
            {/* Left Column: Form Details & Copy Link / Preview */}
            <div style={styles.assignmentDetailsCol}>
              <div style={styles.inputGroup}>
                <label style={styles.fieldLabel}>Assessment Title</label>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {assessmentTitle}
                </div>
              </div>

              {/* Shareable Link Display */}
              <div style={styles.shareLinkContainer}>
                <label style={styles.fieldLabel}>Class Shareable Link (All Students)</label>
                <div style={styles.shareLinkInputGroup}>
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/assessment/join?id=${createdAssessmentId}`}
                    style={styles.shareLinkField}
                  />
                  <Button
                    type="button"
                    variant={copiedClassLink ? "success" : "secondary"}
                    onClick={() => {
                      const link = `${window.location.origin}/assessment/join?id=${createdAssessmentId}`;
                      copyToClipboard(link, false, true);
                    }}
                    style={{ borderRadius: "0 var(--radius-sm) var(--radius-sm) 0", borderLeft: "none" }}
                  >
                    {copiedClassLink ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              {/* Preview Button */}
              <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "-0.5rem" }}>
                <a
                  href={`/assessment/join?id=${createdAssessmentId}`}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.previewAnchor}
                >
                  Preview Student View &rarr;
                </a>
              </div>

              {/* Fixed Expiry Window */}
              <div style={styles.infoRowCard}>
                <div style={styles.infoRowIcon}>⏱</div>
                <div style={styles.infoRowText}>
                  <strong>Standard Academic Window</strong>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    This shareable link and the student invitations expire exactly 24 hours from creation.
                  </span>
                </div>
              </div>

              {/* Segmented Picker: Assign To */}
              <div style={styles.assignToSelector}>
                <label style={styles.fieldLabel}>Assign To</label>
                <div style={styles.segmentedControl}>
                  <button
                    type="button"
                    onClick={() => setAssignMode("class")}
                    style={{
                      ...styles.segmentBtn,
                      backgroundColor: assignMode === "class" ? "var(--bg-surface)" : "transparent",
                      color: assignMode === "class" ? "var(--primary)" : "var(--text-secondary)",
                      boxShadow: assignMode === "class" ? "var(--shadow-sm)" : "none",
                      fontWeight: assignMode === "class" ? 600 : 500
                    }}
                  >
                    Entire Class
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignMode("students")}
                    style={{
                      ...styles.segmentBtn,
                      backgroundColor: assignMode === "students" ? "var(--bg-surface)" : "transparent",
                      color: assignMode === "students" ? "var(--primary)" : "var(--text-secondary)",
                      boxShadow: assignMode === "students" ? "var(--shadow-sm)" : "none",
                      fontWeight: assignMode === "students" ? 600 : 500
                    }}
                  >
                    Specific Students
                  </button>
                </div>
              </div>

              {/* Evaluation Details Info Card */}
              <div style={styles.infoRowCard}>
                <div style={styles.infoRowIcon}>📋</div>
                <div style={styles.infoRowText}>
                  <strong>Evaluation Details</strong>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Each student will be asked exactly <strong>{questionsToAsk}</strong> randomly selected questions out of the <strong>{draftQuestions.length}</strong> questions in the pool.
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Student Checklist (conditionally displayed if Specific Students selected) */}
            {assignMode === "students" && (
              <div style={styles.studentListCol}>
                <div style={styles.studentHeaderRow}>
                  <span style={styles.studentSelectionCount}>
                    {selectedStudentIds.length} of {students.length} selected
                  </span>
                  
                  <div style={styles.quickSelectionActions}>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIds(students.map(s => Number(s.id)))}
                      style={styles.quickTextLink}
                    >
                      Select All
                    </button>
                    <span style={{ color: "var(--border-color)" }}>|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIds([])}
                      style={styles.quickTextLink}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div style={styles.studentSearchFieldWrapper}>
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={studentsSearch}
                    onChange={(e) => setStudentsSearch(e.target.value)}
                    style={styles.studentSearchInputText}
                  />
                </div>

                <div style={styles.studentScrollContainer}>
                  {filteredStudents.length === 0 ? (
                    <div style={styles.emptyGridState}>No matches found.</div>
                  ) : (
                    <div style={styles.studentGridList}>
                      {filteredStudents.map((s) => {
                        const isChecked = selectedStudentIds.includes(Number(s.id));
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              const sId = Number(s.id);
                              setSelectedStudentIds(prev =>
                                prev.includes(sId) ? prev.filter(id => id !== sId) : [...prev, sId]
                              );
                            }}
                            style={{
                              ...styles.studentSelectionRow,
                              backgroundColor: isChecked ? "var(--primary-light)" : "transparent",
                              borderColor: isChecked ? "var(--primary)" : "var(--border-color)"
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              style={{ cursor: "pointer" }}
                            />
                            <div style={styles.studentDetailBlock}>
                              <div style={styles.studentDisplayName}>{s.name}</div>
                              <div style={styles.studentDisplayEmail}>{s.email}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={styles.footerPanel}>
            <Button variant="ghost" onClick={() => setStep("review")} disabled={loading}>
              Back
            </Button>
            <Button type="submit" loading={loading} disabled={assignMode === "students" && selectedStudentIds.length === 0}>
              Activate & Assign
            </Button>
          </div>
        </form>
      )}

      {/* STEP 5: Success & Invitation Copy Links */}
      {step === "success" && successData && (
        <div style={styles.successWrapper}>
          <div style={styles.successBadgeCircle}>✓</div>
          <h4 style={styles.successHeadline}>Your assessment is ready.</h4>
          <p style={styles.successDescription}>
            The assessment has been activated and is live. Invitation credentials have been compiled for {successData.length} students.
          </p>

          <div style={styles.classShareCard}>
            <div style={styles.classShareHeader}>Classroom Entry Point</div>
            <div style={styles.classShareInputRow}>
              <input
                type="text"
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/assessment/join?id=${createdAssessmentId}`}
                style={styles.classLinkFieldReadOnly}
              />
              <Button
                variant={copiedClassLink ? "success" : "primary"}
                onClick={() => {
                  const link = `${window.location.origin}/assessment/join?id=${createdAssessmentId}`;
                  copyToClipboard(link, false, true);
                }}
                style={{ borderRadius: "0 var(--radius-sm) var(--radius-sm) 0" }}
              >
                {copiedClassLink ? "Copied" : "Copy Link"}
              </Button>
            </div>
          </div>

          {/* Collapsible Individual Invitation Table */}
          <div style={styles.studentInvitationAccordion}>
            <div style={styles.accordionHeader}>
              <span style={styles.accordionLabel}>Individual Invitation Access Links</span>
              <Button
                variant={copiedAll ? "success" : "secondary"}
                onClick={copyAllLinks}
                style={{ height: "30px", fontSize: "0.75rem", padding: "0 0.6rem" }}
              >
                {copiedAll ? "All Copied!" : "Copy All"}
              </Button>
            </div>

            <div style={styles.studentInviteScrollGrid}>
              <table style={styles.inviteTable}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.tableTh}>Student</th>
                    <th style={styles.tableTh}>Email</th>
                    <th style={styles.tableTh}>Unique Access Link</th>
                  </tr>
                </thead>
                <tbody>
                  {successData.map(sa => {
                    const isCopied = copiedId === String(sa.id);
                    return (
                      <tr key={sa.id} style={styles.tableTr}>
                        <td style={styles.tableTdName}><strong>{sa.studentName}</strong></td>
                        <td style={styles.tableTdEmail}>{sa.studentEmail}</td>
                        <td style={styles.tableTd}>
                          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                            <input
                              type="text"
                              readOnly
                              value={sa.assessmentLink}
                              style={styles.tableSmallInput}
                            />
                            <Button
                              variant={isCopied ? "success" : "primary"}
                              onClick={() => copyToClipboard(sa.assessmentLink, false, false, String(sa.id))}
                              style={{ height: "24px", fontSize: "0.7rem", padding: "0 0.5rem" }}
                            >
                              {isCopied ? "Copied" : "Copy"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={styles.completionActionsRow}>
            <a
              href={`/assessment/join?id=${createdAssessmentId}`}
              target="_blank"
              rel="noreferrer"
              style={styles.successPreviewBtn}
            >
              Preview View
            </a>
            
            <Button
              variant="primary"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

const styles: Record<string, React.CSSProperties> = {
  indicatorContainer: {
    padding: "0.5rem 0 1.5rem",
    borderBottom: "1px solid var(--divider)",
    marginBottom: "1.5rem",
    display: "flex",
    justifyContent: "center",
  },
  indicatorRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    width: "100%",
    maxWidth: "500px",
  },
  indicatorNode: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.3rem",
    minWidth: "70px",
  },
  indicatorCircle: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    border: "2px solid transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.8rem",
    fontWeight: 700,
    transition: "all var(--transition-fast)",
  },
  indicatorLabel: {
    fontSize: "0.75rem",
    fontWeight: 500,
  },
  indicatorLine: {
    height: "2px",
    flex: 1,
    transition: "background-color var(--transition-fast)",
    marginTop: "-14px",
  },
  stepContainer: {
    padding: "0.5rem 0",
  },
  formFlow: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    maxWidth: "480px",
    margin: "0 auto",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  fieldLabel: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  selectInput: {
    padding: "0.7rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    outline: "none",
    width: "100%",
    transition: "border-color var(--transition-fast)",
  },
  formTextInput: {
    padding: "0.7rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    outline: "none",
    width: "100%",
  },
  footerPanel: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.8rem",
    marginTop: "1.5rem",
    borderTop: "1px solid var(--divider)",
    paddingTop: "1.2rem",
    width: "100%",
  },
  loaderCenter: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem 1rem",
    textAlign: "center",
  },
  errorBanner: {
    padding: "0.8rem 1.2rem",
    backgroundColor: "var(--error-light)",
    color: "var(--error)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.85rem",
    fontWeight: 500,
    border: "1px solid rgba(220, 38, 38, 0.15)",
    marginBottom: "1.2rem",
    width: "100%",
  },
  preparingWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "2rem 1.5rem 1rem",
  },
  breathOuterCircle: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    backgroundColor: "var(--primary-light)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "1.5rem",
    animation: "pulse-glow 2s infinite ease-in-out",
  },
  breathInnerCircle: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "#ffffff",
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  preparingTitle: {
    fontSize: "1.3rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: "0.4rem",
  },
  preparingSubtitle: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    marginBottom: "2rem",
    maxWidth: "380px",
    lineHeight: 1.4,
  },
  statusStepper: {
    display: "flex",
    flexDirection: "column",
    gap: "0.8rem",
    width: "100%",
    maxWidth: "300px",
    textAlign: "left",
    marginBottom: "2rem",
  },
  statusStepRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
    transition: "opacity 0.25s ease",
  },
  statusDotWrapper: {
    width: "20px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  statusDoneIcon: {
    color: "var(--success)",
    fontWeight: 700,
    fontSize: "0.95rem",
  },
  statusPulseDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "var(--primary)",
    display: "inline-block",
    animation: "pulse-glow 1.2s infinite ease-in-out",
  },
  statusPendingDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "var(--border-color)",
    display: "inline-block",
  },
  statusStepText: {
    fontSize: "0.85rem",
    transition: "font-weight 0.2s ease, color 0.2s ease",
  },
  horizontalProgressBar: {
    height: "4px",
    width: "100%",
    maxWidth: "260px",
    backgroundColor: "var(--divider)",
    borderRadius: "999px",
    overflow: "hidden",
  },
  progressBarProgress: {
    height: "100%",
    backgroundColor: "var(--primary)",
    transition: "width 0.4s ease-out",
  },
  wizardContentFlex: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    width: "100%",
    maxHeight: "75vh",
  },
  reviewConfigCard: {
    backgroundColor: "var(--bg-app)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    padding: "1.2rem",
    marginTop: "0.5rem",
    boxShadow: "var(--shadow-sm)",
  },
  reviewConfigRow: {
    display: "flex",
    gap: "1.2rem",
  },
  reviewSummaryBanner: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "1rem",
    backgroundColor: "var(--bg-app)",
    padding: "1rem 1.2rem",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border-color)",
  },
  summaryMetricItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.2rem",
  },
  summaryMetricLabel: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
  },
  summaryMetricVal: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  metricDifficultyRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.3rem",
    marginTop: "0.15rem",
  },
  diffBadgeEasy: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--success)",
    backgroundColor: "var(--success-light)",
    padding: "0.1rem 0.4rem",
    borderRadius: "6px",
  },
  diffBadgeMed: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--warning)",
    backgroundColor: "var(--warning-light)",
    padding: "0.1rem 0.4rem",
    borderRadius: "6px",
  },
  diffBadgeHard: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--error)",
    backgroundColor: "var(--error-light)",
    padding: "0.1rem 0.4rem",
    borderRadius: "6px",
  },
  questionsScrollWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    overflowY: "auto",
    paddingRight: "0.4rem",
    flex: 1,
  },
  emptyQuestions: {
    textAlign: "center",
    padding: "3rem",
    color: "var(--text-secondary)",
  },
  questionReviewCard: {
    padding: "1.2rem",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--bg-surface)",
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  qCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid var(--divider)",
    paddingBottom: "0.5rem",
  },
  questionIndexLabel: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  qCardControls: {
    display: "flex",
    alignItems: "center",
    gap: "0.3rem",
  },
  qMoveBtn: {
    background: "none",
    border: "1px solid var(--border-color)",
    color: "var(--text-secondary)",
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    fontSize: "0.7rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  qRegenBtn: {
    background: "var(--primary-light)",
    color: "var(--primary)",
    border: "none",
    height: "28px",
    padding: "0 0.6rem",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  qDeleteBtn: {
    background: "var(--error-light)",
    color: "var(--error)",
    border: "none",
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    fontSize: "0.75rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  qCardInputRow: {
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
  },
  qCardInnerLabel: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  cardTextarea: {
    padding: "0.6rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface-hover)",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
    width: "100%",
    minHeight: "64px",
    fontFamily: "inherit",
    resize: "vertical",
    outline: "none",
    transition: "border-color var(--transition-fast)",
  },
  reviewCardFooter: {
    display: "flex",
    justifyContent: "space-between",
    borderTop: "1px solid var(--divider)",
    paddingTop: "1rem",
    marginTop: "0.5rem",
  },
  assignmentLayoutRow: {
    display: "flex",
    gap: "2rem",
    flex: 1,
    overflow: "hidden",
  },
  assignmentDetailsCol: {
    flex: 1.2,
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    overflowY: "auto",
    paddingRight: "0.5rem",
  },
  shareLinkContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  shareLinkInputGroup: {
    display: "flex",
    alignItems: "center",
  },
  shareLinkField: {
    flex: 1,
    padding: "0.7rem 1rem",
    border: "1px solid var(--border-color)",
    borderRight: "none",
    borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
    outline: "none",
    height: "40px",
  },
  previewAnchor: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--primary)",
    textDecoration: "none",
    cursor: "pointer",
  },
  infoRowCard: {
    display: "flex",
    gap: "0.8rem",
    alignItems: "flex-start",
    backgroundColor: "var(--primary-light)",
    padding: "0.8rem 1rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid rgba(37, 99, 235, 0.1)",
  },
  infoRowIcon: {
    fontSize: "1.1rem",
    color: "var(--primary)",
    lineHeight: 1,
  },
  infoRowText: {
    display: "flex",
    flexDirection: "column",
    gap: "0.1rem",
    fontSize: "0.85rem",
    color: "var(--primary)",
  },
  assignToSelector: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  segmentedControl: {
    display: "flex",
    backgroundColor: "var(--bg-app)",
    padding: "0.25rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
  },
  segmentBtn: {
    flex: 1,
    padding: "0.5rem",
    borderRadius: "calc(var(--radius-sm) - 4px)",
    fontSize: "0.85rem",
    cursor: "pointer",
    border: "none",
    transition: "all var(--transition-fast)",
    textAlign: "center",
  },
  advancedConfigGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
    marginTop: "0.5rem",
  },
  advancedToggleBtn: {
    background: "none",
    border: "none",
    color: "var(--text-secondary)",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left",
    padding: 0,
  },
  advancedFieldsPanel: {
    padding: "1rem",
    backgroundColor: "var(--bg-surface-hover)",
    border: "1px dashed var(--border-color)",
    borderRadius: "var(--radius-sm)",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  studentListCol: {
    flex: 1,
    borderLeft: "1px solid var(--border-color)",
    paddingLeft: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.8rem",
    overflow: "hidden",
  },
  studentHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  studentSelectionCount: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "var(--text-secondary)",
  },
  quickSelectionActions: {
    display: "flex",
    gap: "0.4rem",
    alignItems: "center",
  },
  quickTextLink: {
    background: "none",
    border: "none",
    color: "var(--primary)",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  studentSearchFieldWrapper: {
    width: "100%",
  },
  studentSearchInputText: {
    width: "100%",
    padding: "0.5rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    fontSize: "0.85rem",
    backgroundColor: "var(--bg-app)",
    outline: "none",
  },
  studentScrollContainer: {
    flex: 1,
    overflowY: "auto",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--bg-app)",
    padding: "0.6rem",
  },
  emptyGridState: {
    textAlign: "center",
    padding: "2rem 0",
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
  },
  studentGridList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  studentSelectionRow: {
    display: "flex",
    gap: "0.6rem",
    alignItems: "center",
    padding: "0.6rem 0.8rem",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  studentDetailBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
    overflow: "hidden",
  },
  studentDisplayName: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflow: "hidden",
  },
  studentDisplayEmail: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflow: "hidden",
  },
  successWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "1.5rem 1rem 0.5rem",
  },
  successBadgeCircle: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "var(--success-light)",
    color: "var(--success)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.8rem",
    fontWeight: 700,
    marginBottom: "1.2rem",
  },
  successHeadline: {
    fontSize: "1.4rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: "0.3rem",
  },
  successDescription: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    marginBottom: "1.8rem",
    maxWidth: "420px",
    lineHeight: 1.4,
  },
  classShareCard: {
    width: "100%",
    maxWidth: "520px",
    backgroundColor: "var(--bg-app)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    padding: "1.2rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
    marginBottom: "1.8rem",
    textAlign: "left",
  },
  classShareHeader: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "var(--text-secondary)",
  },
  classShareInputRow: {
    display: "flex",
    alignItems: "center",
  },
  classLinkFieldReadOnly: {
    flex: 1,
    padding: "0.7rem 1rem",
    border: "1px solid var(--border-color)",
    borderRight: "none",
    borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)",
    backgroundColor: "#ffffff",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
    outline: "none",
    height: "40px",
  },
  studentInvitationAccordion: {
    width: "100%",
    maxWidth: "520px",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    marginBottom: "2rem",
    overflow: "hidden",
  },
  accordionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.8rem 1.2rem",
    backgroundColor: "var(--bg-app)",
    borderBottom: "1px solid var(--border-color)",
  },
  accordionLabel: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  studentInviteScrollGrid: {
    maxHeight: "180px",
    overflowY: "auto",
    backgroundColor: "#ffffff",
  },
  inviteTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.8rem",
    textAlign: "left",
  },
  thRow: {
    borderBottom: "1px solid var(--border-color)",
  },
  tableTh: {
    padding: "0.6rem 0.8rem",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-secondary)",
    fontWeight: 600,
  },
  tableTr: {
    borderBottom: "1px solid var(--divider)",
  },
  tableTd: {
    padding: "0.6rem 0.8rem",
    color: "var(--text-primary)",
    verticalAlign: "middle",
  },
  tableTdName: {
    padding: "0.6rem 0.8rem",
    color: "var(--text-primary)",
    verticalAlign: "middle",
    fontWeight: 500,
  },
  tableTdEmail: {
    padding: "0.6rem 0.8rem",
    color: "var(--text-secondary)",
    verticalAlign: "middle",
  },
  tableSmallInput: {
    flex: 1,
    padding: "0.2rem 0.4rem",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    backgroundColor: "var(--bg-app)",
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    outline: "none",
    maxWidth: "140px",
    textOverflow: "ellipsis",
  },
  completionActionsRow: {
    display: "flex",
    gap: "0.8rem",
    width: "100%",
    maxWidth: "520px",
    borderTop: "1px solid var(--divider)",
    paddingTop: "1.5rem",
  },
  successPreviewBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "#ffffff",
    color: "var(--text-secondary)",
    padding: "0 1.2rem",
    fontSize: "0.95rem",
    fontWeight: 600,
    height: "40px",
    transition: "background var(--transition-fast)",
  },
};
