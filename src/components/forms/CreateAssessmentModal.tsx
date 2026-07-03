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
import { extractErrorMessage } from "@/utils/helpers";

interface CreateAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type WizardStep =
  | "curriculum"
  | "cache_prompt"
  | "ai_config"
  | "generating"
  | "review"
  | "students"
  | "success";

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

  // AI Configuration states
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [cognitiveLevel, setCognitiveLevel] = useState("applying");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [sessionName, setSessionName] = useState("");
  const [questionType, setQuestionType] = useState("tita");

  // Progress state
  const [generationProgress, setGenerationProgress] = useState(0);

  // Draft questions list
  const [draftQuestions, setDraftQuestions] = useState<QuestionData[]>([]);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // Student details
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentsSearch, setStudentsSearch] = useState("");
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [questionsToAsk, setQuestionsToAsk] = useState<number>(5);

  // Result links
  const [successData, setSuccessData] = useState<StudentAssessmentResponse[] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedClassLink, setCopiedClassLink] = useState(false);

  // Status & error states
  const [loading, setLoading] = useState(false);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);
  const [error, setError] = useState("");

  // Setup/Reset modal state
  useEffect(() => {
    if (isOpen) {
      setStep("curriculum");
      setSelectedClassId("");
      setSelectedSubjectId("");
      setSelectedChapterId("");
      setDraftQuestions([]);
      setAssessmentTitle("");
      setStudents([]);
      setSelectedStudentIds([]);
      setSuccessData(null);
      setError("");
      setQuestionCount(5);
      setQuestionsToAsk(5);
      setDifficulty("medium");

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
        setAssessmentTitle(`${matchedSub.name} - Chapter Quiz`);
      }
    } else {
      setChapters([]);
      setSelectedChapterId("");
    }
  }, [selectedSubjectId, subjects]);

  // Handle proceed from curriculum selection
  const handleCurriculumSubmit = async () => {
    if (!selectedClassId || !selectedSubjectId || !selectedChapterId) {
      setError("Please select a Class, Subject, and Chapter to continue.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // Generate default session name
      const matchedSub = subjects.find((s) => String(s.id) === selectedSubjectId);
      const matchedCh = chapters.find((ch) => String(ch.id) === selectedChapterId);
      const subName = matchedSub ? matchedSub.name : "";
      const chNum = matchedCh ? matchedCh.number : "";
      const chTitle = matchedCh ? matchedCh.title : "";
      
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const session = `${subName} - Ch ${chNum}: ${chTitle} - ${dateStr}`;
      setSessionName(session);

      // Check if questions exist in the database (cache hit check)
      const existing = await questionService.getAll({
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        chapterId: selectedChapterId
      });

      if (existing && existing.length > 0) {
        setDraftQuestions(existing);
        setStep("cache_prompt");
      } else {
        setStep("ai_config");
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to inspect existing questions."));
      setStep("ai_config");
    } finally {
      setLoading(false);
    }
  };

  // Trigger AI generation
  const handleTriggerAI = async () => {
    setStep("generating");
    setGenerationProgress(10);
    setError("");

    const progressInterval = setInterval(() => {
      setGenerationProgress((p) => {
        if (p >= 85) {
          clearInterval(progressInterval);
          return 85;
        }
        return p + 15;
      });
    }, 150);

    try {
      const generated = await questionService.generateAIQuestions({
        classId: selectedClassId || undefined,
        subjectId: selectedSubjectId,
        chapterId: selectedChapterId,
        difficulty,
        cognitiveLevel,
        count: questionCount,
        regenerate: true, // bypass cache since they clicked generate new
        previewOnly: true,
        session: sessionName,
        questionType,
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);
      setDraftQuestions(generated.map(q => ({
        ...q,
        id: "draft_" + Math.random().toString(36).substring(2, 9)
      })));
      setTimeout(() => setStep("review"), 200);
    } catch (err: any) {
      clearInterval(progressInterval);
      setError(extractErrorMessage(err, "Question generation failed."));
      setStep("ai_config");
    }
  };

  // Add a manual custom question
  const handleAddCustomQuestion = () => {
    const newQ: QuestionData = {
      id: "draft_" + Math.random().toString(36).substring(2, 9),
      text: "",
      options: [],
      correctAnswer: "",
      questionType: "tita",
      difficulty,
      cognitiveLevel,
      subjectId: selectedSubjectId,
      chapterId: selectedChapterId || undefined,
      classId: selectedClassId || undefined,
      generatedBy: "manual",
      session: sessionName,
    };
    setDraftQuestions((prev) => [...prev, newQ]);
  };

  // Delete a draft question
  const handleDeleteDraftQuestion = (index: number) => {
    setDraftQuestions((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Move questions up or down
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

  // Regenerate a single question via AI
  const handleRegenerateSingleQuestion = async (index: number) => {
    const q = draftQuestions[index];
    setRegeneratingIndex(index);
    setError("");

    try {
      const newQs = await questionService.generateAIQuestions({
        classId: selectedClassId || undefined,
        subjectId: selectedSubjectId,
        chapterId: selectedChapterId,
        difficulty,
        cognitiveLevel,
        count: 1,
        regenerate: true,
        previewOnly: true,
        session: sessionName,
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

  // Proceed from Review questions step
  const handleReviewSubmit = async () => {
    if (draftQuestions.length === 0) {
      setError("Please add or generate at least one question.");
      return;
    }

    // Check for empty fields
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
      // Find out if any questions need saving (e.g. have draft_ ID keys)
      const needsSaving = draftQuestions.some(q => String(q.id).startsWith("draft_"));

      let savedIds: number[] = [];

      if (needsSaving) {
        // Save batch
        const savedRes = await questionService.batchSave({
          questions: draftQuestions.map((q) => ({
            text: q.text,
            options: [],
            correctAnswer: q.correctAnswer,
            questionType: "tita",
            difficulty: q.difficulty || difficulty,
            cognitiveLevel: q.cognitiveLevel || cognitiveLevel,
            classId: selectedClassId ? parseInt(selectedClassId, 10) : undefined,
            subjectId: parseInt(selectedSubjectId, 10),
            chapterId: selectedChapterId ? parseInt(selectedChapterId, 10) : undefined,
            generatedBy: q.generatedBy || "manual",
            session: q.session || sessionName,
          })),
          clearExisting: false,
          chapterId: selectedChapterId,
          difficulty,
          cognitiveLevel,
        });
        savedIds = savedRes.map(q => Number(q.id));
      } else {
        // All questions already exist in database
        savedIds = draftQuestions.map(q => Number(q.id));
      }

      // Pre-fill student assignment parameters
      setQuestionsToAsk(Math.min(savedIds.length, 5));
      
      const matchedSub = subjects.find(s => String(s.id) === selectedSubjectId);
      const subName = matchedSub ? matchedSub.name : "Quiz";
      setAssessmentTitle(`${subName} - ${draftQuestions.length} Questions`);

      // Update local storage IDs for assignment step reference
      (window as any)._wizardQuestionIds = savedIds;

      setStep("students");
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to save selected questions."));
    } finally {
      setLoading(false);
    }
  };

  // Assign students and publish assessment
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!assessmentTitle.trim()) {
      setError("Assessment Title is required.");
      return;
    }
    if (selectedStudentIds.length === 0) {
      setError("Please select at least one student.");
      return;
    }

    setLoading(true);
    const savedIds: number[] = (window as any)._wizardQuestionIds || [];

    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const createdAssessment = await assessmentService.create({
        title: assessmentTitle.trim(),
        subjectId: Number(selectedSubjectId),
        classId: Number(selectedClassId),
        status: "Active",
        date: todayStr,
        questionsCount: savedIds.length,
        questionIds: savedIds,
        questionsToAsk: questionsToAsk,
      });

      const res = await assessmentService.assignAssessmentBulk({
        assessmentId: Number(createdAssessment.id),
        studentIds: selectedStudentIds,
      });

      setSuccessData(res);
      setStep("success");
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to create assessment and assign."));
    } finally {
      setLoading(false);
    }
  };

  // Invitation link copy helpers
  const handleCopyLink = async (link: string, id: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyAllLinks = async () => {
    if (!successData) return;
    try {
      const allLinks = successData.map(sa => `${sa.studentName}: ${sa.assessmentLink}`).join("\n");
      await navigator.clipboard.writeText(allLinks);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // Search filtered student list
  const filteredStudents = students.filter(s => {
    const q = studentsSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  const getStepTitle = () => {
    switch (step) {
      case "curriculum":
        return "New Assessment: Choose Topic";
      case "cache_prompt":
        return "Review Saved Questions";
      case "ai_config":
        return "Generate Questions with AI";
      case "generating":
        return "Generating Assessment Questions";
      case "review":
        return "Review and Reorder Questions";
      case "students":
        return "Assign Students";
      case "success":
        return "Assessment Assigned Successfully";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getStepTitle()}
      size={step === "review" || step === "students" || step === "success" ? "large" : "medium"}
    >
      {/* Wizard Progress Steps Indicator */}
      {step !== "success" && (
        <div style={styles.wizardIndicator}>
          <div style={{ ...styles.indicatorStep, color: step === "curriculum" ? "var(--primary)" : "var(--text-muted)" }}>1. Select Topic</div>
          <div style={styles.indicatorArrow}>&gt;</div>
          <div style={{ ...styles.indicatorStep, color: step === "ai_config" || step === "cache_prompt" || step === "generating" ? "var(--primary)" : "var(--text-muted)" }}>2. Create</div>
          <div style={styles.indicatorArrow}>&gt;</div>
          <div style={{ ...styles.indicatorStep, color: step === "review" ? "var(--primary)" : "var(--text-muted)" }}>3. Review</div>
          <div style={styles.indicatorArrow}>&gt;</div>
          <div style={{ ...styles.indicatorStep, color: step === "students" ? "var(--primary)" : "var(--text-muted)" }}>4. Assign</div>
        </div>
      )}

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* STEP 1: Curriculum Select */}
      {step === "curriculum" && (
        <div style={styles.formContainer}>
          {loadingCurriculum ? (
            <div style={styles.loadingCurriculum}>
              <div className="spinner"></div>
              <p style={{ marginTop: "1rem" }}>Loading class data...</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Select Class *</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  style={styles.select}
                >
                  <option value="">-- Choose Class --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.section})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Select Subject *</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  disabled={!selectedClassId}
                  style={styles.select}
                >
                  <option value="">-- Choose Subject --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Select Chapter *</label>
                <select
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  disabled={!selectedSubjectId}
                  style={styles.select}
                >
                  <option value="">-- Choose Chapter --</option>
                  {chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      Chapter {ch.number}: {ch.title}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.actions}>
                <Button variant="secondary" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleCurriculumSubmit} loading={loading} disabled={!selectedChapterId}>
                  Next: Select Questions
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Cache Prompt */}
      {step === "cache_prompt" && (
        <div style={styles.promptContainer}>
          <div style={styles.promptIcon}>📚</div>
          <h4 style={styles.promptTitle}>Previously Generated Questions Found</h4>
          <p style={styles.promptDesc}>
            We found <strong>{draftQuestions.length} saved questions</strong> matching this chapter syllabus in the database.
            Would you like to reuse them or generate a new set with AI?
          </p>

          <div style={styles.promptActions}>
            <Button
              variant="secondary"
              style={{ flex: 1, height: "48px" }}
              onClick={() => setStep("ai_config")}
            >
              Generate New
            </Button>
            <Button
              variant="primary"
              style={{ flex: 1, height: "48px" }}
              onClick={() => setStep("review")}
            >
              Reuse Existing ({draftQuestions.length})
            </Button>
          </div>

          <div style={styles.backLinkWrapper}>
            <button style={styles.backLink} onClick={() => setStep("curriculum")}>
              &larr; Choose a different topic
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: AI Configuration */}
      {step === "ai_config" && (
        <div style={styles.formContainer}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Difficulty Level</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              style={styles.select}
            >
              <option value="easy">Easy (Foundational Concepts)</option>
              <option value="medium">Medium (Intermediate Reasoning)</option>
              <option value="hard">Hard (Advanced Problem Solving)</option>
            </select>
          </div>

          <div style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Number of Questions</label>
              <input
                type="number"
                min={1}
                max={30}
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value, 10) || 5)}
                style={styles.textInput}
              />
            </div>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Format</label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
                style={styles.select}
              >
                <option value="tita">Descriptive Answer (TITA)</option>
                <option value="mcq" disabled>Multiple Choice (MCQ)</option>
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <Input
              label="Session Identifier"
              type="text"
              required
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
            />
          </div>

          <div style={styles.actions}>
            <Button
              variant="secondary"
              onClick={() => {
                // If cache existed, go back to cache prompt, otherwise go back to curriculum select
                setStep(draftQuestions.length > 0 ? "cache_prompt" : "curriculum");
              }}
            >
              Back
            </Button>
            <Button variant="primary" onClick={handleTriggerAI}>
              Generate Questions
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: AI Generation Progress */}
      {step === "generating" && (
        <div style={styles.generatingContainer}>
          <div className="spinner" style={{ width: "32px", height: "32px", borderWidth: "3px" }} />
          <h4 style={styles.generatingTitle}>Generating Questions</h4>
          <p style={styles.generatingSubtitle}>
            Creating {questionCount} questions based on reference chapter curriculum text... {generationProgress}%
          </p>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressBarFill, width: `${generationProgress}%` }} />
          </div>
        </div>
      )}

      {/* STEP 5: Review Draft Questions */}
      {step === "review" && (
        <div style={styles.reviewContainer}>
          <div style={styles.reviewHeader}>
            <p style={styles.reviewSubtitle}>
              Inline edit, reorder, or delete questions. Click "+ Add Custom Question" to write your own.
            </p>
          </div>

          <div style={styles.questionsScrollList}>
            {draftQuestions.map((q, idx) => {
              const isRegenerating = regeneratingIndex === idx;
              return (
                <div key={q.id || idx} style={styles.qCard}>
                  <div style={styles.qCardHeader}>
                    <span style={styles.qCardNumber}>Question {idx + 1}</span>
                    <div style={styles.qCardActions}>
                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(idx, "up")}
                        disabled={idx === 0}
                        style={styles.iconButton}
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(idx, "down")}
                        disabled={idx === draftQuestions.length - 1}
                        style={styles.iconButton}
                        title="Move Down"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegenerateSingleQuestion(idx)}
                        disabled={isRegenerating}
                        style={styles.iconButtonSecondary}
                        title="Regenerate single question"
                      >
                        {isRegenerating ? "Regenerating..." : "Regenerate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDraftQuestion(idx)}
                        style={styles.iconButtonDanger}
                        title="Delete Question"
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  <div style={styles.qCardField}>
                    <label style={styles.qCardLabel}>Question Description</label>
                    <textarea
                      value={q.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraftQuestions(prev => prev.map((item, i) => i === idx ? { ...item, text: val } : item));
                      }}
                      style={styles.qTextarea}
                      required
                    />
                  </div>

                  <div style={styles.qCardField}>
                    <label style={styles.qCardLabel}>Expected Classroom Answer</label>
                    <textarea
                      value={q.correctAnswer}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraftQuestions(prev => prev.map((item, i) => i === idx ? { ...item, correctAnswer: val } : item));
                      }}
                      style={styles.qTextarea}
                      required
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={styles.reviewFooter}>
            <Button variant="secondary" onClick={handleAddCustomQuestion}>
              + Add Custom Question
            </Button>
            <div style={{ display: "flex", gap: "0.8rem" }}>
              <Button variant="secondary" onClick={() => setStep("curriculum")}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleReviewSubmit} loading={loading}>
                Save & Assign Students
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: Assign Students */}
      {step === "students" && (
        <form onSubmit={handleAssignSubmit} style={styles.studentsForm}>
          <div style={styles.formGroup}>
            <Input
              label="Assessment Display Title"
              type="text"
              required
              value={assessmentTitle}
              onChange={(e) => setAssessmentTitle(e.target.value)}
              placeholder="e.g. Grade 3 Math quiz"
            />
          </div>

          <div style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Questions to Ask Each Student (5 to 10)</label>
              <input
                type="number"
                min={1}
                max={draftQuestions.length}
                value={questionsToAsk}
                onChange={(e) => setQuestionsToAsk(parseInt(e.target.value, 10) || 5)}
                style={styles.textInput}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Selects a random subset of {questionsToAsk} out of {draftQuestions.length} review questions.
              </span>
            </div>
          </div>

          <div style={styles.studentHeaderBar}>
            <span style={styles.studentCount}>
              Select Students ({selectedStudentIds.length} Selected)
            </span>
            <div style={styles.studentSearchWrapper}>
              <input
                type="text"
                placeholder="Search students..."
                value={studentsSearch}
                onChange={(e) => setStudentsSearch(e.target.value)}
                style={styles.studentSearchInput}
              />
              <button
                type="button"
                style={styles.textLinkBtn}
                onClick={() => setSelectedStudentIds(students.map(s => Number(s.id)))}
              >
                Select All
              </button>
              <span style={{ color: "var(--border-color)" }}>|</span>
              <button
                type="button"
                style={styles.textLinkBtn}
                onClick={() => setSelectedStudentIds([])}
              >
                Deselect All
              </button>
            </div>
          </div>

          <div style={styles.studentsScrollGrid}>
            {filteredStudents.length === 0 ? (
              <div style={styles.emptyState}>No class students found.</div>
            ) : (
              <div style={styles.studentGrid}>
                {filteredStudents.map(student => {
                  const isChecked = selectedStudentIds.includes(Number(student.id));
                  return (
                    <div
                      key={student.id}
                      onClick={() => {
                        const idNum = Number(student.id);
                        setSelectedStudentIds(prev =>
                          prev.includes(idNum) ? prev.filter(id => id !== idNum) : [...prev, idNum]
                        );
                      }}
                      style={{
                        ...styles.studentCard,
                        borderColor: isChecked ? "var(--primary)" : "var(--border-color)",
                        backgroundColor: isChecked ? "var(--primary-light)" : "var(--bg-card)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ cursor: "pointer" }}
                      />
                      <div style={styles.studentCardInfo}>
                        <div style={styles.studentName}>{student.name}</div>
                        <div style={styles.studentEmail}>{student.email}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={styles.actions}>
            <Button variant="secondary" onClick={() => setStep("review")} disabled={loading}>
              Back
            </Button>
            <Button type="submit" variant="primary" loading={loading} disabled={selectedStudentIds.length === 0}>
              Create & Assign Assessment
            </Button>
          </div>
        </form>
      )}

      {/* STEP 7: Success Summary Done Screen */}
      {step === "success" && successData && (
        <div style={styles.successContainer}>
          <div style={styles.successHeader}>
            <div style={styles.successIcon}>✓</div>
            <h4 style={styles.successTitle}>Assessment Assigned Successfully!</h4>
            <p style={styles.successSubtitle}>
              Simulated invitation emails have been dispatched to {successData.length} students.
            </p>
          </div>

          {/* Quick Summary Bar */}
          <div style={styles.successInfoBar}>
            <div>
              <span style={styles.successInfoLabel}>Assigned Students</span>
              <span style={styles.successInfoVal}>{successData.length}</span>
            </div>
            <div>
              <span style={styles.successInfoLabel}>Total Questions</span>
              <span style={styles.successInfoVal}>{draftQuestions.length}</span>
            </div>
            <div>
              <Button
                variant={copiedAll ? "success" : "primary"}
                onClick={handleCopyAllLinks}
                style={{ height: "36px", fontSize: "0.8rem" }}
              >
                {copiedAll ? "All Copied!" : "Copy All Student Links"}
              </Button>
            </div>
          </div>

          {/* Class-wide Link */}
          <div style={styles.classLinkBlock}>
            <label style={styles.label}>Class Shareable Link (All Students)</label>
            <div style={styles.classLinkRow}>
              <input
                type="text"
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/assessment/join?id=${successData[0]?.assessmentId}`}
                style={styles.linkInput}
              />
              <Button
                variant={copiedClassLink ? "success" : "primary"}
                onClick={async () => {
                  try {
                    const link = `${window.location.origin}/assessment/join?id=${successData[0]?.assessmentId}`;
                    await navigator.clipboard.writeText(link);
                    setCopiedClassLink(true);
                    setTimeout(() => setCopiedClassLink(false), 2000);
                  } catch (e) {}
                }}
                style={{ height: "42px", borderRadius: "0 var(--radius-sm) var(--radius-sm) 0" }}
              >
                {copiedClassLink ? "Copied!" : "Copy Link"}
              </Button>
              <a
                href={`${typeof window !== "undefined" ? window.location.origin : ""}/assessment/join?id=${successData[0]?.assessmentId}`}
                target="_blank"
                rel="noreferrer"
                style={styles.previewBtn}
              >
                Preview
              </a>
            </div>
          </div>

          {/* Individual Links table */}
          <div style={styles.tableBlock}>
            <label style={styles.label}>Individual Access Links</label>
            <div style={styles.tableScroll}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Student</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Direct Invitation Access URL</th>
                  </tr>
                </thead>
                <tbody>
                  {successData.map(sa => {
                    const isCopied = copiedId === String(sa.id);
                    return (
                      <tr key={sa.id} style={styles.tableRow}>
                        <td style={styles.td}><strong>{sa.studentName}</strong></td>
                        <td style={styles.td_secondary}>{sa.studentEmail}</td>
                        <td style={styles.td}>
                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            <input
                              type="text"
                              readOnly
                              value={sa.assessmentLink}
                              style={styles.smallLinkInput}
                            />
                            <Button
                              variant={isCopied ? "success" : "primary"}
                              onClick={() => handleCopyLink(sa.assessmentLink, String(sa.id))}
                              style={{ height: "26px", fontSize: "0.75rem", padding: "0 0.5rem" }}
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

          <div style={styles.successActions}>
            <Button variant="secondary" onClick={onClose} style={{ width: "100%" }}>
              Close Wizard
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wizardIndicator: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "var(--bg-app)",
    border: "1px solid var(--border-color)",
    padding: "0.8rem 1.2rem",
    borderRadius: "var(--radius-sm)",
    marginBottom: "1.5rem",
    fontSize: "0.85rem",
    fontWeight: 600,
  },
  indicatorStep: {
    transition: "color var(--transition-fast)",
  },
  indicatorArrow: {
    color: "var(--text-muted)",
  },
  formContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    width: "100%",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    width: "100%",
  },
  formRow: {
    display: "flex",
    gap: "1rem",
    width: "100%",
  },
  label: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  select: {
    padding: "0.7rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    outline: "none",
    width: "100%",
    cursor: "pointer",
  },
  textInput: {
    padding: "0.7rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    outline: "none",
    width: "100%",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.8rem",
    marginTop: "1.5rem",
    borderTop: "1px solid var(--divider)",
    paddingTop: "1rem",
    width: "100%",
  },
  loadingCurriculum: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem 1rem",
    textAlign: "center",
    color: "var(--text-secondary)",
  },
  errorBanner: {
    padding: "0.8rem 1rem",
    backgroundColor: "var(--error-light)",
    color: "var(--error)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.85rem",
    fontWeight: 500,
    border: "1px solid rgba(220, 38, 38, 0.2)",
    marginBottom: "1rem",
    width: "100%",
  },
  promptContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "2rem 1.5rem",
    width: "100%",
  },
  promptIcon: {
    fontSize: "3rem",
    marginBottom: "1rem",
  },
  promptTitle: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: "0.5rem",
  },
  promptDesc: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    lineHeight: 1.5,
    marginBottom: "1.5rem",
    maxWidth: "420px",
  },
  promptActions: {
    display: "flex",
    gap: "1rem",
    width: "100%",
    maxWidth: "400px",
    marginBottom: "1rem",
  },
  backLinkWrapper: {
    marginTop: "1rem",
  },
  backLink: {
    background: "none",
    border: "none",
    color: "var(--primary)",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  generatingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "3rem 2rem",
    width: "100%",
  },
  generatingTitle: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginTop: "1.2rem",
    marginBottom: "0.3rem",
  },
  generatingSubtitle: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    marginBottom: "1.5rem",
  },
  progressBar: {
    height: "8px",
    width: "100%",
    maxWidth: "360px",
    backgroundColor: "var(--border-color)",
    borderRadius: "999px",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "var(--primary)",
    transition: "width 0.2s ease-out",
  },
  reviewContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    maxHeight: "75vh",
    width: "100%",
  },
  reviewHeader: {
    paddingBottom: "0.5rem",
    borderBottom: "1px solid var(--border-color)",
  },
  reviewSubtitle: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
  },
  questionsScrollList: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    overflowY: "auto",
    paddingRight: "0.4rem",
    flex: 1,
  },
  qCard: {
    padding: "1.2rem",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--bg-surface)",
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  qCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid var(--divider)",
    paddingBottom: "0.6rem",
  },
  qCardNumber: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "var(--primary)",
  },
  qCardActions: {
    display: "flex",
    gap: "0.4rem",
  },
  iconButton: {
    background: "none",
    border: "1px solid var(--border-color)",
    color: "var(--text-secondary)",
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.75rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonSecondary: {
    background: "var(--primary-light)",
    border: "none",
    color: "var(--primary)",
    height: "28px",
    padding: "0 0.6rem",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: 600,
  },
  iconButtonDanger: {
    background: "var(--error-light)",
    border: "none",
    color: "var(--error)",
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.8rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  qCardField: {
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
  },
  qCardLabel: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  qTextarea: {
    padding: "0.6rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
    width: "100%",
    minHeight: "60px",
    fontFamily: "inherit",
    resize: "vertical",
    outline: "none",
  },
  reviewFooter: {
    display: "flex",
    justifyContent: "space-between",
    borderTop: "1px solid var(--divider)",
    paddingTop: "1rem",
    marginTop: "0.5rem",
  },
  studentsForm: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    maxHeight: "75vh",
    width: "100%",
  },
  studentHeaderBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.8rem",
    borderBottom: "1px solid var(--border-color)",
    paddingBottom: "0.5rem",
  },
  studentCount: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "var(--text-secondary)",
  },
  studentSearchWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
  },
  studentSearchInput: {
    padding: "0.4rem 0.6rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-app)",
    fontSize: "0.85rem",
    outline: "none",
    width: "150px",
  },
  textLinkBtn: {
    background: "none",
    border: "none",
    color: "var(--primary)",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  studentsScrollGrid: {
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    padding: "1rem",
    backgroundColor: "var(--bg-app)",
    maxHeight: "260px",
    overflowY: "auto",
    flex: 1,
  },
  studentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "0.8rem",
  },
  studentCard: {
    display: "flex",
    gap: "0.6rem",
    alignItems: "center",
    padding: "0.6rem 0.8rem",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  studentCardInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
    overflow: "hidden",
  },
  studentName: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflow: "hidden",
  },
  studentEmail: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflow: "hidden",
  },
  successContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    width: "100%",
  },
  successHeader: {
    textAlign: "center",
  },
  successIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "var(--success-light)",
    color: "var(--success)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.5rem",
    fontWeight: "bold",
    margin: "0 auto 0.8rem",
  },
  successTitle: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: "0.25rem",
  },
  successSubtitle: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
  },
  successInfoBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "var(--bg-app)",
    padding: "1rem",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border-color)",
  },
  successInfoLabel: {
    display: "block",
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    fontWeight: 600,
  },
  successInfoVal: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  classLinkBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  classLinkRow: {
    display: "flex",
    width: "100%",
    alignItems: "center",
  },
  linkInput: {
    flex: 1,
    padding: "0.7rem 1rem",
    border: "1px solid var(--border-color)",
    borderRight: "none",
    borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
    outline: "none",
    height: "42px",
  },
  previewBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-secondary)",
    padding: "0 1rem",
    fontSize: "0.85rem",
    fontWeight: 600,
    height: "42px",
    marginLeft: "0.5rem",
    transition: "background var(--transition-fast)",
  },
  tableBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  tableScroll: {
    maxHeight: "180px",
    overflowY: "auto",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.8rem",
    textAlign: "left",
  },
  tableHeaderRow: {
    borderBottom: "1px solid var(--border-color)",
  },
  th: {
    padding: "0.5rem 0.8rem",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-secondary)",
    fontWeight: 600,
  },
  tableRow: {
    borderBottom: "1px solid var(--divider)",
  },
  td: {
    padding: "0.5rem 0.8rem",
    color: "var(--text-primary)",
    verticalAlign: "middle",
  },
  td_secondary: {
    padding: "0.5rem 0.8rem",
    color: "var(--text-secondary)",
    verticalAlign: "middle",
  },
  smallLinkInput: {
    flex: 1,
    padding: "0.2rem 0.4rem",
    border: "1px solid var(--border-color)",
    borderRadius: "4px",
    backgroundColor: "var(--bg-app)",
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    outline: "none",
    maxWidth: "140px",
    textOverflow: "ellipsis",
  },
  successActions: {
    marginTop: "0.5rem",
  },
  emptyState: {
    textAlign: "center",
    padding: "2rem",
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
  },
};
